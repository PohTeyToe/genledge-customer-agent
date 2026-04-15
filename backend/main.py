"""GenLedge Customer Agent backend.

FastAPI service that powers the customer-flow AI support demo. Single
``/chat`` endpoint drives a multi-iteration tool-calling loop against the
Claude CLI (OAuth token, not Messages API). Six mock tools let the agent
resolve common SMB accounting questions or escalate to a human.

Security layers (all enforced on ``/chat``):
  - shared-secret header ``x-demo-secret``
  - per-IP rate limit via slowapi (5/min, 30/hour)
  - CORS allowlist locked to the production Vercel origin
  - per-request CLI budget cap (``--max-budget-usd 0.10``)
  - user-message length cap (2000 chars)
  - 90s subprocess timeout
  - 4-iteration agent loop cap per user turn
"""

from __future__ import annotations

import copy
import hmac
import json
import logging
import os
import shutil
import subprocess
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address


logger = logging.getLogger("customer_agent")
logging.basicConfig(level=logging.INFO)

BACKEND_DIR = Path(__file__).resolve().parent
CUSTOMER_FILE = BACKEND_DIR / "mock_customer.json"
MODEL_ID = "claude-haiku-4-5-20251001"
CLI_TIMEOUT_SECONDS = 90
MAX_USER_MESSAGE_CHARS = 2000
MAX_BUDGET_USD = "0.10"
MAX_AGENT_ITERATIONS = 4

DEFAULT_ORIGIN = "https://genledge-customer-agent.vercel.app"
ALLOWED_ORIGIN = os.environ.get("CORS_ORIGIN", DEFAULT_ORIGIN)


with CUSTOMER_FILE.open("r", encoding="utf-8") as fh:
    BASE_CUSTOMER: Dict[str, Any] = json.load(fh)

# Per-session mutable state. Keeps new document tickets, callbacks, and
# escalations separate per session so concurrent demo users do not collide.
_SESSIONS: Dict[str, Dict[str, Any]] = {}


def _new_session_state() -> Dict[str, Any]:
    base = copy.deepcopy(BASE_CUSTOMER)
    return {
        "data": base,
        "new_tickets": [],
        "callbacks": [],
        "escalations": [],
    }


def _get_session(session_id: str) -> Dict[str, Any]:
    if session_id not in _SESSIONS:
        _SESSIONS[session_id] = _new_session_state()
    return _SESSIONS[session_id]


# ---------------------------------------------------------------------------
# Tool executors
# ---------------------------------------------------------------------------


def _tool_lookup_invoice_status(session: Dict[str, Any], args: Dict[str, Any]) -> Dict[str, Any]:
    data = session["data"]
    invoices = data["invoices"]
    invoice_id = args.get("invoice_id")
    selector = (args.get("selector") or "").lower().strip()

    if invoice_id:
        inv = next((i for i in invoices if i["id"] == invoice_id), None)
        if inv is None:
            return {"ok": False, "error": f"invoice {invoice_id} not found"}
        return {"ok": True, "invoices": [inv]}

    if selector in ("open", "outstanding"):
        matches = [i for i in invoices if i["status"] == "open"]
    elif selector in ("paid",):
        matches = [i for i in invoices if i["status"] == "paid"]
    elif selector in ("recent", "last", ""):
        matches = sorted(invoices, key=lambda i: i["issued"], reverse=True)[:5]
    elif selector == "all":
        matches = invoices
    else:
        return {"ok": False, "error": f"unknown selector '{selector}'. Use open, paid, recent, all, or pass invoice_id."}

    return {"ok": True, "invoices": matches}


def _tool_lookup_payment_status(session: Dict[str, Any], args: Dict[str, Any]) -> Dict[str, Any]:
    data = session["data"]
    payments = data["payments"]
    invoice_id = args.get("invoice_id")
    payment_id = args.get("payment_id")
    amount = args.get("amount")
    paid_around = args.get("paid_around")

    matches: List[Dict[str, Any]] = []

    if payment_id:
        matches = [p for p in payments if p["id"] == payment_id]
    elif invoice_id:
        matches = [p for p in payments if p.get("invoice_id") == invoice_id]
    else:
        matches = list(payments)

    if amount is not None:
        try:
            amt = float(amount)
            matches = [p for p in matches if abs(float(p["amount"]) - amt) < 0.01]
        except (TypeError, ValueError):
            pass

    if paid_around:
        matches = [p for p in matches if paid_around in p.get("paid_at", "")]

    unmatched = [p for p in payments if p.get("reconciliation_status") == "unmatched"]

    return {
        "ok": True,
        "matches": matches,
        "unmatched_payments_on_account": unmatched,
    }


