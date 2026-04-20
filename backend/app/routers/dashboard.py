from datetime import datetime, timezone, date
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db import get_db
from app.models.product import Product
from app.models.sale import Sale, SaleItem
from app.models.receivable import Receivable

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
def get_summary(db: Session = Depends(get_db)):
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    total_products = db.query(func.count(Product.id)).scalar() or 0
    low_stock_count = db.query(func.count(Product.id)).filter(
        Product.stock_qty <= Product.reorder_level
    ).scalar() or 0

    today_sales_q = db.query(Sale).filter(Sale.created_at >= today_start)
    today_sales = today_sales_q.count()
    today_revenue = db.query(func.sum(Sale.total)).filter(
        Sale.created_at >= today_start,
        Sale.is_credit == False,
    ).scalar() or 0

    total_receivables = db.query(func.sum(
        Receivable.amount_owed - Receivable.amount_paid
    )).filter(Receivable.paid == False).scalar() or 0

    overdue_count = db.query(func.count(Receivable.id)).filter(
        Receivable.paid == False,
        Receivable.due_date < date.today(),
    ).scalar() or 0

    recent_sales = (
        db.query(Sale)
        .order_by(Sale.created_at.desc())
        .limit(5)
        .all()
    )

    low_stock_products = (
        db.query(Product)
        .filter(Product.stock_qty <= Product.reorder_level)
        .order_by(Product.stock_qty.asc())
        .limit(5)
        .all()
    )

    return {
        "total_products": total_products,
        "low_stock_count": low_stock_count,
        "today_sales": today_sales,
        "today_revenue": float(today_revenue),
        "total_receivables": float(total_receivables),
        "overdue_count": overdue_count,
        "recent_sales": [
            {
                "id": s.id,
                "customer_name": s.customer_name or "Walk-in",
                "total": float(s.total),
                "payment_method": s.payment_method,
                "created_at": s.created_at.isoformat(),
            }
            for s in recent_sales
        ],
        "low_stock_products": [
            {
                "id": p.id,
                "name": p.name,
                "stock_qty": p.stock_qty,
                "reorder_level": p.reorder_level,
                "unit": p.unit,
            }
            for p in low_stock_products
        ],
    }
