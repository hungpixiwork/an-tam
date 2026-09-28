// "Tình huống của bạn": tên + mô tả tình huống, 3 chỉ số (chi phí chính, thu nhập hiện tại, mục tiêu sau khi hoàn thành).
// Chọn tình huống khác / tạo tình huống mới từ mẫu.

import { useState, type FormEvent } from 'react';
import { Briefcase, GraduationCap, Pencil, Plus, Target, type LucideIcon } from 'lucide-react';
import type { LifeChoice, LifeChoiceDetail, LifeChoiceTemplate } from '@shared/types/api';
import { formatVndFull } from '@shared/format';
import { Button, FormAlert, FormField, IconTile, Modal, MoneyInput, Segmented, Select, TextInput, Toggle, type ExtTone } from '@/components/ui';
import { useCreateLifeChoice, useLifeChoiceTemplates, useSelectOption, useUpdateChoiceOption, useUpdateLifeChoice } from '@/lib/queries/choices';
import { useLocale } from '@/app/locale';

function Stat({ icon, tone, label, value, sub }: { icon: LucideIcon; tone: ExtTone; label: string; value?: string; sub: string }) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-xl bg-[#F6F9FC] p-3.5">
      <IconTile icon={icon} tone={tone} />
      <div className="min-w-0">
        <p className="text-[13px] text-ink-soft">{label}</p>
        {value && <p className="mt-0.5 text-[17px] font-extrabold tabular-nums text-ink">{value}</p>}
        <p className={value ? 'mt-0.5 text-[13px] text-ink-soft' : 'mt-1 text-[13px] leading-snug text-ink-soft'}>{sub}</p>
      </div>
    </div>
  );
}

export function SituationCard({ detail, choices, onPick, onNew, onEdit }: { detail: LifeChoiceDetail; choices: LifeChoice[]; onPick: (id: string) => void; onNew: () => void; onEdit: () => void }) {
  const { t } = useLocale();
  const selected = detail.options.find((o) => o.selected) ?? detail.options[0];
  const select = useSelectOption(detail.id);
  return (
    <section className="min-w-0 rounded-2xl border border-line bg-white p-4 shadow-card">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-[17px] font-bold text-ink">{t('choices.situation.eyebrow')}</h2>
          {choices.length > 1 && (
            <Select value={detail.id} onChange={onPick} label={t('choices.situation.pick')} options={choices.map((c) => ({ value: c.id, label: c.title }))} className="max-w-[240px]" />
          )}
          <Button variant="soft" size="sm" icon={Plus} onClick={onNew}>
            {t('choices.situation.new')}
          </Button>
          <Button variant="white" size="sm" icon={Pencil} onClick={onEdit}>{t('choices.situation.edit')}</Button>
        </div>
        <h3 className="mt-3 text-[18px] font-extrabold leading-tight text-ink">{detail.title}</h3>
        <p className="mt-2 max-w-[640px] text-[14px] leading-relaxed text-ink-soft">{detail.description}</p>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Stat
          icon={GraduationCap}
          tone="blue"
          label={t('choices.situation.cost')}
          value={formatVndFull(selected?.cost ?? detail.cost)}
          sub={t('choices.situation.cost_sub', { months: selected?.durationMonths ?? 0 })}
        />
        <Stat icon={Briefcase} tone="sky" label={t('choices.situation.income')} value={formatVndFull(detail.monthlyIncome)} sub={t('choices.situation.income_sub')} />
        <Stat icon={Target} tone="rose" label={t('choices.situation.outcome')} sub={detail.outcome || '—'} />
      </div>
      {detail.options.length > 1 && <fieldset className="mt-3 min-w-0"><legend className="mb-1.5 text-[12px] font-bold text-ink">{t('choices.compare.title')}</legend><div className="flex flex-wrap gap-2">{detail.options.map((option) => <label key={option.id} className={option.selected ? 'flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#4AAE88] bg-[#EAF7F0] px-2 py-1.5 text-[12px] font-semibold text-[#126349]' : 'flex cursor-pointer items-center gap-1.5 rounded-lg border border-line px-2 py-1.5 text-[12px] text-ink'}><input type="radio" name={`option-${detail.id}`} checked={option.selected} disabled={select.isPending} onChange={() => select.mutate(option.id)} className="accent-[#087D59]" />{option.title} · {option.evaluation.feasibility}/100</label>)}</div></fieldset>}
      <FormAlert error={select.error} />
    </section>
  );
}

