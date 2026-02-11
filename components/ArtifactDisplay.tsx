/**
 * Reusable component for displaying AI-generated text content.
 * Shows the generated text in a card with Copy and Regenerate buttons.
 * Used for agendas, emails, summaries, etc.
 */
"use client";

import { useState } from "react";

interface ArtifactDisplayProps {
  content: string;
  isLoading: boolean;
  onRegenerate: () => void;
  title?: string;
}

export function ArtifactDisplay({
  content,
  isLoading,
  onRegenerate,
  title,
}: ArtifactDisplayProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header with title and action buttons */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700">
          {title || "Generated Content"}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            disabled={isLoading || !content}
            className="text-xs px-3 py-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {copied ? "Copied!" : "Copy to Clipboard"}
          </button>
          <button
            onClick={onRegenerate}
            disabled={isLoading}
            className="text-xs px-3 py-1.5 rounded border border-[#1F3864] text-[#1F3864] hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "Generating..." : "Regenerate"}
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="p-4 max-h-[500px] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-sm text-gray-500">Generating content...</div>
          </div>
        ) : content ? (
          <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono leading-relaxed">
            {content}
          </pre>
        ) : (
          <div className="text-center py-12 text-sm text-gray-400">
            Click a button to generate content
          </div>
        )}
      </div>
    </div>
  );
}
