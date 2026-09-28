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
      {/* Tiêu đề + 3 nút */}
      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 pb-1">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <h1 className="text-[28px] font-extrabold leading-tight tracking-tight text-ink">{t('ledger.page_title')}</h1>
            <nav role="tablist" aria-label={t('ledger.page_title')} className="flex gap-1 rounded-xl bg-slate-100 p-1">
              {tabs.map((x) => (
                <button
                  key={x.key}
                  type="button"
                  role="tab"
                  aria-selected={tab === x.key}
                  onClick={() => setTab(x.key)}
                  className={cx('rounded-lg px-2.5 py-1 text-[12.5px] font-semibold', tab === x.key ? 'bg-white text-ink shadow-sm' : 'text-ink-soft hover:text-ink')}
                >
                  {x.label}
                </button>
              ))}
            </nav>
          </div>
          <p className="mt-1 text-[15px] text-ink-soft">{t('ledger.page_subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button icon={Plus} onClick={() => setModal('add')} className="h-12 px-6">
            {t('ledger.btn.add')}
          </Button>
          <Button variant="soft" icon={Users} onClick={() => setModal('split')} className="h-12 px-6">
            {t('ledger.btn.split')}
          </Button>
          <Button variant="soft" icon={Target} onClick={() => setModal('budget')} className="h-12 px-6">
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
    <>
      <KpiRow data={data} onBudget={onBudget} onAdd={onAdd} />
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-[536fr_456fr_396fr]">
        <CashflowChartCard months={data.months} onAdd={onAdd} />
        <CategoryDonutCard data={data} onAll={onAll} />
        <AdviceCard advice={data.advice} month={data.month} className="md:col-span-2 xl:col-span-1" />
      </div>
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-[482fr_514fr_394fr]">
        <RecentTransactionsCard items={data.recent} today={data.today} onAll={onAll} onAdd={onAdd} />
        <BillsCard bills={data.bills} />
        <SavingsBanner className="md:col-span-2 xl:col-span-1" />
      </div>
    </>
  );
}
