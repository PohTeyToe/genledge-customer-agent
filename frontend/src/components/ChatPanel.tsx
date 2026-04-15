import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { CornerDownLeft, RefreshCw } from "lucide-react";
import type { ChatMessage } from "../lib/types";
import { ToolTrace } from "./ToolTrace";
import { ScenarioButtons } from "./ScenarioButtons";

interface Props {
  messages: ChatMessage[];
  input: string;
  onInputChange: (v: string) => void;
  onSend: () => void;
  onQuickPrompt: (prompt: string) => void;
  onReset: () => void;
  loading: boolean;
  error: string | null;
}

export function ChatPanel({
  messages,
  input,
  onInputChange,
  onSend,
  onQuickPrompt,
  onReset,
  loading,
  error,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!loading && input.trim()) onSend();
    }
  };

  const showEmpty = messages.length === 0;

  return (
    <section className="flex flex-col h-full bg-white/60">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto scrollbar-thin px-4 py-5 min-h-0"
      >
        <div className="max-w-3xl mx-auto space-y-4">
          {showEmpty && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-slate-200 bg-white p-4"
            >
              <div className="text-[13px] text-slate-700 leading-relaxed">
                Hi Sarah, this is your AI support assistant. I can look up
                invoices and payments, search your transactions, request
                documents from Maya, and escalate anything I cannot resolve.
                Pick one of the prompts below or type your own question.
              </div>
            </motion.div>
          )}

          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className={m.role === "user" ? "flex justify-end" : "flex"}
            >
              <div
                className={
                  m.role === "user"
                    ? "bg-sky-500 text-white text-[13.5px] leading-relaxed rounded-2xl rounded-br-sm px-3.5 py-2.5 max-w-[85%] shadow-sm"
                    : "max-w-[92%]"
                }
              >
                {m.role === "assistant" ? (
                  <div>
                    <div className="rounded-2xl rounded-bl-sm bg-white border border-slate-200 px-3.5 py-2.5 text-[13.5px] leading-relaxed text-slate-800 whitespace-pre-wrap shadow-sm">
                      {m.content}
                    </div>
                    {m.tool_calls && m.tool_calls.length > 0 && (
                      <ToolTrace
                        events={m.tool_calls}
                        iterations={m.iterations}
                      />
                    )}
                  </div>
                ) : (
                  m.content
                )}
              </div>
            </motion.div>
          ))}

          {loading && (
            <div className="flex">
              <div className="rounded-2xl rounded-bl-sm bg-white border border-slate-200 px-3.5 py-3 text-[12px] text-slate-500 shadow-sm">
                <span className="inline-flex items-center gap-1 dot-pulse">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                </span>
                <span className="ml-2">working on it</span>
              </div>
            </div>
          )}

          {error && (
            <div className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-slate-200 bg-white/80 backdrop-blur px-4 py-3 shrink-0">
        <div className="max-w-3xl mx-auto space-y-3">
          {showEmpty && (
            <ScenarioButtons onPick={onQuickPrompt} disabled={loading} />
          )}
          <div className="relative">
            <textarea
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Type a message..."
              rows={2}
              disabled={loading}
              className="w-full bg-white border border-slate-200 rounded-xl pl-3.5 pr-20 py-2.5 text-[14px] text-slate-900 placeholder:text-slate-400 resize-none focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:opacity-60"
            />
            <div className="absolute right-2 bottom-2 flex items-center gap-1">
              <button
                onClick={onReset}
                disabled={loading}
                title="Reset conversation"
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition disabled:opacity-40"
              >
                <RefreshCw className="w-3.5 h-3.5" strokeWidth={2.2} />
              </button>
              <button
                onClick={onSend}
                disabled={loading || !input.trim()}
                className="p-1.5 rounded-md bg-sky-500 hover:bg-sky-600 text-white disabled:opacity-30 transition"
                title="Send (Enter)"
              >
                <CornerDownLeft className="w-3.5 h-3.5" strokeWidth={2.2} />
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>Powered by Claude Haiku 4.5</span>
            <span>Demo only. Mock data. No real accounts touched.</span>
          </div>
        </div>
      </div>
    </section>
  );
}
