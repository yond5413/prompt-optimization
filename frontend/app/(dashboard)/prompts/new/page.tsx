"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PromptEditor from "@/components/PromptEditor";
import { createPrompt } from "@/lib/api";

export default function NewPromptPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [taskType, setTaskType] = useState("classification");
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await createPrompt({
        name,
        task_type: taskType,
        content,
      });
      router.push("/prompts");
    } catch (error) {
      console.error("Failed to create prompt:", error);
      alert("Failed to create prompt. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Create New Prompt</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Prompt Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Task Type</label>
          <select
            value={taskType}
            onChange={(e) => setTaskType(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700"
          >
            <option value="classification">Classification</option>
            <option value="generation">Generation</option>
            <option value="reasoning">Reasoning</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Prompt Content</label>
          <PromptEditor value={content} onChange={setContent} />
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? "Creating..." : "Create Prompt"}
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

