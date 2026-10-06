// Donut Recharts — tách khỏi barrel `@/components/ui` để recharts (≈117 KB gz) chỉ tải ở trang có biểu đồ.

import type { ReactNode } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { cx } from './core';

export interface DonutSlice { key: string; value: number; color: string; label?: string }

/** Donut Recharts + nội dung ở tâm tối ưu tỷ lệ và độ thoáng. */
export function DonutChart({
  data,
  size = 160,
  thickness = 22,
  className,
  children,
}: {
  data: DonutSlice[];
  size?: number;
  thickness?: number;
  className?: string;
  children?: ReactNode;
}) {
  const outerRadius = size / 2;
  const innerRadius = Math.max(12, outerRadius - thickness);

  return (
    <div className={cx('relative shrink-0 flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="key"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            startAngle={90}
            endAngle={-270}
            stroke="#fff"
            strokeWidth={2}
            isAnimationActive={false}
          >
            {data.map((d) => (
              <Cell key={d.key} fill={d.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center p-1.5 text-center">
        {children}
      </div>
    </div>
  );
}
