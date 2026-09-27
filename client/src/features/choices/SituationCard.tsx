// "Tình huống của bạn": tên + mô tả tình huống, 3 chỉ số (chi phí chính, thu nhập hiện tại, mục tiêu sau khi hoàn thành).
// Chọn tình huống khác / tạo tình huống mới từ mẫu.

import { useState, type FormEvent } from 'react';
import { Briefcase, GraduationCap, Plus, Target, type LucideIcon } from 'lucide-react';
import type { LifeChoice, LifeChoiceDetail, LifeChoiceTemplate } from '@shared/types/api';
import { formatVndFull } from '@shared/format';
import { Button, FormAlert, FormField, IconTile, Modal, MoneyInput, Segmented, Select, TextInput, Toggle, type ExtTone } from '@/components/ui';
import { useCreateLifeChoice, useLifeChoiceTemplates } from '@/lib/queries';
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

export function SituationCard({ detail, choices, onPick, onNew }: { detail: LifeChoiceDetail; choices: LifeChoice[]; onPick: (id: string) => void; onNew: () => void }) {
  const { t } = useLocale();
  const selected = detail.options.find((o) => o.selected) ?? detail.options[0];
  return (
    <section className="grid grid-cols-1 gap-4 rounded-2xl border border-line bg-white p-5 shadow-card xl:grid-cols-[minmax(0,1fr)_minmax(0,730px)] xl:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[14px] font-semibold text-ink">{t('choices.situation.eyebrow')}</p>
          {choices.length > 1 && (
            <Select value={detail.id} onChange={onPick} label={t('choices.situation.pick')} options={choices.map((c) => ({ value: c.id, label: c.title }))} className="max-w-[240px]" />
          )}
          <Button variant="soft" size="sm" icon={Plus} onClick={onNew}>
            {t('choices.situation.new')}
          </Button>
        </div>
        <h2 className="mt-1.5 text-[24px] font-extrabold leading-tight text-ink">{detail.title}</h2>
        <p className="mt-2 max-w-[640px] text-[14px] leading-relaxed text-ink-soft">{detail.description}</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat
          icon={GraduationCap}
          tone="blue"
          label={t('choices.situation.cost')}
          value={formatVndFull(detail.cost)}
          sub={t('choices.situation.cost_sub', { months: selected?.durationMonths ?? 0 })}
        />
        <Stat icon={Briefcase} tone="sky" label={t('choices.situation.income')} value={formatVndFull(detail.monthlyIncome)} sub={t('choices.situation.income_sub')} />
        <Stat icon={Target} tone="rose" label={t('choices.situation.outcome')} sub={detail.outcome || '—'} />
      </div>
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
    <Modal title={t('choices.new.title')} onClose={onClose} className="max-w-lg">
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
          <Button variant="ghost" onClick={onClose}>
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
