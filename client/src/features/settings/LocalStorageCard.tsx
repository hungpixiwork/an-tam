import { useState, useRef, type ChangeEvent } from 'react';
import { Database, Download, Upload, RefreshCw, UserCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button, Card, CardTitle, Select } from '@/components/ui';
import {
  exportUserData,
  importUserData,
  resetUserData,
  listUserProfiles,
  getActiveUserId,
  setActiveUserId,
} from '@/lib/storage';

export function LocalStorageCard() {
  const [activeId, setActiveId] = useState(getActiveUserId());
  const [profiles, setProfiles] = useState(listUserProfiles());
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProfileChange = (newId: string) => {
    setActiveId(newId);
    setActiveUserId(newId);
    setStatusMsg({ type: 'success', text: `Đã chuyển sang hồ sơ: ${profiles.find((p) => p.id === newId)?.name || newId}` });
    // Tải lại nhẹ trang sau 300ms để refresh query cache
    setTimeout(() => {
      window.location.reload();
    }, 400);
  };

  const handleExport = () => {
    try {
      const jsonStr = exportUserData(activeId);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `an-tam-backup-${activeId}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMsg({ type: 'success', text: 'Đã xuất file sao lưu JSON thành công về máy của bạn!' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: `Lỗi xuất file sao lưu: ${err.message}` });
    }
  };

  const handleImportFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (!content) return;
      const res = importUserData(activeId, content);
      if (res.success) {
        setStatusMsg({ type: 'success', text: res.message });
        setProfiles(listUserProfiles());
        setTimeout(() => window.location.reload(), 600);
      } else {
        setStatusMsg({ type: 'error', text: res.message });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleReset = (fixtureKey: 'fixture_a' | 'fixture_b' | 'fixture_c') => {
    if (window.confirm('Bạn có chắc chắn muốn đặt lại dữ liệu hồ sơ này về giá trị mẫu chuẩn SGK?')) {
      resetUserData(activeId, fixtureKey);
      setStatusMsg({ type: 'success', text: 'Đã đặt lại dữ liệu hồ sơ về trạng thái chuẩn SGK!' });
      setTimeout(() => window.location.reload(), 400);
    }
  };

  return (
    <Card>
      <CardTitle
        icon={Database}
        tone="blue"
        title="Quản lý Dữ liệu LocalStorage & Sao lưu"
        subtitle="Toàn bộ dữ liệu của bạn được lưu cục bộ riêng biệt trên trình duyệt theo chuẩn Local-First, bảo mật 100%."
      />

      <div className="space-y-4">
        {statusMsg && (
          <div
            className={`flex items-start gap-2 rounded-xl p-3 text-[13px] ${
              statusMsg.type === 'success'
                ? 'border border-success-200 bg-success-50 text-success-700'
                : 'border border-danger-200 bg-danger-50 text-danger-700'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-600" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger-600" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        <div className="rounded-xl border border-line bg-slate-50/60 p-4">
          <label className="block">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
              <UserCheck className="h-4 w-4 text-accent-600" />
              Chọn Hồ sơ người dùng cô lập (Multi-User Profile)
            </span>
            <p className="mt-0.5 text-xs text-ink-soft">
              Mỗi hồ sơ có không gian lưu trữ và sổ thu chi, danh mục, quỹ an toàn riêng biệt 100%.
            </p>
            <div className="mt-2">
              <Select
                label="Hồ sơ người dùng"
                value={activeId}
                onChange={handleProfileChange}
                options={profiles.map((p) => ({ value: p.id, label: `${p.name} (${p.email})` }))}
                className="w-full bg-white"
              />
            </div>
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col justify-between rounded-xl border border-line p-3.5">
            <div>
              <p className="text-sm font-bold text-ink">Xuất bản sao lưu (Backup JSON)</p>
              <p className="mt-1 text-xs text-ink-soft leading-relaxed">
                Tải về máy toàn bộ dữ liệu thu chi, danh mục đầu tư, mục tiêu và kịch bản mô phỏng.
              </p>
            </div>
            <div className="mt-3">
              <Button variant="white" icon={Download} size="sm" onClick={handleExport} className="w-full">
                Xuất file JSON
              </Button>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-xl border border-line p-3.5">
            <div>
              <p className="text-sm font-bold text-ink">Khôi phục từ file (Restore JSON)</p>
              <p className="mt-1 text-xs text-ink-soft leading-relaxed">
                Nhập bản sao lưu JSON để phục hồi lại trạng thái tài chính trước đó.
              </p>
            </div>
            <div className="mt-3">
              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                onChange={handleImportFile}
                className="hidden"
                aria-label="Chọn file sao lưu JSON"
              />
              <Button
                variant="white"
                icon={Upload}
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
              >
                Chọn file JSON
              </Button>
            </div>
          </div>
        </div>

        <div className="border-t border-line pt-3">
          <p className="text-xs font-semibold text-ink">Đặt lại dữ liệu mẫu (Canonical Fixtures):</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleReset('fixture_c')}
              className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-medium text-ink hover:bg-slate-50"
            >
              <RefreshCw className="h-3 w-3 text-accent-600" />
              Nạp Fixture C (Kỹ sư AI)
            </button>
            <button
              type="button"
              onClick={() => handleReset('fixture_a')}
              className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-medium text-ink hover:bg-slate-50"
            >
              <RefreshCw className="h-3 w-3 text-emerald-600" />
              Nạp Fixture A (Khởi nghiệp)
            </button>
            <button
              type="button"
              onClick={() => handleReset('fixture_b')}
              className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-medium text-ink hover:bg-slate-50"
            >
              <RefreshCw className="h-3 w-3 text-amber-600" />
              Nạp Fixture B (Hộ kinh doanh)
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}
