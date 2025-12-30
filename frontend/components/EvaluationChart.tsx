"use client";

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

interface EvaluationChartProps {
  scores: {
    correctness: number;
    format_adherence: number;
    clarity?: number;
    verbosity?: number;
    safety?: number;
    consistency?: number;
  };
}

export default function EvaluationChart({ scores }: EvaluationChartProps) {
  const data = [
    {
      metric: "Correctness",
      score: scores.correctness * 100,
    },
    {
      metric: "Format",
      score: scores.format_adherence * 100,
    },
    {
      metric: "Clarity",
      score: (scores.clarity || 0) * 100,
    },
    {
      metric: "Verbosity",
      score: (scores.verbosity || 0) * 100,
    },
    {
      metric: "Safety",
      score: (scores.safety || 0) * 100,
    },
    {
      metric: "Consistency",
      score: (scores.consistency || 0) * 100,
    },
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="metric" />
        <PolarRadiusAxis angle={90} domain={[0, 100]} />
        <Radar
          name="Scores"
          dataKey="score"
          stroke="#3b82f6"
          fill="#3b82f6"
          fillOpacity={0.6}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

