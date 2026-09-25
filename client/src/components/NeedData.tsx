import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { SetupStatus } from '@shared/types/api';
import { ButtonLink, EmptyState } from '@/components/ui';
import { useOverview } from '@/lib/queries';

const LINKS: Record<keyof SetupStatus, { to: string; label: string }> = {
  profile: { to: '/cai-dat#tai-chinh', label: 'Nhập thu chi' },
  holdings: { to: '/danh-muc', label: 'Thêm tài sản' },
  goals: { to: '/muc-tieu', label: 'Đặt mục tiêu' },
  transactions: { to: '/thu-chi', label: 'Ghi sổ thu chi' },
};

/**
 * Màn cần dữ liệu tài chính mới có ý nghĩa (Mô phỏng, Kế hoạch...): nếu thiếu hết các phần trong `anyOf`
 * thì hiện gợi ý nhập thay cho nội dung. Trạng thái nhập liệu lấy từ cache Tổng quan.
 */
export function NeedData({ anyOf, icon, title, body, children }: { anyOf: (keyof SetupStatus)[]; icon: LucideIcon; title: string; body: string; children: ReactNode }) {
  const setup = useOverview(12).data?.setup;
  if (!setup || anyOf.some((k) => setup[k])) return <>{children}</>;
  return (
    <EmptyState
      icon={icon}
      title={title}
      body={body}
      action={
        <div className="flex flex-wrap justify-center gap-2">
          {anyOf.map((k, i) => (
            <ButtonLink key={k} to={LINKS[k].to} variant={i === 0 ? 'primary' : 'white'}>
              {LINKS[k].label}
            </ButtonLink>
          ))}
        </div>
      }
    />
  );
}