type TemplateKey = LifeChoiceTemplate['key'];

export function NewChoiceModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const { t } = useLocale();
  const { data: templates = [] } = useLifeChoiceTemplates();
  const create = useCreateLifeChoice();
  const [key, setKey] = useState<TemplateKey>('study');
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
            onChange={(k) => {
              setKey(k);
              setTitle('');
              setCost(null);
              setUplift(null);
            }}
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
          {(id) => (
            <TextInput id={id} type="number" min={-100} max={300} value={uplift ?? tpl?.incomeUpliftPct ?? 0} onChange={(e) => setUplift(Math.round(Number(e.target.value) || 0))} />
          )}
        </FormField>
        <Toggle checked={pinned} onChange={setPinned} label={t('choices.new.pin')} />
        <FormAlert error={create.error} />
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose} disabled={create.isPending}>
            {t('choices.plan.cancel')}
          </Button>
          <Button type="submit" disabled={!tpl || create.isPending}>
            {t('choices.new.submit')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function EditChoiceModal({ detail, onClose }: { detail: LifeChoiceDetail; onClose: () => void }) {
  const { t } = useLocale();
  const option = detail.options.find((o) => o.selected) ?? detail.options[0];
  const update = useUpdateLifeChoice(detail.id);
  const updateOption = useUpdateChoiceOption(detail.id, option?.id ?? '');
  const [title, setTitle] = useState(detail.title);
  const [description, setDescription] = useState(detail.description);
  const [cost, setCost] = useState(option?.cost ?? detail.cost);
  const [duration, setDuration] = useState(option?.durationMonths ?? 12);
  const [noIncome, setNoIncome] = useState(option?.monthsWithoutIncome ?? 0);
  const [uplift, setUplift] = useState(detail.incomeUpliftPct);
  const [outcome, setOutcome] = useState(detail.outcome);
  const [saving, setSaving] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!option || title.trim().length < 2 || noIncome > duration) return;
    setSaving(true);
    try {
      await update.mutateAsync({ title: title.trim(), description: description.trim(), cost, outcome: outcome.trim(), incomeUpliftPct: uplift });
      await updateOption.mutateAsync({ cost, durationMonths: duration, monthsWithoutIncome: noIncome });
      onClose();
    } catch {
      // Error stays visible in the form; keep entered values for retry.
    } finally {
      setSaving(false);
    }
  };
  return <Modal title={t('choices.edit.title')} onClose={() => { if (!saving) onClose(); }} className="max-w-lg">
    <form onSubmit={submit} className="space-y-3">
      <FormField label={t('choices.new.name')}>{(id) => <TextInput id={id} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} autoFocus />}</FormField>
      <FormField label={t('choices.edit.description')}>{(id) => <TextInput id={id} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} />}</FormField>
      <div className="grid gap-3 sm:grid-cols-2"><FormField label={t('choices.new.cost')}>{(id) => <MoneyInput id={id} value={cost} onChange={(v) => setCost(v ?? 0)} />}</FormField><FormField label={t('choices.new.uplift')}>{(id) => <TextInput id={id} type="number" min={-100} max={300} value={uplift} onChange={(e) => setUplift(Number(e.target.value) || 0)} />}</FormField></div>
      <div className="grid gap-3 sm:grid-cols-2"><FormField label={t('choices.edit.duration')}>{(id) => <TextInput id={id} type="number" min={1} max={120} value={duration} onChange={(e) => setDuration(Number(e.target.value) || 1)} />}</FormField><FormField label={t('choices.edit.no_income')}>{(id) => <TextInput id={id} type="number" min={0} max={duration} value={noIncome} onChange={(e) => setNoIncome(Number(e.target.value) || 0)} />}</FormField></div>
      <FormField label={t('choices.edit.outcome')}>{(id) => <TextInput id={id} value={outcome} onChange={(e) => setOutcome(e.target.value)} maxLength={200} />}</FormField>
      {noIncome > duration && <p className="text-sm text-danger-600">{t('choices.edit.invalid_months')}</p>}
      <FormAlert error={update.error ?? updateOption.error} />
      <div className="flex justify-end gap-2 pt-2"><Button variant="ghost" onClick={onClose} disabled={saving}>{t('choices.plan.cancel')}</Button><Button type="submit" disabled={saving || !option || title.trim().length < 2 || noIncome > duration}>{saving ? t('choices.edit.saving') : t('choices.plan.save')}</Button></div>
    </form>
  </Modal>;
}
