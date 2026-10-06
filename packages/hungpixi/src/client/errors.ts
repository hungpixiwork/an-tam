export class AnTamError extends Error {
  constructor(message: string, public readonly status?: number, public readonly code?: string) {
    super(message);
    this.name = 'AnTamError';
  }
}

export class AuthError extends AnTamError {
  constructor(message = 'Invalid or missing API key') {
    super(message, 401, 'AUTH_ERROR');
    this.name = 'AuthError';
  }
}

export class QuotaError extends AnTamError {
  constructor(message = 'AI Quota exceeded for today') {
    super(message, 429, 'QUOTA_EXCEEDED');
    this.name = 'QuotaError';
  }
}

export class ToolExecutionError extends AnTamError {
  constructor(message: string) {
    super(message, 400, 'TOOL_EXECUTION_ERROR');
    this.name = 'ToolExecutionError';
  }
}
