/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
// src/app/components/PathwayChat.tsx
"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Loader2,
  Bot,
  User,
  Sparkles,
  RotateCcw,
  School,
  GraduationCap,
  Briefcase,
  ChevronDown,
  ChevronRight,
  BookOpen,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  data?: any;
  timestamp: Date;
  loading?: boolean;
}

interface ProgramDetails {
  coursesByGrade?: {
    "9TH_GRADE_COURSES"?: string[];
    "10TH_GRADE_COURSES"?: string[];
    "11TH_GRADE_COURSES"?: string[];
    "12TH_GRADE_COURSES"?: string[];
  };
  coursesByLevel?: {
    LEVEL_1_POS_COURSES?: string[];
    LEVEL_2_POS_COURSES?: string[];
    LEVEL_3_POS_COURSES?: string[];
    LEVEL_4_POS_COURSES?: string[];
    RECOMMENDED_COURSES?: string[];
  };
}

interface PathwayData {
  highSchoolPrograms: Array<{
    name: string;
    schools: string[];
    schoolCount: number;
    details?: ProgramDetails;
  }>;
  collegePrograms: Array<{
    name: string;
    campuses: string[];
    campusCount: number;
    variants?: string[]; // All program specializations
    variantCount?: number; // Total number of specializations
  }>;
  careers: Array<{
    title: string;
    cipCode: string;
  }>;
  summary: {
    totalHighSchoolPrograms: number;
    totalHighSchools: number;
    totalCollegePrograms: number;
    totalCollegeCampuses: number;
    totalCareerPaths: number;
  };
}

