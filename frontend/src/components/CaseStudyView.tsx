import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Brain,
  Code2,
  Compass,
  GitBranch,
  Link as Github,
  MessageSquare,
  Rocket,
  ShieldCheck,
  Wrench,
} from "lucide-react";

const containerAnim = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemAnim = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export function CaseStudyView() {
  return (
    <motion.div
      variants={containerAnim}
      initial="hidden"
      animate="show"
      className="max-w-3xl mx-auto px-4 py-8 space-y-10 text-slate-800"
    >
      <motion.section variants={itemAnim} className="space-y-3">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-sky-600">
          <Compass className="w-3.5 h-3.5" strokeWidth={2.4} />
          How this was built
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">
          Customer support agent for GenLedge, built in two days against a live
          founder brief.
        </h1>
        <p className="text-[14px] text-slate-600 leading-relaxed">
          Kulwant Yadav, GenLedge founder, accepted a LinkedIn connect Tuesday
          afternoon and proposed a working trial: build a customer-flow agent
          by Wednesday night, review live on a call. This page explains the
          choices, what shipped, and what would change with codebase access.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Pill icon={Github}>github.com/PohTeyToe/genledge-customer-agent</Pill>
          <Pill icon={Brain}>Claude Haiku 4.5</Pill>
          <Pill icon={ShieldCheck}>Token-locked, rate-limited, budget-capped</Pill>
        </div>
        <a
          href="https://genledge-assistant.vercel.app"
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50/60 px-3.5 py-2.5 hover:border-sky-300 hover:bg-sky-50 transition group"
        >
          <div className="w-7 h-7 rounded-md bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" strokeWidth={2.4} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-semibold text-slate-900 leading-tight">
              Sister demo: Ledger Copilot
            </div>
            <div className="text-[11px] text-slate-600 leading-tight">
              The accountant-facing half. Categorize, reconcile, draft AR
              reminders. Same architectural pattern, different persona.
              <span className="text-sky-700 font-medium ml-1">
                genledge-assistant.vercel.app
              </span>
            </div>
          </div>
        </a>
      </motion.section>

      <motion.section variants={itemAnim} className="space-y-3">
        <Header icon={MessageSquare}>The brief, verbatim</Header>
        <Quote>
          "Essentially a customer / operation service agent. And let's see
          where we can get by tomorrow night. We can then review it together
          on the call." -- Kulwant Yadav, 2026-04-14
        </Quote>
        <Quote>
          "User: customer flow. Channel: whatever is easy for you. Agentic
          implementation matters, channel is not relevant. Use mock channel."
        </Quote>
        <p className="text-[13.5px] text-slate-600 leading-relaxed">
          Two signals to optimize for: customer flow (not internal ops, that
          was already covered by the{" "}
          <a
            href="https://genledge-assistant.vercel.app"
            target="_blank"
            rel="noreferrer"
            className="text-sky-700 underline decoration-sky-300 underline-offset-2 hover:decoration-sky-600"
          >
            Ledger Copilot demo
          </a>{" "}
          shipped Monday), and agentic depth (channel is incidental, the
          agent's reasoning loop is the point).
        </p>
      </motion.section>

      <motion.section variants={itemAnim} className="space-y-3">
        <Header icon={Compass}>Three scenarios, three different shapes</Header>
        <p className="text-[13.5px] text-slate-600 leading-relaxed">
          The pre-baked scenarios were chosen for diversity, not breadth. Each
          exercises a different agent capability so the demo shows range in
          two minutes.
        </p>
        <div className="grid sm:grid-cols-3 gap-3">
          <Card
            title="Disputed invoice"
            tone="sky"
            body="Multi-tool chaining plus conditional reasoning. Agent finds an unmatched payment that matches the disputed invoice and surfaces it for customer confirmation before escalating."
          />
          <Card
            title="Tax receipts"
            tone="violet"
            body="Identity verification across turns. Agent refuses the sensitive request, prompts for the last 4 of account, then files the document ticket on the next turn."
          />
          <Card
            title="Stripe fees"
            tone="emerald"
            body="Transaction analytics. Agent pulls 60 days of vendor txns, reasons over monthly aggregations, explains both the rate change and the volume lift."
          />
        </div>
      </motion.section>

      <motion.section variants={itemAnim} className="space-y-3">
        <Header icon={Wrench}>Architecture decisions</Header>
        <div className="grid sm:grid-cols-2 gap-3">
          <DecisionCard
            label="Model"
            decision="Claude Haiku 4.5 via the OAuth-token CLI"
            why="Fast, cheap enough for a 10-cent budget cap, and the OAuth token works with the CLI but not the raw Messages API. For deeper reasoning flows (real reconciliation, anomaly explanation) the same loop would route to Sonnet 4.5."
          />
          <DecisionCard
            label="Loop shape"
            decision="Up to 4 iterations per user turn, with tool observations fed back"
            why="One-shot is not agentic. Each iteration sees what the prior tools returned, so the agent can chain (look up invoice, then look up payment for that invoice). Hard cap prevents runaway loops or budget surprises."
          />
          <DecisionCard
            label="Tool surface"
            decision="6 tools, server-executed, narrow scope"
            why="lookup_invoice_status, lookup_payment_status, search_transactions_by_vendor, request_document, schedule_callback, escalate_to_human. Each has a narrow signature and validates input. Hallucinated args return errors that become the next iteration's observation."
          />
          <DecisionCard
            label="Output contract"
            decision="Strict JSON envelope with reasoning, tool_calls, next_step, assistant_message"
            why="Forces the model to declare its plan (reasoning), its actions (tool_calls), and its intent (continue vs respond). The reasoning text becomes the visible trace in the UI. No prose-mixed-with-tools parsing."
          />
          <DecisionCard
            label="Identity gating"
            decision="Sensitive tools require identity_verified=true"
            why="The system prompt classifies tax docs, bank letters, and account statements as sensitive. The agent must ask for the last 4 of account before calling those tools. Conditional, not just a check at the call site."
          />
          <DecisionCard
            label="UI emphasis"
            decision="Agent activity card open by default, stepwise reveal animation"
            why="Kulwant flagged agentic depth as the signal to optimize for. Hiding the trace behind a toggle would under-sell that. Visible reasoning + tool result cards + animated reveal converts 'here's the answer' into 'watch it think'."
          />
        </div>
      </motion.section>

      <motion.section variants={itemAnim} className="space-y-3">
        <Header icon={ShieldCheck}>Security layers</Header>
        <ul className="text-[13px] text-slate-700 space-y-1.5 list-disc pl-5">
          <li>
            <code className="font-mono text-[12px] bg-slate-100 rounded px-1 py-0.5">x-demo-secret</code>{" "}
            header on every chat call, HMAC-compared, no header is a 403.
          </li>
          <li>Per-IP rate limit, 5/min and 30/hour via slowapi.</li>
          <li>CORS allowlist locked to the production Vercel origin.</li>
          <li>2000-character cap on every user message (cheap pre-check).</li>
          <li>90-second subprocess timeout per Claude CLI call.</li>
          <li>$0.10 per-call budget cap on the CLI itself.</li>
          <li>
            4-iteration cap on the agent loop so a misbehaving model can't
            burn budget chasing its own tail.
          </li>
          <li>OAuth token never reaches the browser, never logged.</li>
        </ul>
      </motion.section>

      <motion.section variants={itemAnim} className="space-y-3">
        <Header icon={Code2}>Stack at a glance</Header>
        <div className="grid sm:grid-cols-2 gap-3">
          <StackCard
            label="Backend"
            items={[
              "FastAPI in Docker on Render (free tier)",
              "Python 3.12 plus Node 20 in the image (for the Claude CLI)",
              "@anthropic-ai/claude-code installed globally in the container",
              "Single /chat endpoint runs the iterative tool loop",
            ]}
          />
          <StackCard
            label="Frontend"
            items={[
              "Vite plus React 19 plus TypeScript",
              "Tailwind v4 plus Framer Motion",
              "Light consumer-support aesthetic, deliberately not dark fintech",
              "Deployed on Vercel, no SSO protection, public URL",
            ]}
          />
        </div>
      </motion.section>

      <motion.section variants={itemAnim} className="space-y-3">
        <Header icon={Rocket}>What I'd do with codebase access</Header>
        <p className="text-[13.5px] text-slate-600 leading-relaxed">
          A 30 / 60 / 90 day plan, scoped to where the demo's mocks would
          become real production paths.
        </p>
        <Roadmap
          phases={[
            {
              window: "Days 1 to 30",
              title: "Wire it to a real channel and one real integration",
              bullets: [
                "Mount this same agent loop behind GenLedge's existing Meta WhatsApp Business surface, since the Tech Provider status is already in place. The biggest channel-side win.",
                "Replace the mock customer record with a session loaded from your customer DB after OAuth.",
                "Pick QuickBooks Online as the first real integration (largest SMB market, cleanest sandbox). Map lookup_invoice_status, lookup_payment_status, search_transactions_by_vendor onto QBO's Invoice / Payment / TransactionList APIs.",
                "Layer in Postgres-backed session store keyed by tenant + customer + thread.",
              ],
            },
            {
              window: "Days 31 to 60",
              title: "Eval-driven prompt iteration plus the second integration",
              bullets: [
                "Ship a golden eval set: 50+ (customer-question, expected-tool-trajectory) pairs. Run nightly, alert on regressions. The agent loop is non-deterministic, so the eval scores trajectory shape, not exact text.",
                "Add Xero as the second integration. Same tool signatures, different adapter under the hood. Validates the abstraction held.",
                "Tighten the system prompt against the eval set, pushing escalation rate down without sacrificing accuracy on edge cases.",
                "Add observability: per-iteration cost, latency, tool counts, escalation reasons logged to a queryable store.",
              ],
            },
            {
              window: "Days 61 to 90",
              title: "Outcome feedback loop and Sonnet routing for hard flows",
              bullets: [
                "Every escalation Maya resolves becomes labeled training data. Use it to tighten retrieval over historical resolutions so future similar questions don't escalate.",
                "Route the genuinely hard flows (cross-period reconciliation, anomaly explanation, multi-account analysis) to Sonnet 4.5 with prompt caching. Keep Haiku for the customer-facing fast path.",
                "Per-tenant prompt customization so each accounting firm can shape tone, escalation thresholds, and which tools the agent can call.",
                "Internal agent-developer dashboard so non-engineering ops can read agent traces in plain English and flag failures.",
              ],
            },
          ]}
        />
      </motion.section>

      <motion.section variants={itemAnim} className="space-y-3">
        <Header icon={GitBranch}>What's deliberately NOT in this demo</Header>
        <ul className="text-[13px] text-slate-700 space-y-1.5 list-disc pl-5">
          <li>Real WhatsApp / Meta Cloud API wiring (mock channel UI only).</li>
          <li>Real OAuth identity (the customer is a fixed mock record).</li>
          <li>Persistent state (sessions live in memory, fresh per restart).</li>
          <li>Real ERP integrations (mock JSON ledger).</li>
          <li>Streaming responses (the trace animates after arrival, not during).</li>
          <li>Multi-customer support (one customer at a time per session).</li>
          <li>Production observability (smoke tests only, no eval suite yet).</li>
        </ul>
        <p className="text-[12.5px] text-slate-500 leading-relaxed pt-1">
          The 30 / 60 / 90 above is exactly the path to convert each of these
          into a production capability.
        </p>
      </motion.section>

      <motion.section variants={itemAnim} className="border-t border-slate-200 pt-6 space-y-3">
        <p className="text-[13px] text-slate-600 leading-relaxed">
          Built by Abdallah Safi (TMU CS senior, ex-lead engineer on a
          production AI platform at VJDS International). Available May through
          August full-time.
        </p>
        <div className="flex flex-wrap gap-2">
          <Pill icon={Github}>github.com/PohTeyToe</Pill>
          <Pill icon={MessageSquare}>linkedin.com/in/abdallah-safi</Pill>
        </div>
      </motion.section>
    </motion.div>
  );
}

function Header({
  icon: Icon,
  children,
}: {
  icon: typeof Compass;
  children: React.ReactNode;
}) {
  return (
    <h2 className="text-base sm:text-lg font-semibold text-slate-900 flex items-center gap-2">
      <Icon className="w-4 h-4 text-sky-500" strokeWidth={2.4} />
      {children}
    </h2>
  );
}

function Pill({
  icon: Icon,
  children,
}: {
  icon: typeof Github;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] bg-slate-100 text-slate-700 rounded-full px-2.5 py-1">
      <Icon className="w-3 h-3 text-slate-500" strokeWidth={2.4} />
      {children}
    </span>
  );
}

