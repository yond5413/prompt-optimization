"use client";

import { use } from "react";

export default function DatasetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dataset Details</h1>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <p className="text-gray-600 dark:text-gray-400">Loading dataset {id}...</p>
      </div>
    </div>
  );
}

