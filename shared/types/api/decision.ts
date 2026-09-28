import type { SimulationParams } from '../domain';

/** Kịch bản của một lựa chọn cuộc đời, độc lập với cú sốc áp lên kịch bản. */
export type DecisionMode = 'bull' | 'base' | 'bear';
export type DecisionShock = 'industry' | 'job_loss' | 'market';

/** Request mới cho /api/simulations/preview và /run; request SimulationParams cũ vẫn hợp lệ. */
export interface DecisionSimulationInput {
  choiceId: string;
  optionId?: string;
  mode: DecisionMode;
  shock: DecisionShock;
  params: SimulationParams;
}
