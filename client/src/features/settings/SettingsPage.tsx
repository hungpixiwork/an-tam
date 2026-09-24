import { useState } from 'react';
import { Bell, Bot, CheckCircle2, Database, Download, Lock, ShieldCheck, Trash2, Users, XCircle } from 'lucide-react';
import { HeroLakeCity, WindingPath } from '@/components/pixel';
import { Badge, Button, Card, CardTitle, ErrorState, IconTile, PageHero, PageSkeleton, Rich, Toggle, type Tone } from '@/components/ui';
import { useDeleteAccount, useSettings, useUpdateSettings, type Settings } from '@/lib/queries';

export default function SettingsPage() {
  const { data: settings, error, refetch, isPending } = useSettings();

  if (isPending) return <PageSkeleton />;
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;

  return (
    <div className="space-y-4">
      <PageHero
        title="Tiền của bạn là chuyện riêng của bạn."
        subtitle={<Rich text="An Tâm AI ưu tiên bảo vệ dữ liệu và minh bạch cách AI hoạt động." />}
        scene={(cls) => <HeroLakeCity className={cls} />}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1.15fr]">
        <PrivacyCard settings={settings} />
        <DataUsedCard />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1.15fr]">
        <TransparencyCard />
        <NotificationsCard settings={settings} />
      </div>

      <CommitmentBanner />
    </div>
  );
}

/* ───────── Privacy Card ───────── */

