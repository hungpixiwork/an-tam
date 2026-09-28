// Trang 7 — Danh mục & rủi ro tập trung (mockup 7). Số liệu: GET /api/portfolio/risk, POST /api/portfolio/what-if, /api/holdings.

import { useRef, useState } from 'react';
import { ArrowRight, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { AssetCategory, Holding } from '@shared/types/domain';
import { ErrorState, PageSkeleton } from '@/components/ui';
import { useLocale } from '@/app/locale';
import { useAllocation, useHoldings, usePortfolioRisk } from '@/lib/queries';
import { HoldingFormModal } from './HoldingFormModal';
import { HoldingsCard } from './HoldingsCard';
import { KpiRow } from './KpiRow';
import { AllocationCard, EmployerCard, RiskGaugeCard } from './RiskRow';
import { SectorCard } from './SectorCard';
import { WhatIfCard } from './WhatIfCard';
import { DecisionStrip } from '@/components/actions/DecisionStrip';
import { useFocusParam } from '@/lib/useFocusParam';

export default function PortfolioPage() {
  const { t } = useLocale();
  const risk = usePortfolioRisk();
  const holdings = useHoldings();
  const allocation = useAllocation();
  // undefined = đóng; null = thêm mới; Holding = đang sửa
  const [editing, setEditing] = useState<Holding | null | undefined>(undefined);
  const [highlight, setHighlight] = useState<AssetCategory | null>(null);
  const sectorRef = useRef<HTMLDivElement>(null);
  const holdingsRef = useRef<HTMLDivElement>(null);
  const whatIfRef = useRef<HTMLDivElement>(null);
  // ?focus=employer (từ gợi ý "Giảm tài sản tập trung") → tới khối thử phân bổ lại
  useFocusParam(!risk.isPending && !holdings.isPending);

  if (risk.isPending || holdings.isPending) return <PageSkeleton />;
  if (risk.error || holdings.error) return <ErrorState error={risk.error ?? holdings.error} onRetry={() => (risk.refetch(), holdings.refetch())} />;
  const data = risk.data;
  const scrollTo = (el: HTMLDivElement | null) => el?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="space-y-3.5">
      <header className="flex flex-wrap items-start justify-between gap-3 pt-1">
        <div className="min-w-0">
          <h1 className="text-[30px] font-extrabold leading-tight tracking-tight text-ink">{t('portfolio.hero.title')}</h1>
          <p className="mt-1 text-[14.5px] text-ink-soft">{t('portfolio.hero.subtitle')}</p>
        </div>
        <Link
          to="/cong-dong"
          className="inline-flex items-center gap-2.5 rounded-xl border border-line bg-white px-4 py-2.5 text-[13px] font-semibold text-accent-600 shadow-card hover:bg-accent-50"
        >
          <BookOpen className="h-5 w-5" aria-hidden />
          {t('portfolio.learn')}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </header>

      <DecisionStrip domain="portfolio" />
      <KpiRow nw={data.netWorth} />

      <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-[1.6fr_1fr_1fr]">
        <AllocationCard
          risk={data}
          plan={allocation.data}
          onPick={(c) => {
            setHighlight(c);
            scrollTo(holdingsRef.current);
          }}
        />
        <EmployerCard risk={data} onDiversify={() => scrollTo(whatIfRef.current)} />
        <RiskGaugeCard risk={data} onDetail={() => scrollTo(sectorRef.current)} />
      </div>

      <SectorCard ref={sectorRef} risk={data} />

      <div ref={whatIfRef} id="focus-employer" className="scroll-mt-24">
        <WhatIfCard />
      </div>

      <HoldingsCard ref={holdingsRef} holdings={holdings.data} highlight={highlight} onAdd={() => setEditing(null)} onEdit={setEditing} />

      {editing !== undefined && <HoldingFormModal key={editing?.id ?? 'new'} holding={editing} onClose={() => setEditing(undefined)} />}
    </div>
  );
}
