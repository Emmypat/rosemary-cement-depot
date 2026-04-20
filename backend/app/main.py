from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum

from app.db import engine, Base
from app.routers import inventory, customers, sales, receivables, receipts, dashboard

# Create all tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="CementTrack API",
    description="Inventory, sales, receivables and receipts for a cement business",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(inventory.router)
app.include_router(customers.router)
app.include_router(sales.router)
app.include_router(receivables.router)
app.include_router(receipts.router)
app.include_router(dashboard.router)


@app.get("/health")
def health():
    return {"status": "ok"}


# AWS Lambda handler
handler = Mangum(app, lifespan="off")
