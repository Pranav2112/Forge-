"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const tooltip = {
  contentStyle: { background: "#1b211c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, color: "#f4f7f1" },
};

export function LineTrend({
  data,
  lines,
}: {
  data: Record<string, string | number | null>[];
  lines: { key: string; name: string; color?: string }[];
}) {
  if (data.length === 0) return null;
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="date" tick={{ fill: "#b7c2b6", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#b7c2b6", fontSize: 12 }} axisLine={false} tickLine={false} width={42} />
          <Tooltip {...tooltip} />
          {lines.map((line) => (
            <Line key={line.key} type="monotone" dataKey={line.key} name={line.name} stroke={line.color ?? "#c6f135"} strokeWidth={2} dot={false} connectNulls />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BarTrend({
  data,
  xKey,
  yKey,
  name,
}: {
  data: Record<string, string | number | null>[];
  xKey: string;
  yKey: string;
  name: string;
}) {
  if (data.length === 0) return null;
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey={xKey} tick={{ fill: "#b7c2b6", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#b7c2b6", fontSize: 12 }} axisLine={false} tickLine={false} width={42} />
          <Tooltip {...tooltip} />
          <Bar dataKey={yKey} name={name} fill="#c6f135" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
