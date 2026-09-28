// Donut Recharts — tách khỏi barrel `@/components/ui` để recharts (≈117 KB gz) chỉ tải ở trang có biểu đồ.

import type { ReactNode } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';

export interface DonutSlice { key: string; value: number; color: string; label?: string }

/** Donut Recharts + nội dung ở tâm. */
export function DonutChart({ data, size = 180, thickness = 30, children }: { data: DonutSlice[]; size?: number; thickness?: number; children?: ReactNode }) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="key" innerRadius={size / 2 - thickness} outerRadius={size / 2} startAngle={90} endAngle={-270} stroke="#fff" strokeWidth={2} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.key} fill={d.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}
