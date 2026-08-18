# FraudGuard Frontend

Clean React + TypeScript + Vite dashboard for the credit-card fraud detection pseudo-stream project.

## Pages kept

- Dashboard — model metrics, stream KPIs, charts, confusion matrix and recent transactions.
- Live Monitor — start/stop pseudo-streaming and inspect predictions.
- Analytics — historical fraud patterns.
- Investigation — inspect a streamed transaction.
- Simulator — run what-if fraud scenarios.

## Removed from the old frontend

- Customers page
- Separate Model page
- Separate Health page
- Unused Status/health navigation

Their useful information is now consolidated into the main dashboard.

## Run

```bash
npm install
npm run dev
```

The frontend expects FastAPI at `http://localhost:8000` by default. To change it, create `.env`:

```env
VITE_API_BASE_URL=http://localhost:8000
```

## Required backend endpoint

The dashboard calls `GET /api/metrics` and expects real evaluation values for:

- accuracy
- precision
- recall
- f1_score
- pr_auc
- roc_auc

Do not hard-code these values in React. They should come from the trained model evaluation.