function PrivacyCard({ settings }: { settings: Settings }) {
  const updateSettings = useUpdateSettings();

  const handleDownload = () => {
    window.location.href = '/api/me/export';
  };

  const handleDeleteClick = () => {
    const modal = document.getElementById('delete-confirm');
    if (modal instanceof HTMLDialogElement) {
      modal.showModal();
    }
  };

  return (
    <Card>
      <CardTitle icon={ShieldCheck} tone="blue" title="Quyền riêng tư của bạn" subtitle="Bạn luôn kiểm soát dữ liệu và cách An Tâm AI sử dụng chúng." />

      <div className="space-y-4">
        {/* Data Encrypted */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-ink">Dữ liệu tài sản lưu an toàn</p>
            <p className="text-xs text-ink-soft mt-1">Mọi thông tin của bạn được mã hóa và lưu trữ an toàn.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge tone="green">Đang bật</Badge>
            <Toggle checked disabled onChange={() => {}} label="Mã hóa dữ liệu" />
          </div>
        </div>

        <div className="border-t border-line" />

        {/* Advanced Analysis */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-ink">Chia sẻ dữ liệu cho phân tích nâng cao</p>
            <p className="text-xs text-ink-soft mt-1">Giúp AI đưa ra gợi ý chính xác hơn cho bạn.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge tone="blue">Tùy chọn</Badge>
            <Toggle
              checked={settings.advancedAnalysis}
              onChange={(v) => updateSettings.mutate({ advancedAnalysis: v })}
              label="Phân tích nâng cao"
              disabled={updateSettings.isPending}
            />
          </div>
        </div>

        <div className="border-t border-line" />

        {/* Download Data */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-ink">Tải xuống dữ liệu của tôi</p>
            <p className="text-xs text-ink-soft mt-1">Nhận bản sao dữ liệu cá nhân bất cứ lúc nào.</p>
          </div>
          <Button variant="soft" icon={Download} size="sm" onClick={handleDownload} className="shrink-0">
            Tải xuống
          </Button>
        </div>

        <div className="border-t border-line" />

        {/* Delete Account */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-ink">Xóa toàn bộ dữ liệu</p>
            <p className="text-xs text-ink-soft mt-1">Xóa vĩnh viễn tất cả dữ liệu của bạn khỏi hệ thống.</p>
          </div>
          <Button variant="danger" icon={Trash2} size="sm" onClick={handleDeleteClick} className="shrink-0">
            Xóa dữ liệu
          </Button>
        </div>
      </div>

      <DeleteConfirmModal />
    </Card>
  );
}

function DeleteConfirmModal() {
  const [confirmText, setConfirmText] = useState('');
  const deleteAccount = useDeleteAccount();

  const handleConfirm = async () => {
    if (confirmText === 'XÓA') {
      await deleteAccount.mutateAsync();
      window.location.assign('/dang-ky');
    }
  };

  return (
    <dialog id="delete-confirm" className="rounded-2xl border border-line shadow-lift backdrop:bg-black/30 p-6 max-w-sm">
      <h2 className="text-lg font-bold text-ink mb-2">Xác nhận xóa dữ liệu</h2>
      <p className="text-sm text-ink-soft mb-4">
        Hành động này không thể hoàn tác. Tất cả dữ liệu của bạn sẽ bị xóa vĩnh viễn.
      </p>
      <p className="text-sm text-ink mb-3">Gõ <span className="font-bold">XÓA</span> để xác nhận:</p>
      <input
        type="text"
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        placeholder="Nhập XÓA"
        className="w-full px-3 py-2 border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-100 mb-4"
      />
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={() => {
            const modal = document.getElementById('delete-confirm');
            if (modal instanceof HTMLDialogElement) modal.close();
          }}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-ink hover:bg-slate-100"
        >
          Hủy
        </button>
        <Button
          variant="danger"
          onClick={handleConfirm}
          disabled={confirmText !== 'XÓA' || deleteAccount.isPending}
        >
          Xóa dữ liệu
        </Button>
      </div>
    </dialog>
  );
}

/* ───────── Data Used Card ───────── */

const DATA_USED = [
  { icon: ShieldCheck, tone: 'green', title: 'Mục tiêu tài chính', body: 'Hiểu điều bạn đang hướng tới' },
  { icon: Database, tone: 'green', title: 'Cấu trúc danh mục', body: 'Để phân tích rủi ro và đề xuất phù hợp' },
  { icon: Download, tone: 'green', title: 'Dòng tiền', body: 'Để theo dõi thu chi và sức khỏe tài chính' },
  { icon: Lock, tone: 'green', title: 'Quỹ dự phòng', body: 'Để đánh giá mức độ an toàn' },
  { icon: CheckCircle2, tone: 'green', title: 'Các lựa chọn trong mô phỏng', body: 'Để đưa ra các kịch bản và gợi ý phù hợp' },
];

const DATA_NOT_USED = [
  { icon: XCircle, tone: 'red', title: 'Không dùng để quảng cáo', body: 'Dữ liệu của bạn không được dùng cho quảng cáo.' },
  { icon: XCircle, tone: 'red', title: 'Không bán cho bên thứ ba', body: 'Chúng tôi không bán dữ liệu của bạn cho bất kỳ bên nào.' },
  { icon: XCircle, tone: 'red', title: 'Không tự ý chia sẻ', body: 'Chỉ chia sẻ khi có sự đồng ý của bạn hoặc theo yêu cầu pháp luật.' },
];

function DataUsedCard() {
  return (
    <Card>
      <CardTitle icon={Database} title="Dữ liệu nào được dùng?" subtitle="An Tâm AI chỉ sử dụng những dữ liệu cần thiết để hỗ trợ bạn tốt hơn." />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Used */}
        <div className="rounded-xl bg-[#F1FAF5] p-4 border border-[#D7EFE2]">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-5 w-5 text-success-500" aria-hidden />
            <h3 className="text-sm font-bold text-ink">Dữ liệu AI cần để hỗ trợ bạn</h3>
          </div>
          <ul className="space-y-2">
            {DATA_USED.map((item) => (
              <li key={item.title} className="flex items-start gap-2 text-xs">
                <span className="text-ink-soft">•</span>
                <div>
                  <p className="font-semibold text-ink">{item.title}</p>
                  <p className="text-ink-soft text-[11px]">{item.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Not Used */}
        <div className="rounded-xl bg-[#FFF5F4] p-4 border border-[#F9DAD6]">
          <div className="flex items-center gap-2 mb-3">
            <XCircle className="h-5 w-5 text-danger-500" aria-hidden />
            <h3 className="text-sm font-bold text-ink">Dữ liệu AI không dùng sai mục đích</h3>
          </div>
          <ul className="space-y-2">
            {DATA_NOT_USED.map((item) => (
              <li key={item.title} className="flex items-start gap-2 text-xs">
                <span className="text-ink-soft">•</span>
                <div>
                  <p className="font-semibold text-ink">{item.title}</p>
                  <p className="text-ink-soft text-[11px]">{item.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}

/* ───────── Transparency Card ───────── */

const TRANSPARENCY = [
  { num: '1', title: 'AI phân tích dữ liệu để phát hiện rủi ro', body: 'Xem xét tình hình tài chính của bạn để nhận ra những rủi ro tiềm ẩn.' },
  { num: '2', title: 'AI chạy mô phỏng để xem kế hoạch có bền không', body: 'Thử nhiều kịch bản tương lai để đánh giá khả năng đạt mục tiêu.' },
  { num: '3', title: 'AI tóm tắt bằng ngôn ngữ dễ hiểu', body: 'Biến dữ liệu phức tạp thành gợi ý rõ ràng, dễ áp dụng.' },
  { num: '4', title: 'Quyết định cuối cùng vẫn là của bạn', body: 'AI chỉ đưa ra gợi ý. Bạn là người quyết định và luôn kiểm soát.' },
];

function TransparencyCard() {
  return (
    <Card>
      <CardTitle icon={Bot} title="AI hoạt động minh bạch" subtitle="Bạn luôn biết AI đang làm gì với dữ liệu của mình." />
      <ul className="space-y-4">
        {TRANSPARENCY.map((item) => (
          <li key={item.num} className="flex items-start gap-3">
            <span className="flex items-center justify-center h-8 w-8 rounded-full bg-accent-100 text-accent-700 font-bold text-sm shrink-0">
              {item.num}
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">{item.title}</p>
              <p className="text-xs text-ink-soft mt-1">{item.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ───────── Notifications Card ───────── */

const NOTIFICATIONS_SETTINGS: Array<{
  key: string;
  icon: typeof CheckCircle2;
  tone: Tone;
  title: string;
  body: string;
}> = [
  {
    key: 'notifyGoalDelay',
    icon: CheckCircle2,
    tone: 'green',
    title: 'Nhắc khi mục tiêu có nguy cơ chậm',
    body: 'Nhận thông báo khi tiến độ có dấu hiệu chậm so với kế hoạch.',
  },
  {
    key: 'notifyPortfolioRisk',
    icon: Database,
    tone: 'green',
    title: 'Nhắc khi danh mục lệch khỏi mức an toàn',
    body: 'Cảnh báo khi danh mục đầu tư có rủi ro cao hơn mức bạn chọn.',
  },
  {
    key: 'notifyWeeklyEmail',
    icon: Download,
    tone: 'green',
    title: 'Bản tóm tắt tài chính hằng tuần',
    body: 'Nhận email tóm tắt tình hình tài chính và gợi ý quan trọng.',
  },
  {
    key: 'notifyCommunityLessons',
    icon: Users,
    tone: 'green',
    title: 'Bài học tài chính dành cho cộng đồng',
    body: 'Nhận nội dung hữu ích, câu chuyện thực tế và mẹo tài chính.',
  },
];

function NotificationsCard({ settings }: { settings: Settings }) {
  const updateSettings = useUpdateSettings();

  return (
    <Card>
      <CardTitle icon={Bell} title="Cách bạn muốn nhận hỗ trợ" subtitle="Tùy chỉnh cách An Tâm AI đồng hành cùng bạn." />
      <ul className="space-y-4">
        {NOTIFICATIONS_SETTINGS.map((item) => (
          <li key={item.key} className="flex items-start gap-3">
            <IconTile icon={item.icon} tone={item.tone} size="sm" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-ink">{item.title}</p>
              <p className="text-xs text-ink-soft mt-1">{item.body}</p>
            </div>
            <Toggle
              checked={settings[item.key as keyof typeof settings]}
              onChange={(v) => updateSettings.mutate({ [item.key]: v })}
              label={item.title}
              disabled={updateSettings.isPending}
            />
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ───────── Commitment Banner ───────── */

function CommitmentBanner() {
  return (
    <Card tone="mint" className="flex items-center gap-6">
      <ShieldCheck className="h-16 w-16 text-success-500 shrink-0" aria-hidden />
      <div>
        <h2 className="text-lg font-bold text-ink">Cam kết của An Tâm AI</h2>
        <p className="text-sm text-ink-soft mt-2 leading-relaxed">
          Chúng tôi xây dựng AI để giúp người dùng hiểu tài chính rõ hơn, không phải để thay thế suy nghĩ của họ.
        </p>
      </div>
      <WindingPath className="hidden lg:block h-[90px] w-[260px] shrink-0" />
    </Card>
  );
}