def _tool_search_transactions_by_vendor(session: Dict[str, Any], args: Dict[str, Any]) -> Dict[str, Any]:
    data = session["data"]
    txns = data["transactions"]
    vendor_name = (args.get("vendor_name") or "").strip().lower()
    date_from = args.get("date_from")
    date_to = args.get("date_to")

    results = txns
    if vendor_name:
        results = [t for t in results if vendor_name in t["vendor"].lower()]
    if date_from:
        results = [t for t in results if t["date"] >= date_from]
    if date_to:
        results = [t for t in results if t["date"] <= date_to]

    if not results:
        return {"ok": True, "transactions": [], "total": 0.0, "count": 0}

    total = round(sum(float(t["amount"]) for t in results), 2)
    by_month: Dict[str, float] = {}
    for t in results:
        month = t["date"][:7]
        by_month[month] = round(by_month.get(month, 0.0) + float(t["amount"]), 2)

    vendor_context: Dict[str, Any] = {}
    if "stripe" in vendor_name:
        vendor_context = data.get("stripe_context", {})

    return {
        "ok": True,
        "transactions": results,
        "total": total,
        "count": len(results),
        "totals_by_month": by_month,
        "vendor_context": vendor_context,
    }


def _tool_request_document(session: Dict[str, Any], args: Dict[str, Any]) -> Dict[str, Any]:
    doc_type = (args.get("doc_type") or "").strip()
    details = (args.get("details") or "").strip()
    identity_verified = bool(args.get("identity_verified"))

    if not doc_type:
        return {"ok": False, "error": "doc_type is required"}

    sensitive_types = {"tax_receipts", "tax_documents", "bank_letter", "account_statement"}
    if doc_type in sensitive_types and not identity_verified:
        return {
            "ok": False,
            "error": "identity not verified",
            "hint": "Sensitive document requests require the customer to confirm the last 4 digits of their account id before you call this tool.",
        }

    ticket = {
        "id": f"DOC-{datetime.utcnow().strftime('%Y')}-{uuid.uuid4().hex[:4].upper()}",
        "doc_type": doc_type,
        "details": details,
        "status": "queued",
        "created": datetime.utcnow().strftime("%Y-%m-%d"),
        "eta_business_days": 2 if doc_type in sensitive_types else 1,
    }
    session["new_tickets"].append(ticket)
    return {"ok": True, "ticket": ticket}


def _tool_schedule_callback(session: Dict[str, Any], args: Dict[str, Any]) -> Dict[str, Any]:
    reason = (args.get("reason") or "").strip()
    preferred_time = (args.get("preferred_time") or "").strip()
    if not reason:
        return {"ok": False, "error": "reason is required"}

    callback = {
        "id": f"CB-{uuid.uuid4().hex[:6].upper()}",
        "reason": reason,
        "preferred_time": preferred_time or "not specified",
        "status": "scheduled",
        "accountant": session["data"]["customer"]["accountant_assigned"],
        "created_at": datetime.utcnow().isoformat(timespec="seconds") + "Z",
    }
    session["callbacks"].append(callback)
    return {"ok": True, "callback": callback}


def _tool_escalate_to_human(session: Dict[str, Any], args: Dict[str, Any]) -> Dict[str, Any]:
    reason = (args.get("reason") or "").strip()
    context = args.get("context") or {}
    priority = (args.get("priority") or "normal").strip()
    if not reason:
        return {"ok": False, "error": "reason is required"}

    esc = {
        "id": f"ESC-{uuid.uuid4().hex[:6].upper()}",
        "reason": reason,
        "priority": priority if priority in {"low", "normal", "high", "urgent"} else "normal",
        "context": context,
        "assigned_to": session["data"]["customer"]["accountant_assigned"],
        "status": "open",
        "created_at": datetime.utcnow().isoformat(timespec="seconds") + "Z",
    }
    session["escalations"].append(esc)
    return {"ok": True, "escalation": esc}


TOOL_EXECUTORS = {
    "lookup_invoice_status": _tool_lookup_invoice_status,
    "lookup_payment_status": _tool_lookup_payment_status,
    "search_transactions_by_vendor": _tool_search_transactions_by_vendor,
    "request_document": _tool_request_document,
    "schedule_callback": _tool_schedule_callback,
    "escalate_to_human": _tool_escalate_to_human,
}


# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------


