"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PromptEditor from "@/components/PromptEditor";

export default function EditPromptPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [content, setContent] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Call API to update prompt
    router.push(`/prompts/${params.id}`);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Edit Prompt</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Prompt Content</label>
          <PromptEditor value={content} onChange={setContent} />
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Save Changes
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

