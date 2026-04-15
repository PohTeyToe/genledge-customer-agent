import { MessageSquareText, ShieldCheck } from "lucide-react";
import type { Customer } from "../lib/types";

interface Props {
  customer: Customer | null;
}

export function IdentityBanner({ customer }: Props) {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-10">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center text-white shadow-sm">
          <MessageSquareText className="w-4.5 h-4.5" strokeWidth={2.2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-slate-900 leading-tight">
            GenLedge Support
          </div>
          <div className="text-[11px] text-slate-500 leading-tight">
            AI assistant for {customer?.accountant_assigned ?? "your accountant"}
          </div>
        </div>
        {customer && (
          <div className="hidden sm:flex items-center gap-2 bg-slate-100 rounded-full px-3 py-1.5 text-[11px] text-slate-700">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2.2} />
            <span className="font-medium">{customer.name}</span>
            <span className="text-slate-400">&middot;</span>
            <span className="font-mono text-slate-500">
              {customer.account_id}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
