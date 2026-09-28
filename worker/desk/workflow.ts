// Cloudflare Workflow cho bàn đầu tư theo mã. Mỗi bước là một step.do: thử lại riêng, có giới hạn thời gian,
// kết quả được lưu nên Workflow chạy lại không gọi AI lần hai cho bước đã xong.
// Instance id = desk-<MÃ>-<ngày> → mỗi mã chỉ một lần chạy mỗi ngày (tạo trùng id sẽ bị từ chối).

import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep, type WorkflowStepConfig } from 'cloudflare:workers';
import type { Env } from '../env';
import { runDeskPipeline, type DeskParams, type StepRunner } from './pipeline';

/** AI lỗi đã có câu mẫu dự phòng bên trong bước, nên chỉ thử lại 1 lần cho lỗi D1 / mạng. */
const STEP_CONFIG: WorkflowStepConfig = { retries: { limit: 1, delay: '2 seconds', backoff: 'constant' }, timeout: '60 seconds' };

export class DeskWorkflow extends WorkflowEntrypoint<Env, DeskParams> {
  async run(event: WorkflowEvent<DeskParams>, step: WorkflowStep) {
    // step.do đòi kiểu trả về tuần tự hóa được; báo cáo chỉ gồm chuỗi / số / mảng / object thường
    // `step` là RPC stub: gọi thẳng step.do (không .bind được)
    const runner: StepRunner = <T>(name: string, fn: () => Promise<T>) =>
      step.do(name, STEP_CONFIG, fn as () => Promise<Rpc.Serializable<unknown>>) as Promise<T>;
    const { report, created } = await runDeskPipeline(this.env, event.payload, runner);
    return { symbol: report.symbol, day: report.day, created, trend: report.verdict.trend, risk: report.verdict.risk };
  }
}
