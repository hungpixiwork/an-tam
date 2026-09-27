import { useState, type FormEvent } from 'react';
import { Minus, Plus, QrCode } from 'lucide-react';
import type { SplitResult } from '@shared/types/api';
import { VN_BANKS } from '@shared/data/vn-banks';
import { formatVndFull } from '@shared/format';
import { Button, FormAlert, FormField, Modal, MoneyInput, Select, TextInput } from '@/components/ui';
import { usePayoutAccount, useSavePayoutAccount, useSplitBill } from '@/lib/queries';
import { useLocale } from '@/app/locale';

/** "Chia đều chi phí": tổng tiền + tên người cùng chia → phần mỗi người + mã VietQR chuyển về tài khoản của bạn. */
export function SplitModal({ onClose }: { onClose: () => void }) {
  const { t } = useLocale();
  const payout = usePayoutAccount();
  const split = useSplitBill();
  const [title, setTitle] = useState('');
  const [total, setTotal] = useState(0);
  const [people, setPeople] = useState<string[]>(['', '']);
  const [editPayout, setEditPayout] = useState(false);
  const [result, setResult] = useState<SplitResult | null>(null);

  const names = people.map((p, i) => p.trim() || t('ledger.split.person', { n: i + 1 }));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    split.mutate({ title: title.trim() || t('ledger.split.default_title'), total, people: names }, { onSuccess: setResult });
  };
  const needPayout = payout.isSuccess && (payout.data === null || editPayout);

  return (
    <Modal title={t('ledger.btn.split')} onClose={onClose} className="max-w-xl">
      {needPayout ? (
        <PayoutForm initial={payout.data} onDone={() => setEditPayout(false)} onCancel={payout.data ? () => setEditPayout(false) : undefined} />
      ) : result ? (
        <div className="space-y-4">
          <p className="text-[14px] text-ink">
            {t('ledger.split.result', { title: result.title, total: formatVndFull(result.total), n: result.shares.length })}
          </p>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {result.shares.map((s, i) => (
              <li key={i} className="rounded-xl border border-line p-3 text-center">
                <p className="text-[13px] font-semibold text-ink">{s.isMe ? t('ledger.split.me') : s.name}</p>
                <p className="text-[16px] font-extrabold text-ink tabular-nums">{formatVndFull(s.amount)}</p>
                {s.qrUrl ? (
                  <img src={s.qrUrl} alt={t('ledger.split.qr_alt', { name: s.name, amount: formatVndFull(s.amount) })} className="mx-auto mt-2 h-40 w-40 rounded-lg object-contain" loading="lazy" />
                ) : (
                  <p className="mt-2 text-[12px] text-ink-mute">{s.isMe ? t('ledger.split.me_note') : t('ledger.split.no_qr')}</p>
                )}
              </li>
            ))}
          </ul>
          {payout.data && (
            <p className="text-[12.5px] text-ink-soft">
              {t('ledger.split.to_account', { bank: payout.data.bankName, acc: payout.data.accountNo, name: payout.data.accountName })}{' '}
              <button type="button" className="font-semibold text-accent-600" onClick={() => { setResult(null); setEditPayout(true); }}>{t('ledger.split.change_account')}</button>
            </p>
          )}
          <div className="flex gap-2">
            <Button variant="white" onClick={() => setResult(null)}>{t('ledger.split.again')}</Button>
            <Button onClick={onClose}>{t('ledger.split.done')}</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <FormField label={t('ledger.split.title_label')}>{(id) => <TextInput id={id} value={title} maxLength={40} placeholder={t('ledger.split.default_title')} onChange={(e) => setTitle(e.target.value)} />}</FormField>
          <FormField label={t('ledger.split.total')}>{(id) => <MoneyInput id={id} value={total} onChange={setTotal} />}</FormField>
          <div>
            <p className="mb-2 text-sm font-semibold text-ink">{t('ledger.split.people', { n: people.length + 1 })}</p>
            <ul className="space-y-2">
              {people.map((p, i) => (
                <li key={i} className="flex gap-2">
                  <TextInput aria-label={t('ledger.split.person', { n: i + 1 })} placeholder={t('ledger.split.person', { n: i + 1 })} value={p} maxLength={30} onChange={(e) => setPeople((o) => o.map((x, j) => (j === i ? e.target.value : x)))} />
                  <Button variant="white" size="sm" className="h-11" aria-label={t('ledger.split.remove')} disabled={people.length <= 1} onClick={() => setPeople((o) => o.filter((_, j) => j !== i))}>
                    <Minus className="h-4 w-4" aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
            <Button variant="ghost" size="sm" icon={Plus} className="mt-2" disabled={people.length >= 20} onClick={() => setPeople((o) => [...o, ''])}>
              {t('ledger.split.add_person')}
            </Button>
          </div>
          {total > 0 && <p className="rounded-xl bg-accent-50 p-3 text-[13px] text-ink">{t('ledger.split.preview', { amount: formatVndFull(Math.round(total / (people.length + 1) / 1000) * 1000) })}</p>}
          <FormAlert error={split.error ?? payout.error} />
          <Button type="submit" icon={QrCode} disabled={total <= 0 || split.isPending}>
            {split.isPending ? t('ledger.saving') : t('ledger.split.submit')}
          </Button>
        </form>
      )}
    </Modal>
  );
}

function PayoutForm({ initial, onDone, onCancel }: { initial: { bankBin: string; accountNo: string; accountName: string } | null | undefined; onDone: () => void; onCancel?: () => void }) {
  const { t } = useLocale();
  const save = useSavePayoutAccount();
  const [bankBin, setBankBin] = useState(initial?.bankBin ?? VN_BANKS[0].bin);
  const [accountNo, setAccountNo] = useState(initial?.accountNo ?? '');
  const [accountName, setAccountName] = useState(initial?.accountName ?? '');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate({ bankBin, accountNo: accountNo.trim(), accountName }, { onSuccess: onDone });
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="rounded-xl bg-accent-50 p-3 text-[13px] leading-relaxed text-ink">{t('ledger.payout.intro')}</p>
      <FormField label={t('ledger.payout.bank')}>{() => <Select label={t('ledger.payout.bank')} value={bankBin} onChange={setBankBin} options={VN_BANKS.map((b) => ({ value: b.bin, label: b.name }))} />}</FormField>
      <FormField label={t('ledger.payout.account_no')}>{(id) => <TextInput id={id} inputMode="numeric" value={accountNo} maxLength={19} onChange={(e) => setAccountNo(e.target.value.replace(/\D/g, ''))} required />}</FormField>
      <FormField label={t('ledger.payout.account_name')}>{(id) => <TextInput id={id} value={accountName} maxLength={50} onChange={(e) => setAccountName(e.target.value)} required />}</FormField>
      <FormAlert error={save.error} />
      <div className="flex gap-2">
        <Button type="submit" disabled={save.isPending || accountNo.length < 6 || accountName.trim().length < 2}>{save.isPending ? t('ledger.saving') : t('ledger.payout.save')}</Button>
        {onCancel && <Button variant="white" onClick={onCancel}>{t('ledger.payout.cancel')}</Button>}
      </div>
    </form>
  );
}
