import { motion } from "framer-motion";
import { Brain, Check } from "lucide-react";
import type { AgentStep } from "../lib/types";
import { ToolCard } from "./ToolCard";

interface Props {
  steps: AgentStep[];
  live?: boolean;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.18, delayChildren: 0.1 },
  },
};

const stepVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const toolContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.05 },
  },
};

const toolItem = {
  hidden: { opacity: 0, y: 6, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.25 } },
};

export function AgentTrace({ steps }: Props) {
  if (!steps.length) return null;
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="rounded-2xl border border-slate-200 bg-white/70 px-3.5 py-3 space-y-3"
    >
      <div className="flex items-center gap-2 text-[11px] text-slate-500">
        <div className="w-5 h-5 rounded-md bg-sky-500/10 text-sky-600 flex items-center justify-center">
          <Brain className="w-3 h-3" strokeWidth={2.4} />
        </div>
        <span className="font-semibold text-slate-700">Agent activity</span>
        <span className="text-slate-400">&middot;</span>
        <span>
          {steps.length} step{steps.length === 1 ? "" : "s"},{" "}
          {steps.reduce((n, s) => n + s.tool_calls.length, 0)} tool call
          {steps.reduce((n, s) => n + s.tool_calls.length, 0) === 1 ? "" : "s"}
        </span>
      </div>

      <ol className="space-y-3">
        {steps.map((step) => (
          <motion.li
            key={step.iteration}
            variants={stepVariants}
            className="relative pl-6"
          >
            <div className="absolute left-0 top-0 w-5 h-5 rounded-full bg-sky-500 text-white text-[10px] font-bold flex items-center justify-center tabular">
              {step.iteration}
            </div>
            {step.reasoning && (
              <div className="text-[12px] text-slate-700 italic leading-snug mb-1.5">
                &ldquo;{step.reasoning}&rdquo;
              </div>
            )}
            {step.tool_calls.length > 0 ? (
              <motion.div
                variants={toolContainer}
                initial="hidden"
                animate="show"
                className="space-y-1.5"
              >
                {step.tool_calls.map((evt, i) => (
                  <motion.div key={i} variants={toolItem}>
                    <ToolCard event={evt} />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Check className="w-3 h-3 text-emerald-500" strokeWidth={2.4} />
                No tool calls in this step, responding to customer.
              </div>
            )}
          </motion.li>
        ))}
      </ol>
    </motion.div>
  );
}
