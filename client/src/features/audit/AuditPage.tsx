// Trang 9 — Nhật ký AI, kiểm toán & quyền riêng tư (mockup 9).
// Dữ liệu: GET /api/audit (+ /verify), /api/integrations, /api/health, /api/me/export, DELETE /api/me.
// Neo #integrations / #privacy dùng cho link ở Topbar.

import { AuditHero } from './AuditHero';
import { AuditLogCard } from './AuditLogCard';
import { PrivacyCard } from './PrivacyCard';
import { IntegrationsCard } from './IntegrationsCard';
import { SystemStatusCard } from './SystemStatusCard';

const ROW = 'grid grid-cols-1 gap-3.5 xl:grid-cols-[minmax(0,978fr)_minmax(340px,420fr)]';

export default function AuditPage() {
  return (
    <div className="space-y-3.5">
      <AuditHero />
      <div className={ROW}>
        <AuditLogCard />
        <PrivacyCard />
      </div>
      <div className={ROW}>
        <IntegrationsCard />
        <SystemStatusCard />
      </div>
    </div>
  );
}
