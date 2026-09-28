import { describe, expect, it } from 'vitest';
import { maskWithPlaceholders } from '../shared/agent/sanitize';
import { parseIntentRules, parseParamsRules } from '../shared/agent/intent';

describe('ý định bằng luật (không cần AI)', () => {
  it('quyết định lớn: rút thời gian và chi phí, AI chỉ thấy ký hiệu', () => {
    const { masked, map } = maskWithPlaceholders('nghỉ việc học thạc sĩ 18 tháng 300 triệu');
    expect(masked).toBe('nghỉ việc học thạc sĩ DUR_1 AMT_1');
    const intents = parseIntentRules(masked);
    expect(intents).toEqual(['life_decision']);
    expect(parseParamsRules(masked, map, intents).life).toEqual({ kind: 'study', durationMonths: 18, oneTimeCost: 300_000_000, incomeDuringPct: 0 });
  });
});
