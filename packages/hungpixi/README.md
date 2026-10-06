# 🌿 antam-ai (Hung Pixi SDK)

[![npm version](https://img.shields.io/npm/v/antam-ai.svg)](https://www.npmjs.com/package/antam-ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

> **Official AI Agent SDK, Model Context Protocol (MCP) Server & Financial Intelligence Engine for An Tâm AI.**  
> *Hiểu tiền của bạn. Chuẩn bị cho tương lai. Tích hợp AI Agent không ma sát.*

---

## ⚡ Tính Năng Cốt Lõi (Key Features)

- 🤖 **Universal Agent Adapters**: Tích hợp 1-dòng lệnh cho **Claude Desktop (MCP)**, **OpenAI / ChatGPT Actions**, **Vercel AI SDK**, **LangChain**.
- 🧮 **Local Financial Engine**: Tính toán **Điểm An Tâm (Peace Score)**, **Vốn con người (Human Capital ISCO-08)**, **Quỹ an toàn (Runway)** offline không tốn API.
- 🇻🇳 **Vietnamese Smart NLP Parser**: Bóc tách tự nhiên câu lệnh thu chi tiếng Việt (`an trua 45k`, `luong thang 10 25tr`) không tốn LLM token.
- 📅 **1-Click Google Calendar**: Tự động sinh link thêm lịch nhắc nhở tài chính 1-chạm không cần cấu hình OAuth.
- 🛡️ **Human-In-The-Loop**: Đề xuất hành động thông minh (`proposeAction`) chờ người dùng duyệt 1-chạm trong app An Tâm AI để bảo vệ an toàn tài chính tuyệt đối.

---

## 🚀 Cài Đặt (Installation)

```bash
npm install antam-ai
# hoặc
pnpm add antam-ai
# hoặc
yarn add antam-ai
```

---

## 📖 Hướng Dẫn Sử Dụng (Quick Start)

### 1. Sử dụng với Claude Desktop qua MCP Server

Thêm vào file cấu hình `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "an-tam-ai": {
      "command": "npx",
      "args": ["-y", "antam-ai", "mcp"],
      "env": {
        "ANTAM_API_KEY": "your_api_key_here",
        "ANTAM_BASE_URL": "https://an-tam.ai"
      }
    }
  }
}
```

### 2. Sử dụng với Vercel AI SDK

```typescript
import { createAnTamTools } from 'antam-ai';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

const tools = createAnTamTools({ apiKey: process.env.ANTAM_API_KEY });

const result = await generateText({
  model: openai('gpt-4o'),
  tools,
  prompt: 'Kiểm tra xem tháng này tôi còn bao nhiêu tiền và quỹ dự phòng an toàn được bao lâu?',
});
console.log(result.text);
```

### 3. Bóc Tách Câu Lệnh Chi Tiêu Tiếng Việt (Local NLP)

```typescript
import { parseVietnameseTransaction } from 'antam-ai';

const parsed = parseVietnameseTransaction('Sáng nay ăn phở bún bò 45k');
console.log(parsed);
// {
//   amount: 45000,
//   category: 'food',
//   kind: 'expense',
//   note: 'ăn phở bún bò',
//   occurredOn: '2026-10-06',
//   confidence: 0.95
// }
```

### 4. Tính Toán Điểm An Tâm (Peace Score Math)

```typescript
import { calculatePeaceScore } from 'antam-ai';

const score = calculatePeaceScore({
  cash: 120_000_000,
  essentialMonthlyExpense: 15_000_000,
  targetMonths: 6,
  goalCompletionAverage: 0.85,
  volatileAssetsRatio: 0.35,
  postDebtSavingsRatio: 0.28,
});

console.log(`Điểm An Tâm: ${score.total}/100 (${score.level})`);
```

### 5. Tạo Link Google Calendar 1-Chạm

```typescript
import { createGoogleCalendarLink, FINANCIAL_REMINDER_TEMPLATES } from 'antam-ai';

const event = FINANCIAL_REMINDER_TEMPLATES.CREDIT_CARD_DUE(
  'Thẻ Visa Techcombank',
  8500000,
  '2026-10-20'
);

const url = createGoogleCalendarLink(event);
console.log('Mở link này để thêm vào Google Calendar:', url);
```

---

## 💻 CLI Commands

Bạn có thể chạy trực tiếp bằng `npx`:

```bash
# Khởi động MCP Server qua stdio
npx antam mcp

# Bóc tách câu lệnh chi tiêu tiếng Việt
npx antam parse "đổ xăng 80k tiền mặt"

# Tính Điểm An Tâm nhanh với Tiền mặt & Chi tiêu tháng
npx antam score 180000000 20000000
```

---

## 📄 Bản Quyền (License)

Phát triển bởi Hung Pixi & An Tâm AI Team theo giấy phép [MIT](LICENSE).
