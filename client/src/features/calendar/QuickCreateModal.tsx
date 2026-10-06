import { useState, type FormEvent } from 'react';
import { Sparkles, CalendarPlus } from 'lucide-react';
import type { CalendarCategory, CalendarEventInput } from '@shared/types/api';
import { Button, FormAlert, FormField, Modal, Segmented, TextInput } from '@/components/ui';
import { useAutoSchedule, useCreateCalendarEvent } from '@/lib/queries';
import { useLocale } from '@/app/locale';
import { CATEGORIES, CATEGORY_ICON } from './util';

interface QuickCreateModalProps {
  initialDate?: string;
  initialHour?: number;
  weekStart: string;
  onClose: () => void;
}

export function QuickCreateModal({ initialDate, initialHour = 9, weekStart, onClose }: QuickCreateModalProps) {
  const { t } = useLocale();
  const create = useCreateCalendarEvent();
  const autoSchedule = useAutoSchedule();

  const defaultDay = initialDate || new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
  const startStr = `${String(initialHour).padStart(2, '0')}:00`;
  const endStr = `${String(Math.min(23, initialHour + 1)).padStart(2, '0')}:00`;

  const [mode, setMode] = useState<'manual' | 'ai'>('manual');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(defaultDay);
  const [startTime, setStartTime] = useState(startStr);
  const [endTime, setEndTime] = useState(endStr);
  const [category, setCategory] = useState<CalendarCategory>('work');
  const [note, setNote] = useState('');

  const handleManualSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const payload: CalendarEventInput = {
      title: title.trim(),
      note: note.trim(),
      category,
      startsAt: `${date}T${startTime}`,
      endsAt: `${date}T${endTime}`,
    };

    create.mutate(payload, {
      onSuccess: onClose,
    });
  };

  const handleAiAutoSchedule = () => {
    autoSchedule.mutate(weekStart, {
      onSuccess: onClose,
    });
  };

  return (
    <Modal title={mode === 'ai' ? '✨ Nhờ AI tự động xếp lịch' : 'Thêm vào lịch'} onClose={onClose} className="max-w-lg">
      <div className="mb-4">
        <Segmented<'manual' | 'ai'>
          value={mode}
          onChange={setMode}
          label="Chế độ tạo lịch"
          options={[
            { value: 'manual', label: 'Tự thêm lịch' },
            { value: 'ai', label: '✨ AI tự xếp lịch' },
          ]}
        />
      </div>

      {mode === 'ai' ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-[#D7EFE2] bg-[#F1FAF5] p-4 text-[13.5px] text-ink leading-relaxed">
            <p className="font-bold text-primary-700 flex items-center gap-1.5 mb-1">
              <Sparkles className="h-4 w-4" /> AI Agent sẽ làm gì?
            </p>
            AI sẽ tự động quét các mục tiêu tài chính, kế hoạch học tập và các khoảng thời gian còn trống trong tuần <b>{weekStart}</b> để đề xuất lịch trình tối ưu nhất cho bạn.
          </div>
          <FormAlert error={autoSchedule.error} />
          <div className="flex justify-end gap-2.5 pt-2">
            <Button variant="white" onClick={onClose}>
              Để sau
            </Button>
            <Button
              icon={Sparkles}
              disabled={autoSchedule.isPending}
              onClick={handleAiAutoSchedule}
            >
              {autoSchedule.isPending ? 'AI đang phân tích & xếp lịch…' : 'Xếp lịch ngay'}
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleManualSubmit} className="space-y-3.5">
          <FormField label="Tên công việc / sự kiện">
            {(id) => (
              <TextInput
                id={id}
                autoFocus
                placeholder="VD: Học OOP, Đóng tiền nhà, Họp dự án..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            )}
          </FormField>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-[13px] font-semibold text-ink">Ngày</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-11 w-full rounded-xl border border-line bg-white px-3 text-[14px] text-ink focus:border-accent-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-semibold text-ink">Bắt đầu</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="h-11 w-full rounded-xl border border-line bg-white px-3 text-[14px] text-ink focus:border-accent-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-semibold text-ink">Kết thúc</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="h-11 w-full rounded-xl border border-line bg-white px-3 text-[14px] text-ink focus:border-accent-500 focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-ink">Loại hoạt động</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {CATEGORIES.map((c) => {
                const Icon = CATEGORY_ICON[c];
                const active = category === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={`flex items-center gap-2 rounded-xl border p-2.5 text-[12.5px] font-semibold transition-colors ${
                      active ? 'border-primary-600 bg-primary-50 text-primary-800' : 'border-line bg-white text-ink-soft hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{t(`calendar.cat.${c}`)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <FormField label="Ghi chú (tuỳ chọn)">
            {(id) => (
              <TextInput
                id={id}
                placeholder="Thêm ghi chú, link tài liệu hoặc địa điểm..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={120}
              />
            )}
          </FormField>

          <FormAlert error={create.error} />

          <div className="flex justify-end gap-2.5 pt-3 border-t border-line">
            <Button variant="white" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" icon={CalendarPlus} disabled={!title.trim() || create.isPending}>
              {create.isPending ? 'Đang lưu…' : 'Thêm vào lịch'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
