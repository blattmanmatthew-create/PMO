/**
 * Chat interface component for the conversational intake flow.
 * Shows messages in chat bubbles (user on right, assistant on left),
 * with a text input and send button at the bottom.
 * Supports quick-select choice buttons parsed from assistant messages.
 */
"use client";

import { useState, useRef, useEffect } from "react";

// A single message in the conversation
interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatInterfaceProps {
  // Called when Claude outputs valid JSON — the parent component handles saving
  onProjectComplete: (jsonData: string) => void;
}

// Parse <<choices>>A||B||C<</choices>> from message text
function parseChoices(content: string): { text: string; choices: string[] } {
  const match = content.match(/<<choices>>([\s\S]*?)<\/choices>>/);
  if (!match) return { text: content, choices: [] };
  const text = content.replace(/<<choices>>[\s\S]*?<\/choices>>/, "").trim();
  const choices = match[1]
    .split("||")
    .map((c) => c.trim())
    .filter(Boolean);
  return { text, choices };
}

export function ChatInterface({ onProjectComplete }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to the latest message whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea as user types
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = inputRef.current.scrollHeight + "px";
    }
  }, [input]);

  // Send a message (from typing or clicking a choice)
  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    setError(null);
    const userMessage: Message = { role: "user", content: trimmed };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed (${response.status})`);
      }

      const data = await response.json();
      const assistantMessage: Message = {
        role: "assistant",
        content: data.content,
      };
      setMessages([...updatedMessages, assistantMessage]);

      // Check if Claude's response contains JSON (the final output)
      const jsonMatch = data.content.match(/```json\s*([\s\S]*?)```/);
      if (jsonMatch) {
        onProjectComplete(jsonMatch[1]);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSend() {
    sendMessage(input);
  }

  // Handle Enter key — send on Enter, new line on Shift+Enter
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // Check if the last message has choices to show
  const lastMessage = messages[messages.length - 1];
  const lastChoices =
    lastMessage?.role === "assistant" && !isLoading
      ? parseChoices(lastMessage.content).choices
      : [];

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Welcome message if no conversation started yet */}
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              Set up a new project
            </h2>
            <p className="text-sm max-w-md mx-auto">
              Describe your project or program in a few sentences.
              I&apos;ll guide you through a few quick questions.
            </p>
          </div>
        )}

        {messages.map((msg, i) => {
          const { text, choices } = msg.role === "assistant"
            ? parseChoices(msg.content)
            : { text: msg.content, choices: [] };
          const isLast = i === messages.length - 1;

          return (
            <div key={i}>
              <div
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-3 text-sm whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-[#1F3864] text-white"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {text}
                </div>
              </div>

              {/* Render choice buttons for the last assistant message only */}
              {isLast && choices.length > 0 && !isLoading && (
                <div className="flex flex-wrap gap-2 mt-2 ml-1">
                  {choices.map((choice, ci) => (
                    <button
                      key={ci}
                      onClick={() => sendMessage(choice)}
                      className="px-3 py-1.5 text-sm border border-[#1F3864] text-[#1F3864] rounded-full hover:bg-[#1F3864] hover:text-white transition-colors"
                    >
                      {choice}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-3 text-sm text-gray-500">
              <span className="inline-flex gap-1">
                <span className="animate-bounce" style={{ animationDelay: "0ms" }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: "150ms" }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: "300ms" }}>.</span>
              </span>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="text-center">
            <p className="text-red-500 text-sm">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-sm text-blue-600 underline mt-1"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Invisible div used as scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t bg-white p-4">
        {/* Show choice hint when choices are available */}
        {lastChoices.length > 0 && (
          <p className="text-xs text-gray-400 text-center mb-2">
            Tap a choice above or type your own answer
          </p>
        )}
        <div className="flex items-end gap-2 max-w-3xl mx-auto">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={messages.length === 0 ? "Describe your project..." : "Type your answer..."}
            rows={1}
            className="flex-1 resize-none border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F3864] focus:border-transparent max-h-32"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="bg-[#1F3864] text-white rounded-lg px-4 py-3 text-sm font-medium hover:bg-[#2a4a7f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
