/* eslint-disable @next/next/no-img-element */
// components/ChatInput.tsx
import React, { useRef, useEffect, useState } from "react";
import { Send, Sparkles, Command } from "lucide-react";
import { UserProfile } from "./types";

interface ChatInputProps {
  message: string;
  setMessage: (message: string) => void;
  handleSend: () => void;
  isLoading: boolean;
  userProfile: UserProfile | null;
  messagesLength: number;
  dataPanelOpen: boolean;
  sidebarOpen: boolean;
}

export default function ChatInput({
  message,
  setMessage,
  handleSend,
  isLoading,
  userProfile,
  dataPanelOpen,
  sidebarOpen,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [message]);

  // Auto-focus the textarea after sending a message
  useEffect(() => {
    if (!isLoading && textareaRef.current && message === "") {
      textareaRef.current.focus();
    }
  }, [isLoading, message]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendWithFocus();
    }
  };

  const handleSendWithFocus = () => {
    handleSend();
    // Keep focus on the textarea after sending
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 0);
  };

  return (
    <div
      className="fixed bottom-0 z-50 bg-white border-gray-200 transition-all duration-300"
      style={{
        fontFamily:
          '"SF Pro Display", "Inter", -apple-system, BlinkMacSystemFont, sans-serif',
        left: sidebarOpen ? "320px" : "0",
        right: dataPanelOpen ? "384px" : "0",
      }}
    >
      <div className="relative">
        {/* Loading indicator bar */}
        {isLoading && <div className="absolute top-0 left-0 right-0 h-0.5" />}

        <div className="p-4">
          <div className="max-w-4xl mx-auto">
            {/* Main Input Container */}
            <div
              className={`
                relative bg-gray-50 rounded-xl transition-all duration-200
                ${isFocused ? "bg-white ring-2 ring-black" : "hover:bg-gray-100"}
              `}
            >
              {/* Input Header - Shows context when focused */}
              {isFocused && (
                <div className="px-4 py-2 border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Sparkles className="w-3 h-3" />
                      <span className="font-medium">
                        {userProfile?.isComplete
                          ? "Career Intelligence Active"
                          : "Building Profile"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Command className="w-3 h-3" />
                      <span>Enter to send</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Input Area */}
              <div className="relative flex items-end">
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder={
                    userProfile?.isComplete
                      ? "Ask about programs, careers, or pathways..."
                      : "Share your interests and goals..."
                  }
                  className="w-full border-0 rounded-xl px-4 py-3 pr-12 focus:outline-none resize-none min-h-[48px] max-h-[160px] text-black placeholder-gray-400 bg-transparent text-sm leading-relaxed"
                  rows={1}
                  disabled={isLoading}
                />

                {/* Send Button */}
                <button
                  onClick={handleSendWithFocus}
                  disabled={isLoading || !message.trim()}
                  className={`
                    absolute right-2 bottom-2 p-2 rounded-lg transition-all duration-200
                    ${
                      !isLoading && message.trim()
                        ? "bg-black text-white hover:bg-gray-800"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }
                  `}
                >
                  <Send
                    className={`w-4 h-4 ${isLoading ? "animate-pulse" : ""}`}
                  />
                </button>
              </div>
            </div>

            {/* Bottom Status Bar */}
            <div className="mt-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3 text-gray-600">
                <div className="flex items-center gap-1.5">
                  <img
                    src="/images/uhcc-logo-3.png"
                    alt="UHCC Logo"
                    className="w-6 h-6 object-contain"
                  />
                  <span>Sponsored by UHCC</span>
                </div>
              </div>

              <div className="text-gray-500">
                {isLoading ? (
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-1 h-1 bg-gray-600 rounded-full animate-pulse" />
                    <span
                      className="inline-block w-1 h-1 bg-gray-600 rounded-full animate-pulse"
                      style={{ animationDelay: "100ms" }}
                    />
                    <span
                      className="inline-block w-1 h-1 bg-gray-600 rounded-full animate-pulse"
                      style={{ animationDelay: "200ms" }}
                    />
                  </span>
                ) : (
                  <span>
                    {message.length > 0
                      ? `${message.length} characters`
                      : "Ready"}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
