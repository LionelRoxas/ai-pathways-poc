/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  Bot,
  User,
  Menu,
  X,
  TrendingUp,
  MapPin,
  DollarSign,
  Building,
  Briefcase,
  GraduationCap,
  BookOpen,
  Award,
  Clock,
} from "lucide-react";

interface UserProfile {
  education_level: string;
  grade_level?: number;
  interests: string[];
  career_goals?: string;
  timeline: string;
  college_plans: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  data?: any;
  responseType?: string;
}

interface Career {
  id: string;
  title: string;
  description: string;
  salaryMin: number;
  salaryMax: number;
  requiredEducation: string;
  skills: string[];
  industries: string[];
  jobOutlook: string;
  growthRate?: number;
  currentOpenings?: number;
  hiringCompanies?: string[];
}

interface Program {
  id: string;
  institution: string;
  campus?: string;
  programName: string;
  degreeType: string;
  durationYears: number;
  tuitionResident?: number;
  tuitionNonresident?: number;
  admissionRequirements?: string[];
  graduationRate?: number;
  employmentRate?: number;
  medianStartingSalary?: number;
  relatedCareers?: string[];
}

interface AIPathwaysChatProps {
  userProfile: UserProfile;
  onBack: () => void;
}

export default function AIPathwaysChat({
  userProfile,
  onBack,
}: AIPathwaysChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Send initial welcome message
    const welcomeMessage = generateWelcomeMessage(userProfile);
    setMessages([
      {
        role: "assistant",
        content: welcomeMessage,
      },
    ]);

    // Optionally fetch initial recommendations
    fetchInitialRecommendations();
  }, [userProfile]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const generateWelcomeMessage = (profile: UserProfile) => {
    const educationMap: { [key: string]: string } = {
      middle_school: "middle school student",
      high_school: "high school student",
      college: "college student",
      working: "working professional",
      other: "learner",
    };

    const interestMap: { [key: string]: string } = {
      math_science: "Math & Science",
      technology: "Technology",
      arts_creative: "Arts & Creative",
      business_finance: "Business & Finance",
      healthcare: "Healthcare",
      education_social: "Education & Social Work",
      hands_on: "Hands-on/Technical Work",
      tourism: "Tourism & Hospitality",
      environment: "Environmental Science",
    };

    const interests = profile.interests
      .map(i => interestMap[i] || i)
      .join(", ");
    const education =
      educationMap[profile.education_level] || profile.education_level;

    return `Aloha! I'm your AI career guide. Based on your profile as a ${education} interested in ${interests}, I'm here to help you explore career pathways in Hawaii.

I can help you with:
• **Career recommendations** based on your interests
• **Education pathways** at UH campuses 
• **Job market information** specific to Hawaii
• **Skills and certifications** you'll need
• **Company insights** and hiring trends

What would you like to explore first?`;
  };

  const fetchInitialRecommendations = async () => {
    try {
      const response = await fetch("/api/ai-pathways", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "",
          userProfile: userProfile,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.quickRecommendations) {
          // Silently store initial recommendations for quick access
          console.log("Initial recommendations loaded");
        }
      }
    } catch (error) {
      console.error("Error fetching initial recommendations:", error);
    }
  };

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage = { role: "user" as const, content: message };
    setMessages(prev => [...prev, userMessage]);
    setMessage("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai-pathways", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message,
          userProfile: userProfile,
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const data = await response.json();

      // Create assistant message with data
      const assistantMessage: Message = {
        role: "assistant",
        content: data.message,
        data: data,
        responseType: data.responseType,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error:", error);
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content:
            "I apologize, but I'm having trouble accessing the career database right now. Please try again in a moment.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return "Salary data unavailable";
    if (!max) return `From $${min?.toLocaleString()}`;
    if (!min) return `Up to $${max.toLocaleString()}`;
    return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
  };

  const getEducationDisplay = (profile: UserProfile) => {
    const educationMap: { [key: string]: string } = {
      middle_school: "Middle School",
      high_school: "High School",
      college: "College Student",
      working: "Working Professional",
      other: "Other",
    };
    return educationMap[profile.education_level] || profile.education_level;
  };

  const renderCareerRecommendations = (careers: Career[]) => {
    if (!careers || careers.length === 0) return null;

    return (
      <div className="mt-4 space-y-3">
        <h4 className="font-semibold text-gray-800 flex items-center gap-2">
          <Briefcase size={18} />
          Career Recommendations
        </h4>
        {careers.map((career, idx) => (
          <div
            key={career.id || idx}
            className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-2">
              <h5 className="font-semibold text-blue-900">{career.title}</h5>
              {career.growthRate && (
                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                  <TrendingUp size={12} />+{career.growthRate}%
                </span>
              )}
            </div>

            <p className="text-sm text-gray-700 mb-3">{career.description}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <DollarSign size={16} className="text-green-600" />
                <span>{formatSalary(career.salaryMin, career.salaryMax)}</span>
              </div>

              {career.currentOpenings !== undefined && (
                <div className="flex items-center gap-2">
                  <Briefcase size={16} className="text-blue-600" />
                  <span>{career.currentOpenings} openings</span>
                </div>
              )}
            </div>

            <div className="mt-3">
              <span className="text-xs text-gray-600">
                Required Education:{" "}
              </span>
              <span className="text-xs font-medium">
                {career.requiredEducation}
              </span>
            </div>

            {career.skills && career.skills.length > 0 && (
              <div className="mt-2">
                <span className="text-xs text-gray-600">Key Skills: </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {career.skills.slice(0, 5).map((skill, idx) => (
                    <span
                      key={idx}
                      className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {career.hiringCompanies && career.hiringCompanies.length > 0 && (
              <div className="mt-2">
                <span className="text-xs text-gray-600">
                  Hiring Companies:{" "}
                </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {career.hiringCompanies.slice(0, 3).map((company, idx) => (
                    <span
                      key={idx}
                      className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded flex items-center gap-1"
                    >
                      <Building size={10} />
                      {company}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderEducationPrograms = (programs: Program[]) => {
    if (!programs || programs.length === 0) return null;

    return (
      <div className="mt-4 space-y-3">
        <h4 className="font-semibold text-gray-800 flex items-center gap-2">
          <GraduationCap size={18} />
          Education Pathways
        </h4>
        {programs.map((program, idx) => (
          <div
            key={program.id || idx}
            className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <h5 className="font-semibold text-green-900">
              {program.programName}
            </h5>
            <p className="text-sm text-gray-700 mb-2">
              {program.institution}
              {program.campus && ` - ${program.campus}`}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-3">
              <div>
                <span className="font-medium">Degree Type:</span>{" "}
                {program.degreeType}
              </div>
              <div className="flex items-center gap-1">
                <Clock size={14} />
                <span>{program.durationYears} years</span>
              </div>

              {program.tuitionResident && (
                <div>
                  <span className="font-medium">Tuition (Resident):</span> $
                  {program.tuitionResident.toLocaleString()}/year
                </div>
              )}

              {program.employmentRate && (
                <div className="flex items-center gap-1">
                  <Briefcase size={14} />
                  <span>{program.employmentRate}% employment rate</span>
                </div>
              )}
            </div>

            {program.relatedCareers && program.relatedCareers.length > 0 && (
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Career Paths:
                </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {program.relatedCareers.slice(0, 3).map((career, idx) => (
                    <span
                      key={idx}
                      className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded"
                    >
                      {career}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderMarketData = (data: any) => {
    if (!data.marketData && !data.stats) return null;

    const marketStats = data.marketData?.stats || data.stats;
    const companies = data.topCompanies || data.companies || [];

    return (
      <div className="mt-4">
        <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <TrendingUp size={18} />
          Job Market Insights
        </h4>
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
          {marketStats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
              {marketStats.totalOpenings && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {marketStats.totalOpenings}
                  </div>
                  <div className="text-sm text-gray-600">Current Openings</div>
                </div>
              )}

              {marketStats.avgGrowthRate !== undefined && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    +{Math.round(marketStats.avgGrowthRate)}%
                  </div>
                  <div className="text-sm text-gray-600">Average Growth</div>
                </div>
              )}

              {marketStats.avgRemotePercentage !== undefined && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {Math.round(marketStats.avgRemotePercentage)}%
                  </div>
                  <div className="text-sm text-gray-600">Remote Available</div>
                </div>
              )}
            </div>
          )}

          {companies.length > 0 && (
            <div>
              <span className="text-sm font-medium text-gray-700">
                Top Hiring Companies:
              </span>
              <div className="flex flex-wrap gap-2 mt-2">
                {companies.map((company: any, idx: number) => (
                  <span
                    key={idx}
                    className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded flex items-center gap-1"
                  >
                    <Building size={12} />
                    {typeof company === "string" ? company : company.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSkills = (data: any) => {
    if (!data.skills || data.skills.length === 0) return null;

    return (
      <div className="mt-4">
        <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Award size={18} />
          Skills & Certifications
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.skills.map((skill: any, idx: number) => (
            <div
              key={skill.id || idx}
              className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-3"
            >
              <h5 className="font-semibold text-orange-900 text-sm">
                {skill.name}
              </h5>
              <div className="mt-2 space-y-1 text-xs">
                {skill.timeToAcquireMonths && (
                  <div className="flex items-center gap-1">
                    <Clock size={12} />
                    <span>{skill.timeToAcquireMonths} months to learn</span>
                  </div>
                )}
                {skill.demandLevel && (
                  <div>
                    <span className="font-medium">Demand:</span>{" "}
                    <span
                      className={`px-1 py-0.5 rounded ${
                        skill.demandLevel === "high"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {skill.demandLevel}
                    </span>
                  </div>
                )}
                {skill.onlineAvailable && (
                  <span className="text-blue-600">✓ Available online</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDataSources = (sources: any[]) => {
    if (!sources || sources.length === 0) return null;

    return (
      <div className="mt-4">
        <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <BookOpen size={18} />
          Available Data Sources
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sources.map((source, idx) => (
            <div
              key={idx}
              className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setMessage(`Show me data from ${source.name}`)}
            >
              <h5 className="font-semibold text-gray-900 text-sm">
                {source.name}
              </h5>
              <p className="text-xs text-gray-600 mt-1">{source.description}</p>
              {source.count && (
                <div className="mt-2 text-xs text-blue-600 font-medium">
                  {source.count} records available
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderMessageData = (msg: Message) => {
    if (!msg.data) return null;

    const {
      careers,
      recommendations,
      programs,
      pathways,
      marketData,
      marketInsights,
      skills,
      trainingPrograms,
      dataSources,
      quickRecommendations,
    } = msg.data;

    return (
      <>
        {(careers || recommendations || quickRecommendations) &&
          renderCareerRecommendations(
            careers || recommendations || quickRecommendations
          )}
        {(programs || pathways) &&
          renderEducationPrograms(programs || pathways)}
        {(marketData || marketInsights) && renderMarketData(msg.data)}
        {skills && renderSkills(msg.data)}
        {dataSources && renderDataSources(dataSources)}
      </>
    );
  };

  const renderSuggestedQuestions = (msg: Message) => {
    if (
      !msg.data?.suggestedQuestions ||
      msg.data.suggestedQuestions.length === 0
    )
      return null;

    return (
      <div className="mt-3 pt-3 border-t border-gray-200">
        <p className="text-xs text-gray-500 mb-2">
          You might also want to ask:
        </p>
        <div className="flex flex-wrap gap-2">
          {msg.data.suggestedQuestions
            .slice(0, 3)
            .map((question: string, idx: number) => (
              <button
                key={idx}
                onClick={() => setMessage(question)}
                className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full hover:bg-gray-200 transition-colors"
              >
                {question}
              </button>
            ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } fixed md:relative md:translate-x-0 w-80 h-full bg-white border-r border-gray-200 flex flex-col shadow-lg z-50 transition-transform duration-300`}
      >
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="font-bold text-gray-800">AI Pathways</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>

          {/* User Profile Summary */}
          <div className="bg-blue-50 rounded-lg p-3">
            <h3 className="font-semibold text-blue-900 mb-2">Your Profile</h3>
            <div className="space-y-1 text-sm">
              <div>
                <span className="font-medium">Education:</span>{" "}
                {getEducationDisplay(userProfile)}
              </div>
              <div>
                <span className="font-medium">Interests:</span>{" "}
                {userProfile.interests.length} selected
              </div>
              <div>
                <span className="font-medium">Timeline:</span>{" "}
                {userProfile.timeline.replace(/_/g, " ")}
              </div>
              <div>
                <span className="font-medium">College Plans:</span>{" "}
                {userProfile.college_plans.replace(/_/g, " ")}
              </div>
            </div>
            <button
              onClick={onBack}
              className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              ← Edit Profile
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800 mb-3">Quick Actions</h3>
          <div className="space-y-2">
            <button
              onClick={() =>
                setMessage(
                  "Show me career recommendations based on my interests"
                )
              }
              className="w-full text-left p-2 text-sm bg-gray-50 hover:bg-gray-100 rounded flex items-center gap-2"
            >
              <Briefcase size={16} />
              Get Career Recommendations
            </button>
            <button
              onClick={() =>
                setMessage("What education pathways are available at UH?")
              }
              className="w-full text-left p-2 text-sm bg-gray-50 hover:bg-gray-100 rounded flex items-center gap-2"
            >
              <GraduationCap size={16} />
              Explore UH Programs
            </button>
            <button
              onClick={() => setMessage("Show me the job market in Hawaii")}
              className="w-full text-left p-2 text-sm bg-gray-50 hover:bg-gray-100 rounded flex items-center gap-2"
            >
              <TrendingUp size={16} />
              View Job Market Data
            </button>
            <button
              onClick={() => setMessage("What skills should I develop?")}
              className="w-full text-left p-2 text-sm bg-gray-50 hover:bg-gray-100 rounded flex items-center gap-2"
            >
              <Award size={16} />
              Skills & Certifications
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="p-4 flex-1 overflow-y-auto">
          <h3 className="font-semibold text-gray-800 mb-3">Database Stats</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Careers Tracked</span>
              <span className="font-medium">9+</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">UH Programs</span>
              <span className="font-medium">8+</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Companies</span>
              <span className="font-medium">5+</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Job Openings</span>
              <span className="font-medium">1,500+</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <Menu size={20} />
              </button>
              <div className="flex items-center gap-2">
                <Bot className="text-blue-600" size={24} />
                <h1 className="text-lg font-semibold text-gray-800">
                  AI Career Pathways - Hawaii
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Connected to Database</span>
            </div>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot size={16} className="text-white" />
                </div>
              )}
              <div
                className={`max-w-[80%] ${msg.role === "user" ? "order-2" : ""}`}
              >
                <div
                  className={`p-4 rounded-lg ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-white border border-gray-200 shadow-sm"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>

                  {/* Render data based on response type */}
                  {msg.role === "assistant" && renderMessageData(msg)}

                  {/* Render suggested questions */}
                  {msg.role === "assistant" && renderSuggestedQuestions(msg)}
                </div>
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0 order-3">
                  <User size={16} className="text-white" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <Bot size={16} className="text-white" />
              </div>
              <div className="bg-white border border-gray-200 shadow-sm p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                    style={{ animationDelay: "-0.3s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                    style={{ animationDelay: "-0.15s" }}
                  ></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                  <span className="ml-2 text-sm text-gray-500">
                    Analyzing Hawaii career data...
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4 bg-white">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyPress={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask about careers, education pathways, or job market in Hawaii..."
                className="w-full rounded-lg border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={isLoading || !message.trim()}
              className="bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex-shrink-0"
            >
              <Send size={20} />
            </button>
          </div>

          {/* Quick suggestions */}
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={() => setMessage("What careers match my interests?")}
              className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-full hover:bg-blue-100 transition-colors"
            >
              Career Match
            </button>
            <button
              onClick={() => setMessage("Show me UH programs for tech careers")}
              className="text-sm bg-green-50 text-green-700 px-3 py-1 rounded-full hover:bg-green-100 transition-colors"
            >
              UH Programs
            </button>
            <button
              onClick={() =>
                setMessage(
                  "What's the job market like for software developers?"
                )
              }
              className="text-sm bg-purple-50 text-purple-700 px-3 py-1 rounded-full hover:bg-purple-100 transition-colors"
            >
              Tech Jobs
            </button>
            <button
              onClick={() =>
                setMessage("Which companies are hiring in Hawaii?")
              }
              className="text-sm bg-orange-50 text-orange-700 px-3 py-1 rounded-full hover:bg-orange-100 transition-colors"
            >
              Companies Hiring
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
