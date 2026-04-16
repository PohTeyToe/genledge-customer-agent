import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, MoreVertical, Paperclip, Phone, Send, Video } from "lucide-react";
import type { ChatMessage } from "../lib/types";
import { SCENARIOS } from "./ScenarioButtons";
import { AgentTrace } from "./AgentTrace";

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

const WA_BG =
  "bg-[#0b141a] [background-image:radial-gradient(rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:18px_18px]";

function timeNow(): string {
  const d = new Date();
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function WhatsAppView({
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
    <div className="flex justify-center py-6 px-2 min-h-full">
      <div className="w-full max-w-[400px]">
        <div className="text-center text-[10px] text-slate-400 mb-2">
          Mock WhatsApp view. Same agent backend, channel-aware UI shell.
        </div>
        <div className="rounded-[36px] border-[10px] border-slate-900 bg-slate-900 shadow-2xl overflow-hidden">
          <div className="rounded-t-[26px] bg-[#075e54] px-3 py-2.5 flex items-center gap-2 text-white">
            <ArrowLeft className="w-4 h-4 opacity-80" strokeWidth={2.2} />
            <div className="w-8 h-8 rounded-full bg-emerald-300 flex items-center justify-center text-emerald-900 font-bold text-[12px]">
              GL
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold leading-tight">
                GenLedge Support
              </div>
              <div className="text-[10px] opacity-80">
                {loading ? "typing..." : "online"}
              </div>
            </div>
            <Video className="w-4 h-4 opacity-80" strokeWidth={2.2} />
            <Phone className="w-4 h-4 opacity-80" strokeWidth={2.2} />
            <MoreVertical className="w-4 h-4 opacity-80" strokeWidth={2.2} />
          </div>

          <div
            ref={scrollRef}
            className={`${WA_BG} px-3 py-3 h-[460px] overflow-y-auto scrollbar-thin space-y-2`}
          >
            {showEmpty && (
              <div className="text-center text-[10px] text-emerald-200/70 bg-emerald-900/30 rounded-md py-2 px-3 mx-auto max-w-[80%]">
                Today
              </div>
            )}
            {showEmpty && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-[#1f2c33] text-slate-100 text-[12.5px] leading-snug rounded-lg rounded-tl-sm px-3 py-2 max-w-[88%] shadow"
              >
                Hi Sarah, this is your AI support assistant. Tap a starter
                below or text me a question.
                <div className="text-[9px] text-slate-400 text-right mt-0.5">
                  {timeNow()}
                </div>
              </motion.div>
            )}
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className={m.role === "user" ? "flex justify-end" : ""}
              >
                {m.role === "user" ? (
                  <div className="bg-[#005c4b] text-slate-100 text-[12.5px] leading-snug rounded-lg rounded-tr-sm px-3 py-2 max-w-[85%] shadow">
                    {m.content}
                    <div className="text-[9px] text-slate-300 text-right mt-0.5">
                      {timeNow()}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-w-full">
                    {m.steps && m.steps.length > 0 && (
                      <div className="bg-[#1f2c33]/90 rounded-lg p-2 text-slate-200">
                        <AgentTrace steps={m.steps} />
                      </div>
                    )}
                    <div className="bg-[#1f2c33] text-slate-100 text-[12.5px] leading-snug rounded-lg rounded-tl-sm px-3 py-2 max-w-[88%] shadow whitespace-pre-wrap">
                      {m.content}
                      <div className="text-[9px] text-slate-400 text-right mt-0.5">
                        {timeNow()}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
            {loading && (
              <div className="flex">
                <div className="bg-[#1f2c33] text-slate-300 text-[11px] rounded-lg rounded-tl-sm px-3 py-2 shadow">
                  <span className="inline-flex dot-pulse gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-300 rounded-full" />
                    <span className="w-1.5 h-1.5 bg-emerald-300 rounded-full" />
                    <span className="w-1.5 h-1.5 bg-emerald-300 rounded-full" />
                  </span>
                </div>
              </div>
            )}
            {error && (
              <div className="text-[11px] text-red-200 bg-red-900/40 rounded-md px-2.5 py-1.5">
                {error}
              </div>
            )}
          </div>

          {showEmpty && (
            <div className="bg-[#0b141a] px-2 pt-2 pb-1 flex gap-1 overflow-x-auto scrollbar-thin">
              {SCENARIOS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onQuickPrompt(s.prompt)}
                  disabled={loading}
                  className="text-[10.5px] text-emerald-200 bg-emerald-900/40 border border-emerald-700/50 rounded-full px-2.5 py-1 whitespace-nowrap hover:bg-emerald-800/40 transition disabled:opacity-50"
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}

          <div className="bg-[#0b141a] px-2 py-2 flex items-end gap-2">
            <Paperclip className="w-5 h-5 text-slate-400 shrink-0 mb-1.5" strokeWidth={2.2} />
            <textarea
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Message"
              rows={1}
              disabled={loading}
              className="flex-1 bg-[#1f2c33] text-slate-100 text-[12.5px] rounded-2xl px-3 py-2 placeholder:text-slate-500 resize-none focus:outline-none disabled:opacity-60 max-h-24"
            />
            <button
              onClick={onSend}
              disabled={loading || !input.trim()}
              className="w-9 h-9 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white shrink-0 flex items-center justify-center disabled:opacity-40 transition"
              title="Send"
            >
              <Send className="w-4 h-4" strokeWidth={2.2} />
            </button>
          </div>
        </div>
        <div className="mt-3 flex justify-center gap-2 text-[10px]">
          <button
            onClick={onReset}
            className="text-slate-500 hover:text-slate-800 underline-offset-2 hover:underline"
          >
            Reset conversation
          </button>
          <span className="text-slate-300">|</span>
          <span className="text-slate-400">
            Real Meta WhatsApp wiring would route this through their Cloud API.
          </span>
        </div>
      </div>
    </div>
  );
}