def _build_system_prompt(customer_ctx: Dict[str, Any]) -> str:
    customer = customer_ctx["customer"]
    as_of = customer_ctx.get("as_of", "today")
    return (
        "You are the GenLedge customer support agent. You speak directly with a "
        "small-business customer about their own account with their accounting "
        "provider. You are helpful, concise, and never invent data that the tools "
        "do not return.\n\n"
        "You represent Maya Torres, CPA (the assigned human accountant). If you "
        "escalate, it goes to Maya.\n\n"
        "CURRENT CUSTOMER (authenticated at the start of session):\n"
        f"  Name: {customer['name']}\n"
        f"  Business: {customer['business_name']}\n"
        f"  Account id: {customer['account_id']}\n"
        f"  Email: {customer['email']}\n"
        f"  As of: {as_of}\n\n"
        "TOOLS YOU CAN CALL:\n"
        "  1. lookup_invoice_status({invoice_id}) OR ({selector: open|paid|recent|all})\n"
        "  2. lookup_payment_status({invoice_id}) OR ({payment_id}) OR ({amount, paid_around: 'YYYY-MM'})\n"
        "  3. search_transactions_by_vendor({vendor_name, date_from: 'YYYY-MM-DD', date_to: 'YYYY-MM-DD'})\n"
        "  4. request_document({doc_type, details, identity_verified: bool})\n"
        "  5. schedule_callback({reason, preferred_time})\n"
        "  6. escalate_to_human({reason, context: {...}, priority: low|normal|high|urgent})\n\n"
        "OUTPUT CONTRACT (CRITICAL):\n"
        "Every reply MUST be a single JSON object with NO prose, NO markdown "
        "fences, NO commentary. Shape:\n"
        "{\n"
        '  "reasoning": "one short sentence describing your plan for this step",\n'
        '  "tool_calls": [ {"tool": "<name>", "args": {...}}, ... ],\n'
        '  "next_step": "continue" | "respond",\n'
        '  "assistant_message": "required when next_step=respond; what the customer sees"\n'
        "}\n\n"
        "RULES:\n"
        "- Prefer calling tools before claiming any fact about the customer's account. Never guess invoice ids, amounts, or dates.\n"
        "- Use next_step='continue' after tool_calls when you need to see the results before answering. Use next_step='respond' when you have enough to reply.\n"
        "- When a customer disputes a charge, look up the invoice AND the payment history (including unmatched payments). If you find an unmatched payment that matches the disputed invoice, suggest applying it and ASK the customer to confirm before escalating.\n"
        "- Sensitive doc requests (tax_receipts, tax_documents, bank_letter, account_statement) require identity verification. Ask the customer for the last 4 digits of their account id. Only call request_document with identity_verified=true after the customer's reply matches the expected last4 given in the turn's observation context.\n"
        "- Escalate to a human if: the customer asks for something outside these tools, you have tried 2+ lookups without resolution, or the customer is frustrated.\n"
        "- Tone is warm and professional. No em dashes. No filler. Do not restate data verbatim, summarize.\n"
        "- When you call tools, say WHY in one short reasoning sentence. Do NOT put the reasoning in assistant_message.\n"
        "- Never reveal the raw JSON envelope to the customer. assistant_message is plain chat text.\n\n"
        "EXAMPLES of a valid reply with tool calls:\n"
        '{"reasoning":"Customer disputes INV-2026-0038; pull the invoice and look for matching payments.","tool_calls":[{"tool":"lookup_invoice_status","args":{"invoice_id":"INV-2026-0038"}},{"tool":"lookup_payment_status","args":{"invoice_id":"INV-2026-0038"}}],"next_step":"continue"}\n\n'
        "EXAMPLE of a valid final reply:\n"
        '{"reasoning":"Tools found the unmatched payment; confirm with customer before escalating.","tool_calls":[],"next_step":"respond","assistant_message":"Found it. There is an unmatched ACH payment of $3,425 on Mar 30 (confirmation ACH-2026-GH48). The memo did not include the invoice number, which is why it did not auto-apply to INV-2026-0038. Does that sound like the payment you sent? If yes, I will flag it for Maya to apply it today."}\n'
    )


# ---------------------------------------------------------------------------
# API models
# ---------------------------------------------------------------------------


