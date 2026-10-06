import { describe, it, expect } from 'vitest';
import { OPENAPI_SPEC, AI_PLUGIN_MANIFEST } from '../worker/routes/openapi';
import { parseVietnameseTransaction } from '../packages/hungpixi/src/nlp/parser';
import { createGoogleCalendarLink } from '../packages/hungpixi/src/calendar/google-link';

describe('OpenAPI & AI Plugin Integration Tests', () => {
  it('1. Trả về OpenAPI 3.1.0 Spec chuẩn xác', () => {
    expect(OPENAPI_SPEC.openapi).toBe('3.1.0');
    expect(OPENAPI_SPEC.paths['/api/overview']).toBeDefined();
    expect(OPENAPI_SPEC.paths['/api/ledger/dashboard']).toBeDefined();
    expect(OPENAPI_SPEC.paths['/api/agent/actions']).toBeDefined();
    expect(OPENAPI_SPEC.paths['/api/nlp/parse-transaction']).toBeDefined();
    expect(OPENAPI_SPEC.paths['/api/smart-calendar/link']).toBeDefined();
  });

  it('2. Trả về OpenAI ai-plugin.json Manifest chuẩn', () => {
    expect(AI_PLUGIN_MANIFEST.schema_version).toBe('v1');
    expect(AI_PLUGIN_MANIFEST.name_for_model).toBe('an_tam_ai');
    expect(AI_PLUGIN_MANIFEST.api.type).toBe('openapi');
  });

  it('3. NLP Endpoint xử lý câu tiếng Việt tự nhiên', () => {
    const res = parseVietnameseTransaction('Ăn trưa 45k bún chả');
    expect(res).not.toBeNull();
    expect(res?.amount).toBe(45000);
    expect(res?.category).toBe('food');
    expect(res?.kind).toBe('expense');
  });

  it('4. Smart Calendar Link Endpoint sinh URL hợp lệ', () => {
    const url = createGoogleCalendarLink({
      title: 'Nhắc đóng tiền nhà',
      startsAt: '2026-10-10T10:00:00+07:00',
      durationMinutes: 15,
    });
    expect(url).toContain('https://calendar.google.com/calendar/render?');
    expect(url).toContain('action=TEMPLATE');
  });
});
