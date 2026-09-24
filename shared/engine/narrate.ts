// Câu chữ do "AI" nói. Mọi câu đều sinh từ template + số liệu engine.
// Interface Narrator cho phép sau này cắm Workers AI để diễn đạt lại (không đổi số liệu).

import type { Salutation } from '../types/domain';
import type { PeaceLevel } from './peace';

export type Vars = Record<string, string | number>;

export interface Narrator {
  narrate(key: TemplateKey, vars?: Vars): string;
}

const TEMPLATES = {
  'greeting.stable': 'hôm nay tài chính của {s} đang ở {em:mức ổn định}.',
  'greeting.watch': 'tài chính của {s} đang ở {em:mức cần chú ý}.',
  'greeting.action': 'tài chính của {s} {em:cần được chăm sóc} ngay.',
  'greeting.sub.stable': 'Mọi thứ đang đi đúng hướng. Hãy tiếp tục duy trì thói quen tốt\nvà khám phá thêm các gợi ý từ An Tâm AI để đạt được mục tiêu lớn hơn.',
  'greeting.sub.watch': 'Một vài chỉ số đang lệch khỏi kế hoạch. Xem các gợi ý bên dưới\nđể điều chỉnh sớm trước khi rủi ro lớn hơn.',
  'greeting.sub.action': 'Quỹ an toàn hoặc mục tiêu của bạn đang chịu áp lực.\nHãy bắt đầu từ Kế hoạch an toàn để lấy lại thế cân bằng.',
  'peace.stable': 'Bạn đang có nền tảng tài chính tốt và kiểm soát rủi ro ở mức hợp lý.',
  'peace.watch': 'Nền tảng khá ổn nhưng còn một vài điểm cần cải thiện để an tâm hơn.',
  'peace.action': 'Nền tảng tài chính đang mỏng. Ưu tiên quỹ dự phòng và giảm rủi ro.',
  'tip.delay': 'Danh mục của bạn đang {state}. Tuy nhiên, nếu thị trường giảm mạnh, mục tiêu {goal} có thể bị chậm {months} tháng. Hãy xem mô phỏng để chuẩn bị trước.',
  'tip.safe': 'Danh mục của bạn đang {state}. Ngay cả khi thị trường giảm mạnh, mục tiêu {goal} vẫn giữ được tiến độ. Hãy xem mô phỏng để tự kiểm chứng.',
  'tip.empty': 'Hãy thêm mục tiêu đầu tiên để An Tâm AI giúp bạn theo dõi tiến độ và cảnh báo sớm.',
  'alert.goal_delay.title': 'Mục tiêu {goal} có nguy cơ chậm {months} tháng',
  'alert.goal_delay.body': 'Với mức để dành hiện tại, bạn có thể cần thêm {months} tháng nữa mới đạt đủ số tiền cho mục tiêu {goal}.',
  'alert.volatile_share.title': 'Tỷ trọng tài sản biến động cao đang vượt mức an toàn',
  'alert.volatile_share.body': 'Tài sản biến động hiện chiếm {share}, cao hơn mức khuyến nghị {recommended} cho mục tiêu trung hạn của bạn.',
  'alert.emergency_low.title': 'Quỹ dự phòng chưa đủ theo mức bạn đã đặt',
  'alert.emergency_low.body': 'Hiện tại bạn có {amount}, thấp hơn {gap} so với mục tiêu quỹ dự phòng {target} tháng chi tiêu.',
} as const;

export type TemplateKey = keyof typeof TEMPLATES;

/** Thay {name} bằng biến; giữ nguyên cú pháp {em:...} để tầng hiển thị tô màu nhấn mạnh. */
export const templateNarrator: Narrator = {
  narrate(key, vars = {}) {
    return TEMPLATES[key].replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
  },
};

/** "Nguyễn Văn Minh" → "Minh". */
export const givenName = (fullName: string): string => fullName.trim().split(/\s+/).pop() ?? fullName;

/** "Chào anh Minh," / "Chào bạn Minh,". */
export const greetingName = (fullName: string, s: Salutation): string => `Chào ${s} ${givenName(fullName)},`;

export const levelKey = <P extends string>(prefix: P, level: PeaceLevel) => `${prefix}.${level}` as `${P}.${PeaceLevel}`;
