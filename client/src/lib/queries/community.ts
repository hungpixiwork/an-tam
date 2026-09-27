import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { qk } from './keys';

export interface Lesson {
  id: string; slug: string; kind: 'lesson' | 'story' | 'history'; title: string; excerpt: string;
  category: string; icon: string; readTime: string; isFeatured: boolean; bodyMd?: string;
  recommendedFor?: string;
}

/* ───────── 09 · Cộng đồng ───────── */
export function useLessons(peaceLevel?: string) {
  return useQuery({
    queryKey: ['lessons', peaceLevel],
    queryFn: () => api.get<Lesson[]>(`/lessons${peaceLevel ? `?peace_level=${peaceLevel}` : ''}`),
    staleTime: 5 * 60_000
  });
}
export const useLesson = (slug: string | null) =>
  useQuery({ queryKey: qk.lesson(slug ?? ''), queryFn: () => api.get<Lesson>(`/lessons/${slug}`), enabled: !!slug });
