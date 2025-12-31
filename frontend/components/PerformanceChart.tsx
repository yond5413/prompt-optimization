"use client";

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";

interface PerformanceHistoryItem {
    version: number;
    scores: Record<string, number>;
    evaluated_at: string;
}

interface PerformanceChartProps {
    history: PerformanceHistoryItem[];
}

const METRICS = [
    { key: "correctness", label: "Correctness", color: "#3b82f6" },
    { key: "format_adherence", label: "Format", color: "#10b981" },
    { key: "clarity", label: "Clarity", color: "#f59e0b" },
    { key: "safety", label: "Safety", color: "#ef4444" },
];

export default function PerformanceChart({ history }: PerformanceChartProps) {
    // Transform data for recharts
    const data = history.map(item => {
        const formattedScores: Record<string, number> = {};
        Object.entries(item.scores).forEach(([k, v]) => {
            formattedScores[k] = v * 100;
        });

        return {
            name: `v${item.version}`,
            ...formattedScores,
        };
    });

    if (!history || history.length === 0) {
        return (
            <div className="flex items-center justify-center h-full w-full text-muted-foreground">
                No performance history available
            </div>
        );
    }

    // Collect all unique metrics present in the history
    const allMetricKeys = new Set<string>();
    history.forEach(item => {
        Object.keys(item.scores).forEach(key => allMetricKeys.add(key));
    });

    return (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart
                data={data}
                margin={{ top: 20, right: 30, left: 10, bottom: 10 }}
            >
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: 'currentColor', opacity: 0.6 }}
                    dy={10}
                />
                <YAxis
                    domain={[0, 100]}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: 'currentColor', opacity: 0.6 }}
                    tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                    contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        borderRadius: '12px',
                        border: '1px solid hsl(var(--border))',
                        boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                        fontSize: '12px'
                    }}
                    itemStyle={{ padding: '2px 0' }}
                    formatter={(value: number) => [`${value.toFixed(1)}%`]}
                />
                <Legend
                    verticalAlign="top"
                    height={40}
                    iconType="circle"
                    wrapperStyle={{ fontSize: '13px', opacity: 0.9, fontWeight: 500 }}
                />
                {METRICS.map(metric => (
                    allMetricKeys.has(metric.key) && (
                        <Line
                            key={metric.key}
                            type="monotone"
                            dataKey={metric.key}
                            name={metric.label}
                            stroke={metric.color}
                            strokeWidth={4}
                            dot={{ r: 5, fill: metric.color, strokeWidth: 0 }}
                            activeDot={{ r: 7, strokeWidth: 0 }}
                            animationDuration={1500}
                            animationEasing="ease-in-out"
                        />
                    )
                ))}
            </LineChart>
        </ResponsiveContainer>
    );
}
