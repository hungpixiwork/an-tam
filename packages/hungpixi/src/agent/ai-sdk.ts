import { AnTamClient, type AnTamClientOptions } from '../client/client';
import {
  GetOverviewSchema,
  GetLedgerSchema,
  ProposeActionSchema,
  RunDeskSchema,
  EvaluateLifeChoiceSchema,
} from '../types/tools';

/**
 * Tạo danh sách tools chuẩn tương thích với Vercel AI SDK (`ai` package)
 */
export function createAnTamTools(options: AnTamClientOptions = {}) {
  const client = new AnTamClient(options);

  return {
    anTamOverview: {
      description: 'Lấy bức tranh tổng quan tài chính (Điểm An Tâm, Quỹ an toàn tháng, Dòng tiền).',
      parameters: GetOverviewSchema,
      execute: async (args: { rangeMonths?: 6 | 12 }) => client.getOverview(args.rangeMonths || 12),
    },
    anTamLedger: {
      description: 'Lấy sổ thu chi và danh mục chi tiêu theo tháng.',
      parameters: GetLedgerSchema,
      execute: async (args: { month?: string }) => client.getLedger(args.month),
    },
    anTamProposeAction: {
      description: 'Đề xuất hành động thông minh (ngân sách, lịch nhắc, mục tiêu) chờ người dùng duyệt.',
      parameters: ProposeActionSchema,
      execute: async (args: any) => client.proposeAction(args),
    },
    anTamEvaluateLifeChoice: {
      description: 'Đánh giá tác động tài chính của quyết định lớn (nghỉ việc, mua nhà, học thạc sĩ).',
      parameters: EvaluateLifeChoiceSchema,
      execute: async (args: any) => client.evaluateLifeChoice(args),
    },
    anTamDesk: {
      description: 'Phân tích đa chuyên gia cho mã tài sản/vàng.',
      parameters: RunDeskSchema,
      execute: async (args: { symbol: string }) => client.runDesk(args.symbol),
    },
  };
}
