import { useState, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { addMonths, currentMonth } from '@shared/engine/month';
import type { Goal, GoalHorizon, GoalKind } from '@shared/types/domain';
import { Button, FormAlert, FormField, Modal, MoneyInput, Segmented, Select, TONE_EXT, TextInput, cx } from '@/components/ui';
import { useDeleteGoal, useSaveGoal, type GoalInput } from '@/lib/queries';
import { useLocale } from '@/app/locale';
import { GOAL_ICONS, goalLook } from './goalLook';

const KINDS: GoalKind[] = ['emergency', 'education', 'home', 'retirement', 'custom'];
type HorizonChoice = GoalHorizon | 'auto';

/** Thêm / sửa mục tiêu (có biểu tượng + kỳ hạn). Mount lại theo `key` mỗi lần mở. */
export function GoalFormModal({ goal, onClose }: { goal: Goal | null; onClose: () => void }) {
  const { t } = useLocale();
  const [kind, setKind] = useState<GoalKind>(goal?.kind ?? 'custom');
  const [title, setTitle] = useState(goal?.title ?? '');
  const [targetAmount, setTargetAmount] = useState(goal?.targetAmount ?? 0);
  const [currentAmount, setCurrentAmount] = useState(goal?.currentAmount ?? 0);
  const [targetMonth, setTargetMonth] = useState(goal?.targetMonth ?? addMonths(currentMonth(), 12));
  const [monthlyContribution, setMonthlyContribution] = useState(goal?.monthlyContribution ?? 0);
  const [priority, setPriority] = useState<'1' | '2' | '3'>(String(goal?.priority ?? 2) as '1' | '2' | '3');
  const [icon, setIcon] = useState<string>(goal ? goalLook(goal).key : 'heart');
  const [horizon, setHorizon] = useState<HorizonChoice>(goal?.horizon ?? 'auto');
  const save = useSaveGoal();
  const del = useDeleteGoal();
  const kindLabel = (k: GoalKind) => t(`safety.form.kind.${k}`);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const input: GoalInput = {
      kind,
      title: title.trim() || kindLabel(kind),
      targetAmount,
      currentAmount,
      targetMonth,
      monthlyContribution,
      priority: Number(priority),
      icon,
      horizon: horizon === 'auto' ? null : horizon,
    };
    save.mutate(goal ? { ...input, id: goal.id } : input, { onSuccess: onClose });
  }

  const busy = save.isPending || del.isPending;

  return (
    <Modal title={t(goal ? 'safety.form.title_edit' : 'safety.form.title_add')} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 text-sm font-semibold text-ink">{t('safety.form.kind')}</p>
            <Select label={t('safety.form.kind')} value={kind} onChange={setKind} options={KINDS.map((k) => ({ value: k, label: kindLabel(k) }))} className="h-11 w-full text-[15px]" />
          </div>
          <FormField label={t('safety.form.name')}>
            {(id) => <TextInput id={id} value={title} maxLength={60} placeholder={kindLabel(kind)} onChange={(e) => setTitle(e.target.value)} />}
          </FormField>
        </div>
        <div>
          <p className="mb-1.5 text-sm font-semibold text-ink">{t('safety.form.icon')}</p>
          <div role="radiogroup" aria-label={t('safety.form.icon')} className="flex flex-wrap gap-2">
            {Object.entries(GOAL_ICONS).map(([key, { icon: Icon, tone }]) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={icon === key}
                aria-label={t(`safety.form.icon.${key}`)}
                onClick={() => setIcon(key)}
                className={cx(
                  'flex h-10 w-10 items-center justify-center rounded-xl border-2 transition-colors',
                  TONE_EXT[tone].soft,
                  icon === key ? 'border-accent-600' : 'border-transparent hover:border-line',
                )}
              >
                <Icon className={cx('h-5 w-5', TONE_EXT[tone].text)} aria-hidden />
              </button>
            ))}
          </div>
        </div>
        <FormField label={t('safety.form.target')}>{(id) => <MoneyInput id={id} value={targetAmount} onChange={setTargetAmount} />}</FormField>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label={t('safety.form.current')}>{(id) => <MoneyInput id={id} value={currentAmount} onChange={setCurrentAmount} />}</FormField>
          <FormField label={t('safety.form.month')}>
            {(id) => <TextInput id={id} type="month" value={targetMonth} min={currentMonth()} onChange={(e) => e.target.value && setTargetMonth(e.target.value)} />}
          </FormField>
        </div>
        <FormField label={t('safety.form.monthly')} hint={t('safety.form.monthly_hint')}>
          {(id) => <MoneyInput id={id} value={monthlyContribution} onChange={setMonthlyContribution} />}
        </FormField>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 text-sm font-semibold text-ink">{t('safety.form.horizon')}</p>
            <Select
              label={t('safety.form.horizon')}
              value={horizon}
              onChange={setHorizon}
              options={(['auto', 'short', 'mid', 'long'] as const).map((h) => ({ value: h, label: t(h === 'auto' ? 'safety.form.horizon.auto' : `safety.goals.tab.${h}`) }))}
              className="h-11 w-full text-[15px]"
            />
          </div>
          <div>
            <p className="mb-1.5 text-sm font-semibold text-ink">{t('safety.form.priority')}</p>
            <Segmented
              label={t('safety.form.priority')}
              value={priority}
              onChange={setPriority}
              options={(['1', '2', '3'] as const).map((p) => ({ value: p, label: t(`safety.form.priority.${p}`) }))}
            />
          </div>
        </div>
        <FormAlert error={save.error ?? del.error} />
        <div className="flex gap-2 pt-2">
          <Button type="submit" className="flex-1" disabled={busy || targetAmount <= 0}>
            {save.isPending ? t('safety.form.saving') : t(goal ? 'safety.form.save' : 'safety.form.add')}
          </Button>
          {goal && (
            <Button
              variant="danger"
              icon={Trash2}
              disabled={busy}
              onClick={() => confirm(t('safety.goals.confirm_delete', { title: goal.title })) && del.mutate(goal.id, { onSuccess: onClose })}
            >
              {t('safety.form.delete')}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
}
