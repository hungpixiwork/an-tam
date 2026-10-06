import type { AnTamClient } from '../client/client';
import {
  GetOverviewSchema,
  GetLedgerSchema,
  EvaluateLifeChoiceSchema,
  WhatIfAllocateSchema,
  ProposeActionSchema,
  RunDeskSchema,
} from '../types/tools';

export function getOpenAITools() {
  return [
    {
      type: 'function',
      function: {
        name: 'an_tam_get_overview',
        description: 'Lấy dữ liệu tổng quan tài chính (Điểm An Tâm 0-100, Quỹ an toàn tháng, Dòng tiền 6 tháng, Tỷ lệ tiết kiệm).',
        parameters: {
          type: 'object',
          properties: {
            rangeMonths: { type: 'number', enum: [6, 12], description: 'Số tháng xem biểu đồ (6 hoặc 12)' },
          },
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'an_tam_get_ledger',
        description: 'Lấy sổ thu chi và phân bổ danh mục theo tháng YYYY-MM.',
        parameters: {
          type: 'object',
          properties: {
            month: { type: 'string', description: 'Tháng cần xem dạng YYYY-MM' },
          },
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'an_tam_propose_action',
        description: 'Đề xuất hành động tài chính (đặt ngân sách, lịch nhắc việc, mục tiêu) chờ người dùng duyệt 1-chạm.',
        parameters: {
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
    },
    {
      type: 'function',
      function: {
        name: 'an_tam_evaluate_life_choice',
        description: 'Đánh giá tính khả thi và rủi ro của quyết định lớn trong đời (học tập, mua nhà, khởi nghiệp).',
        parameters: {
          type: 'object',
          required: ['title'],
          properties: {
            title: { type: 'string' },
            cost: { type: 'number' },
            durationMonths: { type: 'number' },
            monthsWithoutIncome: { type: 'number' },
          },
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'an_tam_run_desk',
        description: 'Chạy phân tích đa chuyên gia tài chính (kỹ thuật, vĩ mô, tin tức, cá nhân hóa) cho một mã tài sản.',
        parameters: {
          type: 'object',
          required: ['symbol'],
          properties: {
            symbol: { type: 'string', description: 'Mã cổ phiếu hoặc vàng (FPT, SJC, VNINDEX)' },
          },
        },
      },
    },
  ];
}

export async function handleOpenAICall(client: AnTamClient, name: string, args: Record<string, unknown>) {
  switch (name) {
    case 'an_tam_get_overview':
      return client.getOverview((args.rangeMonths as 6 | 12) || 12);
    case 'an_tam_get_ledger':
      return client.getLedger(args.month as string);
    case 'an_tam_propose_action':
      return client.proposeAction(args as any);
    case 'an_tam_evaluate_life_choice':
      return client.evaluateLifeChoice(args);
    case 'an_tam_run_desk':
      return client.runDesk(args.symbol as string);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
