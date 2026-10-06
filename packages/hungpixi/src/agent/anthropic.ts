import type { AnTamClient } from '../client/client';
import { handleOpenAICall } from './openai';

export function getAnthropicTools() {
  return [
    {
      name: 'an_tam_get_overview',
      description: 'Lấy dữ liệu tổng quan tài chính (Điểm An Tâm 0-100, Quỹ an toàn tháng, Dòng tiền 6 tháng, Tỷ lệ tiết kiệm).',
      input_schema: {
        type: 'object',
        properties: {
          rangeMonths: { type: 'number', enum: [6, 12], description: 'Số tháng xem biểu đồ (6 hoặc 12)' },
        },
      },
    },
    {
      name: 'an_tam_get_ledger',
      description: 'Lấy sổ thu chi và phân bổ danh mục theo tháng YYYY-MM.',
      input_schema: {
        type: 'object',
        properties: {
          month: { type: 'string', description: 'Tháng cần xem dạng YYYY-MM' },
        },
      },
    },
    {
      name: 'an_tam_propose_action',
      description: 'Đề xuất hành động tài chính (đặt ngân sách, lịch nhắc việc, mục tiêu) chờ người dùng duyệt 1-chạm.',
      input_schema: {
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
          payload: { type: 'object', description: 'Dữ liệu chi tiết của hành động' },
          note: { type: 'string', description: 'Lý do đề xuất' },
        },
      },
    },
    {
      name: 'an_tam_run_desk',
      description: 'Chạy phân tích đa chuyên gia tài chính (kỹ thuật, vĩ mô, tin tức, cá nhân hóa) cho một mã tài sản.',
      input_schema: {
        type: 'object',
        required: ['symbol'],
        properties: {
          symbol: { type: 'string', description: 'Mã cổ phiếu hoặc vàng (FPT, SJC, VNINDEX)' },
        },
      },
    },
  ];
}

export const handleAnthropicCall = handleOpenAICall;
