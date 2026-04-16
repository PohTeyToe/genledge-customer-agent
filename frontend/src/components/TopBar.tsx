import { motion } from "framer-motion";
import {
  BookOpen,
  ClipboardList,
  MessageCircle,
  MessageSquareText,
  ShieldCheck,
} from "lucide-react";
import type { Customer } from "../lib/types";

export type TabId = "customer" | "whatsapp" | "accountant" | "about";

const TABS: Array<{ id: TabId; label: string; icon: typeof MessageSquareText }> = [
  { id: "customer", label: "Customer chat", icon: MessageSquareText },
  { id: "whatsapp", label: "WhatsApp view", icon: MessageCircle },
  { id: "accountant", label: "Accountant queue", icon: ClipboardList },
  { id: "about", label: "How it was built", icon: BookOpen },
];

interface Props {
  customer: Customer | null;
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export function TopBar({ customer, activeTab, onTabChange }: Props) {
  const showIdentity = activeTab === "customer" || activeTab === "whatsapp";
  return (
    <header className="border-b border-slate-200 bg-white/85 backdrop-blur sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center text-white shadow-sm shrink-0">
          <MessageSquareText className="w-4.5 h-4.5" strokeWidth={2.2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-slate-900 leading-tight">
            GenLedge Support
          </div>
          <div className="text-[11px] text-slate-500 leading-tight truncate">
            AI assistant for {customer?.accountant_assigned ?? "your accountant"}
          </div>
        </div>
        {showIdentity && customer && (
          <div className="hidden md:flex items-center gap-2 bg-slate-100 rounded-full px-3 py-1.5 text-[11px] text-slate-700 shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2.2} />
            <span className="font-medium">{customer.name}</span>
            <span className="text-slate-400">&middot;</span>
            <span className="font-mono text-slate-500">{customer.account_id}</span>
          </div>
        )}
      </div>
      <nav className="max-w-5xl mx-auto px-4 flex gap-1 overflow-x-auto scrollbar-thin">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium transition whitespace-nowrap ${
                isActive
                  ? "text-slate-900"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Icon className="w-3.5 h-3.5" strokeWidth={2.2} />
              {tab.label}
              {isActive && (
                <motion.div
                  layoutId="tab-underline"
                  className="absolute inset-x-2 -bottom-px h-0.5 bg-sky-500 rounded-full"
                />
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