class ChatMessage(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")
    content: str


class ChatRequest(BaseModel):
    session_id: str
    messages: List[ChatMessage]


class ToolCallEvent(BaseModel):
    iteration: int
    tool: str
    input: Dict[str, Any]
    result: Dict[str, Any]


class ChatResponse(BaseModel):
    message: str
    tool_calls: List[ToolCallEvent]
    iterations: int
    customer: Dict[str, Any]
    new_tickets: List[Dict[str, Any]]
    callbacks: List[Dict[str, Any]]
    escalations: List[Dict[str, Any]]


# ---------------------------------------------------------------------------
# Auth / rate limiting helpers
# ---------------------------------------------------------------------------


def _require_demo_secret(x_demo_secret: Optional[str] = Header(default=None)) -> None:
    expected = os.environ.get("DEMO_SHARED_SECRET", "")
    if not expected:
        raise HTTPException(status_code=503, detail="demo secret not configured")
    if not x_demo_secret or not hmac.compare_digest(x_demo_secret, expected):
        raise HTTPException(status_code=403, detail="forbidden")


limiter = Limiter(key_func=get_remote_address)


# ---------------------------------------------------------------------------
# Claude CLI invocation
# ---------------------------------------------------------------------------


def _format_prompt(
    messages: List[ChatMessage],
    observations: List[Dict[str, Any]],
) -> str:
    """Flatten chat turns plus prior-iteration tool observations into one prompt."""
    lines: List[str] = []
    for m in messages:
        tag = "User" if m.role == "user" else "Assistant"
        lines.append(f"{tag}: {m.content}")
    if observations:
        lines.append("")
        lines.append("TOOL OBSERVATIONS (results of tool_calls you made earlier this turn):")
        lines.append(json.dumps(observations, indent=2, sort_keys=True))
    lines.append("")
    lines.append("Assistant (respond with ONE JSON envelope only):")
    return "\n\n".join(lines)


def _run_claude_cli(system_prompt: str, prompt_text: str) -> Dict[str, Any]:
    cli_path = shutil.which("claude")
    if cli_path is None:
        raise HTTPException(status_code=503, detail="claude CLI not installed on the backend")

    cli_env = os.environ.copy()

    cmd = [
        cli_path,
        "--print",
        "--output-format",
        "json",
        "--model",
        MODEL_ID,
        "--system-prompt",
        system_prompt,
        "--max-budget-usd",
        MAX_BUDGET_USD,
        prompt_text,
    ]

    try:
        proc = subprocess.run(
            cmd,
            env=cli_env,
            capture_output=True,
            text=True,
            timeout=CLI_TIMEOUT_SECONDS,
            check=False,
        )
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="claude CLI timed out")

    if proc.returncode != 0:
        logger.error(
            "claude CLI exited %s; stderr=%s",
            proc.returncode,
            (proc.stderr or "")[:500],
        )
        raise HTTPException(status_code=502, detail="claude CLI failed")

    try:
        envelope = json.loads(proc.stdout)
    except json.JSONDecodeError:
        logger.error("claude CLI returned non-JSON output: %r", proc.stdout[:500])
        raise HTTPException(status_code=502, detail="claude CLI returned non-JSON")

    result_text = envelope.get("result") or ""
    usage = envelope.get("usage") if isinstance(envelope.get("usage"), dict) else None
    cost_usd = envelope.get("total_cost_usd") or envelope.get("cost_usd")

    if not result_text:
        logger.warning(
            "claude CLI returned empty 'result'; envelope keys=%s",
            sorted(envelope.keys()),
        )
        for alt in ("structured_output", "content", "text", "output"):
            val = envelope.get(alt)
            if isinstance(val, str) and val.strip():
                result_text = val
                break
            if isinstance(val, dict):
                result_text = json.dumps(val)
                break

    return {"result_text": result_text, "usage": usage, "cost_usd": cost_usd}


def _extract_json_envelope(text: str) -> Optional[Dict[str, Any]]:
    text = (text or "").strip()
    if not text:
        return None
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    depth = 0
    start = -1
    for idx, ch in enumerate(text):
        if ch == "{":
            if depth == 0:
                start = idx
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0 and start >= 0:
                candidate = text[start : idx + 1]
                try:
                    return json.loads(candidate)
                except json.JSONDecodeError:
                    start = -1
                    continue
    return None


# ---------------------------------------------------------------------------
# Agent loop
# ---------------------------------------------------------------------------


