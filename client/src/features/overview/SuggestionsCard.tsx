import { useState } from 'react';
import { ArrowRight, BarChart3, PiggyBank, ShoppingCart, type LucideIcon } from 'lucide-react';
import type { SuggestionGroup, TodaySuggestion } from '@shared/engine/suggestions';
import { addMonths, monthsBetween } from '@shared/engine/month';
import { formatMonthLocale, formatVndFull } from '@shared/format';
import { Badge, Button, ButtonLink, FormAlert, FormField, IconTile, MenuButton, Modal, MoneyInput, SectionCard, cx, type ExtTone } from '@/components/ui';
import { useDismissSuggestion, useRestoreSuggestions, useSaveGoal } from '@/lib/queries';
import { useLocale } from '@/app/locale';

const GROUP_STYLE: Record<SuggestionGroup, { icon: LucideIcon; tone: ExtTone; bg: string }> = {
  safety: { icon: PiggyBank, tone: 'green', bg: 'bg-[#F3F8F5] border-[#E1EEE6]' },
  saving: { icon: ShoppingCart, tone: 'orange', bg: 'bg-[#FFF8F0] border-[#F6E6D2]' },
  growth: { icon: BarChart3, tone: 'blue', bg: 'bg-[#F2F7FE] border-[#DCE8F8]' },
};

/** Badge theo nhóm + trạng thái. */
function badgeOf(s: TodaySuggestion): { key: string; tone: ExtTone } {
  if (s.urgent) return { key: 'urgent', tone: 'rose' };
  if (s.group === 'safety') return { key: s.key === 'emergency_setup' ? 'safety' : 'safety_ok', tone: 'green' };
  return s.group === 'saving' ? { key: 'saving', tone: 'green' } : { key: 'growth', tone: 'blue' };
}

