import { describe, expect, test } from 'vitest';
import { capitalize, templateNarrator } from '../shared/engine/narrate';

describe('narrate', () => {
  test('capitalize', () => {
    expect(capitalize('anh')).toBe('Anh');
    expect(capitalize('chị')).toBe('Chị');
    expect(capitalize('bạn')).toBe('Bạn');
  });

  test('template thay thế biến', () => {
    const result = templateNarrator.narrate('greeting.stable', { s: 'anh' });
    expect(result).toContain('anh');
    expect(result).not.toContain('{s}');
  });

  test('template giữ {em:...} nguyên', () => {
    const result = templateNarrator.narrate('greeting.stable', { s: 'bạn' });
    expect(result).toContain('{em:');
  });
});