def _run_agent_turn(
    session: Dict[str, Any],
    messages: List[ChatMessage],
) -> Tuple[str, List[ToolCallEvent], int]:
    system_prompt = _build_system_prompt(session["data"])
    tool_events: List[ToolCallEvent] = []
    observations: List[Dict[str, Any]] = []
    final_message = ""

    for iteration in range(1, MAX_AGENT_ITERATIONS + 1):
        prompt_text = _format_prompt(messages, observations)
        cli = _run_claude_cli(system_prompt, prompt_text)
        envelope = _extract_json_envelope(cli["result_text"])

        if not isinstance(envelope, dict):
            logger.warning(
                "envelope parse failed on iteration %s; result_text[:300]=%r",
                iteration,
                (cli["result_text"] or "")[:300],
            )
            fallback = (cli["result_text"] or "").strip()
            final_message = fallback or (
                "I had trouble processing that. Let me get Maya on this."
            )
            return final_message, tool_events, iteration

        raw_calls = envelope.get("tool_calls") or []
        next_step = (envelope.get("next_step") or "respond").strip()
        assistant_message = (envelope.get("assistant_message") or "").strip()

        iter_observations: List[Dict[str, Any]] = []
        if isinstance(raw_calls, list):
            for call in raw_calls:
                if not isinstance(call, dict):
                    continue
                tool_name = call.get("tool")
                args = call.get("args") or {}
                if not isinstance(args, dict):
                    continue
                executor = TOOL_EXECUTORS.get(tool_name)
                if executor is None:
                    result = {"ok": False, "error": f"unknown tool {tool_name}"}
                else:
                    try:
                        result = executor(session, args)
                    except Exception as exc:  # noqa: BLE001
                        logger.exception("tool %s crashed", tool_name)
                        result = {"ok": False, "error": str(exc)}
                tool_events.append(
                    ToolCallEvent(iteration=iteration, tool=str(tool_name), input=args, result=result)
                )
                iter_observations.append({"tool": tool_name, "args": args, "result": result})

        if iter_observations:
            observations.append({"iteration": iteration, "calls": iter_observations})

        if next_step == "respond" or iteration == MAX_AGENT_ITERATIONS:
            final_message = assistant_message or (
                "I have done what I can here. Let me hand this to Maya."
            )
            return final_message, tool_events, iteration

    return final_message or "Let me hand this to Maya.", tool_events, MAX_AGENT_ITERATIONS


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------


def create_app() -> FastAPI:
    app = FastAPI(
        title="GenLedge Customer Agent API",
        description="Customer-flow AI support demo backend.",
        version="0.1.0",
    )

    app.state.limiter = limiter

    @app.exception_handler(RateLimitExceeded)
    async def _rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
        return JSONResponse(status_code=429, content={"detail": "rate limit exceeded"})

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[ALLOWED_ORIGIN],
        allow_credentials=True,
        allow_methods=["POST", "GET", "OPTIONS"],
        allow_headers=["content-type", "x-demo-secret"],
    )

    @app.get("/health")
    def health() -> Dict[str, Any]:
        return {"ok": True}

    @app.get("/customer/{session_id}", dependencies=[Depends(_require_demo_secret)])
    def get_customer(session_id: str) -> Dict[str, Any]:
        session = _get_session(session_id)
        data = session["data"]
        return {
            "customer": data["customer"],
            "company": data["company"],
            "new_tickets": session["new_tickets"],
            "callbacks": session["callbacks"],
            "escalations": session["escalations"],
        }

    @app.post("/reset/{session_id}", dependencies=[Depends(_require_demo_secret)])
    def reset(session_id: str) -> Dict[str, Any]:
        _SESSIONS.pop(session_id, None)
        _get_session(session_id)
        return {"ok": True}

    @app.post("/chat", response_model=ChatResponse, dependencies=[Depends(_require_demo_secret)])
    @limiter.limit("5/minute")
    @limiter.limit("30/hour")
    def chat(request: Request, req: ChatRequest) -> ChatResponse:
        for m in req.messages:
            if m.role == "user" and len(m.content) > MAX_USER_MESSAGE_CHARS:
                raise HTTPException(
                    status_code=413,
                    detail=f"user message exceeds {MAX_USER_MESSAGE_CHARS} chars",
                )

        session = _get_session(req.session_id)
        client_ip = get_remote_address(request)
        t0 = time.monotonic()
        message, tool_events, iterations = _run_agent_turn(session, req.messages)
        duration_ms = int((time.monotonic() - t0) * 1000)

        logger.info(
            "chat ip=%s session=%s duration_ms=%s iterations=%s tool_calls=%s",
            client_ip,
            req.session_id,
            duration_ms,
            iterations,
            len(tool_events),
        )

        data = session["data"]
        return ChatResponse(
            message=message,
            tool_calls=tool_events,
            iterations=iterations,
            customer=data["customer"],
            new_tickets=session["new_tickets"],
            callbacks=session["callbacks"],
            escalations=session["escalations"],
        )

    return app


app = create_app()
