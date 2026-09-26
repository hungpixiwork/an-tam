import { useState } from 'react';
import { Target, TrendingUp, Clock, Hourglass, Trash2, Plus, Info } from 'lucide-react';
import { formatVnd } from '@shared/format';
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
  const [activeTab, setActiveTab] = useState<'plan' | 'hours' | 'time'>('plan');
  
  const TABS = [
    { value: 'plan', label: 'Kế hoạch tăng thu nhập' },
    { value: 'hours', label: 'Giờ giá trị' },
    { value: 'time', label: 'Quỹ thời gian' },
  ];

  return (
    <div className="space-y-4 pb-8">
      <PageHero
        eyebrow="Tăng thu nhập"
        title="Đầu tư vào bản thân"
        highlight={<span className="text-primary-700">Tăng thu nhập</span>}
        subtitle={<span>Thay vì cắt giảm chi tiêu, hãy tìm cách gia tăng thu nhập của bạn qua việc đầu tư thời gian hiệu quả.</span>}
        scene={(cls) => <WindingPath className={cls} />}
      />

      <Segmented 
        label="Chọn mục hiển thị"
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
        <CardTitle icon={TrendingUp} title="Kế hoạch của bạn" subtitle="Xác định mục tiêu tăng thu nhập" />
        {form && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Thu nhập hiện tại">
                {(id) => <MoneyInput id={id} value={form.currentIncome} onChange={(v) => setForm({ ...form, currentIncome: v })} />}
              </FormField>
              <FormField label="Mục tiêu thu nhập">
                {(id) => <MoneyInput id={id} value={form.targetIncome} onChange={(v) => setForm({ ...form, targetIncome: v })} />}
              </FormField>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Công việc hiện tại">
                {(id) => <TextInput id={id} value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} placeholder="VD: Nhân viên văn phòng" />}
              </FormField>
              <FormField label="Khoảng thời gian (tháng)">
                {(id) => (
                  <select 
                    id={id}
                    className="w-full rounded-lg border border-line bg-white px-3 py-2 text-[15px] text-ink outline-none transition-colors focus:border-primary-500"
                    value={form.targetMonths} 
                    onChange={(e) => setForm({ ...form, targetMonths: Number(e.target.value) })}
                  >
                    <option value={6}>6 tháng</option>
                    <option value={12}>12 tháng</option>
                    <option value={18}>18 tháng</option>
                    <option value={24}>24 tháng</option>
                  </select>
                )}
              </FormField>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Giờ/tuần đầu tư">
                {(id) => <TextInput id={id} type="number" value={form.hoursPerWeek} onChange={(e) => setForm({ ...form, hoursPerWeek: Number(e.target.value) })} />}
              </FormField>
              <FormField label="Kỹ năng tập trung">
                {(id) => <TextInput id={id} value={form.focusSkill} onChange={(e) => setForm({ ...form, focusSkill: e.target.value })} placeholder="VD: Lập trình, tiếng Anh..." />}
              </FormField>
            </div>
            {isChanged && (
              <div className="pt-2">
                <Button onClick={handleSave} disabled={saveProfile.isPending}>Lưu kế hoạch</Button>
              </div>
            )}
          </div>
        )}
      </Card>

      <div className="space-y-4">
        {summary && summary.plan && (
          <Card tone="mint">
            <CardTitle icon={Target} tone="green" title="Tổng quan chiến lược" />
            <div className="space-y-3">
              <p className="text-[15px] text-ink">
                Mục tiêu: từ <span className="font-bold">{formatVnd(summary.plan.currentIncome)}</span> → <span className="font-bold">{formatVnd(summary.plan.targetIncome)}</span>/tháng trong {summary.plan.targetMonths} tháng tới.
              </p>
              <p className="text-[15px] text-ink">
                Bạn có khoảng <span className="font-bold">{summary.plan.hoursPerWeek}</span> giờ/tuần = <span className="font-bold">{summary.plan.totalAvailableHours}</span> giờ tổng cộng để rèn luyện.
              </p>
              <p className="text-[15px] text-ink">
                Tập trung: <span className="font-bold">{summary.plan.focusSkill}</span>
              </p>
              
              {summary.plan.recommendations && summary.plan.recommendations.length > 0 && (
                <div className="mt-4 rounded-xl bg-white p-3 border border-[#D7EFE2]">
                  <p className="mb-2 text-sm font-semibold text-ink">Gợi ý hành động:</p>
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
            <CardTitle icon={TrendingUp} tone="blue" title="Tác động đến tài chính" />
            <div className="space-y-3">
              <p className="text-[15px] text-ink">
                Nếu đạt mục tiêu, bạn có thể tăng thêm <span className="font-bold text-primary-700">{formatVnd(summary.connection.additionalMonthlyIncome)}</span>/tháng.
              </p>
              {summary.connection.goalAcceleration && (
                <p className="text-[15px] text-ink">
                  Điều này giúp bạn đạt mục tiêu <span className="font-semibold">"{summary.connection.goalAcceleration.goalTitle}"</span> sớm hơn <span className="font-bold">{summary.connection.goalAcceleration.monthsSaved}</span> tháng!
                </p>
              )}
              <p className="text-xs text-ink-soft italic mt-2">
                * Đây là kịch bản dựa trên mục tiêu bạn đặt, không phải dự đoán chắc chắn.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function ValueHoursTab() {
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
        <CardTitle icon={Clock} title="Giờ giá trị tuần này" subtitle="Phân bổ thời gian cho các hoạt động tăng thu nhập" />
        
        <div className="space-y-4">
          {(!activities || activities.length === 0) ? (
            <EmptyState icon={Clock} title="Chưa có hoạt động" body="Thêm các hoạt động bạn dự định làm để tăng thu nhập." />
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-[1fr_80px_80px_40px] gap-2 items-end px-2 text-xs font-semibold text-ink-soft">
                <span>Hoạt động</span>
                <span className="text-center">Kế hoạch</span>
                <span className="text-center">Thực tế</span>
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
                placeholder="Tên hoạt động mới..." 
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddActivity()}
              />
            </div>
            <Button onClick={handleAddActivity} disabled={createAct.isPending} variant="soft" icon={Plus}>Thêm</Button>
          </div>
          
          {isHoursChanged && (
            <div className="pt-4 flex justify-end">
              <Button onClick={handleSaveHours} disabled={saveHours.isPending}>Lưu số giờ</Button>
            </div>
          )}
        </div>
      </Card>

      <div className="space-y-4">
        {summary && summary.hours && (
          <Card tone="violet">
            <CardTitle icon={Clock} tone="violet" title="Tổng kết tuần" />
            <div className="space-y-4">
              <p className="text-[15px] text-ink">
                Tuần này bạn dự định đầu tư <span className="font-bold text-primary-700">{summary.hours.totalPlanned}</span> giờ vào khả năng tăng thu nhập, và đã thực hiện được <span className="font-bold text-primary-700">{summary.hours.totalActual}</span> giờ.
              </p>
              
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-ink-soft">
                  <span>Tiến độ thực tế</span>
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
        <CardTitle icon={Hourglass} title="Phân bổ 168 giờ" subtitle="Bạn đang dành bao nhiêu thời gian cho mỗi việc?" />
        
        {localAlloc && (
          <div className="space-y-5">
            <div className="h-6 w-full rounded-full flex overflow-hidden bg-slate-100">
              {localAlloc.map(a => (
                a.hours > 0 ? (
                  <div 
                    key={a.category} 
                    style={{ width: `${(a.hours / 168) * 100}%`, backgroundColor: COLORS[a.category] || '#ccc' }} 
                    title={`${a.category}: ${a.hours}h`}
                  />
                ) : null
              ))}
              {unallocated > 0 && (
                <div style={{ width: `${(unallocated / 168) * 100}%`, backgroundColor: '#e2e8f0' }} title={`Chưa phân bổ: ${unallocated}h`} />
              )}
            </div>

            <div className="space-y-3">
              {localAlloc.map(a => (
                <div key={a.category} className="grid grid-cols-[1fr_80px_40px] gap-3 items-center">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[a.category] || '#ccc' }} />
                    <span className="text-sm font-medium text-ink">{a.category}</span>
                  </div>
                  <TextInput 
                    type="number" 
                    value={a.hours} 
                    onChange={(e) => updateAlloc(a.category, Number(e.target.value))} 
                  />
                  <span className="text-sm text-ink-soft text-right">giờ</span>
                </div>
              ))}
              
              <div className="grid grid-cols-[1fr_80px_40px] gap-3 items-center pt-2 border-t border-line">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-slate-200" />
                  <span className="text-sm font-medium text-ink">Chưa phân bổ</span>
                </div>
                <div className="text-right font-medium px-3 text-ink-soft">{unallocated}</div>
                <span className="text-sm text-ink-soft text-right">giờ</span>
              </div>
            </div>

            {isAllocChanged && (
              <div className="pt-2 flex justify-end">
                <Button onClick={handleSaveAlloc} disabled={saveAlloc.isPending || unallocated < 0}>
                  {unallocated < 0 ? 'Quá 168 giờ!' : 'Lưu phân bổ'}
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      <div className="space-y-4">
        {summary && summary.time && (
          <Card tone="sky">
            <CardTitle icon={Info} tone="blue" title="Góc nhìn từ AI" />
            <div className="space-y-4">
              {summary.time.insight ? (
                <p className="text-[15px] leading-relaxed text-ink">{summary.time.insight}</p>
              ) : (
                <p className="text-[15px] leading-relaxed text-ink">
                  Bạn đang có một quỹ thời gian tương đối cân bằng. Hãy tiếp tục duy trì!
                </p>
              )}
              
              {unallocated > 0 && (
                <div className="rounded-xl bg-blue-50 p-3 border border-blue-100">
                  <p className="text-[13px] text-blue-800">
                    Bạn còn <span className="font-bold">{unallocated}</span> giờ chưa phân bổ. Đây có thể là thời gian tiềm năng để học thêm kỹ năng mới hoặc nghỉ ngơi.
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
