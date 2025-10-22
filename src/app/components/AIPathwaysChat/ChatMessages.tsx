// components/ChatMessages.tsx
import React, { useRef, useEffect, useState } from "react";
import {
  Database,
  ArrowRight,
  Zap,
  ChevronDown,
  ChevronUp,
  School,
  GraduationCap,
  // Briefcase,
  ChevronRight,
  BookOpen,
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
    let currentList: string[] = [];
    let inList = false;

    const processInlineMarkdown = (text: string): React.ReactNode => {
      const parts: React.ReactNode[] = [];
      let key = 0;

      const pattern = /(\*\*[^*]+\*\*)/g;
      let lastIndex = 0;
      let match;

      while ((match = pattern.exec(text)) !== null) {
        if (match.index > lastIndex) {
          parts.push(text.substring(lastIndex, match.index));
        }

        const matchedText = match[0];
        if (matchedText.startsWith("**") && matchedText.endsWith("**")) {
          parts.push(
            <strong key={`bold-${key++}`} className="font-bold">
              {matchedText.slice(2, -2)}
            </strong>
          );
        }

        lastIndex = match.index + matchedText.length;
      }

      if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
      }

      return parts.length > 0 ? parts : text;
    };

    lines.forEach((line, index) => {
      if (line.trim().startsWith("- ")) {
        inList = true;
        currentList.push(line.trim().substring(2));
      } else if (/^\d+\.\s/.test(line.trim())) {
        inList = true;
        currentList.push(line.trim().replace(/^\d+\.\s/, ""));
      } else if (line.trim() !== "") {
        if (inList && currentList.length > 0) {
          elements.push(
            <ul
              key={`list-${elements.length}`}
              className="ml-4 mt-2 mb-2 space-y-1"
            >
              {currentList.map((item, i) => (
                <li key={i} className="flex items-start">
                  <span className="mr-2 mt-1 text-xs">•</span>
                  <span className="flex-1">{processInlineMarkdown(item)}</span>
                </li>
              ))}
            </ul>
          );
          currentList = [];
          inList = false;
        }
        elements.push(
          <p key={`p-${index}`} className="mb-2 last:mb-0">
            {processInlineMarkdown(line)}
          </p>
        );
      }
    });

    if (currentList.length > 0) {
      elements.push(
        <ul
          key={`list-${elements.length}`}
          className="ml-4 mt-2 mb-2 space-y-1"
        >
          {currentList.map((item, i) => (
            <li key={i} className="flex items-start">
              <span className="mr-2 mt-1 text-xs">•</span>
              <span className="flex-1">{processInlineMarkdown(item)}</span>
            </li>
          ))}
        </ul>
      );
    }

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
      <div className="mt-2 border-t pt-2">
        <button
          onClick={() => toggleProgramExpanded(programName)}
          className="flex items-center gap-2 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
        >
          {isExpanded ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
          <BookOpen className="w-3 h-3" />
          View Course Sequence
        </button>

        {isExpanded && (
          <div className="mt-2 pl-4">
            {coursesByGrade && (
              <div className="mb-3">
                <div className="text-xs font-semibold text-gray-700 mb-2">
                  Courses by Grade Level
                </div>
                {coursesByGrade["9TH_GRADE_COURSES"] && (
                  <div className="mb-2">
                    <div className="text-xs font-medium text-blue-600">
                      9th Grade
                    </div>
                    <ul className="text-xs text-gray-600 ml-4 mt-1 space-y-0.5">
                      {coursesByGrade["9TH_GRADE_COURSES"].map(
                        (course, idx) => (
                          <li key={idx}>• {course}</li>
                        )
                      )}
                    </ul>
                  </div>
                )}
                {coursesByGrade["10TH_GRADE_COURSES"] && (
                  <div className="mb-2">
                    <div className="text-xs font-medium text-blue-600">
                      10th Grade
                    </div>
                    <ul className="text-xs text-gray-600 ml-4 mt-1 space-y-0.5">
                      {coursesByGrade["10TH_GRADE_COURSES"].map(
                        (course, idx) => (
                          <li key={idx}>• {course}</li>
                        )
                      )}
                    </ul>
                  </div>
                )}
                {coursesByGrade["11TH_GRADE_COURSES"] && (
                  <div className="mb-2">
                    <div className="text-xs font-medium text-blue-600">
                      11th Grade
                    </div>
                    <ul className="text-xs text-gray-600 ml-4 mt-1 space-y-0.5">
                      {coursesByGrade["11TH_GRADE_COURSES"].map(
                        (course, idx) => (
                          <li key={idx}>• {course}</li>
                        )
                      )}
                    </ul>
                  </div>
                )}
                {coursesByGrade["12TH_GRADE_COURSES"] && (
                  <div className="mb-2">
                    <div className="text-xs font-medium text-blue-600">
                      12th Grade
                    </div>
                    <ul className="text-xs text-gray-600 ml-4 mt-1 space-y-0.5">
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

            {coursesByLevel && (
              <div>
                <div className="text-xs font-semibold text-gray-700 mb-2">
                  Program of Study Levels
                </div>
                {coursesByLevel.LEVEL_1_POS_COURSES && (
                  <div className="mb-2">
                    <div className="text-xs font-medium text-purple-600">
                      Level 1 (Introductory)
                    </div>
                    <ul className="text-xs text-gray-600 ml-4 mt-1 space-y-0.5">
                      {coursesByLevel.LEVEL_1_POS_COURSES.map((course, idx) => (
                        <li key={idx}>• {course}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {coursesByLevel.LEVEL_2_POS_COURSES && (
                  <div className="mb-2">
                    <div className="text-xs font-medium text-purple-600">
                      Level 2 (Concentrator)
                    </div>
                    <ul className="text-xs text-gray-600 ml-4 mt-1 space-y-0.5">
                      {coursesByLevel.LEVEL_2_POS_COURSES.map((course, idx) => (
                        <li key={idx}>• {course}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {coursesByLevel.LEVEL_3_POS_COURSES && (
                  <div className="mb-2">
                    <div className="text-xs font-medium text-purple-600">
                      Level 3 (Advanced)
                    </div>
                    <ul className="text-xs text-gray-600 ml-4 mt-1 space-y-0.5">
                      {coursesByLevel.LEVEL_3_POS_COURSES.map((course, idx) => (
                        <li key={idx}>• {course}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {coursesByLevel.LEVEL_4_POS_COURSES && (
                  <div className="mb-2">
                    <div className="text-xs font-medium text-purple-600">
                      Level 4 (Capstone)
                    </div>
                    <ul className="text-xs text-gray-600 ml-4 mt-1 space-y-0.5">
                      {coursesByLevel.LEVEL_4_POS_COURSES.map((course, idx) => (
                        <li key={idx}>• {course}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {coursesByLevel.RECOMMENDED_COURSES && (
                  <div className="mb-2">
                    <div className="text-xs font-medium text-green-600">
                      Recommended Courses
                    </div>
                    <ul className="text-xs text-gray-600 ml-4 mt-1 space-y-0.5">
                      {coursesByLevel.RECOMMENDED_COURSES.map((course, idx) => (
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

  return (
    <div className="mt-4 space-y-3">
      {data.highSchoolPrograms && data.highSchoolPrograms.length > 0 && (
        <details className="bg-gray-50 rounded-lg p-3">
          <summary className="cursor-pointer font-medium flex items-center gap-2 text-sm">
            <School className="w-4 h-4 text-blue-600" />
            <span className="text-gray-900">
              High School Programs ({data.highSchoolPrograms.length})
            </span>
          </summary>
          <div className="mt-3 space-y-2">
            {data.highSchoolPrograms.map((prog, idx) => (
              <div
                key={idx}
                className="bg-white rounded-lg p-3 text-sm shadow-sm border border-gray-200"
              >
                <div className="font-semibold text-gray-900">{prog.name}</div>
                <div className="text-gray-600 text-xs mt-1">
                  {prog.schoolCount} school{prog.schoolCount !== 1 ? "s" : ""}:{" "}
                  {prog.schools.join(", ")}
                </div>
                {formatProgramDetails(prog.name, prog.details)}
              </div>
            ))}
          </div>
        </details>
      )}

      {data.collegePrograms && data.collegePrograms.length > 0 && (
        <details className="bg-gray-50 rounded-lg p-3">
          <summary className="cursor-pointer font-medium flex items-center gap-2 text-sm">
            <GraduationCap className="w-4 h-4 text-purple-600" />
            <span className="text-gray-900">
              College Programs ({data.collegePrograms.length})
            </span>
          </summary>
          <div className="mt-3 space-y-2">
            {data.collegePrograms.map((prog, idx) => (
              <div
                key={idx}
                className="bg-white rounded-lg p-3 text-sm shadow-sm border border-gray-200"
              >
                <div className="font-semibold text-gray-900">{prog.name}</div>
                <div className="text-gray-600 text-xs mt-1">
                  {prog.campusCount} campus
                  {prog.campusCount !== 1 ? "es" : ""}:{" "}
                  {prog.campuses.join(", ")}
                </div>

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
                      Specialization
                      {(prog.variantCount || prog.variants.length) !== 1
                        ? "s"
                        : ""}
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

      {/* {data.careers && data.careers.length > 0 && (
        <details className="bg-gray-50 rounded-lg p-3">
          <summary className="cursor-pointer font-medium flex items-center gap-2 text-sm">
            <Briefcase className="w-4 h-4 text-green-600" />
            <span className="text-gray-900">
              Career Paths ({data.careers.length})
            </span>
          </summary>
          <div className="mt-3 space-y-1">
            {data.careers.map((career, idx) => (
              <div
                key={idx}
                className="bg-white rounded px-3 py-2 text-sm border border-gray-200"
              >
                {career.title}
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

        {suggestedQuestions.length > 0 && !isLoading && (
          <div className="flex justify-center py-6">
            <div className="max-w-2xl w-full">
              <button
                onClick={() => setShowSuggestions(!showSuggestions)}
                className="flex items-center justify-center gap-2 mb-3 mx-auto hover:opacity-70 transition-opacity cursor-pointer group"
              >
                <Zap className="w-4 h-4 text-black" />
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
