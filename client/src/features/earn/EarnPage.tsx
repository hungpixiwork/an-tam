import { useState } from 'react';
import { Target, TrendingUp, Clock, Hourglass, Trash2, Plus, Info } from 'lucide-react';
import { formatCurrency } from '@shared/format';
import { useLocale } from '@/app/locale';
import { Button, Card, CardTitle, EmptyState, PageSkeleton, ProgressBar } from '@/components/ui';
import { FormField, TextInput, MoneyInput, Segmented } from '@/components/ui/form';
import { PageHero } from '@/components/ui/PageHero';
import { WindingPath } from '@/components/pixel/scenes/WindingPath';
import { 
  useEarnProfile, useSaveEarnProfile,
  useEarnActivities, useCreateActivity, useDeleteActivity,
  useEarnHours, useSaveEarnHours,
  useEarnTime, useSaveEarnTime,
  useEarnSummary,
} from '@/lib/queries';
import type { EarnProfile, EarnHourEntry, EarnTimeAlloc } from '@/lib/queries';

export default function EarnPage() {
  const { t } = useLocale();
  const [activeTab, setActiveTab] = useState<'plan' | 'hours' | 'time'>('plan');
  
  const TABS = [
    { value: 'plan', label: t('earn.tab_plan') },
    { value: 'hours', label: t('earn.tab_hours') },
    { value: 'time', label: t('earn.tab_time') },
  ];

  return (
    <div className="space-y-4 pb-8">
      <PageHero
        eyebrow={t('earn.hero_eyebrow')}
        title={t('earn.hero_title')}
        highlight={<span className="text-primary-700">{t('earn.hero_highlight')}</span>}
        subtitle={<span>{t('earn.hero_subtitle')}</span>}
        scene={(cls) => <WindingPath className={cls} />}
      />

      <Segmented 
        label={t('earn.tab_selector')}
        options={TABS} 
        value={activeTab} 
        onChange={(v) => setActiveTab(v as any)} 
      />

      {activeTab === 'plan' && <IncomeGrowthTab />}
      {activeTab === 'hours' && <ValueHoursTab />}
      {activeTab === 'time' && <TimeAllocationTab />}
    </div>
  );
}

