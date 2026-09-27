import { useState, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { SECTORS } from '@shared/engine/concentration';
import { CATEGORY_ASSUMPTIONS, CATEGORY_ORDER, defaultInPortfolio } from '@shared/engine/portfolio';
import { HOLDING_DEFAULTS } from '@shared/engine/ledger';
import type { AssetCategory, Holding, Sector, Volatility } from '@shared/types/domain';
import { Button, FormAlert, FormField, Modal, MoneyInput, Segmented, Select, TextInput, Toggle } from '@/components/ui';
import { useLocale } from '@/app/locale';
import { useDeleteHolding, useSaveHolding } from '@/lib/queries';

const VOLATILITY: { value: Volatility; label: string }[] = [
  { value: 'low', label: 'Thấp' },
  { value: 'mid', label: 'Vừa' },
  { value: 'high', label: 'Cao' },
];

/** Thêm / sửa một khoản tài sản: loại, giá trị, ngành, cổ phiếu công ty mình, có tính vào danh mục đầu tư hay không. */
export function HoldingFormModal({ holding, onClose }: { holding: Holding | null; onClose: () => void }) {
  const { t } = useLocale();
  const [name, setName] = useState(holding?.name ?? '');
  const [category, setCategory] = useState<AssetCategory>(holding?.category ?? 'stock');
  const [value, setValue] = useState(holding?.value ?? 0);
  const [volatility, setVolatility] = useState<Volatility>(holding?.volatility ?? HOLDING_DEFAULTS.stock.volatility);
  const [sector, setSector] = useState<Sector>(holding?.sector ?? 'other');
  const [isEmployerStock, setEmployer] = useState(holding?.isEmployerStock ?? false);
  const [inPortfolio, setInPortfolio] = useState(holding?.inPortfolio ?? defaultInPortfolio(holding?.category ?? 'stock'));
  const save = useSaveHolding();
  const del = useDeleteHolding();

  function changeCategory(c: AssetCategory) {
    setCategory(c);
    setVolatility(HOLDING_DEFAULTS[c].volatility);
    if (!holding) setInPortfolio(defaultInPortfolio(c));
    if (c !== 'stock') setEmployer(false);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const input = { name: name.trim() || CATEGORY_ASSUMPTIONS[category].label, category, value, volatility, sector, isEmployerStock, inPortfolio };
    save.mutate(holding ? { ...input, id: holding.id } : input, { onSuccess: onClose });
  }

  return (
    <Modal title={holding ? 'Sửa tài sản' : 'Thêm tài sản'} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <p className="mb-1.5 text-sm font-semibold text-ink">Loại tài sản</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {CATEGORY_ORDER.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={c === category}
                onClick={() => changeCategory(c)}
                className={
                  c === category
                    ? 'h-10 rounded-xl border border-accent-600 bg-accent-50 text-[13px] font-semibold text-accent-700'
                    : 'h-10 rounded-xl border border-line bg-white text-[13px] font-semibold text-ink-soft hover:bg-slate-50'
                }
              >
                {CATEGORY_ASSUMPTIONS[c].label}
              </button>
            ))}
          </div>
        </div>
        <FormField label="Tên khoản">
          {(id) => <TextInput id={id} value={name} maxLength={60} placeholder={`VD: ${CATEGORY_ASSUMPTIONS[category].label} ngân hàng A`} onChange={(e) => setName(e.target.value)} />}
        </FormField>
        <FormField label="Giá trị hiện tại">{(id) => <MoneyInput id={id} value={value} onChange={setValue} autoFocus={!!holding} />}</FormField>
        <div>
          <p className="mb-1.5 text-sm font-semibold text-ink">{t('portfolio.form.sector')}</p>
          <Select label={t('portfolio.form.sector')} value={sector} onChange={setSector} options={SECTORS.map((s) => ({ value: s, label: t(`portfolio.sector.${s}`) }))} className="h-10 w-full" />
        </div>
        {category === 'stock' && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-ink">{t('portfolio.form.employer')}</span>
            <Toggle checked={isEmployerStock} onChange={setEmployer} label={t('portfolio.form.employer')} />
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <span>
            <span className="block text-sm font-semibold text-ink">{t('portfolio.form.in_portfolio')}</span>
            <span className="block text-xs text-ink-mute">{t('portfolio.form.in_portfolio_hint')}</span>
          </span>
          <Toggle checked={inPortfolio} onChange={setInPortfolio} label={t('portfolio.form.in_portfolio')} />
        </div>
        <div>
          <p className="mb-1.5 text-sm font-semibold text-ink">Mức biến động</p>
          <Segmented label="Mức biến động" value={volatility} onChange={setVolatility} options={VOLATILITY} />
          <p className="mt-1 text-xs text-ink-mute">Gợi ý theo loại tài sản. AI dùng để tính tỷ trọng rủi ro của danh mục.</p>
        </div>
        <FormAlert error={save.error ?? del.error} />
        <div className="flex gap-2 pt-2">
          <Button type="submit" className="flex-1" disabled={save.isPending || del.isPending}>
            {save.isPending ? 'Đang lưu…' : holding ? 'Lưu thay đổi' : 'Thêm tài sản'}
          </Button>
          {holding && (
            <Button
              variant="danger"
              icon={Trash2}
              disabled={save.isPending || del.isPending}
              onClick={() => confirm(`Xóa "${holding.name}" khỏi danh mục?`) && del.mutate(holding.id, { onSuccess: onClose })}
            >
              Xóa
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
}
