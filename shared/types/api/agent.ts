// AI Workspace: agent_runs / agent_steps / agent_actions (khớp CHECK trong migrations/0008_agent_audit.sql).

export type AgentRunSource = 'user' | 'mcp' | 'automation';
export type AgentRunStatus = 'running' | 'awaiting_approval' | 'completed' | 'failed' | 'cancelled';
export type AgentStepKind = 'plan' | 'tool' | 'propose' | 'note' | 'error';
export type AgentStepStatus = 'pending' | 'running' | 'done' | 'failed' | 'skipped';
export type AgentActionSource = 'agent' | 'mcp' | 'automation' | 'user';
export type AgentActionStatus = 'pending' | 'approved' | 'executing' | 'done' | 'rejected' | 'changes_requested' | 'failed' | 'expired';
export type ActionIntegration = 'local' | 'google_calendar' | 'google_sheets' | 'gmail' | 'notion';
export type ActionRisk = 'low' | 'mid' | 'high';
