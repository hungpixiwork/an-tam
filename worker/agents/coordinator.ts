// Một Agent bền vững cho mỗi user. Hono là cổng xác thực; Agent chỉ xử lý hàng đợi nội bộ.
import { Agent, getAgentByName } from 'agents';
import type { Env } from '../env';
import { decryptToken, encryptToken } from '../lib/crypto';
import { ApiError } from '../lib/http';
import { deskHookFor } from '../desk/agentHook';
import { createRun, executeRun, failRun, type RunInput } from './runner';

interface QueuedRun { userId: string; runId: string; encryptedInput: string }
const RETRIES = 3;

export class UserCoordinatorAgent extends Agent<Env> {
  // Không mở HTTP/WebSocket vào DO. Chỉ Hono gọi RPC sau xác thực và rate limit.
  onRequest(): Response { return new Response('Not Found', { status: 404 }); }
  onConnect(): void { throw new Error('Direct Agent connections are disabled'); }

  async enqueueRun(payload: QueuedRun): Promise<void> {
    if (payload.userId !== this.name) throw new Error('Agent/user mismatch');
    await this.queue('processRun', payload, {
      id: payload.runId,
      retry: { maxAttempts: RETRIES, baseDelayMs: 300, maxDelayMs: 3000 },
    });
  }

  async processRun({ userId, runId, encryptedInput }: QueuedRun): Promise<void> {
    if (userId !== this.name) throw new Error('Agent/user mismatch');
    const attempt = await this.env.DB.prepare(
      "UPDATE agent_runs SET attempt_count = attempt_count + 1, updated_at = ? WHERE id = ? AND user_id = ? AND status = 'running' RETURNING attempt_count",
    ).bind(new Date().toISOString(), runId, userId).first<{ attempt_count: number }>();
    if (!attempt) return; // Đã xong/thất bại: replay không tạo lại action hay audit.
    try {
      if (!this.env.TOKEN_ENC_KEY) throw new Error('TOKEN_ENC_KEY missing');
      const raw = await decryptToken(this.env.TOKEN_ENC_KEY, encryptedInput, { userId, provider: `agent-run:${runId}` });
      const input = JSON.parse(raw) as RunInput;
      await executeRun(this.env, userId, runId, input, { deskHook: deskHookFor(this.env, userId) });
    } catch (error) {
      console.error('UserCoordinatorAgent.processRun', { runId, attempt: attempt.attempt_count, error });
      if (attempt.attempt_count < RETRIES) throw error;
      await failRun(this.env, userId, runId);
    }
  }
}

/** Lệnh gốc của một lượt chạy (giải mã) — dùng khi "Yêu cầu điều chỉnh" để giữ số tiền thật. */
export async function originalRunInput(env: Env, userId: string, runId: string): Promise<RunInput | null> {
  const row = await env.DB.prepare('SELECT input_enc FROM agent_runs WHERE id = ? AND user_id = ?').bind(runId, userId).first<{ input_enc: string | null }>();
  if (!row?.input_enc || !env.TOKEN_ENC_KEY) return null;
  try {
    return JSON.parse(await decryptToken(env.TOKEN_ENC_KEY, row.input_enc, { userId, provider: `agent-run:${runId}` })) as RunInput;
  } catch {
    return null;
  }
}

/** Mã hóa trước khi ghi D1; response chỉ trả runId, UI poll D1. */
export async function submitAgentRun(env: Env, userId: string, input: RunInput): Promise<string> {
  if (!env.USER_COORDINATOR || !env.TOKEN_ENC_KEY) {
    throw new ApiError(503, 'agent_unavailable', 'AI Workspace chưa được cấu hình, vui lòng thử lại sau');
  }
  const runId = crypto.randomUUID();
  let encryptedInput: string;
  try {
    encryptedInput = await encryptToken(env.TOKEN_ENC_KEY, JSON.stringify(input), { userId, provider: `agent-run:${runId}` });
  } catch (error) {
    console.error('UserCoordinatorAgent.encryptRun', { runId, error });
    throw new ApiError(503, 'agent_unavailable', 'AI Workspace chưa được cấu hình, vui lòng thử lại sau');
  }
  await createRun(env.DB, userId, input, runId, encryptedInput);
  try {
    const agent = await getAgentByName(env.USER_COORDINATOR, userId);
    await agent.enqueueRun({ userId, runId, encryptedInput });
  } catch (error) {
    console.error('UserCoordinatorAgent.enqueueRun', { runId, error });
    await failRun(env, userId, runId);
    throw new ApiError(503, 'agent_unavailable', 'Chưa thể nhận yêu cầu, vui lòng thử lại sau');
  }
  return runId;
}
