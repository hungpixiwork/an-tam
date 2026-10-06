import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { parseVietnameseTransaction } from '../../packages/hungpixi/src/nlp/parser';
import { createGoogleCalendarLink } from '../../packages/hungpixi/src/calendar/google-link';

export const openapiRouter = new Hono<AppEnv>();

export const OPENAPI_SPEC = {
  openapi: '3.1.0',
  info: {
    title: 'An Tâm AI - Cố Vấn Tài Chính An Nhiên API',
    description:
      'API chính thức cho AI Agents, ChatGPT Custom GPT Actions, Claude MCP và các hệ thống tự động hóa kết nối với An Tâm AI.',
    version: '1.0.0',
    contact: {
      name: 'An Tâm AI Team',
      url: 'https://an-tam.ai',
    },
  },
  servers: [
    {
      url: 'https://an-tam.ai',
      description: 'Production Server',
    },
  ],
  paths: {
    '/api/overview': {
      get: {
        operationId: 'getFinancialOverview',
        summary: 'Lấy bức tranh tài chính tổng quan',
        description:
          'Trả về Điểm An Tâm (0-100 điểm), Quỹ dự phòng an toàn (số tháng), Dòng tiền 6 tháng, Tỷ lệ tiết kiệm và các đề xuất hôm nay.',
        parameters: [
          {
            name: 'range',
            in: 'query',
            description: 'Số tháng xem biểu đồ (6 hoặc 12)',
            required: false,
            schema: { type: 'integer', enum: [6, 12], default: 12 },
          },
        ],
        responses: {
          '200': {
            description: 'Dữ liệu tổng quan thành công',
            content: { 'application/json': { schema: { type: 'object' } } },
          },
        },
      },
    },
    '/api/ledger/dashboard': {
      get: {
        operationId: 'getMonthlyLedger',
        summary: 'Lấy sổ thu chi và ngân sách theo tháng',
        description: 'Trả về tổng thu, tổng chi, số dư ròng, hạn mức ngân sách và danh sách giao dịch gần nhất.',
        parameters: [
          {
            name: 'month',
            in: 'query',
            description: 'Tháng cần xem định dạng YYYY-MM (mặc định tháng hiện tại)',
            required: false,
            schema: { type: 'string', pattern: '^\\d{4}-\\d{2}$' },
          },
        ],
        responses: {
          '200': {
            description: 'Dữ liệu sổ thu chi thành công',
            content: { 'application/json': { schema: { type: 'object' } } },
          },
        },
      },
    },
    '/api/agent/actions': {
      post: {
        operationId: 'proposeFinancialAction',
        summary: 'Đề xuất hành động tài chính chờ người dùng duyệt 1-chạm',
        description:
          'Lệnh ghi Human-In-The-Loop an toàn tuyệt đối: Agent tạo đề xuất (đặt ngân sách, lịch nhắc việc, mục tiêu) để người dùng bấm duyệt trong app.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['type', 'payload'],
                properties: {
                  type: {
                    type: 'string',
                    enum: [
                      'calendar.create_events',
                      'budget.set',
                      'goal.update_progress',
                      'reminder.create',
                      'sheets.update_budget',
                      'notion.weekly_report',
                      'gmail.send',
                    ],
                  },
                  payload: { type: 'object' },
                  note: { type: 'string', maxLength: 300 },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Đề xuất đã được lưu thành công, chờ người dùng duyệt',
            content: { 'application/json': { schema: { type: 'object' } } },
          },
        },
      },
    },
    '/api/life-choices/evaluate': {
      post: {
        operationId: 'evaluateLifeChoice',
        summary: 'Đánh giá quyết định cuộc đời (học tập, nghỉ việc, mua nhà)',
        description:
          'Đối chiếu quyết định lớn với tài chính thực tế: Điểm khả thi, số tháng an toàn còn lại và tác động mục tiêu.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title'],
                properties: {
                  title: { type: 'string' },
                  cost: { type: 'integer', minimum: 0 },
                  durationMonths: { type: 'integer', default: 12 },
                  monthsWithoutIncome: { type: 'integer', default: 0 },
                  monthlyIncomeDelta: { type: 'integer', default: 0 },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Báo cáo đánh giá quyết định',
            content: { 'application/json': { schema: { type: 'object' } } },
          },
        },
      },
    },
    '/api/desk/{symbol}/run': {
      post: {
        operationId: 'runInvestmentDesk',
        summary: 'Phân tích đa chuyên gia đầu tư cho một mã tài sản',
        description:
          'Tổng hợp nhận định kỹ thuật, vĩ mô, tin tức và ghi chú rủi ro cá nhân hóa. Không phải lời khuyên đầu tư.',
        parameters: [
          {
            name: 'symbol',
            in: 'path',
            required: true,
            description: 'Mã tài sản (FPT, SJC, VNINDEX)',
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Báo cáo phân tích tổng hợp',
            content: { 'application/json': { schema: { type: 'object' } } },
          },
        },
      },
    },
    '/api/nlp/parse-transaction': {
      post: {
        operationId: 'parseVietnameseTransactionText',
        summary: 'Bóc tách câu lệnh chi tiêu tiếng Việt tự nhiên',
        description:
          'Chuyển đổi câu văn tiếng Việt (vd: "đổ xăng 80k tiền mặt", "lương tháng 10 25tr") thành object giao dịch chuẩn không tốn token LLM.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['text'],
                properties: {
                  text: { type: 'string', example: 'sáng nay ăn phở 45k' },
                  date: { type: 'string', example: '2026-10-06' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Kết quả bóc tách thành công',
            content: { 'application/json': { schema: { type: 'object' } } },
          },
        },
      },
    },
    '/api/smart-calendar/link': {
      post: {
        operationId: 'createGoogleCalendarQuickLink',
        summary: 'Sinh link 1-chạm thêm sự kiện vào Google Calendar',
        description: 'Tạo link Google Calendar mở trực tiếp trên điện thoại/máy tính mà không cần cấu hình OAuth.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'startsAt'],
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  location: { type: 'string' },
                  startsAt: { type: 'string', example: '2026-10-15T09:00:00+07:00' },
                  durationMinutes: { type: 'integer', default: 30 },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Link Google Calendar 1-chạm',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    url: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT / API Key',
      },
    },
  },
  security: [{ bearerAuth: [] }],
};

