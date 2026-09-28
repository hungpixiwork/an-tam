// Nối bàn đầu tư vào AI Workspace (ý định ask_desk): lấy báo cáo hôm nay của mã, chạy bàn nếu gói cho phép,
// trả câu trả lời + các bước (hiện ở dòng thời gian có sẵn) + việc đề xuất (người dùng duyệt).

import type { Env } from '../env';
import type { DeskHook } from '../agents/runner';
import type { ActionDraft } from '../../shared/agent/planner';
import { ACTION_TYPES, isActionType, validateAction } from '../../shared/agent/actions';
import { PLANS } from '../../shared/plans';
import { userPlan } from '../lib/usage';
import { vnClock } from '../market/http';
import { getDeskView, runDeskAndWait } from './index';

const TREND: Record<string, string> = { tang: 'đang đi lên', giam: 'đang đi xuống', di_ngang: 'đi ngang' };
const RISK: Record<string, string> = { thap: 'thấp', vua: 'vừa', cao: 'cao' };

export function deskHookFor(env: Env, userId: string): DeskHook {
  return async (symbol) => {
    const sym = symbol.toUpperCase();
    let view = await getDeskView(env, userId, sym);
    // Chưa có báo cáo hôm nay: gói Plus/Ngân hàng được chạy ngay; gói miễn phí dùng báo cáo chạy hằng ngày (nếu có)
    if (view.status !== 'ready' || view.stale) {
      const { plan } = await userPlan(env.DB, userId);
      if (PLANS[plan].deskAsk) {
        await runDeskAndWait(env, { symbol: sym, day: vnClock().day, userId }, 20_000);
        view = await getDeskView(env, userId, sym);
      }
    }
    if (!view.report) return null;
    const v = view.report.verdict;
    const reply = [
      view.risk?.text,
      `Bàn phân tích: ${sym} ${TREND[v.trend] ?? v.trend}, rủi ro ${RISK[v.risk] ?? v.risk}${v.reasons[0] ? ` — ${v.reasons[0]}` : ''}.`,
    ].filter(Boolean).join(' ');
    const steps = view.steps.map((s) => ({ agent: 'planner' as const, kind: s.kind, title: s.title, detail: s.detail ?? undefined }));
    const actions: ActionDraft[] = [];
    for (const a of view.risk?.suggestedActions ?? []) {
      if (!isActionType(a.type)) continue;
      const d = ACTION_TYPES[a.type];
      try {
        actions.push({
          type: a.type, agent: d.agent, title: a.title, payload: validateAction(a.type, a.payload),
          integration: d.integration === 'google_calendar_or_local' ? 'local' : d.integration, risk: d.risk,
        });
      } catch { /* đề xuất không hợp lệ → bỏ qua */ }
    }
    return { reply, steps, actions };
  };
}
