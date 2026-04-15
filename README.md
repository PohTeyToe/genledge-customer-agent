# GenLedge Customer Agent

Customer-flow AI support agent for a GenLedge-style SMB accounting product.
End user: a small-business customer asking about their own invoices,
payments, and documents. The agent runs a multi-turn tool loop against a
mock ledger and escalates to a human when it cannot resolve a request.

Separate from the Ledger Copilot demo (`genledge-assistant`) which is
the accountant-facing internal ops demo.

## Stack

- **Backend:** FastAPI + Docker on Render. Python 3.12 + Node 20.
  Single `/chat` endpoint runs an iterative Claude CLI loop against 6
  mock tools. OAuth token via `CLAUDE_CODE_OAUTH_TOKEN`.
- **Frontend:** Vite + React 19 + TS + Tailwind v4 + Framer Motion.
  Deployed on Vercel.
- **Model:** `claude-haiku-4-5-20251001` via the `claude` CLI.

## Tools the agent can call

1. `lookup_invoice_status(invoice_id OR recent)`
2. `lookup_payment_status(invoice_id_or_payment_id)`
3. `search_transactions_by_vendor(vendor_name, date_range)`
4. `request_document(doc_type, details)`
5. `schedule_callback(reason, preferred_time)`
6. `escalate_to_human(reason, context)`

## Local dev

```bash
# backend
cd backend
pip install -r requirements.txt
export CLAUDE_CODE_OAUTH_TOKEN=...
export DEMO_SHARED_SECRET=localdev
export CORS_ORIGIN=http://localhost:5186
uvicorn main:app --port 8005

# frontend
cd frontend
npm install
echo "VITE_API_URL=http://localhost:8005" > .env.local
echo "VITE_DEMO_SECRET=localdev" >> .env.local
npm run dev
```
