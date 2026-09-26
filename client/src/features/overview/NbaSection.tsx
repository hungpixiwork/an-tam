import { Card, ButtonLink } from '../../components/ui/core';
import type { OverviewData } from '../../../../shared/types/api';

export function NbaSection({ nba }: { nba: OverviewData['nba'] }) {
  if (!nba || nba.length === 0) return null;

  const [primary, ...secondaries] = nba;

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-ink">Hôm nay / Tuần này</h2>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="col-span-1 md:col-span-2">
          <Card className="border-primary-500 bg-primary-50">
            <h3 className="text-base font-semibold text-primary-900">{primary.title}</h3>
            <p className="mt-1 text-sm text-primary-800">{primary.description}</p>
            <div className="mt-4">
              <ButtonLink to={primary.actionTo} variant="primary" size="sm" arrow>
                {primary.actionLabel}
              </ButtonLink>
            </div>
          </Card>
        </div>
        {secondaries.map((s, i) => (
          <Card key={i} className="border-line bg-white">
            <h3 className="text-sm font-semibold text-ink">{s.title}</h3>
            <p className="mt-1 text-xs text-ink-soft">{s.description}</p>
            <div className="mt-3">
              <ButtonLink to={s.actionTo} variant="soft" size="sm" arrow>
                {s.actionLabel}
              </ButtonLink>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
