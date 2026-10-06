// Trang 2 — Sổ thu chi & dòng tiền (mockup 2). Số liệu từ GET /api/ledger/dashboard (engine budget/bills/split).
// Tab: Tổng quan (mặc định) · Tất cả giao dịch (?tab=giao-dich) · Thói quen (?tab=thoi-quen, gộp từ trang cũ).

import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Target, Users } from 'lucide-react';
import { Button, ErrorState, PageSkeleton, cx } from '@/components/ui';
import { useLedgerDashboard } from '@/lib/queries';
import { useLocale } from '@/app/locale';

import { KpiRow } from './KpiRow';
import { CashflowChartCard } from './CashflowChartCard';
import { CategoryDonutCard } from './CategoryDonutCard';
import { AdviceCard } from './AdviceCard';
import { RecentTransactionsCard } from './RecentTransactionsCard';
import { BillsCard } from './BillsCard';
import { SavingsBanner } from './SavingsBanner';
import { AddTransactionModal } from './TransactionForm';
import { SplitModal } from './SplitModal';
import { BudgetModal } from './BudgetModal';
import { DecisionStrip } from '@/components/actions/DecisionStrip';
import TransactionsTab from './TransactionsTab';
import HabitsTab from './HabitsTab';

type Tab = 'tong-quan' | 'giao-dich' | 'thoi-quen';
type ModalKind = 'add' | 'split' | 'budget' | null;

export default function LedgerPage() {
  const { t } = useLocale();
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab');
  const tab: Tab = raw === 'giao-dich' || raw === 'thoi-quen' ? raw : 'tong-quan';
  // ?modal=budget (từ gợi ý "Đặt ngân sách tháng sau") → mở luôn hộp ngân sách
  const [modal, setModal] = useState<ModalKind>(() => (params.get('modal') === 'budget' ? 'budget' : null));
  const setTab = (k: Tab) => setParams(k === 'tong-quan' ? {} : { tab: k }, { replace: true });

  const tabs: { key: Tab; label: string }[] = [
    { key: 'tong-quan', label: t('ledger.tab.overview') },
    { key: 'giao-dich', label: t('ledger.tab.transactions') },
    { key: 'thoi-quen', label: t('ledger.tab.habits') },
  ];

  return (
    <div className="space-y-3.5">
      {/* ── Tiêu đề + Tabs + Actions Toolbar ── */}
      <header className="flex flex-col gap-3 pb-1 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 md:justify-start md:gap-x-4">
            <h1 className="text-[20px] font-extrabold leading-tight tracking-tight text-ink md:text-[28px]">
              {t('ledger.page_title')}
            </h1>
            <nav role="tablist" aria-label={t('ledger.page_title')} className="flex gap-1 rounded-xl bg-slate-100 p-1">
              {tabs.map((x) => (
                <button
                  key={x.key}
                  type="button"
                  role="tab"
                  aria-selected={tab === x.key}
                  onClick={() => setTab(x.key)}
                  className={cx(
                    'rounded-lg px-2.5 py-1 text-[12px] font-semibold md:text-[12.5px]',
                    tab === x.key ? 'bg-white text-ink shadow-sm' : 'text-ink-soft hover:text-ink',
                  )}
                >
                  {x.label}
                </button>
              ))}
            </nav>
          </div>
          <p className="hidden text-[14px] text-ink-soft md:mt-1 md:block">{t('ledger.page_subtitle')}</p>
        </div>

        {/* ── Action Buttons ── */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:gap-2.5 md:overflow-visible md:pb-0">
          <Button icon={Plus} onClick={() => setModal('add')} className="h-9 shrink-0 px-3 text-[12px] md:h-11 md:px-4 md:text-[13.5px]">
            {t('ledger.btn.add')}
          </Button>
          <Button variant="soft" icon={Users} onClick={() => setModal('split')} className="h-9 shrink-0 px-3 text-[12px] md:h-11 md:px-4 md:text-[13.5px]">
            {t('ledger.btn.split')}
          </Button>
          <Button variant="soft" icon={Target} onClick={() => setModal('budget')} className="h-9 shrink-0 px-3 text-[12px] md:h-11 md:px-4 md:text-[13.5px]">
            {t('ledger.btn.budget')}
          </Button>
        </div>
      </header>

      <DecisionStrip domain="ledger" />

      {tab === 'tong-quan' && <Dashboard onBudget={() => setModal('budget')} onAdd={() => setModal('add')} onAll={() => setTab('giao-dich')} />}
      {tab === 'giao-dich' && <TransactionsTab />}
      {tab === 'thoi-quen' && <HabitsTab />}

      {modal === 'add' && <AddTransactionModal onClose={() => setModal(null)} />}
      {modal === 'split' && <SplitModal onClose={() => setModal(null)} />}
      {modal === 'budget' && <BudgetModal onClose={() => setModal(null)} />}
    </div>
  );
}

function Dashboard({ onBudget, onAdd, onAll }: { onBudget: () => void; onAdd: () => void; onAll: () => void }) {
  const { data, error, refetch, isPending } = useLedgerDashboard();
  if (isPending) return <PageSkeleton />;
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;

  return (
    <div className="space-y-3.5 sm:space-y-4">
      <KpiRow data={data} onBudget={onBudget} onAdd={onAdd} />

      {/* Row 1: Dòng tiền (5) + Cơ cấu chi (4) + Gợi ý AI (3) */}
      <div className="grid grid-cols-1 gap-3.5 sm:gap-4 md:grid-cols-2 xl:grid-cols-12">
        <div className="min-w-0 md:col-span-1 xl:col-span-5">
          <CashflowChartCard months={data.months} onAdd={onAdd} />
        </div>
        <div className="min-w-0 md:col-span-1 xl:col-span-4">
          <CategoryDonutCard data={data} onAll={onAll} />
        </div>
        <div className="min-w-0 md:col-span-2 xl:col-span-3">
          <AdviceCard advice={data.advice} month={data.month} />
        </div>
      </div>

      {/* Row 2: Giao dịch gần đây (5) + Hóa đơn (4) + Tiết kiệm (3) */}
      <div className="grid grid-cols-1 gap-3.5 sm:gap-4 md:grid-cols-2 xl:grid-cols-12">
        <div className="min-w-0 md:col-span-1 xl:col-span-5">
          <RecentTransactionsCard items={data.recent} today={data.today} onAll={onAll} onAdd={onAdd} />
        </div>
        <div className="min-w-0 md:col-span-1 xl:col-span-4">
          <BillsCard bills={data.bills} />
        </div>
        <div className="min-w-0 md:col-span-2 xl:col-span-3">
          <SavingsBanner />
        </div>
      </div>
    </div>
  );
}