export default function PathwayChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hi! I'm your Hawaii Educational Pathway Advisor. I can help you explore high school programs, college options, and career pathways. What would you like to know?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showData, setShowData] = useState<string | null>(null);
  const [expandedPrograms, setExpandedPrograms] = useState<Set<string>>(
    new Set()
  );
  const [expandedCollegeVariants, setExpandedCollegeVariants] = useState<
    Set<string>
  >(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    const loadingMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "",
      timestamp: new Date(),
      loading: true,
    };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Prepare conversation history (exclude the current message and loading message)
      const conversationHistory = messages
        .filter(m => !m.loading)
        .map(m => ({
          role: m.role,
          content: m.content,
        }));

      const response = await fetch("/api/pathway", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input.trim(),
          conversationHistory,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: "assistant",
        content: data.message || "I found some relevant information for you.",
        data: data.data,
        timestamp: new Date(),
      };

      setMessages(prev =>
        prev.filter(m => m.id !== loadingMessage.id).concat(assistantMessage)
      );
    } catch (error) {
      console.error("Error:", error);

      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: "assistant",
        content:
          "Sorry, I encountered an error. Please try again or rephrase your question.",
        timestamp: new Date(),
      };

      setMessages(prev =>
        prev.filter(m => m.id !== loadingMessage.id).concat(errorMessage)
      );
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleReset = () => {
    setMessages([
      {
        id: "1",
        role: "assistant",
        content:
          "Hi! I'm your Hawaii Educational Pathway Advisor. I can help you explore high school programs, college options, and career pathways. What would you like to know?",
        timestamp: new Date(),
      },
    ]);
    setShowData(null);
    setExpandedPrograms(new Set());
    setExpandedCollegeVariants(new Set());
  };

  const suggestedQueries = [
    "Where can I study culinary arts?",
    "What high schools offer engineering?",
    "Show me computer science pathways",
    "Healthcare programs in Hawaii",
    "Careers from cybersecurity",
  ];

  const handleSuggestion = (query: string) => {
    setInput(query);
    inputRef.current?.focus();
  };

  const toggleProgramExpanded = (programName: string) => {
    setExpandedPrograms(prev => {
      const newSet = new Set(prev);
      if (newSet.has(programName)) {
        newSet.delete(programName);
      } else {
        newSet.add(programName);
      }
      return newSet;
    });
  };

  const toggleCollegeVariants = (programName: string) => {
    setExpandedCollegeVariants(prev => {
      const newSet = new Set(prev);
      if (newSet.has(programName)) {
        newSet.delete(programName);
      } else {
        newSet.add(programName);
      }
      return newSet;
    });
  };

  const formatProgramDetails = (
    programName: string,
    details?: ProgramDetails
  ) => {
    if (!details) return null;

    const isExpanded = expandedPrograms.has(programName);
    const { coursesByGrade, coursesByLevel } = details;

    return (
      <div className="mt-2 border-t pt-2">
        <button
          onClick={() => toggleProgramExpanded(programName)}
          className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
          <BookOpen className="w-4 h-4" />
          View Course Details
        </button>

        {isExpanded && (
          <div className="mt-3 space-y-3 pl-4">
            {/* Grade-Level Courses */}
            {coursesByGrade && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Courses by Grade Level
                </div>

                {coursesByGrade["9TH_GRADE_COURSES"] && (
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="text-xs font-semibold text-blue-700 mb-1">
                      9th Grade Courses
                    </div>
                    <ul className="text-xs text-blue-700 space-y-0.5">
                      {coursesByGrade["9TH_GRADE_COURSES"].map(
                        (course, idx) => (
                          <li key={idx}>• {course}</li>
                        )
                      )}
                    </ul>
                  </div>
                )}

                {coursesByGrade["10TH_GRADE_COURSES"] && (
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="text-xs font-semibold text-green-700 mb-1">
                      10th Grade Courses
                    </div>
                    <ul className="text-xs text-green-700 space-y-0.5">
                      {coursesByGrade["10TH_GRADE_COURSES"].map(
                        (course, idx) => (
                          <li key={idx}>• {course}</li>
                        )
                      )}
                    </ul>
                  </div>
                )}

                {coursesByGrade["11TH_GRADE_COURSES"] && (
                  <div className="bg-yellow-50 rounded-lg p-3">
                    <div className="text-xs font-semibold text-yellow-700 mb-1">
                      11th Grade Courses
                    </div>
                    <ul className="text-xs text-yellow-700 space-y-0.5">
                      {coursesByGrade["11TH_GRADE_COURSES"].map(
                        (course, idx) => (
                          <li key={idx}>• {course}</li>
                        )
                      )}
                    </ul>
                  </div>
                )}

                {coursesByGrade["12TH_GRADE_COURSES"] && (
                  <div className="bg-purple-50 rounded-lg p-3">
                    <div className="text-xs font-semibold text-purple-700 mb-1">
                      12th Grade Courses
                    </div>
                    <ul className="text-xs text-purple-700 space-y-0.5">
                      {coursesByGrade["12TH_GRADE_COURSES"].map(
                        (course, idx) => (
                          <li key={idx}>• {course}</li>
                        )
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Level-Based Courses */}
            {coursesByLevel && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Program of Study (POS) Courses
                </div>

                {coursesByLevel.LEVEL_1_POS_COURSES && (
                  <div className="bg-indigo-50 rounded-lg p-3">
                    <div className="text-xs font-semibold text-indigo-700 mb-1">
                      Level 1 POS Courses
                    </div>
                    <ul className="text-xs text-indigo-700 space-y-0.5">
                      {coursesByLevel.LEVEL_1_POS_COURSES.map((course, idx) => (
                        <li key={idx}>• {course}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {coursesByLevel.LEVEL_2_POS_COURSES && (
                  <div className="bg-indigo-50 rounded-lg p-3">
                    <div className="text-xs font-semibold text-indigo-700 mb-1">
                      Level 2 POS Courses
                    </div>
                    <ul className="text-xs text-indigo-700 space-y-0.5">
                      {coursesByLevel.LEVEL_2_POS_COURSES.map((course, idx) => (
                        <li key={idx}>• {course}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {coursesByLevel.LEVEL_3_POS_COURSES && (
                  <div className="bg-indigo-50 rounded-lg p-3">
                    <div className="text-xs font-semibold text-indigo-700 mb-1">
                      Level 3 POS Courses
                    </div>
                    <ul className="text-xs text-indigo-700 space-y-0.5">
                      {coursesByLevel.LEVEL_3_POS_COURSES.map((course, idx) => (
                        <li key={idx}>• {course}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {coursesByLevel.LEVEL_4_POS_COURSES && (
                  <div className="bg-indigo-50 rounded-lg p-3">
                    <div className="text-xs font-semibold text-indigo-700 mb-1">
                      Level 4 POS Courses
                    </div>
                    <ul className="text-xs text-indigo-700 space-y-0.5">
                      {coursesByLevel.LEVEL_4_POS_COURSES.map((course, idx) => (
                        <li key={idx}>• {course}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const formatPathwayData = (data: PathwayData) => {
    return (
      <div className="mt-4 space-y-4 border-t pt-4">
        {/* Expandable Details */}
        <div className="space-y-2">
          {data.highSchoolPrograms.length > 0 && (
            <details className="bg-gray-50 rounded p-3" open>
              <summary className="cursor-pointer font-medium flex items-center gap-2">
                <School className="w-4 h-4" />
                High School Programs ({data.highSchoolPrograms.length})
              </summary>
              <div className="mt-2 space-y-3">
                {data.highSchoolPrograms.map((prog, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-lg p-3 text-sm shadow-sm"
                  >
                    <div className="font-medium text-gray-900">{prog.name}</div>
                    <div className="text-gray-600 text-xs mt-1">
                      {prog.schoolCount} schools: {prog.schools.join(", ")}
                    </div>
                    {formatProgramDetails(prog.name, prog.details)}
                  </div>
                ))}
              </div>
            </details>
          )}

          {data.collegePrograms.length > 0 && (
            <details className="bg-gray-50 rounded p-3">
              <summary className="cursor-pointer font-medium flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                College Programs ({data.collegePrograms.length})
              </summary>
              <div className="mt-2 space-y-2">
                {data.collegePrograms.map((prog, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-lg p-3 text-sm shadow-sm"
                  >
                    <div className="font-medium text-gray-900">{prog.name}</div>
                    <div className="text-gray-600 text-xs mt-1">
                      {prog.campusCount} campuses: {prog.campuses.join(", ")}
                    </div>

                    {/* Show all program variants/specializations */}
                    {prog.variants && prog.variants.length > 0 && (
                      <div className="mt-2">
                        <button
                          onClick={() => toggleCollegeVariants(prog.name)}
                          className="flex items-center gap-2 text-xs font-medium text-purple-600 hover:text-purple-700 transition-colors"
                        >
                          {expandedCollegeVariants.has(prog.name) ? (
                            <ChevronDown className="w-3 h-3" />
                          ) : (
                            <ChevronRight className="w-3 h-3" />
                          )}
                          <GraduationCap className="w-3 h-3" />
                          View {prog.variantCount || prog.variants.length}{" "}
                          Specializations
                        </button>

                        {expandedCollegeVariants.has(prog.name) && (
                          <div className="mt-2 pl-4 space-y-1">
                            {prog.variants.map((variant, vIdx) => (
                              <div
                                key={vIdx}
                                className="text-xs text-gray-700 bg-purple-50 rounded px-2 py-1"
                              >
                                • {variant}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </details>
          )}

          {data.careers.length > 0 && (
            <details className="bg-gray-50 rounded p-3">
              <summary className="cursor-pointer font-medium flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Career Paths ({data.careers.length})
              </summary>
              <div className="mt-2 space-y-1">
                {data.careers.map((career, idx) => (
                  <div key={idx} className="bg-white rounded px-2 py-1 text-sm">
                    {career.title}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen max-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-gray-900">
              Hawaii Pathway Advisor
            </h1>
            <p className="text-xs text-gray-500">
              Educational pathways from high school to career
            </p>
          </div>
        </div>
        <button
          onClick={handleReset}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          title="Reset conversation"
        >
          <RotateCcw className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map(message => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "assistant" && (
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-white" />
                </div>
              )}

              <div
                className={`max-w-[80%] ${
                  message.role === "user"
                    ? "bg-blue-600 text-white rounded-2xl rounded-tr-sm"
                    : "bg-white rounded-2xl rounded-tl-sm shadow-sm"
                } px-4 py-3`}
              >
                {message.loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-gray-500">Searching pathways...</span>
                  </div>
                ) : (
                  <>
                    <p
                      className={`whitespace-pre-wrap ${
                        message.role === "user" ? "text-white" : "text-gray-800"
                      }`}
                    >
                      {message.content}
                    </p>
                    {message.data && formatPathwayData(message.data)}
                  </>
                )}
              </div>

              {message.role === "user" && (
                <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Suggestions */}
      {messages.length === 1 && (
        <div className="px-4 pb-2">
          <div className="max-w-3xl mx-auto">
            <p className="text-xs text-gray-500 mb-2">Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {suggestedQueries.map((query, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestion(query)}
                  className="text-sm bg-white border border-gray-200 rounded-full px-3 py-1.5 hover:bg-gray-50 transition-colors"
                >
                  {query}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input Form */}
      <div className="bg-white border-t p-4">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about programs, schools, careers..."
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
