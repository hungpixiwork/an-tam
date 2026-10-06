// Root entry point cho package antam-ai / hungpixi SDK

// 1. Client & Errors
export { AnTamClient, type AnTamClientOptions } from './client/client';
export { API_ENDPOINTS } from './client/endpoints';
export { AnTamError, AuthError, QuotaError, ToolExecutionError } from './client/errors';

// 2. Types & Schemas
export * from './types/domain';
export * from './types/api';
export * from './types/tools';

// 3. Mathematical & Financial Engines
export { calculatePeaceScore, type PeaceScoreInput } from './engine/peace-score';
export {
  calculateHumanCapital,
  calculateCareerOverlap,
  calculateRunway,
  CAREER_BETA,
  RISK_FREE_RATE,
} from './engine/human-capital';
export { analyzeSpendingIntent, type SpendingSummary } from './engine/spending-intent';

// 4. Vietnamese NLP Parser
export { parseVietnameseTransaction, type ParsedTransaction } from './nlp/parser';
export { CATEGORY_KEYWORDS, VALUE_TAG_KEYWORDS } from './nlp/keywords';

// 5. Calendar & Google 1-Chạm Link
export { createGoogleCalendarLink, FINANCIAL_REMINDER_TEMPLATES, type CalendarEventPayload } from './calendar/google-link';

// 6. Multi-Agent Adapters
export { getOpenAITools, handleOpenAICall } from './agent/openai';
export { getAnthropicTools, handleAnthropicCall } from './agent/anthropic';
export { createAnTamTools } from './agent/ai-sdk';
export { startMcpStdioServer, MCP_TOOLS, type McpToolDeclaration } from './agent/mcp';
