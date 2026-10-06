import { forwardRef } from 'react';
import { Pencil, Plus, PieChart } from 'lucide-react';
import type { AssetCategory, Holding } from '@shared/types/domain';
import { formatVndFull } from '@shared/format';
import { isInvestment } from '@shared/engine/portfolio';
import { Badge, Button, EmptyState, SectionCard, cx } from '@/components/ui';
import { useLocale } from '@/app/locale';
import { CATEGORY_COLOR } from './RiskRow';

/** Bảng các khoản (thêm / sửa ngành, cổ phiếu công ty mình, thuộc danh mục hay không). */
export const HoldingsCard = forwardRef<HTMLDivElement, { holdings: Holding[]; highlight: AssetCategory | null; onAdd: () => void; onEdit: (h: Holding) => void }>(
  function HoldingsCard({ holdings, highlight, onAdd, onEdit }, ref) {
    const { t } = useLocale();
    const groups = [
      { key: 'invest', label: t('portfolio.holdings.invest'), items: holdings.filter(isInvestment) },
      { key: 'other', label: t('portfolio.holdings.other'), items: holdings.filter((h) => !isInvestment(h)) },
    ].filter((g) => g.items.length > 0);
    return (
      <div ref={ref} className="scroll-mt-24">
        <SectionCard title={t('portfolio.holdings.title')} extra={<Button variant="soft" size="sm" icon={Plus} onClick={onAdd}>{t('portfolio.holdings.add')}</Button>}>
          {groups.length === 0 ? (
            <EmptyState
              icon={PieChart}
              tone="blue"
              title="Chưa có tài sản nào"
              body="Thêm tiền gửi, cổ phiếu, bất động sản hoặc vàng để theo dõi danh mục và rủi ro tập trung."
              action={
                <Button variant="primary" size="sm" icon={Plus} onClick={onAdd}>
                  {t('portfolio.holdings.add')}
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {groups.map((g) => (
                <div key={g.key} className="min-w-0">
                  <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-wider text-ink-mute">{g.label}</p>
                  <ul className="divide-y divide-line">
                    {g.items.map((h) => (
                      <li key={h.id} className={cx('flex items-center gap-3 rounded-lg px-1 py-2.5', highlight === h.category && isInvestment(h) && 'bg-accent-50/60')}>
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: CATEGORY_COLOR[h.category] }} aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-medium text-ink">{h.name}</span>
                          <span className="mt-0.5 flex flex-wrap gap-1.5 text-[12px] text-ink-soft">
                            {t(`portfolio.cat.${h.category}`)}
                            {h.sector && h.sector !== 'other' && <span>· {t(`portfolio.sector.${h.sector}`)}</span>}
                          </span>
                        </span>
                        {h.isEmployerStock && <Badge size="sm" tone="red">{t('portfolio.holdings.employer')}</Badge>}
                        <span className="whitespace-nowrap text-[14px] font-semibold text-ink tabular-nums">{formatVndFull(h.value)}</span>
                        <button type="button" onClick={() => onEdit(h)} className="rounded-lg p-2 text-ink-mute hover:bg-slate-100 hover:text-ink" aria-label={t('portfolio.holdings.edit', { name: h.name })}>
                          <Pencil className="h-4 w-4" aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    );
  },
);
