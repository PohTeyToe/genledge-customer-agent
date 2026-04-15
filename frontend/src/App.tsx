import { useEffect, useState } from "react";
import { IdentityBanner } from "./components/IdentityBanner";
import { ChatPanel } from "./components/ChatPanel";
import { fetchCustomer, resetSession, sendChat } from "./lib/api";
import type { ChatMessage, Customer } from "./lib/types";

function makeSessionId(): string {
  const key = "genledge_customer_agent_session";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const fresh = `s_${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(key, fresh);
  return fresh;
}

export default function App() {
  const [sessionId] = useState(() => makeSessionId());
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchCustomer(sessionId)
      .then((state) => {
        if (!cancelled) setCustomer(state.customer);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    setError(null);
    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setLoading(true);
    try {
      const resp = await sendChat(
        sessionId,
        history.map((m) => ({ role: m.role, content: m.content })),
      );
      const assistant: ChatMessage = {
        role: "assistant",
        content: resp.message,
        tool_calls: resp.tool_calls,
        iterations: resp.iterations,
      };
      setMessages((prev) => [...prev, assistant]);
      setCustomer(resp.customer);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const onReset = async () => {
    if (loading) return;
    try {
      await resetSession(sessionId);
    } catch {
      /* ignore; still clear locally */
    }
    setMessages([]);
    setError(null);
    setInput("");
  };

  return (
    <div className="h-full flex flex-col">
      <IdentityBanner customer={customer} />
      <main className="flex-1 min-h-0">
        <ChatPanel
          messages={messages}
          input={input}
          onInputChange={setInput}
          onSend={() => send(input)}
          onQuickPrompt={(p) => send(p)}
          onReset={onReset}
          loading={loading}
          error={error}
        />
      </main>
    </div>
  );
}
