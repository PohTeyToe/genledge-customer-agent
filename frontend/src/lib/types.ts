export interface Customer {
  id: string;
  name: string;
  business_name: string;
  email: string;
  phone?: string;
  account_id: string;
  account_last4: string;
  phone_last4?: string;
  preferred_contact?: string;
  accountant_assigned: string;
  timezone?: string;
  onboarded?: string;
}

export interface Company {
  name: string;
  tagline: string;
}

export interface ToolCallEvent {
  tool: string;
  input: Record<string, unknown>;
  result: Record<string, unknown>;
  duration_ms?: number;
}

export interface AgentStep {
  iteration: number;
  reasoning: string;
  tool_calls: ToolCallEvent[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  steps?: AgentStep[];
  iterations?: number;
}

export interface ChatResponse {
  message: string;
  iterations: number;
  steps: AgentStep[];
  customer: Customer;
  new_tickets: Array<Record<string, unknown>>;
  callbacks: Array<Record<string, unknown>>;
  escalations: Array<Record<string, unknown>>;
}

export interface CustomerState {
  customer: Customer;
  company: Company;
  new_tickets: Array<Record<string, unknown>>;
  callbacks: Array<Record<string, unknown>>;
  escalations: Array<Record<string, unknown>>;
}
