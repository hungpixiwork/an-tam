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
  'greeting.empty': 'hãy cùng vẽ {em:bức tranh tài chính} của {s}.',
  'greeting.sub.empty': 'Nhập thu chi, tài sản và mục tiêu — An Tâm AI sẽ tính mức an tâm\nvà theo dõi giúp {s} mỗi ngày.',
  'peace.empty': 'Chưa đủ dữ liệu để tính. Hãy nhập thu chi hoặc tài sản của bạn.',
  'peace.stable': 'Bạn đang có nền tảng tài chính tốt và kiểm soát rủi ro ở mức hợp lý.',
  'peace.watch': 'Nền tảng khá ổn nhưng còn một vài điểm cần cải thiện để an tâm hơn.',
  'peace.action': 'Nền tảng tài chính đang mỏng. Ưu tiên quỹ dự phòng và giảm rủi ro.',
  'tip.delay': 'Danh mục của bạn đang {state}. Tuy nhiên, nếu thị trường giảm mạnh, mục tiêu {goal} có thể bị chậm {months} tháng. Hãy xem mô phỏng để chuẩn bị trước.',
  'tip.safe': 'Danh mục của bạn đang {state}. Ngay cả khi thị trường giảm mạnh, mục tiêu {goal} vẫn giữ được tiến độ. Hãy xem mô phỏng để tự kiểm chứng.',
  'tip.empty': 'Hãy thêm mục tiêu đầu tiên để An Tâm AI giúp bạn theo dõi tiến độ và cảnh báo sớm.',
  'tip.spending': 'Chi tiêu tháng trước của {s} cao hơn {pct} so với ngân sách. Xem sổ thu chi để tìm khoản có thể cắt giảm.',
  'tip.goal_soon': 'Mục tiêu {goal} sắp đến hạn trong {months} tháng nữa. Tiến độ: {progress}.',
  'tip.learn': 'Tài chính của {s} đang ổn định. Khám phá bài học cộng đồng để cải thiện thêm.',
  'alert.goal_delay.title': 'Mục tiêu {goal} có nguy cơ chậm {months} tháng',
  'alert.goal_delay.body': 'Với mức để dành hiện tại, bạn có thể cần thêm {months} tháng nữa mới đạt đủ số tiền cho mục tiêu {goal}.',
  'alert.volatile_share.title': 'Tài sản có rủi ro cao đang chiếm phần quá lớn',
  'alert.volatile_share.body': 'Tài sản biến động hiện chiếm {share}, cao hơn mức khuyến nghị {recommended} cho mục tiêu trung hạn của bạn.',
  'alert.emergency_low.title': 'Quỹ dự phòng chưa đủ theo mức bạn đã đặt',
  'alert.emergency_low.body': 'Hiện tại bạn có {amount}, thấp hơn {gap} so với mục tiêu quỹ dự phòng {target} tháng chi tiêu.',
  // ── Analysis templates ──
  'goals.tip': 'Mục tiêu {goal} đang có nguy cơ chậm {danger:{delay} tháng} nếu {s} giữ danh mục hiện tại. Chỉ cần tăng tiền dự phòng thêm {danger:{extra}/tháng} và giảm bớt phần đầu tư biến động cao, khả năng đạt đúng hạn có thể tăng lên {success:{prob}}.',
  'sim.headline.survive': 'Danh mục của {s} vẫn tồn tại,',
  'sim.headline.stress': 'Danh mục của {s} chịu áp lực lớn,',
  'sim.emphasis.delay': 'nhưng mục tiêu {goal} có thể bị chậm.',
  'sim.emphasis.ontrack': 'và mục tiêu {goal} vẫn đúng hướng.',
  'sim.emphasis.nogoal': 'hãy đặt mục tiêu để xem tác động.',
  'sim.body.survive': 'Ngay cả trong kịch bản khó khăn, {s} vẫn giữ được nền tảng tài chính.\nTuy nhiên, một số mục tiêu quan trọng có thể bị ảnh hưởng nếu không có điều chỉnh kịp thời.',
  'sim.body.stress': 'Kịch bản này làm tài sản giảm mạnh. Hãy ưu tiên quỹ dự phòng\nvà giảm bớt phần đầu tư biến động cao trước khi rủi ro xảy ra.',
  'sim.worry.low': 'Rủi ro lớn nhất {em:không phải là} {s} mất hết tiền, {em:mà là mục tiêu {goal} bị lệch khỏi kế hoạch} do tiền dự phòng chưa đủ mạnh.',
  'sim.worry.ok': 'Quỹ dự phòng vẫn đủ {months} tháng. Điều cần theo dõi là {em:tỷ trọng tài sản biến động} khi thị trường chưa ổn định.',
  'sim.sug.emergency': 'Giúp {s} có đủ tháng chi tiêu dự phòng, giảm áp lực khi thu nhập bị gián đoạn.',
  'sim.sug.rebalance': 'Hạn chế rủi ro khi thị trường tiếp tục biến động, ưu tiên giữ vững nền tảng tài chính.',
  'sim.sug.contribution': 'Dồn một phần tiền mới tích lũy cho mục tiêu quan trọng nhất để giữ tiến độ.',
  'habits.calm': '{s_cap} khá bình tĩnh ở mức giảm nhẹ',
  'habits.calm.body': '{s_cap} không vội thay đổi khi thị trường chỉ giảm một chút.',
  'habits.reactive': '{s_cap} phản ứng sớm với biến động nhỏ',
  'habits.reactive.body': 'Hãy đặt trước giới hạn rủi ro để tránh quyết định theo cảm xúc.',
  'habits.pressure': 'Khi áp lực tăng, {s} bắt đầu ưu tiên an toàn',
  'habits.pressure.body': 'Ở mức giảm sâu hơn, {s} có xu hướng giảm rủi ro để bảo vệ thành quả.',
  'habits.gap': 'Danh mục hiện tại nên bớt biến động để phù hợp với mục tiêu thật của {s}',
  'habits.gap.body': 'Cách {s} phản ứng cho thấy {s} phù hợp với mức rủi ro vừa phải, ổn định hơn.',
  'portfolio.growth': 'Danh mục của {s} đang thiên về {direction}',
  'portfolio.growth.body': 'Khoảng {pct} tài sản của {s} đang ở cổ phiếu và quỹ tăng trưởng, giúp có tiềm năng sinh lời cao trong dài hạn.',
  'portfolio.shock': 'Nếu thị trường biến động mạnh, phần cổ phiếu sẽ ảnh hưởng nhiều nhất',
  'portfolio.shock.body': '{group} chiếm {pct} danh mục nên có thể biến động mạnh khi thị trường điều chỉnh.',
  'portfolio.safe': '{s_cap} đang {status} phần tài sản an toàn cho mục tiêu {goal}',
  'portfolio.safe.body': 'Tài sản an toàn (tiền mặt, trái phiếu) hiện chiếm {pct}, {detail}.',
  'portfolio.concentration': 'Một phần rủi ro của {s} đang tập trung khá nhiều vào {group}.',
  'alert.spending_over.title': 'Chi tiêu tháng này vượt ngân sách {pct}',
  'alert.spending_over.body': '{s_cap} đã chi {actual}, vượt ngân sách {budget}. Xem lại các khoản chi để giữ quỹ dự phòng an toàn.',
  'alert.savings_declining.title': 'Tỷ lệ tiết kiệm giảm 3 tháng liên tiếp',
  'alert.savings_declining.body': 'Phần để dành đang giảm dần. Nếu xu hướng tiếp tục, mục tiêu có thể bị ảnh hưởng.',
} as const;

export type TemplateKey = keyof typeof TEMPLATES;

/** "anh" → "Anh". */
export const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

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
