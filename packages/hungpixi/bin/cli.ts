#!/usr/bin/env node

import { AnTamClient } from '../src/client/client';
import { startMcpStdioServer } from '../src/agent/mcp';
import { calculatePeaceScore } from '../src/engine/peace-score';
import { parseVietnameseTransaction } from '../src/nlp/parser';

const args = process.argv.slice(2);
const command = args[0] || 'help';

const apiKey = process.env.ANTAM_API_KEY;
const baseUrl = process.env.ANTAM_BASE_URL || 'https://an-tam.ai';
const client = new AnTamClient({ apiKey, baseUrl });

async function main() {
  switch (command) {
    case 'mcp':
      // Khởi chạy MCP server qua stdio
      await startMcpStdioServer(client);
      break;

    case 'parse': {
      const sentence = args.slice(1).join(' ');
      if (!sentence) {
        console.error('Lỗi: Hãy nhập câu cần bóc tách. Ví dụ: npx antam parse "ăn trưa 45k"');
        process.exit(1);
      }
      const res = parseVietnameseTransaction(sentence);
      console.log(JSON.stringify(res, null, 2));
      break;
    }

    case 'score': {
      const cash = parseFloat(args[1] || '60000000');
      const expense = parseFloat(args[2] || '10000000');
      const score = calculatePeaceScore({
        cash,
        essentialMonthlyExpense: expense,
      });
      console.log(JSON.stringify(score, null, 2));
      break;
    }

    case 'status': {
      try {
        const overview = await client.getOverview();
        console.log(`\n🌿 AN TÂM AI — BÁO CÁO TÀI CHÍNH`);
        console.log(`───────────────────────────────────`);
        console.log(`Điểm An Tâm: ${overview.peace.score}/100 (${overview.peace.level.toUpperCase()})`);
        console.log(`Quỹ an toàn: ${overview.safeMonths.months} tháng`);
        console.log(`Dòng tiền ròng: ${overview.cashflow6m.net.toLocaleString('vi-VN')} đ`);
        console.log(`Tài sản ròng: ${overview.netWorthBreakdown.total.toLocaleString('vi-VN')} đ\n`);
      } catch (err: any) {
        console.error(`Không thể lấy dữ liệu: ${err.message}`);
      }
      break;
    }

    case 'help':
    default:
      console.log(`
🌿 An Tâm AI CLI & Agent SDK (antam-ai / hungpixi)

Sử dụng:
  npx antam mcp               Chạy MCP Server qua stdio cho Claude Desktop / Cursor
  npx antam parse "<câu>"     Bóc tách giao dịch tiếng Việt không tốn token
  npx antam score [tiền] [chi] Tính Điểm An Tâm nhanh
  npx antam status            Lấy bức tranh tài chính hiện tại (cần ANTAM_API_KEY)
      `);
      break;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
