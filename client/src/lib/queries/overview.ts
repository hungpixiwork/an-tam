import { useQuery } from '@tanstack/react-query';
import type { OverviewData } from '@shared/types/api';
import { api } from '../api';
import { qk } from './keys';

/* ───────── 01 · Tổng quan ───────── */
export const useOverview = (range = 12) => useQuery({ queryKey: qk.overview(range), queryFn: () => api.get<OverviewData>(`/overview?range=${range}`) });
