# FraudGuard Full Stack

Full-stack UI/API framework for Real-Time Behavioral Credit Card Fraud Detection.

Stack:
- React + Vite + TypeScript
- FastAPI + Pydantic
- ML adapter boundary for your uploaded model
- PostgreSQL-ready backend
- Nginx API gateway
- Render deployment blueprint
- Recharts dashboards

Pages:
Overview, Live Monitor, Investigation, Analytics, Customer Behavior,
Model Performance, Simulator, System Health.

The frontend is intentionally plain-language and navigation-first so a first-time
user can understand the application without external help.

## Local

Backend:
```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Frontend:
```powershell
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:5173
Backend docs: http://localhost:8000/docs

## Docker gateway

From project root:
```bash
docker compose -f deploy/docker-compose.yml up --build
```
Open http://localhost:8080

## ML integration

Replace the internals of `backend/app/services/ml_service.py` with the model
and feature-engineering code you will upload later. Keep its output contract:
fraud_probability, risk_level, decision, latency_ms, reasons, model_version.

## Render

Backend service:
- root: backend
- build: `pip install -r requirements.txt`
- start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

Frontend static site:
- root: frontend
- build: `npm ci && npm run build`
- publish: `dist`
- env: `VITE_API_BASE_URL=https://YOUR-BACKEND.onrender.com`

See `render.yaml`.
