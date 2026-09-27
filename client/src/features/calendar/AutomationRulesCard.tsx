import { CalendarCheck, GraduationCap, Receipt, Users, type LucideIcon } from 'lucide-react';
import type { AutomationRuleKey } from '@shared/types/api';
import { IconTile, SectionCard, Toggle, type ExtTone } from '@/components/ui';
import { useAutomationRules, useToggleRule } from '@/lib/queries';
import { useLocale } from '@/app/locale';

const META: Record<AutomationRuleKey, { icon: LucideIcon; tone: ExtTone }> = {
  weekly_review: { icon: CalendarCheck, tone: 'green' },
  bill_reminder: { icon: Receipt, tone: 'amber' },
  skill_block: { icon: GraduationCap, tone: 'violet' },
  freelance_followup: { icon: Users, tone: 'rose' },
};

/** 4 quy tắc tự động — bật/tắt lưu ngay (PUT /api/automation-rules/:key), engine xếp lịch đọc lại. */
export function AutomationRulesCard() {
  const { t } = useLocale();
  const { data } = useAutomationRules();
  const toggle = useToggleRule();
  return (
    <SectionCard title={t('calendar.rules.title')} className="!p-4" bodyClassName="space-y-3">
      {(data ?? []).map((r) => {
        const m = META[r.key];
        const title = t(`calendar.rules.${r.key}.title`);
        return (
          <div key={r.key} className="flex items-center gap-3">
            <IconTile icon={m.icon} tone={m.tone} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold leading-snug text-ink">{title}</p>
              <p className="text-[12px] text-ink-soft">{t(`calendar.rules.${r.key}.desc`)}</p>
            </div>
            <Toggle checked={r.enabled} onChange={(enabled) => toggle.mutate({ key: r.key, enabled })} label={title} />
          </div>
        );
      })}
    </SectionCard>
  );
}
