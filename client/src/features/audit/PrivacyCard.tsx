import { useState, type ReactNode } from 'react';
import { ArrowRight, Download, Lock, ShieldCheck, Trash2, UserRound, type LucideIcon } from 'lucide-react';
import { Button, FormAlert, Modal, TextInput, cx } from '@/components/ui';
import { downloadMyData, useDeleteAccount } from '@/lib/queries';
import { useAuth } from '@/app/auth';
import { useLocale } from '@/app/locale';

/** Quyền riêng tư & bảo mật: ẩn danh · cần phê duyệt · toàn quyền kiểm soát (Xuất / Xóa dữ liệu). Neo #privacy. */
export function PrivacyCard() {
  const { t } = useLocale();
  const [more, setMore] = useState<'anon' | 'approval' | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<unknown>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const doExport = async () => {
    setExporting(true);
    setExportError(null);
    try {
      await downloadMyData();
    } catch (e) {
      setExportError(e);
    } finally {
      setExporting(false);
    }
  };

  return (
    <section id="privacy" className="min-w-0 scroll-mt-24 rounded-2xl border border-line bg-white p-5 shadow-card" aria-labelledby="privacy-title">
      <h2 id="privacy-title" className="mb-3.5 text-[19px] font-bold text-ink">{t('audit.privacy.title')}</h2>
      <div className="space-y-3">
        <Box icon={Lock} tone="sky" title={t('audit.privacy.anon_title')} body={t('audit.privacy.anon_body')}>
          <LearnMore onClick={() => setMore('anon')} />
        </Box>
        <Box icon={UserRound} tone="mint" title={t('audit.privacy.approval_title')} body={t('audit.privacy.approval_body')}>
          <LearnMore onClick={() => setMore('approval')} />
        </Box>
        <Box icon={ShieldCheck} tone="cream" title={t('audit.privacy.control_title')} body={t('audit.privacy.control_body')}>
          <div className="flex flex-wrap gap-2.5">
            <Button variant="white" size="sm" icon={Download} onClick={doExport} disabled={exporting} className="text-accent-700">
              {t(exporting ? 'audit.privacy.exporting' : 'audit.privacy.export')}
            </Button>
            <Button variant="danger" size="sm" icon={Trash2} onClick={() => setConfirmDelete(true)}>{t('audit.privacy.delete')}</Button>
          </div>
          {exportError ? <div className="mt-2"><FormAlert error={exportError} /></div> : null}
        </Box>
      </div>

      {more && (
        <Modal title={t(more === 'anon' ? 'audit.privacy.anon_title' : 'audit.privacy.approval_title')} onClose={() => setMore(null)}>
          <p className="text-[14px] leading-relaxed text-ink">{t(more === 'anon' ? 'audit.privacy.anon_more' : 'audit.privacy.approval_more')}</p>
        </Modal>
      )}
      {confirmDelete && <DeleteModal onClose={() => setConfirmDelete(false)} />}
    </section>
  );
}

const BOX_TONE = {
  sky: { box: 'bg-[#F1F7FE]', icon: 'bg-accent-100/70 text-accent-600', title: 'text-ink' },
  mint: { box: 'bg-[#EFF8F3]', icon: 'bg-success-100/70 text-success-600', title: 'text-ink' },
  cream: { box: 'bg-[#FFF6EC]', icon: 'bg-warning-100/70 text-warning-600', title: 'text-warning-600' },
};

function Box({ icon: Icon, tone, title, body, children }: { icon: LucideIcon; tone: keyof typeof BOX_TONE; title: string; body: string; children: ReactNode }) {
  const c = BOX_TONE[tone];
  return (
    <div className={cx('flex gap-3.5 rounded-xl p-4', c.box)}>
      <span className={cx('grid h-12 w-12 shrink-0 place-items-center rounded-full', c.icon)}>
        <Icon className="h-6 w-6" strokeWidth={2.2} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className={cx('text-[14.5px] font-bold', c.title)}>{title}</h3>
        <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">{body}</p>
        <div className="mt-2.5">{children}</div>
      </div>
    </div>
  );
}

function LearnMore({ onClick }: { onClick: () => void }) {
  const { t } = useLocale();
  return (
    <div className="flex justify-end">
      <button type="button" onClick={onClick} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[12.5px] font-semibold text-accent-700 shadow-sm hover:bg-accent-50">
        {t('audit.privacy.learn')}
        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
}

/** Xác nhận xóa vĩnh viễn: phải gõ đúng email tài khoản → DELETE /api/me → về trang đăng nhập. */
function DeleteModal({ onClose }: { onClose: () => void }) {
  const { t } = useLocale();
  const { me } = useAuth();
  const del = useDeleteAccount();
  const [typed, setTyped] = useState('');
  const email = me?.email ?? '';
  const match = !!email && typed.trim().toLowerCase() === email.toLowerCase();
  const submit = async () => {
    if (!match) return;
    await del.mutateAsync();
    window.location.assign('/dang-nhap');
  };
  return (
    <Modal title={t('audit.privacy.delete_title')} onClose={onClose}>
      <p className="text-[14px] leading-relaxed text-ink">{t('audit.privacy.delete_body')}</p>
      <label className="mt-4 block text-[13px] font-medium text-ink" htmlFor="delete-email">{t('audit.privacy.delete_type', { email })}</label>
      <TextInput id="delete-email" type="email" autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} className="mt-1.5" />
      {del.error ? <div className="mt-2"><FormAlert error={del.error} /></div> : null}
      <div className="mt-5 flex justify-end gap-2.5">
        <Button variant="white" size="sm" onClick={onClose}>{t('audit.privacy.cancel')}</Button>
        <Button variant="danger" size="sm" icon={Trash2} onClick={submit} disabled={!match || del.isPending}>{t('audit.privacy.delete_confirm')}</Button>
      </div>
    </Modal>
  );
}
