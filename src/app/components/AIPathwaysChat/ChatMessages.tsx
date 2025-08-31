// components/ChatMessages.tsx
import React, { useRef, useEffect } from "react";
import {
  Activity,
  Database,
  ArrowRight,
  Zap,
} from "lucide-react";
import { Message, UserProfile } from "./types";

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
  isAnalyzing: boolean;
  suggestedQuestions: string[];
  setSuggestedQuestions: (questions: string[]) => void;
  setMessage: (message: string) => void;
  userProfile: UserProfile | null;
  sidebarOpen: boolean;
  dataPanelOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export default function ChatMessages({
  messages,
  isLoading,
  isAnalyzing,
  suggestedQuestions,
  setSuggestedQuestions,
  setMessage,
  userProfile,
  sidebarOpen,
  dataPanelOpen,
}: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userMessageCount = messages.filter(msg => msg.role === "user").length;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSuggestedQuestionClick = (question: string) => {
    setMessage(question);
    setSuggestedQuestions([]);
  };

  return (
    <div
      className="flex-1 overflow-y-auto pb-36 transition-all duration-300 bg-white"
      style={{
        fontFamily:
          '"SF Pro Display", "Inter", -apple-system, BlinkMacSystemFont, sans-serif',
        marginLeft: sidebarOpen ? "320px" : "0",
        marginRight: dataPanelOpen ? "384px" : "0",
      }}
    >
      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`flex gap-3 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              {/* Avatar */}
              <div className="flex-shrink-0">
                {msg.role === "assistant" ? (
                  <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                ) : (
                  ""
                )}
              </div>

              {/* Message Content */}
              <div
                className={`flex-1 min-w-0 ${msg.role === "user" ? "max-w-lg" : ""}`}
              >
                <div
                  className={`${
                    msg.role === "user"
                      ? "bg-black text-white px-5 py-3.5 rounded-2xl rounded-tr-md"
                      : "bg-white border-2 text-black px-5 py-3.5 rounded-2xl rounded-tl-md"
                  } text-sm leading-relaxed`}
                >
                  <div
                    className="whitespace-pre-wrap"
                    style={{ lineHeight: "1.6" }}
                  >
                    {msg.content}
                  </div>

                  {/* Data indicator for assistant messages */}
                  {msg.metadata &&
                    msg.metadata.totalResults > 0 &&
                    msg.role === "assistant" && (
                      <div className="mt-4 pt-3 border-t border-gray-300">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <Database className="w-4 h-4 text-black" />
                            <span className="text-xs font-semibold">
                              Data Retrieved:
                            </span>
                          </div>
                          <span className="px-3 py-1 bg-black text-white text-xs rounded-full font-bold">
                            {msg.metadata.totalResults} results
                          </span>
                          {msg.metadata.queriesExecuted.map((query, i) => (
                            <span
                              key={i}
                              className="px-2.5 py-1 bg-white border border-black text-black text-xs rounded-full font-medium"
                            >
                              {query
                                .replace(/get|Get/, "")
                                .replace(/([A-Z])/g, " $1")
                                .trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex gap-3 max-w-[85%]">
              <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                <Activity className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div className="bg-white border-2 px-5 py-3.5 rounded-2xl rounded-tl-md">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-black rounded-full animate-pulse"></div>
                    <div
                      className="w-2 h-2 bg-black rounded-full animate-pulse"
                      style={{ animationDelay: "150ms" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-black rounded-full animate-pulse"
                      style={{ animationDelay: "300ms" }}
                    ></div>
                  </div>
                  <span className="text-sm text-black font-medium">
                    {userProfile?.isComplete
                      ? "Querying MCP server"
                      : "Processing"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Profile Analysis State */}
        {isAnalyzing && (
          <div className="flex justify-center py-6">
            <div className="bg-white border-2 border-black rounded-2xl px-6 py-4 flex items-center gap-3 max-w-md">
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
              <div>
                <p className="text-sm font-bold text-black">
                  Building Your Profile
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                  Analyzing conversation patterns...
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Suggested Questions */}
        {suggestedQuestions.length > 0 && !isLoading && (
          <div className="flex justify-center py-6">
            <div className="max-w-2xl w-full">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-black" />
                <span className="text-xs font-bold text-black uppercase tracking-wider">
                  {userProfile?.isComplete
                    ? "Explore Options"
                    : "Quick Actions"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {suggestedQuestions.map((question, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestedQuestionClick(question)}
                    className="group relative bg-white border-2 border-black hover:bg-black hover:text-white text-black px-4 py-3 rounded-xl transition-all duration-200 text-left"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium line-clamp-2">
                        {question}
                      </span>
                      <ArrowRight className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Progress Indicator - Discovery Phase */}
        {!userProfile?.isComplete && userMessageCount > 0 && (
          <div className="flex justify-center py-6">
            <div className="bg-white border-2 border-black rounded-2xl px-6 py-4 max-w-md w-full">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-black rounded-full animate-pulse"></div>
                  <span className="text-sm font-bold text-black">
                    Discovery Phase
                  </span>
                </div>
                <span className="text-xs font-medium text-gray-600">
                  {userMessageCount}/7 responses
                </span>
              </div>

              {/* Progress Bar */}
              <div className="relative w-full bg-white border-2 border-black rounded-full h-2 overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full bg-black transition-all duration-700 ease-out"
                  style={{
                    width: `${Math.min(100, (userMessageCount / 7) * 100)}%`,
                  }}
                />
              </div>

              {/* Encouragement */}
              {userMessageCount >= 4 && userMessageCount < 7 && (
                <p className="text-xs text-gray-600 mt-3 text-center font-medium">
                  {7 - userMessageCount} more response
                  {7 - userMessageCount > 1 ? "s" : ""} for personalized
                  recommendations
                </p>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
