// Lựa chọn cuộc đời (B1) — phần tối thiểu dùng ở màn Tổng quan.

import type { LifeChoiceReadiness } from '../../engine/lifeChoice';

export interface LifeChoice {
  id: string;
  title: string;
  description: string;
  icon: string;
  cost: number;
  steps: string[];
  /** Số mốc đã xong (0..steps.length). */
  currentStep: number;
  pinned: boolean;
  status: 'active' | 'done' | 'archived';
}

export interface LifeChoiceInput {
  title: string;
  description?: string;
  icon?: string;
  cost?: number;
  steps?: string[];
  currentStep?: number;
  pinned?: boolean;
}

export interface PinnedLifeChoice extends LifeChoice {
  readiness: LifeChoiceReadiness;
}
