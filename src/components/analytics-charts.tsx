"use client";

import { useRouter } from "next/navigation";
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

const hint = "Click a segment to see the matching books";

export function GenrePie({ data }: { data: { name: string; value: number }[] }) {
  const router = useRouter();
  return (
    <>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={90}
            label
            className="cursor-pointer"
            onClick={(d) => {
              const name = (d as { name?: string; payload?: { name?: string } })?.payload?.name ??
                (d as { name?: string })?.name;
              if (name) router.push(`/books?genre=${encodeURIComponent(name)}`);
            }}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
      <p className="mt-2 text-center text-xs text-muted-foreground">{hint}</p>
    </>
  );
}

export function RatingsBar({ data }: { data: { rating: string; count: number; bucket: number }[] }) {
  const router = useRouter();
  return (
    <>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="rating" {...axis} />
          <YAxis allowDecimals={false} {...axis} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
          <Bar
            dataKey="count"
            fill="var(--primary)"
            radius={[6, 6, 0, 0]}
            className="cursor-pointer"
            onClick={(d) => {
              const bucket = (d as { payload?: { bucket?: number } })?.payload?.bucket;
              if (bucket != null) router.push(`/books?rating=${bucket}`);
            }}
          />
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-2 text-center text-xs text-muted-foreground">{hint}</p>
    </>
  );
}

export function LengthBands({
  data,
}: {
  data: { label: string; count: number; min: number; max: number }[];
}) {
  const router = useRouter();
  return (
    <>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="label" {...axis} />
          <YAxis allowDecimals={false} {...axis} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
          <Bar
            dataKey="count"
            fill="var(--secondary)"
            radius={[6, 6, 0, 0]}
            className="cursor-pointer"
            onClick={(d) => {
              const p = (d as { payload?: { min?: number; max?: number } })?.payload;
              if (p?.min != null) router.push(`/books?minPages=${p.min}&maxPages=${p.max}`);
            }}
          />
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Click a band to see books of that length
      </p>
    </>
  );
}

export function PagesLine({ data }: { data: { label: string; pages: number; bookId: string }[] }) {
  const router = useRouter();
  return (
    <>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart
          data={data}
          className="cursor-pointer"
          onClick={(state) => {
            const id = (
              state as { activePayload?: { payload?: { bookId?: string } }[] }
            )?.activePayload?.[0]?.payload?.bookId;
            if (id) router.push(`/books/${id}`);
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="label" {...axis} />
          <YAxis allowDecimals={false} {...axis} />
          <Tooltip contentStyle={tooltipStyle} />
          <Line
            type="monotone"
            dataKey="pages"
            stroke="var(--secondary)"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Click a point to open that book
      </p>
    </>
  );
}
