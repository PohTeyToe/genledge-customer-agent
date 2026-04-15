import { motion } from "framer-motion";
import { FileSearch, Receipt, TrendingUp } from "lucide-react";

export interface Scenario {
  id: string;
  label: string;
  prompt: string;
  icon: "receipt" | "doc" | "trend";
  hint: string;
}

export const SCENARIOS: Scenario[] = [
  {
    id: "dispute",
    label: "I paid this, why is it still charged?",
    prompt:
      "Hey, I already paid my March invoice but my dashboard still shows it as open. Can you check?",
    icon: "receipt",
    hint: "Dispute flow",
  },
  {
    id: "tax-docs",
    label: "Send me my 2025 tax receipts",
    prompt:
      "Can you send me my 2025 tax receipts? I need them for my personal filing.",
    icon: "doc",
    hint: "Verified document request",
  },
  {
    id: "stripe",
    label: "Why did my Stripe fees go up?",
    prompt:
      "My Stripe fees look way higher this month than last. Can you explain what happened?",
    icon: "trend",
    hint: "Transaction analysis",
  },
];

const ICONS = {
  receipt: Receipt,
  doc: FileSearch,
  trend: TrendingUp,
};

interface Props {
  onPick: (prompt: string) => void;
  disabled: boolean;
}

export function ScenarioButtons({ onPick, disabled }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      {SCENARIOS.map((s) => {
        const Icon = ICONS[s.icon];
        return (
          <motion.button
            key={s.id}
            onClick={() => onPick(s.prompt)}
            disabled={disabled}
            whileHover={{ y: -1 }}
            className="text-left rounded-xl border border-slate-200 bg-white p-3 hover:border-sky-300 hover:shadow-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-md bg-sky-50 text-sky-600 flex items-center justify-center">
                <Icon className="w-3.5 h-3.5" strokeWidth={2.2} />
              </div>
              <span className="text-[10px] uppercase tracking-wide font-semibold text-slate-400">
                {s.hint}
              </span>
            </div>
            <div className="text-[13px] leading-snug text-slate-800 font-medium">
              {s.label}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