function IncomeGrowthTab() {
  const { t, currency } = useLocale();
  const { data: profile, isPending: isProfilePending } = useEarnProfile();
  const { data: summary, isPending: isSummaryPending } = useEarnSummary();
  const saveProfile = useSaveEarnProfile();

  const [form, setForm] = useState<EarnProfile | null>(null);

  // Initialize form when profile loads
  if (profile && !form) {
    setForm(profile);
  }

  if (isProfilePending || isSummaryPending) return <PageSkeleton />;

  const isChanged = profile && form && JSON.stringify(profile) !== JSON.stringify(form);

  const handleSave = () => {
    if (form) saveProfile.mutate(form);
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr]">
      <Card>
        <CardTitle icon={TrendingUp} title={t('earn.plan_card_title')} subtitle={t('earn.plan_card_subtitle')} />
        {form && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={t('earn.current_income')}>
                {(id) => <MoneyInput id={id} value={form.currentIncome} onChange={(v) => setForm({ ...form, currentIncome: v })} />}
              </FormField>
              <FormField label={t('earn.target_income')}>
                {(id) => <MoneyInput id={id} value={form.targetIncome} onChange={(v) => setForm({ ...form, targetIncome: v })} />}
              </FormField>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={t('earn.occupation')}>
                {(id) => <TextInput id={id} value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} placeholder={t('earn.occupation_placeholder')} />}
              </FormField>
              <FormField label={t('earn.timeframe')}>
                {(id) => (
                  <select 
                    id={id}
                    className="w-full rounded-lg border border-line bg-white px-3 py-2 text-[15px] text-ink outline-none transition-colors focus:border-primary-500"
                    value={form.targetMonths} 
                    onChange={(e) => setForm({ ...form, targetMonths: Number(e.target.value) })}
                  >
                    <option value={6}>{t('earn.months_n', { n: 6 })}</option>
                    <option value={12}>{t('earn.months_n', { n: 12 })}</option>
                    <option value={18}>{t('earn.months_n', { n: 18 })}</option>
                    <option value={24}>{t('earn.months_n', { n: 24 })}</option>
                  </select>
                )}
              </FormField>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={t('earn.hours_per_week')}>
                {(id) => <TextInput id={id} type="number" value={form.hoursPerWeek} onChange={(e) => setForm({ ...form, hoursPerWeek: Number(e.target.value) })} />}
              </FormField>
              <FormField label={t('earn.focus_skill')}>
                {(id) => <TextInput id={id} value={form.focusSkill} onChange={(e) => setForm({ ...form, focusSkill: e.target.value })} placeholder={t('earn.focus_skill_placeholder')} />}
              </FormField>
            </div>
            {isChanged && (
              <div className="pt-2">
                <Button onClick={handleSave} disabled={saveProfile.isPending}>{t('earn.save_plan')}</Button>
              </div>
            )}
          </div>
        )}
      </Card>

      <div className="space-y-4">
        {summary && summary.plan && (
          <Card tone="mint">
            <CardTitle icon={Target} tone="green" title={t('earn.strategy_title')} />
            <div className="space-y-3">
              <p className="text-[15px] text-ink">
                {t('earn.plan_summary_target', {
                  current: formatCurrency(summary.plan.currentIncome, currency),
                  target: formatCurrency(summary.plan.targetIncome, currency),
                  months: summary.plan.targetMonths,
                })}
              </p>
              <p className="text-[15px] text-ink">
                {t('earn.plan_summary_hours', {
                  hours: summary.plan.hoursPerWeek,
                  total: summary.plan.totalAvailableHours,
                })}
              </p>
              <p className="text-[15px] text-ink">
                {t('earn.plan_summary_focus', { skill: summary.plan.focusSkill })}
              </p>
              
              {summary.plan.recommendations && summary.plan.recommendations.length > 0 && (
                <div className="mt-4 rounded-xl bg-white p-3 border border-[#D7EFE2]">
                  <p className="mb-2 text-sm font-semibold text-ink">{t('earn.recommendations_title')}</p>
                  <ul className="list-disc pl-5 text-sm text-ink-soft space-y-1">
                    {summary.plan.recommendations.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Card>
        )}
        
        {summary && summary.connection && (
          <Card tone="sky">
            <CardTitle icon={TrendingUp} tone="blue" title={t('earn.financial_impact_title')} />
            <div className="space-y-3">
              <p className="text-[15px] text-ink">
                {t('earn.impact_additional_income', {
                  amount: formatCurrency(summary.connection.additionalMonthlyIncome, currency),
                })}
              </p>
              {summary.connection.goalAcceleration && (
                <p className="text-[15px] text-ink">
                  {t('earn.impact_accelerate_goal', {
                    goal: summary.connection.goalAcceleration.goalTitle,
                    months: summary.connection.goalAcceleration.monthsSaved,
                  })}
                </p>
              )}
              <p className="text-xs text-ink-soft italic mt-2">
                {t('earn.disclaimer')}
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function ValueHoursTab() {
  const { t } = useLocale();
  const currentWeek = "2026-W39"; // Mock current week for now
  
  const { data: activities, isPending: isActPending } = useEarnActivities();
  const { data: hours, isPending: isHoursPending } = useEarnHours(currentWeek);
  const { data: summary, isPending: isSummaryPending } = useEarnSummary();
  
  const createAct = useCreateActivity();
  const deleteAct = useDeleteActivity();
  const saveHours = useSaveEarnHours();

  const [newTitle, setNewTitle] = useState("");
  const [localHours, setLocalHours] = useState<EarnHourEntry[] | null>(null);

  if (hours && !localHours) {
    setLocalHours(hours);
  }

  if (isActPending || isHoursPending || isSummaryPending) return <PageSkeleton />;

  const isHoursChanged = hours && localHours && JSON.stringify(hours) !== JSON.stringify(localHours);

  const handleAddActivity = () => {
    if (newTitle.trim()) {
      createAct.mutate(newTitle.trim(), {
        onSuccess: () => setNewTitle("")
      });
    }
  };

  const handleSaveHours = () => {
    if (localHours) {
      saveHours.mutate({
        week: currentWeek,
        entries: localHours.map(h => ({ activityId: h.activityId, planned: h.planned, actual: h.actual }))
      });
    }
  };

  const updateHour = (activityId: string, field: 'planned' | 'actual', val: number) => {
    if (!localHours) return;
    setLocalHours(localHours.map(h => h.activityId === activityId ? { ...h, [field]: val } : h));
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_1fr]">
      <Card>
        <CardTitle icon={Clock} title={t('earn.hours_card_title')} subtitle={t('earn.hours_card_subtitle')} />
        
        <div className="space-y-4">
          {(!activities || activities.length === 0) ? (
            <EmptyState icon={Clock} title={t('earn.no_activity_title')} body={t('earn.no_activity_body')} />
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-[1fr_80px_80px_40px] gap-2 items-end px-2 text-xs font-semibold text-ink-soft">
                <span>{t('earn.th_activity')}</span>
                <span className="text-center">{t('earn.th_planned')}</span>
                <span className="text-center">{t('earn.th_actual')}</span>
                <span></span>
              </div>
              
              {activities.map(act => {
                const h = localHours?.find(x => x.activityId === act.id) || { planned: 0, actual: 0 };
                return (
                  <div key={act.id} className="grid grid-cols-[1fr_80px_80px_40px] gap-2 items-center rounded-xl bg-slate-50 p-2 border border-line">
                    <span className="text-[14px] font-medium text-ink px-2 truncate">{act.title}</span>
                    <TextInput 
                      type="number" 
                      value={h.planned} 
                      onChange={(e) => updateHour(act.id, 'planned', Number(e.target.value))} 
                    />
                    <TextInput 
                      type="number" 
                      value={h.actual} 
                      onChange={(e) => updateHour(act.id, 'actual', Number(e.target.value))} 
                    />
                    <button 
                      onClick={() => deleteAct.mutate(act.id)}
                      className="p-2 text-danger-500 hover:bg-danger-50 rounded-lg flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex gap-2 items-center pt-4 border-t border-line">
            <div className="flex-1">
              <TextInput 
                placeholder={t('earn.new_activity_placeholder')} 
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddActivity()}
              />
            </div>
            <Button onClick={handleAddActivity} disabled={createAct.isPending} variant="soft" icon={Plus}>{t('earn.add_btn')}</Button>
          </div>
          
          {isHoursChanged && (
            <div className="pt-4 flex justify-end">
              <Button onClick={handleSaveHours} disabled={saveHours.isPending}>{t('earn.save_hours_btn')}</Button>
            </div>
          )}
        </div>
      </Card>

      <div className="space-y-4">
        {summary && summary.hours && (
          <Card tone="violet">
            <CardTitle icon={Clock} tone="violet" title={t('earn.week_summary_title')} />
            <div className="space-y-4">
              <p className="text-[15px] text-ink">
                {t('earn.week_summary_desc', {
                  planned: summary.hours.totalPlanned,
                  actual: summary.hours.totalActual,
                })}
              </p>
              
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-ink-soft">
                  <span>{t('earn.actual_progress')}</span>
                  <span>{Math.round((summary.hours.totalActual / Math.max(summary.hours.totalPlanned, 1)) * 100)}%</span>
                </div>
                <ProgressBar 
                  value={summary.hours.totalActual / Math.max(summary.hours.totalPlanned, 1)} 
                  color="#8b5cf6" 
                />
              </div>

              {summary.hours.insight && (
                <div className="rounded-xl bg-white p-3 border border-[#E9D5FF]">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
                    <p className="text-[13px] text-ink-soft">{summary.hours.insight}</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function TimeAllocationTab() {
  const { t } = useLocale();
  const { data: allocations, isPending: isAllocPending } = useEarnTime();
  const { data: summary, isPending: isSummaryPending } = useEarnSummary();
  const saveAlloc = useSaveEarnTime();

  const [localAlloc, setLocalAlloc] = useState<EarnTimeAlloc[] | null>(null);

  if (allocations && !localAlloc) {
    setLocalAlloc(allocations);
  }

  if (isAllocPending || isSummaryPending) return <PageSkeleton />;

  const isAllocChanged = allocations && localAlloc && JSON.stringify(allocations) !== JSON.stringify(localAlloc);
  const totalAllocated = localAlloc?.reduce((sum, a) => sum + a.hours, 0) || 0;
  const unallocated = 168 - totalAllocated;

  const handleSaveAlloc = () => {
    if (localAlloc) saveAlloc.mutate(localAlloc);
  };

  const updateAlloc = (category: string, hours: number) => {
    if (!localAlloc) return;
    setLocalAlloc(localAlloc.map(a => a.category === category ? { ...a, hours } : a));
  };

  const getCatLabel = (cat: string) => {
    switch (cat) {
      case 'Ngủ': return t('earn.cat_sleep');
      case 'Công việc/học chính': return t('earn.cat_work');
      case 'Sinh hoạt & di chuyển': return t('earn.cat_living');
      case 'Giải trí & thư giãn': return t('earn.cat_leisure');
      case 'Phát triển bản thân (Tăng thu nhập)': return t('earn.cat_growth');
      default: return cat;
    }
  };

  const COLORS: Record<string, string> = {
    'Ngủ': '#94a3b8',
    'Công việc/học chính': '#3b82f6',
    'Sinh hoạt & di chuyển': '#f59e0b',
    'Giải trí & thư giãn': '#10b981',
    'Phát triển bản thân (Tăng thu nhập)': '#8b5cf6',
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr]">
      <Card>
        <CardTitle icon={Hourglass} title={t('earn.time_card_title')} subtitle={t('earn.time_card_subtitle')} />
        
        {localAlloc && (
          <div className="space-y-5">
            <div className="h-6 w-full rounded-full flex overflow-hidden bg-slate-100">
              {localAlloc.map(a => (
                a.hours > 0 ? (
                  <div 
                    key={a.category} 
                    style={{ width: `${(a.hours / 168) * 100}%`, backgroundColor: COLORS[a.category] || '#ccc' }} 
                    title={`${getCatLabel(a.category)}: ${a.hours}h`}
                  />
                ) : null
              ))}
              {unallocated > 0 && (
                <div style={{ width: `${(unallocated / 168) * 100}%`, backgroundColor: '#e2e8f0' }} title={`${t('earn.unallocated')}: ${unallocated}h`} />
              )}
            </div>

            <div className="space-y-3">
              {localAlloc.map(a => (
                <div key={a.category} className="grid grid-cols-[1fr_80px_40px] gap-3 items-center">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[a.category] || '#ccc' }} />
                    <span className="text-sm font-medium text-ink">{getCatLabel(a.category)}</span>
                  </div>
                  <TextInput 
                    type="number" 
                    value={a.hours} 
                    onChange={(e) => updateAlloc(a.category, Number(e.target.value))} 
                  />
                  <span className="text-sm text-ink-soft text-right">{t('earn.hours_unit')}</span>
                </div>
              ))}
              
              <div className="grid grid-cols-[1fr_80px_40px] gap-3 items-center pt-2 border-t border-line">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-slate-200" />
                  <span className="text-sm font-medium text-ink">{t('earn.unallocated')}</span>
                </div>
                <div className="text-right font-medium px-3 text-ink-soft">{unallocated}</div>
                <span className="text-sm text-ink-soft text-right">{t('earn.hours_unit')}</span>
              </div>
            </div>

            {isAllocChanged && (
              <div className="pt-2 flex justify-end">
                <Button onClick={handleSaveAlloc} disabled={saveAlloc.isPending || unallocated < 0}>
                  {unallocated < 0 ? t('earn.over_168_hours') : t('earn.save_alloc_btn')}
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      <div className="space-y-4">
        {summary && summary.time && (
          <Card tone="sky">
            <CardTitle icon={Info} tone="blue" title={t('earn.ai_perspective_title')} />
            <div className="space-y-4">
              {summary.time.insight ? (
                <p className="text-[15px] leading-relaxed text-ink">{summary.time.insight}</p>
              ) : (
                <p className="text-[15px] leading-relaxed text-ink">
                  {t('earn.balanced_time_desc')}
                </p>
              )}
              
              {unallocated > 0 && (
                <div className="rounded-xl bg-blue-50 p-3 border border-blue-100">
                  <p className="text-[13px] text-blue-800">
                    {t('earn.unallocated_desc', { hours: unallocated })}
                  </p>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
