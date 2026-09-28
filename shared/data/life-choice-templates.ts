// Mẫu tình huống "Lựa chọn cuộc đời" — người dùng chọn mẫu rồi sửa số cho khớp hoàn cảnh.
// Số tiền là mức gợi ý ban đầu (ƯỚC TÍNH), được lưu thành dữ liệu của người dùng khi tạo.

import type { LifeChoiceTemplate } from '../types/api';

const M = 1_000_000;
const RESERVE = { title: 'Có quỹ dự phòng tối thiểu 12 tháng chi phí sinh hoạt', autoKey: 'reserve_12m' };

export const LIFE_CHOICE_TEMPLATES: LifeChoiceTemplate[] = [
  {
    key: 'study',
    title: 'Nghỉ việc 12 tháng để học thạc sĩ',
    description: 'Tạm dừng công việc để theo học, nâng cao chuyên môn và mở rộng cơ hội nghề nghiệp.',
    icon: 'graduation-cap',
    cost: 300 * M,
    incomeUpliftPct: 30,
    outcome: 'Tăng cơ hội thăng tiến, chuyển sang vị trí tốt hơn với mức thu nhập cao hơn.',
    steps: ['Tìm hiểu', 'Chuẩn bị tài chính', 'Ứng tuyển', 'Bắt đầu học'],
    options: [
      { title: 'Nghỉ việc 12 tháng để học thạc sĩ', description: 'Tập trung toàn thời gian cho việc học, đầu tư cho cơ hội nghề nghiệp dài hạn.', cost: 300 * M, otherCost: 60 * M, durationMonths: 12, monthsWithoutIncome: 12, monthlyIncomeDelta: 0 },
      { title: 'Vừa học vừa làm (bán thời gian)', description: 'Học thạc sĩ và làm bán thời gian để duy trì thu nhập, thời gian kéo dài 24 tháng.', cost: 300 * M, otherCost: 40 * M, durationMonths: 24, monthsWithoutIncome: 0, monthlyIncomeDelta: -3_500_000 },
    ],
    prereqs: [RESERVE, { title: 'Giảm chi tiêu không cần thiết 20%' }, { title: 'Có kế hoạch tài chính chi tiết cho thời gian học' }, { title: 'Xác nhận học bổng/hỗ trợ tài chính (nếu có)' }, { title: 'Đảm bảo bảo hiểm y tế và sức khỏe' }, { title: 'Có nguồn thu nhập phụ ổn định (làm thêm/bán thời gian)' }],
    tasks: [
      { title: 'Tăng quỹ dự phòng', detail: 'Bổ sung thêm chi phí sinh hoạt vào quỹ trước khi nghỉ việc.', priority: 'high', category: 'finance' },
      { title: 'Giảm chi tiêu', detail: 'Cắt giảm 20% chi tiêu không cần thiết (ăn uống, giải trí, mua sắm).', priority: 'high', category: 'finance' },
      { title: 'Tìm nguồn thu nhập phụ', detail: 'Nhận việc làm thêm/bán thời gian, mục tiêu 5–8 triệu/tháng.', priority: 'mid', category: 'career' },
      { title: 'Chuẩn bị hồ sơ và săn học bổng', detail: 'Tìm kiếm học bổng, hỗ trợ tài chính để giảm chi phí.', priority: 'mid', category: 'career' },
      { title: 'Lập kế hoạch học tập & quản lý thời gian', detail: 'Lên lịch học, mục tiêu cụ thể và cách đo lường tiến độ.', priority: 'low', category: 'time' },
    ],
  },
  {
    key: 'care',
    title: 'Nghỉ 6 tháng chăm sóc gia đình',
    description: 'Tạm nghỉ việc để chăm con nhỏ hoặc bố mẹ, sau đó quay lại làm việc.',
    icon: 'heart',
    cost: 0,
    incomeUpliftPct: 0,
    outcome: 'Gia đình ổn định, quay lại công việc với thu nhập tương đương.',
    steps: ['Bàn với gia đình', 'Chuẩn bị tài chính', 'Xin nghỉ', 'Quay lại làm việc'],
    options: [
      { title: 'Nghỉ hẳn 6 tháng', description: 'Dành toàn bộ thời gian cho gia đình.', cost: 0, otherCost: 20 * M, durationMonths: 6, monthsWithoutIncome: 6, monthlyIncomeDelta: 0 },
      { title: 'Làm bán thời gian 12 tháng', description: 'Giảm giờ làm, vẫn có một phần thu nhập.', cost: 0, otherCost: 20 * M, durationMonths: 12, monthsWithoutIncome: 0, monthlyIncomeDelta: -10 * M },
    ],
    prereqs: [RESERVE, { title: 'Thống nhất kế hoạch với gia đình' }, { title: 'Hỏi chế độ nghỉ của công ty' }, { title: 'Đảm bảo bảo hiểm y tế và sức khỏe' }],
    tasks: [
      { title: 'Tăng quỹ dự phòng', detail: 'Để dành đủ chi phí cho những tháng không có lương.', priority: 'high' },
      { title: 'Rà soát chi tiêu gia đình', detail: 'Tạm dừng các khoản không cần thiết.', priority: 'mid' },
      { title: 'Giữ kết nối nghề nghiệp', detail: 'Học ngắn hạn để dễ quay lại công việc.', priority: 'low' },
    ],
  },
  {
    key: 'startup',
    title: 'Nghỉ việc để khởi nghiệp',
    description: 'Dành thời gian xây dựng công việc kinh doanh riêng.',
    icon: 'rocket',
    cost: 200 * M,
    incomeUpliftPct: 50,
    outcome: 'Có công việc kinh doanh riêng tự nuôi được bản thân.',
    steps: ['Ý tưởng', 'Thử nghiệm nhỏ', 'Chuẩn bị tài chính', 'Ra mắt'],
    options: [
      { title: 'Nghỉ hẳn 12 tháng để khởi nghiệp', description: 'Tập trung toàn thời gian cho dự án.', cost: 200 * M, otherCost: 30 * M, durationMonths: 12, monthsWithoutIncome: 12, monthlyIncomeDelta: 0 },
      { title: 'Làm song song 18 tháng', description: 'Giữ việc chính, làm dự án ngoài giờ.', cost: 100 * M, otherCost: 20 * M, durationMonths: 18, monthsWithoutIncome: 0, monthlyIncomeDelta: 0 },
    ],
    prereqs: [RESERVE, { title: 'Có khách hàng thử nghiệm đầu tiên' }, { title: 'Có kế hoạch kinh doanh 12 tháng' }, { title: 'Đảm bảo bảo hiểm y tế và sức khỏe' }],
    tasks: [
      { title: 'Thử nghiệm ý tưởng với chi phí nhỏ', detail: 'Bán thử trước khi nghỉ việc.', priority: 'high' },
      { title: 'Tăng quỹ dự phòng', detail: 'Đủ sống ít nhất 12 tháng khi chưa có doanh thu.', priority: 'high' },
      { title: 'Tách tiền cá nhân và tiền kinh doanh', detail: 'Mở tài khoản riêng cho dự án.', priority: 'mid' },
    ],
  },
  {
    key: 'switch',
    title: 'Chuyển ngành nghề',
    description: 'Học kỹ năng mới và chuyển sang ngành có triển vọng hơn.',
    icon: 'repeat',
    cost: 50 * M,
    incomeUpliftPct: 20,
    outcome: 'Làm việc trong ngành mới phù hợp và bền vững hơn.',
    steps: ['Tìm hiểu ngành', 'Học kỹ năng', 'Ứng tuyển', 'Bắt đầu việc mới'],
    options: [
      { title: 'Nghỉ 4 tháng học tập trung', description: 'Học khóa chuyên sâu rồi tìm việc mới.', cost: 50 * M, otherCost: 10 * M, durationMonths: 4, monthsWithoutIncome: 4, monthlyIncomeDelta: 0 },
      { title: 'Học buổi tối 9 tháng', description: 'Giữ việc hiện tại trong lúc học.', cost: 50 * M, otherCost: 5 * M, durationMonths: 9, monthsWithoutIncome: 0, monthlyIncomeDelta: 0 },
    ],
    prereqs: [RESERVE, { title: 'Nói chuyện với 3 người đang làm trong ngành mới' }, { title: 'Có hồ sơ năng lực cho ngành mới' }],
    tasks: [
      { title: 'Chọn khóa học phù hợp', detail: 'So sánh học phí, thời gian và đầu ra.', priority: 'high' },
      { title: 'Làm dự án thực tế', detail: 'Xây hồ sơ năng lực trước khi ứng tuyển.', priority: 'mid' },
    ],
  },
  {
    key: 'sabbatical',
    title: 'Nghỉ ngơi 3 tháng',
    description: 'Tạm nghỉ để hồi phục sức khỏe, du lịch hoặc định hướng lại bản thân.',
    icon: 'palm-tree',
    cost: 0,
    incomeUpliftPct: 0,
    outcome: 'Quay lại công việc với sức khỏe và tinh thần tốt hơn.',
    steps: ['Lên kế hoạch', 'Chuẩn bị tài chính', 'Nghỉ ngơi', 'Quay lại'],
    options: [
      { title: 'Nghỉ hẳn 3 tháng', description: 'Không làm việc trong 3 tháng.', cost: 0, otherCost: 30 * M, durationMonths: 3, monthsWithoutIncome: 3, monthlyIncomeDelta: 0 },
      { title: 'Nghỉ 1 tháng + làm từ xa 3 tháng', description: 'Giảm nhịp độ nhưng vẫn giữ một phần thu nhập.', cost: 0, otherCost: 20 * M, durationMonths: 4, monthsWithoutIncome: 1, monthlyIncomeDelta: -5 * M },
    ],
    prereqs: [RESERVE, { title: 'Được công ty đồng ý cho nghỉ' }, { title: 'Có kế hoạch cho thời gian nghỉ' }],
    tasks: [
      { title: 'Để dành chi phí nghỉ ngơi', detail: 'Tách riêng khoản tiền cho chuyến đi.', priority: 'high' },
      { title: 'Bàn giao công việc', detail: 'Chuẩn bị để quay lại thuận lợi.', priority: 'mid' },
    ],
  },
];

export const lifeChoiceTemplate = (key: string) => LIFE_CHOICE_TEMPLATES.find((t) => t.key === key);
