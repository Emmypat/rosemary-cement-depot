# CementTrack – Small Business Manager

A full-stack inventory and business management system for a cement retailer, built on AWS (eu-west-1).

## Features

- **Inventory** – Track cement products, stock levels, and low-stock alerts
- **Sales** – Create sales with cash / card / mobile money payments
- **Transaction Verification** – Verify and audit every transaction
- **Receivables** – Track credit sales and customer debts
- **Receipts** – Auto-generate PDF receipts and email via AWS SES
- **Customers** – Manage customer profiles and purchase history

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + Tailwind CSS (PWA) |
| Backend | Python 3.12 + FastAPI + Mangum |
| Database | AWS RDS PostgreSQL |
| Auth | AWS Cognito |
| Storage | AWS S3 |
| Email | AWS SES |
| Infra | AWS SAM (Lambda + API Gateway) |
| Region | eu-west-1 (Ireland) |

## Project Structure

```
cement-business/
├── frontend/          # React PWA
├── backend/           # Python FastAPI on Lambda
└── README.md
```

## Getting Started

### Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Environment Variables

### Frontend (`frontend/.env`)
```
VITE_API_URL=https://your-api-gateway-url.execute-api.eu-west-1.amazonaws.com/prod
```

### Backend
See `backend/template.yaml` for AWS SAM environment configuration.
