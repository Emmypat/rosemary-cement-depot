from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app.db import get_db
from app.models.sale import Sale, SaleItem
from app.models.product import Product
from app.models.customer import Customer
from app.models.receivable import Receivable
from app.models.receipt import Receipt
from app.models.payment import Payment
from app.schemas.sale import SaleCreate, SaleOut, SaleItemOut
from app.utils.pdf import generate_receipt_pdf
from app.utils.email import send_receipt_email

router = APIRouter(prefix="/sales", tags=["sales"])


def _load_sale(sale_id: int, db: Session) -> Sale:
    sale = (
        db.query(Sale)
        .options(joinedload(Sale.items).joinedload(SaleItem.product))
        .filter(Sale.id == sale_id)
        .first()
    )
    if not sale:
        raise HTTPException(404, "Sale not found")
    return sale


def _sale_to_out(sale: Sale) -> dict:
    items = [SaleItemOut.from_orm_with_name(item) for item in sale.items]
    return SaleOut(
        id=sale.id,
        customer_id=sale.customer_id,
        customer_name=sale.customer_name,
        customer_email=sale.customer_email,
        payment_method=sale.payment_method,
        payment_reference=sale.payment_reference,
        total=float(sale.total),
        is_credit=sale.is_credit,
        verified=sale.verified,
        created_at=sale.created_at,
        items=items,
    )


@router.get("", response_model=list[SaleOut])
def get_all(db: Session = Depends(get_db)):
    sales = (
        db.query(Sale)
        .options(joinedload(Sale.items).joinedload(SaleItem.product))
        .order_by(Sale.created_at.desc())
        .all()
    )
    return [_sale_to_out(s) for s in sales]


@router.get("/{sale_id}", response_model=SaleOut)
def get_one(sale_id: int, db: Session = Depends(get_db)):
    return _sale_to_out(_load_sale(sale_id, db))


@router.post("", response_model=SaleOut, status_code=201)
def create_sale(data: SaleCreate, db: Session = Depends(get_db)):
    # Validate stock
    for item in data.items:
        product = db.get(Product, item.product_id)
        if not product:
            raise HTTPException(400, f"Product {item.product_id} not found")
        if product.stock_qty < item.qty:
            raise HTTPException(400, f"Insufficient stock for {product.name}. Available: {product.stock_qty}")

    # Create sale
    sale = Sale(
        customer_id=data.customer_id,
        customer_name=data.customer_name,
        customer_email=data.customer_email,
        payment_method=data.payment_method,
        payment_reference=data.payment_reference,
        total=data.total,
        is_credit=data.is_credit,
    )
    db.add(sale)
    db.flush()

    # Sale items + deduct stock
    for item_data in data.items:
        item = SaleItem(
            sale_id=sale.id,
            product_id=item_data.product_id,
            qty=item_data.qty,
            unit_price=item_data.unit_price,
            subtotal=item_data.subtotal,
        )
        db.add(item)
        product = db.get(Product, item_data.product_id)
        product.stock_qty -= item_data.qty

    # Payment record
    if not data.is_credit:
        payment = Payment(
            sale_id=sale.id,
            amount=data.total,
            method=data.payment_method,
            reference=data.payment_reference,
        )
        db.add(payment)

    # Receivable for credit sale
    if data.is_credit:
        receivable = Receivable(
            sale_id=sale.id,
            customer_id=data.customer_id,
            customer_name=data.customer_name,
            customer_email=data.customer_email,
            amount_owed=data.total,
            amount_paid=0,
            due_date=(datetime.now(timezone.utc) + timedelta(days=30)).date(),
        )
        db.add(receivable)
        # Update customer balance
        if data.customer_id:
            customer = db.get(Customer, data.customer_id)
            if customer:
                customer.balance_owed = float(customer.balance_owed) + data.total

    db.commit()
    db.refresh(sale)

    # Generate and email receipt
    sale_loaded = _load_sale(sale.id, db)
    sale_dict = {
        "id": sale.id,
        "customer_name": sale.customer_name,
        "customer_email": sale.customer_email,
        "payment_method": sale.payment_method,
        "payment_reference": sale.payment_reference,
        "total": float(sale.total),
        "is_credit": sale.is_credit,
        "created_at": sale.created_at,
        "items": [
            {
                "name": item.product.name if item.product else "Unknown",
                "qty": item.qty,
                "unit_price": float(item.unit_price),
                "subtotal": float(item.subtotal),
            }
            for item in sale_loaded.items
        ],
    }

    pdf_bytes = generate_receipt_pdf(sale_dict)

    emailed_to = None
    sent_at = None
    if sale.customer_email:
        success = send_receipt_email(sale.customer_email, sale.customer_name or "Customer", sale.id, pdf_bytes)
        if success:
            emailed_to = sale.customer_email
            sent_at = datetime.now(timezone.utc)

    receipt = Receipt(
        sale_id=sale.id,
        emailed_to=emailed_to,
        sent_at=sent_at,
    )
    db.add(receipt)
    db.commit()

    return _sale_to_out(sale_loaded)


@router.post("/{sale_id}/verify", response_model=SaleOut)
def verify_sale(sale_id: int, db: Session = Depends(get_db)):
    sale = _load_sale(sale_id, db)
    sale.verified = True
    db.commit()
    db.refresh(sale)
    return _sale_to_out(_load_sale(sale_id, db))
