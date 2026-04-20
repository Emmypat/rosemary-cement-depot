from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db import get_db
from app.models.product import Product
from app.schemas.product import ProductCreate, ProductUpdate, ProductOut, StockAdjust

router = APIRouter(prefix="/inventory", tags=["inventory"])


@router.get("", response_model=list[ProductOut])
def get_all(db: Session = Depends(get_db)):
    return db.query(Product).order_by(Product.name).all()


@router.get("/{product_id}", response_model=ProductOut)
def get_one(product_id: int, db: Session = Depends(get_db)):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(404, "Product not found")
    return product


@router.post("", response_model=ProductOut, status_code=201)
def create(data: ProductCreate, db: Session = Depends(get_db)):
    product = Product(**data.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.put("/{product_id}", response_model=ProductOut)
def update(product_id: int, data: ProductUpdate, db: Session = Depends(get_db)):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(404, "Product not found")
    for key, value in data.model_dump().items():
        setattr(product, key, value)
    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}", status_code=204)
def delete(product_id: int, db: Session = Depends(get_db)):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(404, "Product not found")
    db.delete(product)
    db.commit()


@router.post("/{product_id}/adjust", response_model=ProductOut)
def adjust_stock(product_id: int, data: StockAdjust, db: Session = Depends(get_db)):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(404, "Product not found")

    if data.reason == "restock":
        product.stock_qty += data.quantity
    elif data.reason == "damaged":
        product.stock_qty = max(0, product.stock_qty - data.quantity)
    else:
        # correction: set absolute value
        product.stock_qty = data.quantity

    db.commit()
    db.refresh(product)
    return product
