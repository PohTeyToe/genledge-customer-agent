import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Wrench } from "lucide-react";
import type { ToolCallEvent } from "../lib/types";

const TOOL_LABELS: Record<string, string> = {
  lookup_invoice_status: "Look up invoices",
  lookup_payment_status: "Look up payments",
  search_transactions_by_vendor: "Search transactions",
  request_document: "File document request",
  schedule_callback: "Schedule callback",
  escalate_to_human: "Escalate to accountant",
};

function labelFor(tool: string): string {
  return TOOL_LABELS[tool] ?? tool;
}

function summarize(event: ToolCallEvent): string {
  const r = event.result as Record<string, unknown>;
  if (r.ok === false) return String(r.error ?? "error");
  if (event.tool === "lookup_invoice_status") {
    const n = Array.isArray(r.invoices) ? r.invoices.length : 0;
    return `${n} invoice${n === 1 ? "" : "s"}`;
  }
  if (event.tool === "lookup_payment_status") {
    const m = Array.isArray(r.matches) ? r.matches.length : 0;
    const u = Array.isArray(r.unmatched_payments_on_account)
      ? (r.unmatched_payments_on_account as unknown[]).length
      : 0;
    return `${m} match${m === 1 ? "" : "es"}, ${u} unmatched on file`;
  }
  if (event.tool === "search_transactions_by_vendor") {
    return `${r.count ?? 0} txns, $${r.total ?? 0}`;
  }
  if (event.tool === "request_document") {
    const t = r.ticket as Record<string, unknown> | undefined;
    return t ? `ticket ${t.id}` : "queued";
  }
  if (event.tool === "schedule_callback") {
    const c = r.callback as Record<string, unknown> | undefined;
    return c ? `callback ${c.id}` : "scheduled";
  }
  if (event.tool === "escalate_to_human") {
    const e = r.escalation as Record<string, unknown> | undefined;
    return e ? `escalation ${e.id}` : "escalated";
  }
  return "ok";
}

interface Props {
  events: ToolCallEvent[];
  iterations?: number;
}

export function ToolTrace({ events, iterations }: Props) {
  const [open, setOpen] = useState(false);
  if (!events.length) return null;

  return (
    <div className="mt-2 border-l-2 border-slate-200 pl-3 text-[11px] text-slate-500">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 hover:text-slate-800 transition"
      >
        <Wrench className="w-3 h-3 text-sky-500" strokeWidth={2.2} />
        <span className="font-medium">
          {events.length} tool call{events.length === 1 ? "" : "s"}
          {iterations ? ` across ${iterations} step${iterations === 1 ? "" : "s"}` : null}
        </span>
        <ChevronDown
          className={`w-3 h-3 transition ${open ? "rotate-180" : ""}`}
          strokeWidth={2.2}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ol
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden mt-1.5 space-y-1"
          >
            {events.map((evt, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 font-mono text-[11px]"
              >
                <span className="text-slate-300 w-6 shrink-0">
                  #{evt.iteration}.{idx + 1}
                </span>
                <span className="text-sky-700 font-semibold">
                  {labelFor(evt.tool)}
                </span>
                <span className="text-slate-400 truncate">
                  {summarize(evt)}
                </span>
              </li>
            ))}
          </motion.ol>
        )}
      </AnimatePresence>
    </div>
  );
}
