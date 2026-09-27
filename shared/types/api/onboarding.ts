// Màn "Bắt đầu".

import type { PeaceLevel } from '../../engine/peace';
import type { AlertSeverity } from '../../engine/alerts';
import type { Me, SetupStatus } from './common';

export interface OnboardingResult {
  me: Me;
  peace: { score: number; label: string; level: PeaceLevel };
  alerts: { severity: AlertSeverity; title: string }[];
  setup: SetupStatus;
}
