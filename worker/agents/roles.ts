// Năm vai trò là module điều phối trên kết quả engine thuần trong shared/agent/planner.
// Chỉ vai trò có bước phân tích hoặc đề xuất thực tế mới xuất hiện trong timeline.
import type { AgentKey } from '../../shared/agent/tools';
import type { PlanResult, StepDraft } from '../../shared/agent/planner';

interface RoleModule { key: AgentKey; proposed: string }

export const ROLE_MODULES: readonly RoleModule[] = [
  { key: 'planner', proposed: 'Đã tổng hợp kế hoạch để bạn xem' },
  { key: 'calendar', proposed: 'Đã chuẩn bị lịch chờ bạn duyệt' },
  { key: 'cashflow', proposed: 'Đã chuẩn bị thay đổi ngân sách chờ bạn duyệt' },
  { key: 'skill', proposed: 'Đã chuẩn bị nhắc việc học chờ bạn duyệt' },
  { key: 'goal', proposed: 'Đã chuẩn bị thay đổi mục tiêu chờ bạn duyệt' },
] as const;

export function coordinateRoles(plan: PlanResult): PlanResult {
  const steps = [...plan.steps];
  const agents: AgentKey[] = [];
  for (const module of ROLE_MODULES) {
    const proposals = plan.actions.filter((action) => action.agent === module.key);
    const hasStep = steps.some((step) => step.agent === module.key);
    if (module.key !== 'planner' && !hasStep && proposals.length) {
      const step: StepDraft = { agent: module.key, kind: 'propose', title: module.proposed, detail: `${proposals.length} việc chờ phê duyệt` };
      steps.push(step);
    }
    if (module.key === 'planner' || hasStep || proposals.length) agents.push(module.key);
  }
  return { ...plan, agents, steps };
}