export const AI_PLUGIN_MANIFEST = {
  schema_version: 'v1',
  name_for_human: 'An Tâm AI',
  name_for_model: 'an_tam_ai',
  description_for_human: 'Cố vấn tài chính an nhiên, tính Điểm An Tâm, quản lý thu chi và lập kế hoạch cuộc đời.',
  description_for_model:
    'An Tâm AI provides personal finance intelligence for Vietnamese users: calculate Peace Score (0-100), runway emergency fund months, 6-month cashflow, monthly ledger, what-if life choice simulations, and human-in-the-loop action proposals.',
  auth: {
    type: 'user_http',
    authorization_type: 'bearer',
  },
  api: {
    type: 'openapi',
    url: 'https://an-tam.ai/api/openapi.json',
  },
  logo_url: 'https://an-tam.ai/hero-lake-city.jpg',
  contact_email: 'lienhe@an-tam.ai',
  legal_info_url: 'https://an-tam.ai/cai-dat#privacy',
};

// ── Endpoints công khai ──
openapiRouter.get('/api/openapi.json', (c) => c.json(OPENAPI_SPEC));
openapiRouter.get('/.well-known/ai-plugin.json', (c) => c.json(AI_PLUGIN_MANIFEST));

// Tiện ích NLP bóc tách văn bản tiếng Việt
openapiRouter.post('/api/nlp/parse-transaction', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { text?: string; date?: string };
  if (!body?.text) return c.json({ success: false, error: 'Thiếu trường text' }, 400);
  const parsed = parseVietnameseTransaction(body.text, body.date);
  if (!parsed) return c.json({ success: false, message: 'Không nhận diện được số tiền trong câu' }, 422);
  return c.json({ success: true, data: parsed });
});

// Tiện ích sinh link Google Calendar 1-chạm
openapiRouter.post('/api/smart-calendar/link', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    title?: string;
    description?: string;
    location?: string;
    startsAt?: string;
    durationMinutes?: number;
  };

  if (!body?.title || !body?.startsAt) {
    return c.json({ success: false, error: 'Thiếu title hoặc startsAt' }, 400);
  }

  const url = createGoogleCalendarLink({
    title: body.title,
    description: body.description,
    location: body.location,
    startsAt: body.startsAt,
    durationMinutes: body.durationMinutes || 30,
  });

  return c.json({ success: true, data: { url } });
});
