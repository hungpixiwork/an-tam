// "Tình huống đang xây dựng": tên, nhãn, mô tả + 4 chỉ số (mục tiêu chính, chi phí dự kiến, thời gian chuẩn bị, tác động thu nhập).
// Menu ⋮: tạo tình huống mới / chuyển tình huống. Chỉnh sửa: tên, chi phí, thời gian, phương án đang chọn, tháng bắt đầu.

import { useState, type FormEvent } from 'react';
import { CalendarDays, ChartNoAxesColumnIncreasing, Clock3, GraduationCap, Lightbulb, Pencil, Target, Wallet, type LucideIcon } from 'lucide-react';
import type { LifeChoice, LifeChoiceDetail, LifeChoicePreview, LifeChoiceTemplate } from '@shared/types/api';
import { formatVnd } from '@shared/format';
import { Button, FormAlert, FormField, IconTile, MenuButton, Modal, MoneyInput, Segmented, TextInput, Toggle, cx } from '@/components/ui';
import { useCreateLifeChoice, useLifeChoiceTemplates, useUpdateLifeChoice } from '@/lib/queries/choices';
import { useLocale } from '@/app/locale';

function Fact({ icon: Icon, tone, label, value, sub, compact }: { icon: LucideIcon; tone: string; label: string; value: string; sub?: string; compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-start gap-2.5 px-3 py-3 first:pl-0">
      <Icon className={cx('mt-0.5 h-6 w-6 shrink-0', tone)} strokeWidth={1.9} aria-hidden />
      <div className="min-w-0">
        <p className="text-[12px] text-ink-soft">{label}</p>
        <p className={cx('leading-snug text-ink', compact ? 'line-clamp-3 text-[12px] font-semibold' : 'text-[14px] font-bold')} title={compact ? value : undefined}>{value}</p>
        {sub && <p className="text-[11.5px] leading-snug text-ink-soft">{sub}</p>}
      </div>
    </div>
  );
}

