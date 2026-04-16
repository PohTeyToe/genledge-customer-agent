import { useEffect, useState } from "react";
import { TopBar } from "./components/TopBar";
import type { TabId } from "./components/TopBar";
import { ChatPanel } from "./components/ChatPanel";
import { WhatsAppView } from "./components/WhatsAppView";
import { AccountantView } from "./components/AccountantView";
import { CaseStudyView } from "./components/CaseStudyView";
import { fetchCustomer, resetSession, sendChat, warmup } from "./lib/api";
import type { ChatMessage, Customer } from "./lib/types";

function makeSessionId(): string {
  const key = "genledge_customer_agent_session";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const fresh = `s_${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(key, fresh);
  return fresh;
}

function getInitialTab(): TabId {
  if (typeof window === "undefined") return "customer";
  const hash = window.location.hash.replace("#", "");
  if (
    hash === "customer" ||
    hash === "whatsapp" ||
    hash === "accountant" ||
    hash === "about"
  ) {
    return hash;
  }
  return "customer";
}

export default function App() {
  const [sessionId] = useState(() => makeSessionId());
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>(() => getInitialTab());
  const [accountantRefresh, setAccountantRefresh] = useState(0);

  useEffect(() => {
    warmup();
  }, []);

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash !== `#${activeTab}`) {
      window.history.replaceState(null, "", `#${activeTab}`);
    }
  }, [activeTab]);

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
        steps: resp.steps,
        iterations: resp.iterations,
      };
      setMessages((prev) => [...prev, assistant]);
      setCustomer(resp.customer);
      setAccountantRefresh((n) => n + 1);
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
    setAccountantRefresh((n) => n + 1);
  };

  const sharedChatProps = {
    messages,
    input,
    onInputChange: setInput,
    onSend: () => send(input),
    onQuickPrompt: (p: string) => send(p),
    onReset,
    loading,
    error,
  };

  return (
    <div className="h-full flex flex-col">
      <TopBar
        customer={customer}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      <main className="flex-1 min-h-0 overflow-y-auto">
        {activeTab === "customer" && <ChatPanel {...sharedChatProps} />}
        {activeTab === "whatsapp" && <WhatsAppView {...sharedChatProps} />}
        {activeTab === "accountant" && (
          <AccountantView
            sessionId={sessionId}
            customer={customer}
            refreshTrigger={accountantRefresh}
          />
        )}
        {activeTab === "about" && <CaseStudyView />}
      </main>
    </div>
  );
}