export function SuggestionsCard({ suggestions }: { suggestions: TodaySuggestion[] }) {
  const { t, locale } = useLocale();
  const dismiss = useDismissSuggestion();
  const restore = useRestoreSuggestions();
  const [topup, setTopup] = useState<Extract<TodaySuggestion['action'], { kind: 'emergency_topup' }> | null>(null);

  const text = (s: TodaySuggestion, part: 'title' | 'body' | 'cta') => {
    const v = s.vars;
    const vars: Record<string, string | number> = {
      amount: v.amount !== undefined ? formatVndFull(v.amount) : '',
      months: v.months ?? '',
      minutes: v.minutes ?? '',
      pct: v.pct ?? '',
      skill: v.skill ?? '',
      items: v.items ?? '',
      category: v.category ? t(`category.${v.category}`).toLowerCase() : '',
      month: v.month ? formatMonthLocale(v.month, locale) : '',
    };
    const key = part === 'body' && s.key === 'skill_daily' && !v.pct ? 'body_nogoal' : part;
    return t(`overview.sugg.${s.key}.${key}`, vars);
  };

  return (
    <SectionCard title={t('overview.sugg.title')} action={{ label: t('overview.sugg.view_all'), to: '/ai-workspace' }} className="flex flex-col" bodyClassName="flex-1">
      {suggestions.length === 0 ? (
        <div className="flex h-full min-h-[160px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-line text-center">
          <p className="text-sm text-ink-soft">{t('overview.sugg.hidden_all')}</p>
          <Button variant="white" size="sm" onClick={() => restore.mutate()} disabled={restore.isPending}>
            {t('overview.sugg.show_again')}
          </Button>
        </div>
      ) : (
        <ul className="grid h-full gap-3 md:grid-cols-3">
          {suggestions.map((s) => {
            const style = GROUP_STYLE[s.group];
            const badge = badgeOf(s);
            return (
              <li key={s.group} className={cx('flex min-w-0 flex-col rounded-xl border p-4', style.bg)}>
                <div className="flex items-start justify-between gap-2">
                  <IconTile icon={style.icon} tone={style.tone} size="md" className="bg-white/80" />
                  <div className="flex items-center gap-1">
                    <Badge size="sm" tone={badge.tone} className="h-[22px] px-2 text-[11px]">
                      {t(`overview.sugg.badge.${badge.key}`)}
                    </Badge>
                    <MenuButton label={t('overview.sugg.menu')} items={[{ label: t('overview.sugg.hide_today'), onSelect: () => dismiss.mutate(s.group) }]} />
                  </div>
                </div>
                <h3 className="mt-3 text-[15px] font-bold leading-snug text-ink">{text(s, 'title')}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">{text(s, 'body')}</p>
                <div className="mt-auto pt-3.5">
                  {s.action.kind === 'emergency_topup' ? (
                    <Button size="sm" onClick={() => setTopup(s.action.kind === 'emergency_topup' ? s.action : null)} className="h-9 rounded-lg px-4">
                      {text(s, 'cta')}
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </Button>
                  ) : (
                    <ButtonLink
                      to={s.action.to}
                      variant="white"
                      size="sm"
                      className="h-9 rounded-lg border-[#DCE6F2] px-3.5 text-accent-600"
                    >
                      {text(s, 'cta')}
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </ButtonLink>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {topup && <TopupModal action={topup} onClose={() => setTopup(null)} />}
    </SectionCard>
  );
}

/** "Thực hiện ngay": xác nhận số tiền góp quỹ dự phòng mỗi tháng → cập nhật (hoặc tạo) mục tiêu quỹ dự phòng. */
function TopupModal({ action, onClose }: { action: Extract<TodaySuggestion['action'], { kind: 'emergency_topup' }>; onClose: () => void }) {
  const { t, locale } = useLocale();
  const save = useSaveGoal();
  const [amount, setAmount] = useState(action.suggested);
  const gap = Math.max(0, action.targetAmount - action.currentAmount);
  const months = amount > 0 ? Math.ceil(gap / amount) : 0;
  const now = new Date().toISOString().slice(0, 7);
  const reach = addMonths(now, months);

  const submit = () =>
    save.mutate(
      action.goalId
        ? { id: action.goalId, monthlyContribution: amount }
        : {
            kind: 'emergency',
            title: t('overview.topup.goal_title'),
            targetAmount: action.targetAmount,
            currentAmount: action.currentAmount,
            // Hạn mới theo số tiền góp (không sớm hơn hạn đã đề xuất)
            targetMonth: monthsBetween(action.targetMonth, reach) > 0 ? reach : action.targetMonth,
            monthlyContribution: amount,
            priority: 1,
          },
      { onSuccess: onClose },
    );

  return (
    <Modal title={t('overview.topup.title')} onClose={onClose}>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-slate-50 p-3">
          <dt className="text-ink-soft">{t('overview.topup.current')}</dt>
          <dd className="mt-1 font-bold text-ink tabular-nums">{formatVndFull(action.current)}</dd>
        </div>
        <div className="rounded-xl bg-primary-50 p-3">
          <dt className="text-ink-soft">{t('overview.topup.suggested')}</dt>
          <dd className="mt-1 font-bold text-primary-700 tabular-nums">{formatVndFull(action.suggested)}</dd>
        </div>
      </dl>
      <FormField label={t('overview.topup.amount')} className="mt-4">
        {(id) => <MoneyInput id={id} value={amount} onChange={setAmount} chips={[action.current, action.suggested].filter((v, i, a) => v > 0 && a.indexOf(v) === i)} autoFocus />}
      </FormField>
      <p className="mt-3 rounded-xl bg-accent-50 p-3 text-[13px] leading-relaxed text-ink">
        {amount > 0
          ? t('overview.topup.result', { amount: formatVndFull(amount), target: formatVndFull(action.targetAmount), months, month: formatMonthLocale(reach, locale) })
          : t('overview.topup.result_zero')}
      </p>
      <div className="mt-3">
        <FormAlert error={save.error} />
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="white" onClick={onClose}>
          {t('overview.topup.cancel')}
        </Button>
        <Button onClick={submit} disabled={save.isPending || amount <= 0}>
          {t('overview.topup.confirm')}
        </Button>
      </div>
    </Modal>
  );
}
