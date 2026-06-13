"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const PIE_COLORS = [
  "#f97316",
  "#818cf8",
  "#34d399",
  "#38bdf8",
  "#f472b6",
  "#fbbf24",
  "#a78bfa",
  "#fb7185",
];

const axis = { stroke: "var(--muted-foreground)", fontSize: 12 };
const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--foreground)",
  fontSize: 12,
};

export function GenrePie({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
          {data.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function RatingsBar({ data }: { data: { rating: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="rating" {...axis} />
        <YAxis allowDecimals={false} {...axis} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
        <Bar dataKey="count" fill="var(--primary)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PagesLine({ data }: { data: { label: string; pages: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="label" {...axis} />
        <YAxis allowDecimals={false} {...axis} />
        <Tooltip contentStyle={tooltipStyle} />
        <Line
          type="monotone"
          dataKey="pages"
          stroke="var(--secondary)"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