export function SituationCard({ detail, preview, choices, onPick, onNew, onEdit }: {
  detail: LifeChoiceDetail; preview: LifeChoicePreview | undefined; choices: LifeChoice[];
  onPick: (id: string) => void; onNew: () => void; onEdit: () => void;
}) {
  const { t } = useLocale();
  const option = detail.options.find((o) => o.selected) ?? detail.options[0];
  const verdict = preview?.evaluation.verdict;
  const ready = verdict === 'go';
  const incomePct = option && detail.monthlyIncome > 0
    ? option.monthsWithoutIncome > 0 ? 100 : Math.round((-option.monthlyIncomeDelta / detail.monthlyIncome) * 100)
    : 0;
  const menu = [
    { label: t('choices.situation.new'), onSelect: onNew },
    ...choices.filter((c) => c.id !== detail.id).map((c) => ({ label: t('choices.build.switch', { title: c.title }), onSelect: () => onPick(c.id) })),
  ];
  return (
    <section className="min-w-0 rounded-2xl border border-line bg-white p-4 shadow-card" aria-labelledby="situation-title">
      <div className="flex items-center gap-2">
        <h2 id="situation-title" className="text-[17px] font-bold text-ink">{t('choices.build.title')}</h2>
        {verdict && (
          <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-semibold', ready ? 'bg-[#E3F5EB] text-[#137A4F]' : 'bg-[#FFF3DC] text-[#B86E00]')}>
            <Lightbulb className="h-3.5 w-3.5" aria-hidden />{t(ready ? 'choices.build.ready' : 'choices.build.prepare')}
          </span>
        )}
        <MenuButton items={menu} label={t('choices.build.menu')} className="ml-auto" />
      </div>

      <div className="mt-3 flex flex-wrap items-start gap-3">
        <IconTile icon={GraduationCap} tone="blue" size="lg" className="h-14 w-14" />
        <div className="min-w-0 flex-1">
          <h3 className="text-[18px] font-extrabold leading-tight text-ink">{detail.title}</h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-md bg-[#EDF4FF] px-2 py-0.5 text-[12px] font-semibold text-accent-700">{t(`choices.kind.${detail.kind}`)}</span>
            {detail.incomeUpliftPct > 0 && <span className="rounded-md bg-[#F4F0FF] px-2 py-0.5 text-[12px] font-semibold text-violet-700">{t('choices.build.tag_growth')}</span>}
            {option && <span className="inline-flex items-center gap-1 rounded-md bg-[#F2F5F8] px-2 py-0.5 text-[12px] text-ink-soft"><Clock3 className="h-3 w-3" aria-hidden />{t('choices.detail.months', { n: option.durationMonths })}</span>}
          </div>
        </div>
        <Button variant="white" size="sm" icon={Pencil} onClick={onEdit}>{t('choices.situation.edit')}</Button>
      </div>
      <p className="mt-3 text-[13.5px] leading-relaxed text-ink-soft">{detail.description}</p>

      <div className="mt-3 grid grid-cols-2 divide-line rounded-xl border border-line px-3 md:grid-cols-4 md:divide-x">
        <Fact icon={Target} tone="text-rose-500" label={t('choices.build.goal')} value={detail.outcome || '—'} compact />
        <Fact icon={Wallet} tone="text-amber-500" label={t('choices.build.cost')} value={option ? formatVnd(option.cost + option.otherCost) : '—'} sub={t('choices.build.cost_sub')} />
        <Fact
          icon={CalendarDays}
          tone="text-accent-600"
          label={t('choices.build.prep')}
          value={preview?.prepareMonths == null ? t('choices.scenario.unknown') : t('choices.detail.months', { n: preview.prepareMonths })}
          sub={t('choices.build.prep_sub')}
        />
        <Fact
          icon={ChartNoAxesColumnIncreasing}
          tone="text-[#1FA16B]"
          label={t('choices.build.income')}
          value={incomePct > 0 ? t('choices.build.income_cut', { pct: incomePct }) : t('choices.build.income_keep')}
          sub={option && incomePct > 0 ? t('choices.build.income_sub', { n: option.monthsWithoutIncome || option.durationMonths }) : undefined}
        />
      </div>
    </section>
  );
}

type TemplateKey = LifeChoiceTemplate['key'];

export function NewChoiceModal({ initial = 'study', onClose, onCreated }: { initial?: TemplateKey; onClose: () => void; onCreated: (id: string) => void }) {
  const { t } = useLocale();
  const { data: templates = [] } = useLifeChoiceTemplates();
  const create = useCreateLifeChoice();
  const [key, setKey] = useState<TemplateKey>(initial);
  const tpl = templates.find((x) => x.key === key);
  const [title, setTitle] = useState('');
  const [cost, setCost] = useState<number | null>(null);
  const [uplift, setUplift] = useState<number | null>(null);
  const [pinned, setPinned] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!tpl) return;
    create.mutate(
      { template: key, title: title.trim() || tpl.title, cost: cost ?? tpl.cost, incomeUpliftPct: uplift ?? tpl.incomeUpliftPct, pinned },
      { onSuccess: (r) => onCreated(r.id) },
    );
  };
  return (
    <Modal title={t('choices.new.title')} onClose={() => { if (!create.isPending) onClose(); }} className="max-w-lg">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <p className="mb-1.5 text-sm font-semibold text-ink">{t('choices.new.template')}</p>
          <Segmented
            value={key}
            onChange={(k) => { setKey(k); setTitle(''); setCost(null); setUplift(null); }}
            label={t('choices.new.template')}
            className="flex-wrap [&>button]:min-w-[120px]"
            options={(['study', 'care', 'startup', 'switch', 'sabbatical'] as const).map((k) => ({ value: k, label: t(`choices.tpl.${k}`) }))}
          />
          {tpl && <p className="mt-2 text-[13px] text-ink-soft">{tpl.description}</p>}
        </div>
        <FormField label={t('choices.new.name')}>
          {(id) => <TextInput id={id} value={title} maxLength={80} placeholder={tpl?.title} onChange={(e) => setTitle(e.target.value)} />}
        </FormField>
        <FormField label={t('choices.new.cost')}>{(id) => <MoneyInput id={id} value={cost ?? tpl?.cost ?? 0} onChange={setCost} />}</FormField>
        <FormField label={t('choices.new.uplift')}>
          {(id) => <TextInput id={id} type="number" min={-100} max={300} value={uplift ?? tpl?.incomeUpliftPct ?? 0} onChange={(e) => setUplift(Math.round(Number(e.target.value) || 0))} />}
        </FormField>
        <Toggle checked={pinned} onChange={setPinned} label={t('choices.new.pin')} />
        <FormAlert error={create.error} />
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose} disabled={create.isPending}>{t('choices.plan.cancel')}</Button>
          <Button type="submit" disabled={!tpl || create.isPending}>{t('choices.new.submit')}</Button>
        </div>
      </form>
    </Modal>
  );
}

