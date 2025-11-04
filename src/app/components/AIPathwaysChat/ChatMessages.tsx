// components/ChatMessages.tsx
import React, { useRef, useEffect, useState } from "react";
import {
  Database,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  School,
  GraduationCap,
  // Briefcase,
  ChevronRight,
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
  navSidebarOpen: boolean;
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
  highSchoolPrograms?: Array<{
    name: string;
    schools: string[];
    schoolCount: number;
    details?: ProgramDetails;
  }>;
  collegePrograms?: Array<{
    name: string;
    campuses: string[];
    campusCount: number;
    variants?: string[];
    variantCount?: number;
  }>;
  careers?: Array<{
    title: string;
    cipCode?: string;
  }>;
  summary?: {
    totalHighSchoolPrograms?: number;
    totalHighSchools?: number;
    totalCollegePrograms?: number;
    totalCollegeCampuses?: number;
    totalCareerPaths?: number;
  };
}

const MarkdownRenderer: React.FC<{ content: string; className?: string }> = ({
  content,
  className = "",
}) => {
  const parseMarkdown = (text: string): React.ReactNode => {
    const lines = text.split("\n");
    const elements: React.ReactNode[] = [];
    let currentList: { type: 'ul' | 'ol', items: string[] } | null = null;
    let lineIndex = 0;

    const processInlineMarkdown = (text: string): React.ReactNode => {
      const parts: React.ReactNode[] = [];
      let lastIndex = 0;
      let key = 0;

      // Match bold (**text**), italic (*text*), and inline code (`text`)
      const pattern = /(\*\*[^*]+\*\*)|(\*[^*]+\*)|(`[^`]+`)/g;
      let match;

      while ((match = pattern.exec(text)) !== null) {
        // Add text before match
        if (match.index > lastIndex) {
          parts.push(text.substring(lastIndex, match.index));
        }

        const matchedText = match[0];
        if (matchedText.startsWith("**") && matchedText.endsWith("**")) {
          // Bold
          parts.push(
            <strong key={`bold-${key++}`} className="font-semibold text-slate-900">
              {matchedText.slice(2, -2)}
            </strong>
          );
        } else if (matchedText.startsWith("*") && matchedText.endsWith("*")) {
          // Italic
          parts.push(
            <em key={`italic-${key++}`} className="italic">
              {matchedText.slice(1, -1)}
            </em>
          );
        } else if (matchedText.startsWith("`") && matchedText.endsWith("`")) {
          // Inline code
          parts.push(
            <code key={`code-${key++}`} className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-sm font-mono">
              {matchedText.slice(1, -1)}
            </code>
          );
        }

        lastIndex = match.index + matchedText.length;
      }

      // Add remaining text
      if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
      }

      return parts.length > 0 ? parts : text;
    };

    const flushList = () => {
      if (currentList && currentList.items.length > 0) {
        const ListTag = currentList.type === 'ol' ? 'ol' : 'ul';
        const listClassName = currentList.type === 'ol' 
          ? "ml-5 mt-3 mb-3 space-y-2 list-decimal list-outside"
          : "ml-5 mt-3 mb-3 space-y-2 list-disc list-outside";
        
        elements.push(
          <ListTag
            key={`list-${elements.length}`}
            className={listClassName}
          >
            {currentList.items.map((item, i) => (
              <li key={i} className="pl-1.5 text-slate-700 leading-relaxed">
                {processInlineMarkdown(item)}
              </li>
            ))}
          </ListTag>
        );
        currentList = null;
      }
    };

    while (lineIndex < lines.length) {
      const line = lines[lineIndex];
      const trimmed = line.trim();

      // Headers (## Header or ### Header)
      if (trimmed.match(/^#{1,6}\s+/)) {
        flushList();
        const level = trimmed.match(/^#{1,6}/)?.[0].length || 2;
        const headerText = trimmed.replace(/^#{1,6}\s+/, '');
        
        const headerClasses = {
          1: "text-2xl font-bold text-slate-900 mt-6 mb-4",
          2: "text-xl font-bold text-slate-900 mt-5 mb-3",
          3: "text-lg font-semibold text-slate-900 mt-4 mb-2",
          4: "text-base font-semibold text-slate-800 mt-3 mb-2",
          5: "text-sm font-semibold text-slate-800 mt-3 mb-2",
          6: "text-sm font-semibold text-slate-700 mt-2 mb-1",
        }[level] || "text-lg font-semibold text-slate-900 mt-4 mb-2";

        const headerContent = processInlineMarkdown(headerText);

        // Render appropriate header level
        if (level === 1) {
          elements.push(<h1 key={`header-${lineIndex}`} className={headerClasses}>{headerContent}</h1>);
        } else if (level === 2) {
          elements.push(<h2 key={`header-${lineIndex}`} className={headerClasses}>{headerContent}</h2>);
        } else if (level === 3) {
          elements.push(<h3 key={`header-${lineIndex}`} className={headerClasses}>{headerContent}</h3>);
        } else if (level === 4) {
          elements.push(<h4 key={`header-${lineIndex}`} className={headerClasses}>{headerContent}</h4>);
        } else if (level === 5) {
          elements.push(<h5 key={`header-${lineIndex}`} className={headerClasses}>{headerContent}</h5>);
        } else {
          elements.push(<h6 key={`header-${lineIndex}`} className={headerClasses}>{headerContent}</h6>);
        }
        
        lineIndex++;
        continue;
      }

      // Unordered list (- item or * item)
      if (trimmed.match(/^[-*]\s+/)) {
        const itemText = trimmed.replace(/^[-*]\s+/, '');
        if (!currentList || currentList.type !== 'ul') {
          flushList();
          currentList = { type: 'ul', items: [] };
        }
        currentList.items.push(itemText);
        lineIndex++;
        continue;
      }

      // Ordered list (1. item)
      if (trimmed.match(/^\d+\.\s+/)) {
        const itemText = trimmed.replace(/^\d+\.\s+/, '');
        if (!currentList || currentList.type !== 'ol') {
          flushList();
          currentList = { type: 'ol', items: [] };
        }
        currentList.items.push(itemText);
        lineIndex++;
        continue;
      }

      // Empty line
      if (trimmed === '') {
        flushList();
        lineIndex++;
        continue;
      }

      // Regular paragraph
      flushList();
      elements.push(
        <p key={`p-${lineIndex}`} className="mb-3 last:mb-0 text-slate-700 leading-relaxed">
          {processInlineMarkdown(line)}
        </p>
      );
      lineIndex++;
    }

    // Flush any remaining list
    flushList();

    return elements;
  };

  return (
    <div className={`markdown-content ${className}`}>
      {parseMarkdown(content)}
    </div>
  );
};

const PathwayVisualization: React.FC<{ data: PathwayData }> = ({ data }) => {
  const [expandedPrograms, setExpandedPrograms] = useState<Set<string>>(
    new Set()
  );
  const [expandedCollegeVariants, setExpandedCollegeVariants] = useState<
    Set<string>
  >(new Set());

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
      <div className="mt-3 pt-3 border-t border-slate-100">
        <button
          onClick={() => toggleProgramExpanded(programName)}
          className="flex items-center gap-2 text-xs font-medium text-blue-700 hover:text-blue-900 transition-colors"
        >
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
          <span>View Course Sequence</span>
        </button>

        {isExpanded && (
          <div className="mt-3 space-y-4">
            {coursesByGrade && (
              <div>
                <div className="text-xs font-semibold text-slate-700 mb-2.5 uppercase tracking-wide">
                  Courses by Grade Level
                </div>
                <div className="space-y-3">
                  {coursesByGrade["9TH_GRADE_COURSES"] && (
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                      <div className="text-xs font-semibold text-blue-900 mb-2">
                        9th Grade
                      </div>
                      <div className="space-y-1">
                        {coursesByGrade["9TH_GRADE_COURSES"].map((course, idx) => (
                          <div key={idx} className="text-xs text-slate-700 flex items-start gap-2">
                            <span className="text-blue-400 mt-0.5">•</span>
                            <span>{course}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {coursesByGrade["10TH_GRADE_COURSES"] && (
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                      <div className="text-xs font-semibold text-blue-900 mb-2">
                        10th Grade
                      </div>
                      <div className="space-y-1">
                        {coursesByGrade["10TH_GRADE_COURSES"].map((course, idx) => (
                          <div key={idx} className="text-xs text-slate-700 flex items-start gap-2">
                            <span className="text-blue-400 mt-0.5">•</span>
                            <span>{course}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {coursesByGrade["11TH_GRADE_COURSES"] && (
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                      <div className="text-xs font-semibold text-blue-900 mb-2">
                        11th Grade
                      </div>
                      <div className="space-y-1">
                        {coursesByGrade["11TH_GRADE_COURSES"].map((course, idx) => (
                          <div key={idx} className="text-xs text-slate-700 flex items-start gap-2">
                            <span className="text-blue-400 mt-0.5">•</span>
                            <span>{course}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {coursesByGrade["12TH_GRADE_COURSES"] && (
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                      <div className="text-xs font-semibold text-blue-900 mb-2">
                        12th Grade
                      </div>
                      <div className="space-y-1">
                        {coursesByGrade["12TH_GRADE_COURSES"].map((course, idx) => (
                          <div key={idx} className="text-xs text-slate-700 flex items-start gap-2">
                            <span className="text-blue-400 mt-0.5">•</span>
                            <span>{course}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {coursesByLevel && (
              <div>
                <div className="text-xs font-semibold text-slate-700 mb-2.5 uppercase tracking-wide">
                  Program of Study Levels
                </div>
                <div className="space-y-3">
                  {coursesByLevel.LEVEL_1_POS_COURSES && (
                    <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
                      <div className="text-xs font-semibold text-purple-900 mb-2">
                        Level 1 - Introductory
                      </div>
                      <div className="space-y-1">
                        {coursesByLevel.LEVEL_1_POS_COURSES.map((course, idx) => (
                          <div key={idx} className="text-xs text-slate-700 flex items-start gap-2">
                            <span className="text-purple-400 mt-0.5">•</span>
                            <span>{course}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {coursesByLevel.LEVEL_2_POS_COURSES && (
                    <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
                      <div className="text-xs font-semibold text-purple-900 mb-2">
                        Level 2 - Concentrator
                      </div>
                      <div className="space-y-1">
                        {coursesByLevel.LEVEL_2_POS_COURSES.map((course, idx) => (
                          <div key={idx} className="text-xs text-slate-700 flex items-start gap-2">
                            <span className="text-purple-400 mt-0.5">•</span>
                            <span>{course}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {coursesByLevel.LEVEL_3_POS_COURSES && (
                    <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
                      <div className="text-xs font-semibold text-purple-900 mb-2">
                        Level 3 - Advanced
                      </div>
                      <div className="space-y-1">
                        {coursesByLevel.LEVEL_3_POS_COURSES.map((course, idx) => (
                          <div key={idx} className="text-xs text-slate-700 flex items-start gap-2">
                            <span className="text-purple-400 mt-0.5">•</span>
                            <span>{course}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {coursesByLevel.LEVEL_4_POS_COURSES && (
                    <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
                      <div className="text-xs font-semibold text-purple-900 mb-2">
                        Level 4 - Capstone
                      </div>
                      <div className="space-y-1">
                        {coursesByLevel.LEVEL_4_POS_COURSES.map((course, idx) => (
                          <div key={idx} className="text-xs text-slate-700 flex items-start gap-2">
                            <span className="text-purple-400 mt-0.5">•</span>
                            <span>{course}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {coursesByLevel.RECOMMENDED_COURSES && (
                    <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                      <div className="text-xs font-semibold text-green-900 mb-2">
                        Recommended Courses
                      </div>
                      <div className="space-y-1">
                        {coursesByLevel.RECOMMENDED_COURSES.map((course, idx) => (
                          <div key={idx} className="text-xs text-slate-700 flex items-start gap-2">
                            <span className="text-green-400 mt-0.5">•</span>
                            <span>{course}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mt-4 space-y-3">
      {data.highSchoolPrograms && data.highSchoolPrograms.length > 0 && (
        <details className="group bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200 overflow-hidden transition-all hover:shadow-md">
          <summary className="cursor-pointer px-4 py-3 flex items-center justify-between text-sm font-medium text-slate-900 hover:bg-white/50 transition-colors">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <School className="w-4 h-4 text-blue-700" />
              </div>
              <div>
                <div className="font-semibold text-slate-900">High School Programs</div>
                <div className="text-xs text-slate-500">{data.highSchoolPrograms.length} programs available</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-open:rotate-90 transition-transform" />
          </summary>
          <div className="px-4 pb-4 pt-2 space-y-2.5 bg-white">
            {data.highSchoolPrograms.map((prog, idx) => (
              <div
                key={idx}
                className="bg-white rounded-lg p-4 border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="font-semibold text-slate-900 mb-2">{prog.name}</div>
                <div className="mb-2">
                  <span className="inline-flex items-center gap-2 text-xs text-slate-600 mb-2">
                    <span className="px-2 py-1 bg-slate-100 rounded-md font-medium">
                      {prog.schoolCount} school{prog.schoolCount !== 1 ? "s" : ""}
                    </span>
                  </span>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {prog.schools.map((school, sIdx) => (
                      <span
                        key={sIdx}
                        className="inline-flex items-center px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-md border border-blue-100"
                      >
                        {school}
                      </span>
                    ))}
                  </div>
                </div>
                {formatProgramDetails(prog.name, prog.details)}
              </div>
            ))}
          </div>
        </details>
      )}

      {data.collegePrograms && data.collegePrograms.length > 0 && (
        <details className="group bg-gradient-to-br from-red-50 to-orange-50 rounded-xl border border-red-200 overflow-hidden transition-all hover:shadow-md">
          <summary className="cursor-pointer px-4 py-3 flex items-center justify-between text-sm font-medium text-slate-900 hover:bg-white/50 transition-colors">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-red-700" />
              </div>
              <div>
                <div className="font-semibold text-slate-900">College Programs</div>
                <div className="text-xs text-slate-500">{data.collegePrograms.length} programs available</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-open:rotate-90 transition-transform" />
          </summary>
          <div className="px-4 pb-4 pt-2 space-y-2.5 bg-white">
            {data.collegePrograms.map((prog, idx) => (
              <div
                key={idx}
                className="bg-white rounded-lg p-4 border border-slate-200 hover:border-red-300 hover:shadow-sm transition-all"
              >
                <div className="font-semibold text-slate-900 mb-2">{prog.name}</div>
                <div className="mb-2">
                  <span className="inline-flex items-center gap-2 text-xs text-slate-600 mb-2">
                    <span className="px-2 py-1 bg-slate-100 rounded-md font-medium">
                      {prog.campusCount} campus{prog.campusCount !== 1 ? "es" : ""}
                    </span>
                  </span>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {prog.campuses.map((campus, cIdx) => (
                      <span
                        key={cIdx}
                        className="inline-flex items-center px-2.5 py-1 bg-red-50 text-red-700 text-xs rounded-md border border-red-100"
                      >
                        {campus}
                      </span>
                    ))}
                  </div>
                </div>

                {prog.variants && prog.variants.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => toggleCollegeVariants(prog.name)}
                      className="flex items-center gap-2 text-xs font-medium text-red-700 hover:text-red-900 transition-colors"
                    >
                      {expandedCollegeVariants.has(prog.name) ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {prog.variantCount || prog.variants.length}{" "}
                        Specialization{(prog.variantCount || prog.variants.length) !== 1 ? "s" : ""}
                      </span>
                    </button>

                    {expandedCollegeVariants.has(prog.name) && (
                      <div className="mt-2 space-y-1.5">
                        {prog.variants.map((variant, vIdx) => (
                          <div
                            key={vIdx}
                            className="text-xs text-slate-700 bg-red-50 border border-red-100 rounded-md px-3 py-2 flex items-start gap-2"
                          >
                            <span className="text-red-400 mt-0.5">•</span>
                            <span className="flex-1">{variant}</span>
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

      {/* {data.careers && data.careers.length > 0 && (
      <details className="bg-gray-50 rounded-lg p-3">
        <summary className="cursor-pointer font-medium flex items-center gap-2 text-sm">
        <Briefcase className="w-4 h-4 text-green-600" />
        <span className="text-gray-900">
          Career Paths ({Array.from(new Set(data.careers.map(c => c.title))).length})
        </span>
        </summary>
        <div className="mt-3 space-y-1">
        {Array.from(new Set(data.careers.map(c => c.title))).map((title, idx) => (
          <div
          key={idx}
          className="bg-white rounded px-3 py-2 text-sm border border-gray-200"
          >
          {title}
          </div>
        ))}
        </div>
      </details>
      )} */}
    </div>
  );
};

export default function ChatMessages({
  messages,
  isLoading,
  suggestedQuestions,
  setSuggestedQuestions,
  setMessage,
  userProfile,
  sidebarOpen,
  dataPanelOpen,
  navSidebarOpen,
}: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSeconds, setLoadingSeconds] = useState(0);
  
  // Check if this is the initial state (no user messages yet)
  const isInitialState = messages.filter(m => m.role === "user").length === 0;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isLoading) {
      setLoadingSeconds(0);
      const interval = setInterval(() => {
        setLoadingSeconds(s => s + 1);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isLoading]);

  const handleSuggestedQuestionClick = (question: string) => {
    setMessage(question);
    setSuggestedQuestions([]);
  };

  const getLeftOffset = () => {
    if (sidebarOpen) {
      return 320; // LeftSidebar width only
    }
    return navSidebarOpen ? 256 : 56; // NavSidebar width
  };

  // If initial state, render centered Claude-like layout
  if (isInitialState) {
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center transition-all duration-300 bg-white"
        style={{
          fontFamily:
            '"SF Pro Display", "Inter", -apple-system, BlinkMacSystemFont, sans-serif',
          marginLeft: `${getLeftOffset()}px`,
          marginRight: dataPanelOpen ? "384px" : "0",
          paddingBottom: "180px", // Account for input height
        }}
      >
        <div className="max-w-3xl w-full px-6">
          {/* Welcome Message */}
          {messages.length > 0 && messages[0].role === "assistant" && (
            <div className="text-center mb-8 space-y-8 animate-in fade-in duration-700">
              {/* Logo */}
              <div className="inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/uhcc-logo-3.png"
                  alt="UHCC Logo"
                  className="w-20 h-20 object-contain mx-auto drop-shadow-sm"
                />
              </div>
              
              {/* Title */}
              <div className="space-y-2">
                <h1 className="text-4xl font-bold text-slate-900 tracking-tight" style={{ letterSpacing: "0.04em" }}>
                  Kamaʻāina Pathways
                </h1>
              </div>
              
              {/* Greeting Text */}
              <div className="text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
                <MarkdownRenderer
                  content={messages[0].content}
                  className="text-slate-600"
                />
              </div>
            </div>
          )}

          {/* Suggested Questions */}
          {suggestedQuestions.length > 0 && !isLoading && (
            <div className="space-y-3 animate-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-2 gap-3">
                {suggestedQuestions.map((question, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestedQuestionClick(question)}
                    className="group bg-white border-2 border-slate-200 hover:border-black hover:bg-slate-50 text-slate-700 hover:text-black px-5 py-4 rounded-xl transition-all duration-200 text-left"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium line-clamp-2">
                        {question}
                      </span>
                      <ArrowRight className="w-4 h-4 opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all flex-shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Normal chat layout after first user message
  return (
    <div
      className="flex-1 overflow-y-auto pb-36 transition-all duration-300 bg-white"
      style={{
        fontFamily:
          '"SF Pro Display", "Inter", -apple-system, BlinkMacSystemFont, sans-serif',
        marginLeft: `${getLeftOffset()}px`,
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
              <div className="flex-shrink-0">
                {msg.role === "assistant" ? "" : ""}
              </div>

              <div
                className={`flex-1 min-w-0 ${msg.role === "user" ? "max-w-lg" : ""}`}
              >
                <div
                  className={`${
                    msg.role === "user"
                      ? "bg-black text-white px-5 py-3.5 rounded-2xl rounded-tr-md"
                      : "bg-white text-black px-5 py-3.5"
                  } text-sm leading-relaxed`}
                >
                  <div style={{ lineHeight: "1.6" }}>
                    {msg.role === "assistant" ? (
                      <MarkdownRenderer
                        content={msg.content}
                        className="text-black"
                      />
                    ) : (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    )}
                  </div>

                  {msg.data &&
                    msg.role === "assistant" &&
                    (msg.data.highSchoolPrograms ||
                      msg.data.collegePrograms ||
                      msg.data.careers) && (
                      <PathwayVisualization data={msg.data} />
                    )}

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

        {isLoading && (
          <div className="flex justify-start">
            <div className="flex gap-3 max-w-[85%]">
              <div className="bg-white px-5 py-3.5 rounded-2xl rounded-tl-md">
                <span className="text-sm text-black font-medium">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      ></span>
                      <span
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      ></span>
                      <span
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      ></span>
                    </div>
                    <span className="text-xs text-gray-400">
                      Thinking... {loadingSeconds}s
                    </span>
                  </div>
                </span>
              </div>
            </div>
          </div>
        )}

        {suggestedQuestions.length > 0 && !isLoading && messages.filter(m => m.role === "user").length < 3 && (
          <div className="flex justify-center py-6">
            <div className="max-w-2xl w-full">
              <button
                onClick={() => setShowSuggestions(!showSuggestions)}
                className="flex items-center justify-center gap-2 mb-3 mx-auto hover:opacity-70 transition-opacity cursor-pointer group"
              >
                <span className="text-xs font-bold text-black uppercase tracking-wider">
                  {userProfile?.isComplete
                    ? "Explore Options"
                    : "Quick Actions"}
                </span>
                {showSuggestions ? (
                  <ChevronUp className="w-4 h-4 text-black" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-black" />
                )}
              </button>

              {showSuggestions && (
                <div className="grid grid-cols-2 gap-2 animate-in slide-in-from-top-2 duration-200">
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
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
