import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  FileSearch,
  Receipt,
  TrendingUp,
  UserRound,
  Wallet,
} from "lucide-react";
import type { ToolCallEvent } from "../lib/types";

const TOOL_META: Record<
  string,
  { label: string; icon: typeof Receipt; tone: string }
> = {
  lookup_invoice_status: {
    label: "lookup_invoice_status",
    icon: Receipt,
    tone: "sky",
  },
  lookup_payment_status: {
    label: "lookup_payment_status",
    icon: Wallet,
    tone: "sky",
  },
  search_transactions_by_vendor: {
    label: "search_transactions_by_vendor",
    icon: TrendingUp,
    tone: "sky",
  },
  request_document: {
    label: "request_document",
    icon: FileSearch,
    tone: "violet",
  },
  schedule_callback: {
    label: "schedule_callback",
    icon: CalendarClock,
    tone: "emerald",
  },
  escalate_to_human: {
    label: "escalate_to_human",
    icon: UserRound,
    tone: "amber",
  },
};

function fmtMoney(n: unknown): string {
  const v = typeof n === "number" ? n : parseFloat(String(n));
  if (Number.isNaN(v)) return String(n);
  return v.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

function InvoiceList({ invoices }: { invoices: Array<Record<string, unknown>> }) {
  if (!invoices.length) {
    return <div className="text-[11px] text-slate-500">No invoices match.</div>;
  }
  return (
    <div className="space-y-1.5">
      {invoices.slice(0, 6).map((inv, i) => {
        const status = String(inv.status ?? "");
        const isOpen = status === "open";
        return (
          <div
            key={i}
            className="flex items-center gap-2 bg-white rounded-md border border-slate-100 px-2 py-1.5"
          >
            <span className="font-mono text-[11px] text-slate-700 min-w-[92px]">
              {String(inv.id ?? "")}
            </span>
            <span className="text-[11px] text-slate-500 flex-1 truncate">
              {String(inv.description ?? "")}
            </span>
            <span className="text-[11px] tabular font-semibold text-slate-900">
              {fmtMoney(inv.amount)}
            </span>
            <span
              className={`text-[10px] uppercase font-semibold tracking-wide rounded-full px-2 py-0.5 ${
                isOpen
                  ? "bg-amber-100 text-amber-800"
                  : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {status}
            </span>
          </div>
        );
      })}
      {invoices.length > 6 && (
        <div className="text-[10px] text-slate-400 pl-1">
          +{invoices.length - 6} more
        </div>
      )}
    </div>
  );
}

function PaymentList({
  result,
}: {
  result: Record<string, unknown>;
}) {
  const matches = Array.isArray(result.matches)
    ? (result.matches as Array<Record<string, unknown>>)
    : [];
  const unmatched = Array.isArray(result.unmatched_payments_on_account)
    ? (result.unmatched_payments_on_account as Array<Record<string, unknown>>)
    : [];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 text-[11px] text-slate-500">
        <span>
          <span className="font-semibold text-slate-700">{matches.length}</span>{" "}
          match{matches.length === 1 ? "" : "es"}
        </span>
        <span>
          <span
            className={`font-semibold ${
              unmatched.length ? "text-amber-700" : "text-slate-700"
            }`}
          >
            {unmatched.length}
          </span>{" "}
          unmatched on file
        </span>
      </div>
      {unmatched.length > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-2 space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
            <AlertCircle className="w-3 h-3" strokeWidth={2.4} />
            Unmatched payments
          </div>
          {unmatched.map((p, i) => (
            <div key={i} className="flex items-center gap-2 text-[11px]">
              <span className="font-mono text-amber-900">
                {String(p.confirmation ?? p.id ?? "")}
              </span>
              <span className="text-slate-500">{String(p.paid_at ?? "")}</span>
              <span className="text-slate-500">{String(p.method ?? "")}</span>
              <span className="ml-auto font-semibold text-amber-900 tabular">
                {fmtMoney(p.amount)}
              </span>
            </div>
          ))}
        </div>
      )}
      {matches.slice(0, 3).map((p, i) => (
        <div
          key={i}
          className="flex items-center gap-2 text-[11px] bg-white rounded-md border border-slate-100 px-2 py-1.5"
        >
          <span className="font-mono text-slate-700">
            {String(p.confirmation ?? p.id ?? "")}
          </span>
          <span className="text-slate-500">{String(p.paid_at ?? "")}</span>
          <span className="text-slate-500">{String(p.method ?? "")}</span>
          <span className="ml-auto font-semibold text-slate-900 tabular">
            {fmtMoney(p.amount)}
          </span>
        </div>
      ))}
    </div>
  );
}

function TxnSummary({
  result,
}: {
  result: Record<string, unknown>;
}) {
  const total = Number(result.total ?? 0);
  const count = Number(result.count ?? 0);
  const byMonth = (result.totals_by_month as Record<string, number>) ?? {};
  const months = Object.keys(byMonth).sort();
  const max = Math.max(1, ...Object.values(byMonth));

  return (
    <div className="space-y-2">
      <div className="flex gap-4 text-[11px] text-slate-500">
        <span>
          <span className="font-semibold text-slate-700 tabular">{count}</span>{" "}
          transactions
        </span>
        <span>
          Total{" "}
          <span className="font-semibold text-slate-700 tabular">
            {fmtMoney(total)}
          </span>
        </span>
      </div>
      {months.length > 0 && (
        <div className="space-y-1">
          {months.map((m) => {
            const v = byMonth[m];
            const pct = (v / max) * 100;
            return (
              <div key={m} className="flex items-center gap-2 text-[10px]">
                <span className="font-mono text-slate-500 w-14">{m}</span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6 }}
                    className="h-full bg-gradient-to-r from-sky-400 to-cyan-400"
                  />
                </div>
                <span className="font-semibold text-slate-700 tabular w-16 text-right">
                  {fmtMoney(v)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TicketCard({
  result,
  keyName,
  tone,
}: {
  result: Record<string, unknown>;
  keyName: "ticket" | "callback" | "escalation";
  tone: "violet" | "emerald" | "amber";
}) {
  const item = result[keyName] as Record<string, unknown> | undefined;
  if (!item) return null;
  const toneCls =
    tone === "violet"
      ? "border-violet-200 bg-violet-50 text-violet-900"
      : tone === "emerald"
        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
        : "border-amber-200 bg-amber-50 text-amber-900";
  return (
    <div className={`rounded-md border px-2.5 py-2 space-y-0.5 ${toneCls}`}>
      <div className="flex items-center gap-2 text-[11px]">
        <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2.4} />
        <span className="font-mono font-semibold">
          {String(item.id ?? "")}
        </span>
        <span className="ml-auto text-[10px] uppercase tracking-wide opacity-80">
          {String(item.status ?? "")}
        </span>
      </div>
      {Object.entries(item)
        .filter(([k]) => !["id", "status", "created_at", "created"].includes(k))
        .slice(0, 4)
        .map(([k, v]) => (
          <div key={k} className="text-[10.5px] flex gap-2">
            <span className="opacity-70 w-24 shrink-0">{k.replace(/_/g, " ")}</span>
            <span className="font-medium truncate">
              {typeof v === "object" ? JSON.stringify(v) : String(v)}
            </span>
          </div>
        ))}
    </div>
  );
}

function ErrorBox({ result }: { result: Record<string, unknown> }) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] text-red-800 flex items-start gap-2">
      <AlertCircle className="w-3.5 h-3.5 mt-0.5" strokeWidth={2.4} />
      <span>{String(result.error ?? "error")}</span>
    </div>
  );
}

function ResultPreview({ event }: { event: ToolCallEvent }) {
  const r = event.result;
  if (r && r.ok === false) return <ErrorBox result={r} />;
  if (event.tool === "lookup_invoice_status") {
    const invs = Array.isArray(r?.invoices)
      ? (r.invoices as Array<Record<string, unknown>>)
      : [];
    return <InvoiceList invoices={invs} />;
  }
  if (event.tool === "lookup_payment_status") {
    return <PaymentList result={r as Record<string, unknown>} />;
  }
  if (event.tool === "search_transactions_by_vendor") {
    return <TxnSummary result={r as Record<string, unknown>} />;
  }
  if (event.tool === "request_document") {
    return (
      <TicketCard
        result={r as Record<string, unknown>}
        keyName="ticket"
        tone="violet"
      />
    );
  }
  if (event.tool === "schedule_callback") {
    return (
      <TicketCard
        result={r as Record<string, unknown>}
        keyName="callback"
        tone="emerald"
      />
    );
  }
  if (event.tool === "escalate_to_human") {
    return (
      <TicketCard
        result={r as Record<string, unknown>}
        keyName="escalation"
        tone="amber"
      />
    );
  }
  return null;
}

function InputChip({ input }: { input: Record<string, unknown> }) {
  const entries = Object.entries(input).slice(0, 3);
  if (!entries.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {entries.map(([k, v]) => {
        const val = typeof v === "object" ? JSON.stringify(v) : String(v);
        return (
          <span
            key={k}
            className="font-mono text-[10px] bg-slate-100 text-slate-600 rounded px-1.5 py-0.5"
          >
            <span className="text-slate-400">{k}:</span> {val}
          </span>
        );
      })}
    </div>
  );
}

interface Props {
  event: ToolCallEvent;
}

export function ToolCard({ event }: Props) {
  const meta = TOOL_META[event.tool] ?? {
    label: event.tool,
    icon: ArrowUpRight,
    tone: "slate",
  };
  const Icon = meta.icon;
  const toneBg =
    meta.tone === "violet"
      ? "bg-violet-50 text-violet-600 border-violet-200"
      : meta.tone === "emerald"
        ? "bg-emerald-50 text-emerald-600 border-emerald-200"
        : meta.tone === "amber"
          ? "bg-amber-50 text-amber-600 border-amber-200"
          : "bg-sky-50 text-sky-600 border-sky-200";

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-2.5 space-y-1.5">
      <div className="flex items-center gap-2">
        <div className={`w-6 h-6 rounded-md flex items-center justify-center border ${toneBg}`}>
          <Icon className="w-3.5 h-3.5" strokeWidth={2.2} />
        </div>
        <span className="font-mono text-[11px] text-slate-700 font-semibold">
          {meta.label}
        </span>
        <span className="text-[10px] text-slate-400 ml-auto tabular">
          {event.duration_ms ?? 0} ms
        </span>
      </div>
      <InputChip input={event.input} />
      <div className="pt-0.5">
        <ResultPreview event={event} />
      </div>
    </div>
  );
}
