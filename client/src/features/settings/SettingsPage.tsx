import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, Bot, CheckCircle2, Database, Download, Lock, ShieldCheck, Trash2, Users, XCircle, Globe } from 'lucide-react';
import { HeroLakeCity, WindingPath } from '@/components/pixel';
import { Button, Card, CardTitle, ErrorState, IconTile, PageHero, PageSkeleton, Rich, Toggle, type Tone } from '@/components/ui';
import { Select } from '@/components/ui/core';
import { useDeleteAccount, useSettings, useUpdateSettings, type Settings } from '@/lib/queries';
import { useLocale } from '@/app/locale';
import { FinanceBasicsCard, PasswordCard, ProfileCard } from './AccountCards';

export default function SettingsPage() {
  const { data: settings, error, refetch, isPending } = useSettings();
  const { hash } = useLocation();

  // Link "/cai-dat#tai-chinh" từ Tổng quan: cuộn tới card sau khi màn đã hiện
  useEffect(() => {
    if (!isPending && hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' });
  }, [isPending, hash]);

  if (isPending) return <PageSkeleton />;
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;

  return (
    <div className="space-y-4">
      <PageHero
        title="Tiền của bạn là chuyện riêng của bạn."
        subtitle={<Rich text="An Tâm AI ưu tiên bảo vệ dữ liệu và minh bạch cách AI hoạt động." />}
        scene={(cls) => <HeroLakeCity className={cls} />}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-[1.25fr_1fr_1fr]">
        <div className="lg:col-span-2 xl:col-span-1">
          <FinanceBasicsCard />
        </div>
        <ProfileCard />
        <PasswordCard />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1.15fr]">
        <PrivacyCard />
        <DataUsedCard />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1.15fr]">
        <div className="space-y-4">
          <LocaleCard />
          <TransparencyCard />
        </div>
        <NotificationsCard settings={settings} />
      </div>

      <CommitmentBanner />
    </div>
  );
}

/* ───────── Privacy Card ───────── */

function PrivacyCard() {

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
      <CardTitle icon={ShieldCheck} tone="blue" title="Trung tâm dữ liệu của bạn" subtitle="Bạn luôn kiểm soát dữ liệu và cách An Tâm AI lưu trữ chúng." />

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-line p-3">
            <p className="text-sm font-semibold text-ink">Lưu trên thiết bị</p>
            <p className="mt-1 text-[13px] text-ink-soft">Không (chỉ lưu trên server để bạn đăng nhập ở bất cứ đâu)</p>
          </div>
          <div className="rounded-xl border border-line p-3">
            <p className="text-sm font-semibold text-ink">Lưu trên server</p>
            <p className="mt-1 text-[13px] text-ink-soft">Thu chi, tài sản, mục tiêu, kết quả mô phỏng</p>
          </div>
          <div className="rounded-xl border border-line p-3">
            <p className="text-sm font-semibold text-ink">Dùng để tính toán</p>
            <p className="mt-1 text-[13px] text-ink-soft">Điểm an tâm, xác suất mục tiêu, gợi ý và cảnh báo</p>
          </div>
          <div className="rounded-xl border border-[#D7EFE2] bg-[#F1FAF5] p-3">
            <p className="text-sm font-semibold text-primary-700">Gửi cho AI bên ngoài</p>
            <p className="mt-1 text-[13px] text-primary-600 font-medium">Không (thuật toán tính toán hoàn toàn bảo mật bên trong)</p>
          </div>
        </div>

        <div className="border-t border-line mt-4 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-ink">Tải xuống hoặc xóa dữ liệu</p>
            <p className="text-xs text-ink-soft mt-1">Nhận bản sao hoặc xóa vĩnh viễn dữ liệu của bạn.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="soft" icon={Download} size="sm" onClick={handleDownload} className="shrink-0">
              Tải xuống
            </Button>
            <Button variant="danger" icon={Trash2} size="sm" onClick={handleDeleteClick} className="shrink-0">
              Xóa tài khoản
            </Button>
          </div>
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
              checked={!!settings[item.key as keyof typeof settings]}
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
      <div className="hidden lg:block h-[90px] w-[260px] shrink-0 overflow-hidden rounded-xl">
        <WindingPath />
      </div>
    </Card>
  );
}

/* ───────── Locale Card ───────── */

function LocaleCard() {
  const { locale, currency, setLocale, setCurrency } = useLocale();

  return (
    <Card>
      <CardTitle icon={Globe} tone="teal" title="Ngôn ngữ & Tiền tệ" subtitle="Tuỳ chỉnh ngôn ngữ hiển thị và đơn vị tiền tệ." />
      <div className="space-y-4 mt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-ink">Ngôn ngữ</p>
            <p className="text-xs text-ink-soft mt-1">Ngôn ngữ giao diện</p>
          </div>
          <Select
            label="Ngôn ngữ"
            value={locale}
            onChange={(v) => setLocale(v as any)}
            options={[
              { value: 'vi', label: 'Tiếng Việt' },
              { value: 'en', label: 'English' },
              { value: 'zh', label: '中文' },
            ]}
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-ink">Tiền tệ</p>
            <p className="text-xs text-ink-soft mt-1">Đơn vị tiền tệ chính</p>
          </div>
          <Select
            label="Tiền tệ"
            value={currency}
            onChange={(v) => setCurrency(v as any)}
            options={[
              { value: 'VND', label: 'VND (₫)' },
              { value: 'USD', label: 'USD ($)' },
              { value: 'CNY', label: 'CNY (¥)' },
            ]}
          />
        </div>
      </div>
    </Card>
  );
}