export function EditChoiceModal({ detail, onClose }: { detail: LifeChoiceDetail; onClose: () => void }) {
  const { t } = useLocale();
  const [optionId, setOptionId] = useState((detail.options.find((o) => o.selected) ?? detail.options[0])?.id ?? '');
  const option = detail.options.find((o) => o.id === optionId);
  const update = useUpdateLifeChoice(detail.id);
  const [title, setTitle] = useState(detail.title);
  const [description, setDescription] = useState(detail.description);
  const [cost, setCost] = useState(option?.cost ?? detail.cost);
  const [otherCost, setOtherCost] = useState(option?.otherCost ?? 0);
  const [duration, setDuration] = useState(option?.durationMonths ?? 12);
  const [noIncome, setNoIncome] = useState(option?.monthsWithoutIncome ?? 0);
  const [start, setStart] = useState(option?.startMonth ?? '');
  const [uplift, setUplift] = useState(detail.incomeUpliftPct);
  const [outcome, setOutcome] = useState(detail.outcome);
  const [saving, setSaving] = useState(false);

  const pickOption = (id: string) => {
    const o = detail.options.find((x) => x.id === id);
    if (!o) return;
    setOptionId(id);
    setCost(o.cost); setOtherCost(o.otherCost); setDuration(o.durationMonths); setNoIncome(o.monthsWithoutIncome); setStart(o.startMonth ?? '');
  };
  const invalid = !option || title.trim().length < 2 || noIncome > duration;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (invalid) return;
    setSaving(true);
    try {
      await update.mutateAsync({
        title: title.trim(), description: description.trim(), cost, outcome: outcome.trim(), incomeUpliftPct: uplift,
        option: { id: optionId, select: !option?.selected, cost, otherCost, durationMonths: duration, monthsWithoutIncome: noIncome, startMonth: start || null },
      });
      onClose();
    } catch {
      // Lỗi hiện trong form; giữ nguyên số đã nhập để thử lại.
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal title={t('choices.edit.title')} onClose={() => { if (!saving) onClose(); }} className="max-w-lg">
      <form onSubmit={submit} className="space-y-3">
        <FormField label={t('choices.new.name')}>{(id) => <TextInput id={id} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} autoFocus />}</FormField>
        <FormField label={t('choices.edit.description')}>{(id) => <TextInput id={id} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} />}</FormField>
        {detail.options.length > 1 && (
          <fieldset className="min-w-0">
            <legend className="mb-1.5 text-sm font-semibold text-ink">{t('choices.compare.title')}</legend>
            <div className="space-y-1.5">
              {detail.options.map((o) => (
                <label key={o.id} className={cx('flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-[13px]', o.id === optionId ? 'border-[#4AAE88] bg-[#EAF7F0] font-semibold text-[#126349]' : 'border-line text-ink')}>
                  <input type="radio" name="edit-option" checked={o.id === optionId} onChange={() => pickOption(o.id)} className="accent-[#087D59]" />
                  <span className="min-w-0 flex-1">{o.title}</span>
                  <span className="text-[12px] text-ink-soft">{o.evaluation.feasibility}/100</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label={t('choices.new.cost')}>{(id) => <MoneyInput id={id} value={cost} onChange={(v) => setCost(v ?? 0)} />}</FormField>
          <FormField label={t('choices.edit.other_cost')}>{(id) => <MoneyInput id={id} value={otherCost} onChange={(v) => setOtherCost(v ?? 0)} />}</FormField>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <FormField label={t('choices.edit.duration')}>{(id) => <TextInput id={id} type="number" min={1} max={120} value={duration} onChange={(e) => setDuration(Number(e.target.value) || 1)} />}</FormField>
          <FormField label={t('choices.edit.no_income')}>{(id) => <TextInput id={id} type="number" min={0} max={duration} value={noIncome} onChange={(e) => setNoIncome(Number(e.target.value) || 0)} />}</FormField>
          <FormField label={t('choices.edit.start')}>{(id) => <TextInput id={id} type="month" value={start} onChange={(e) => setStart(e.target.value)} />}</FormField>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label={t('choices.new.uplift')}>{(id) => <TextInput id={id} type="number" min={-100} max={300} value={uplift} onChange={(e) => setUplift(Number(e.target.value) || 0)} />}</FormField>
          <FormField label={t('choices.edit.outcome')}>{(id) => <TextInput id={id} value={outcome} onChange={(e) => setOutcome(e.target.value)} maxLength={200} />}</FormField>
        </div>
        {noIncome > duration && <p className="text-sm text-danger-600">{t('choices.edit.invalid_months')}</p>}
        <FormAlert error={update.error} />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>{t('choices.plan.cancel')}</Button>
          <Button type="submit" disabled={saving || invalid}>{saving ? t('choices.edit.saving') : t('choices.plan.save')}</Button>
        </div>
      </form>
    </Modal>
  );
}
