import { useSearchParams } from 'react-router-dom';
import DoubleShockPage from './DoubleShockPage';
import { LegacySimulationPage } from './LegacySimulator';

/** /mo-phong: có lựa chọn cuộc đời (?choiceId= hoặc lựa chọn đang ghim) → Mô phỏng cú sốc kép; ?preset= hoặc chưa có lựa chọn → mô phỏng chung. */
export default function SimulationPage() {
  const [search, setSearch] = useSearchParams();
  const requestedMode = search.get('mode');
  const mode = requestedMode === 'bull' || requestedMode === 'bear' ? requestedMode : 'base';
  
  if (search.get('preset')) return <LegacySimulationPage />;

  // Không chờ danh sách lựa chọn: /simulations/context tự lấy lựa chọn đang ghim, 404 = chưa có → mô phỏng chung
  const choiceId = search.get('choiceId') ?? undefined;
  const change = (id: string) => setSearch((p) => { p.set('choiceId', id); return p; });

  return (
    <DoubleShockPage
      key={choiceId ?? 'pinned'}
      choiceId={choiceId}
      initialMode={mode}
      onChangeChoice={change}
      onNoChoice={() => <LegacySimulationPage />}
    />
  );
}