function Quote({ children }: { children: React.ReactNode }) {
  return (
    <blockquote className="border-l-4 border-sky-300 bg-sky-50/50 rounded-r-md px-4 py-2 text-[13px] text-slate-700 italic leading-relaxed">
      {children}
    </blockquote>
  );
}

function Card({
  title,
  body,
  tone,
}: {
  title: string;
  body: string;
  tone: "sky" | "violet" | "emerald";
}) {
  const toneCls =
    tone === "sky"
      ? "border-sky-200 bg-sky-50/40"
      : tone === "violet"
        ? "border-violet-200 bg-violet-50/40"
        : "border-emerald-200 bg-emerald-50/40";
  return (
    <div className={`rounded-xl border p-3 ${toneCls}`}>
      <div className="text-[12.5px] font-semibold text-slate-900 mb-1">
        {title}
      </div>
      <div className="text-[12px] text-slate-600 leading-snug">{body}</div>
    </div>
  );
}

function DecisionCard({
  label,
  decision,
  why,
}: {
  label: string;
  decision: string;
  why: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-1.5">
      <div className="text-[10.5px] font-semibold uppercase tracking-wider text-sky-600">
        {label}
      </div>
      <div className="text-[13px] font-semibold text-slate-900 leading-snug">
        {decision}
      </div>
      <div className="text-[12px] text-slate-600 leading-snug">{why}</div>
    </div>
  );
}

function StackCard({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5">
      <div className="text-[10.5px] font-semibold uppercase tracking-wider text-sky-600 mb-1.5">
        {label}
      </div>
      <ul className="text-[12.5px] text-slate-700 space-y-1 list-disc pl-4">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

interface Phase {
  window: string;
  title: string;
  bullets: string[];
}

function Roadmap({ phases }: { phases: Phase[] }) {
  return (
    <div className="space-y-3">
      {phases.map((p, i) => (
        <div
          key={i}
          className="rounded-xl border border-slate-200 bg-white p-3.5"
        >
          <div className="flex items-baseline gap-2 mb-1.5">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-sky-600">
              {p.window}
            </span>
            <span className="text-[13px] font-semibold text-slate-900">
              {p.title}
            </span>
          </div>
          <ul className="text-[12.5px] text-slate-700 space-y-1 list-disc pl-5">
            {p.bullets.map((b, j) => (
              <li key={j} className="leading-snug">
                {b}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
