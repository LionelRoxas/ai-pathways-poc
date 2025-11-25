"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, ChevronRight } from "lucide-react";

export default function LearnMorePage() {
  const [expandedSection, setExpandedSection] = useState<string | null>(
    "overview"
  );

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-medium">Back to Home</span>
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-gradient-to-b from-emerald-50 to-white py-16 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6">
          <h1 className="text-5xl font-bold text-slate-900 mb-4">
            How It Works
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl">
            Kamaʻāina Pathways uses an AI-powered system to help Hawaii students
            discover educational programs and career opportunities through
            natural conversation.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* System Overview */}
        {/* <Section
          id="overview"
          title="What Makes It Smart?"
          isExpanded={expandedSection === "overview"}
          onToggle={() => toggleSection("overview")}
        >
          <div className="space-y-6">
            <p className="text-slate-700 leading-relaxed text-lg">
              Our AI system understands what you're looking for through
              conversation, searches Hawaii's education databases, and
              recommends programs that match your interests and goals.
            </p>

            <div className="grid md:grid-cols-3 gap-4">
              <FeatureCard
                title="Natural Conversation"
                description="Just talk about your interests - no forms or complex searches"
                color="emerald"
              />
              <FeatureCard
                title="Hawaii-Specific"
                description="Real UH programs and local career opportunities"
                color="blue"
              />
              <FeatureCard
                title="Smart Filtering"
                description="Filter by island, degree type, and specific schools"
                color="purple"
              />
            </div>
          </div>
        </Section> */}

        {/* Main Flow */}
        <Section
          id="flow"
          title="How Your Query Gets Processed"
          isExpanded={expandedSection === "flow"}
          onToggle={() => toggleSection("flow")}
        >
          <div className="space-y-8">
            <p className="text-slate-700 leading-relaxed text-lg">
              When you send a message, her&apos;s what happens behind the scenes:
            </p>
            <FlowStep
              number={1}
              title="Understanding Your Intent"
              description="AI reads your message and figures out what you're looking for"
              color="emerald"
              details={[
                "Are you searching for programs or just asking questions?",
                "Which island are you interested in? (Oahu, Maui, Big Island, Kauai)",
                "What degree level? (Certificate, 2-Year, 4-Year)",
              ]}
            />
            <FlowArrow />
            <FlowStep
              number={2}
              title="Searching the Database"
              description="Searches Hawaii's education programs based on your interests"
              color="blue"
              details={[
                "5000+ UH programs across all islands",
                "Filters by location, degree type, and keywords",
                "Finds high school programs, college programs, and careers",
              ]}
            />
            <FlowArrow />
            <FlowStep
              number={3}
              title="Smart Filtering"
              description="Personalizes results just for you"
              color="purple"
              details={[
                "Shows only programs available on your island",
                "Matches your current education level",
                "Ranks programs by how well they fit your interests",
                "Verifies all information is accurate and up-to-date",
              ]}
            />{" "}
            <FlowArrow />
            <FlowStep
              number={4}
              title="Quality Check"
              description="Makes sure the results are really helpful"
              color="amber"
              details={[
                "Excellent results: Perfect match for your interests",
                "Good results: Solid options that fit well",
                "Needs improvement: System tries again with different approach",
                "Always ensures you get the best possible recommendations",
              ]}
            />
            <QualityBranch />
            <FlowArrow />
            <FlowStep
              number={5}
              title="Organize Results"
              description="Groups everything in a logical way"
              color="blue"
              details={[
                "Groups programs by career field",
                "Shows all variations and specializations",
                "Lists every campus offering each program",
                "Connects college programs to future careers",
              ]}
            />
            <FlowArrow />
            <FlowStep
              number={6}
              title="Present Your Path"
              description="Creates a clear, easy-to-read response"
              color="emerald"
              details={[
                "Shows your complete pathway: High School → College → Career",
                "Includes all important program details",
                "Lists which campuses offer what you're looking for",
                "Gives you specific next steps to take",
              ]}
            />
            <FlowArrow />
            <div className="grid md:grid-cols-2 gap-6">
              <FinalStep
                title="Your Personalized Plan"
                description="You receive a complete roadmap showing all the programs and steps to reach your goals"
                color="emerald"
              />

              <FinalStep
                title="Career Insights"
                description="Get a detailed report about your chosen career, including skills you'll need and companies that hire"
                color="blue"
              />
            </div>
          </div>
        </Section>

        {/* Data Architecture */}
        <Section
          id="data"
          title="Data Architecture"
          isExpanded={expandedSection === "data"}
          onToggle={() => toggleSection("data")}
        >
          <div className="space-y-6">
            <p className="text-slate-700 leading-relaxed">
              The system uses <strong>JSONL (JSON Lines) databases</strong> for
              fast, efficient searches across Hawaii&apos;s educational programs.
            </p>

            <div className="space-y-4">
              <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                <h4 className="font-bold text-slate-900 mb-3">📚 Comprehensive Program Database</h4>
                <ul className="space-y-2 text-slate-700">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>
                      <strong>11,000+ programs</strong> across all UH Community Colleges
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>
                      Includes degree levels: 2-Year, 4-Year, and Non-Credit certificates
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>
                      Every program has classification codes (CIP codes) for career mapping
                    </span>
                  </li>
                </ul>
              </div>

              <div className="bg-emerald-50 rounded-xl p-6 border border-emerald-200">
                <h4 className="font-bold text-slate-900 mb-3">🧮 Smart Search Technology</h4>
                <div className="space-y-3">
                  <div>
                    <div className="font-semibold text-emerald-900 mb-1">Keyword Search</div>
                    <ul className="space-y-1 text-sm text-slate-700">
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-500 mt-1">→</span>
                        <span>Matches exact program names and descriptions</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-500 mt-1">→</span>
                        <span>Handles typos and different wording</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-500 mt-1">→</span>
                        <span>Filters by island, school, and degree level</span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <div className="font-semibold text-emerald-900 mb-1">Vector Search (AI-Powered)</div>
                    <ul className="space-y-1 text-sm text-slate-700">
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-500 mt-1">→</span>
                        <span>Understands meaning, not just keywords (&quot;marine biology&quot; finds &quot;oceanography&quot;)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-500 mt-1">→</span>
                        <span>Uses OpenAI embeddings stored in PostgreSQL with pgvector</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-500 mt-1">→</span>
                        <span>Automatically activates when keyword search finds too few results</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-500 mt-1">→</span>
                        <span>Combines with keyword results for comprehensive coverage</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
                <h4 className="font-bold text-slate-900 mb-3">🌐 Web Research (Optional)</h4>
                <ul className="space-y-2 text-slate-700">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 mt-1">•</span>
                    <span>
                      Searches the internet for current industry trends and company insights
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 mt-1">•</span>
                    <span>
                      AI summarizes findings into easy-to-read reports
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 mt-1">•</span>
                    <span>
                      Available after 3+ messages to prevent accidental expensive API calls
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </Section>

        {/* Market Intelligence */}
        {/* <Section
          id="intelligence"
          title="Market Intelligence"
          isExpanded={expandedSection === "intelligence"}
          onToggle={() => toggleSection("intelligence")}
        >
          <div className="space-y-6">
            <p className="text-slate-700 leading-relaxed">
              After showing you education pathways, the system creates a{" "}
              <strong>personalized career report</strong> with real information about the Hawaii job market.
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              <ReportComponent
                title="Skills You'll Need"
                description="The top 5 skills employers look for in this career"
                icon="📊"
              />
              <ReportComponent
                title="Who's Hiring"
                description="Top 5 companies in Hawaii hiring for this job"
                icon="🏢"
              />
              <ReportComponent
                title="Your Next Steps"
                description="4 specific actions you can take right now"
                icon="💡"
              />
              <ReportComponent
                title="Real Hawaii Data"
                description="Information from Hawaii Career Explorer"
                icon="🔗"
              />
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
              <h4 className="font-bold text-slate-900 mb-3">
                Creative AI Approach
              </h4>
              <p className="text-slate-700 leading-relaxed">
                The system uses <strong>temperature 0.7</strong> for balanced
                creativity, allowing the AI to infer relevant skills based on
                domain knowledge rather than relying solely on potentially
                inaccurate API data.
              </p>
              <div className="mt-4 p-4 bg-white rounded-lg border border-purple-200">
                <div className="text-sm text-slate-600 mb-2">Example:</div>
                <div className="text-slate-800">
                  For <strong>Electrical Engineering</strong>, suggests "Circuit
                  Design, AutoCAD, MATLAB" instead of generic skills like
                  "communication" or "teamwork"
                </div>
              </div>
            </div>
          </div>
        </Section> */}

        {/* Performance */}
        {/* <Section
          id="performance"
          title="Performance & Optimization"
          isExpanded={expandedSection === "performance"}
          onToggle={() => toggleSection("performance")}
        >
          <div className="space-y-6">
                        <div className="grid md:grid-cols-3 gap-6 mb-8">
              <MetricCard
                title="Fast Results"
                value="2-4s"
                description="Get answers in seconds"
                color="emerald"
              />
              <MetricCard
                title="Smart Memory"
                value="~60%"
                description="Remembers common searches"
                color="blue"
              />
              <MetricCard
                title="High Quality"
                value="8/10"
                description="Accurate results every time"
                color="purple"
              />
            </div>

            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
              <h4 className="font-bold text-slate-900 mb-4">
                What Makes It Fast
              </h4>
              <div className="space-y-3">
                <OptimizationItem
                  title="Smart Caching"
                  description="Remembers your recent searches for instant results"
                />
                <OptimizationItem
                  title="Parallel Searching"
                  description="Looks through multiple databases at the same time"
                />
                <OptimizationItem
                  title="Quick Verification"
                  description="Stops searching once it finds great matches"
                />
              </div>
            </div>
          </div>
        </Section> */}

        {/* AI Agents */}
        <Section
          id="agents"
          title="Meet the AI Workers"
          isExpanded={expandedSection === "agents"}
          onToggle={() => toggleSection("agents")}
        >
          <div className="space-y-6">
            <p className="text-slate-700 leading-relaxed text-lg">
              Behind the scenes, a team of specialized AI agents work together to understand your needs and find the best pathways for you. Each agent has a specific job:
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              <AgentCard
                name="Classifier Agent"
                icon="🎯"
                role="Traffic Director"
                description="First to analyze your message. Decides if you need program recommendations or just have a question. Detects which island, school, or degree level you're interested in."
              />
              
              <AgentCard
                name="Query Analyzer"
                icon="🧠"
                role="Search Expert"
                description="Improves your search by expanding abbreviations (like 'comp sci' → 'computer science') and adding related terms. Understands Hawaiian, Pidgin, Tagalog, and English."
              />
              
              <AgentCard
                name="Conversational Agent"
                icon="💬"
                role="Friendly Guide"
                description="Answers your questions in natural language. Learns from the conversation and extracts important details about your interests and goals."
              />
              
              <AgentCard
                name="Result Verifier"
                icon="✅"
                role="Quality Inspector"
                description="Checks every program to make sure it matches what you're looking for. Scores each result and filters out anything that doesn't fit well."
              />
              
              <AgentCard
                name="Reflection Agent"
                icon="🤔"
                role="Quality Coach"
                description="Reviews all the results and gives them a score out of 10. If the results aren't good enough, suggests how to search better and tries again."
              />
              
              <AgentCard
                name="Response Formatter"
                icon="📝"
                role="Presentation Specialist"
                description="Takes all the information and presents it in a clear, organized way. Creates the pathway visualizations and writes easy-to-read explanations."
              />
              
              <AgentCard
                name="Market Intelligence Agent"
                icon="📊"
                role="Career Researcher"
                description="Gathers real data about Hawaii careers: what skills employers want, which companies are hiring, and what jobs pay. Creates personalized career reports."
              />
              
              <AgentCard
                name="Profile Agent"
                icon="👤"
                role="Memory Keeper"
                description="Remembers your interests, education level, and goals across conversations. Updates your profile as you share more information."
              />
              
              <AgentCard
                name="Vector Search Engine"
                icon="🧮"
                role="Semantic Matcher"
                description="Finds programs using AI-powered semantic search. Understands that 'marine biology' and 'oceanography' are related, even without exact keyword matches. Uses OpenAI embeddings stored in PostgreSQL."
              />
              
              <AgentCard
                name="Vector Result Verifier"
                icon="✨"
                role="Relevance Checker"
                description="Validates semantic search results to ensure they're actually relevant. Filters out programs that are semantically similar but not what you're looking for."
              />
              
              <AgentCard
                name="Web Search Agent"
                icon="🌐"
                role="Internet Researcher"
                description="Searches the web for current industry trends, company insights, and emerging field information. Summarizes findings into easy-to-read reports with clickable sources."
              />
              
              <AgentCard
                name="CIP Code Verifier"
                icon="🔐"
                role="Program Code Guardian"
                description="Validates and corrects program classification codes (CIP codes) using national standards. Detects when program codes don't match conversation context."
              />
              
              <AgentCard
                name="SOC Code Verifier"
                icon="💼"
                role="Career Code Guardian"
                description="Filters career codes (SOC codes) based on conversation context. Removes irrelevant careers like showing software jobs when you asked for photography."
              />
            </div>

            <div className="bg-emerald-50 rounded-xl p-6 border border-emerald-200 mt-6">
              <h4 className="font-bold text-slate-900 mb-3">🤝 How They Work Together</h4>
              <div className="space-y-3 text-slate-700">
                <p>
                  <strong>1.</strong> <span className="text-emerald-600">Classifier</span> reads your message and decides the best path
                </p>
                <p>
                  <strong>2.</strong> <span className="text-emerald-600">Query Analyzer</span> expands your search terms for better matches
                </p>
                <p>
                  <strong>3.</strong> <span className="text-emerald-600">Vector Search Engine</span> performs semantic search if needed (when keyword results are low)
                </p>
                <p>
                  <strong>4.</strong> <span className="text-emerald-600">Vector Result Verifier</span> validates semantic matches for relevance
                </p>
                <p>
                  <strong>5.</strong> <span className="text-emerald-600">Result Verifier</span> checks each program for relevance
                </p>
                <p>
                  <strong>6.</strong> <span className="text-emerald-600">CIP Code Verifier</span> validates program classification codes
                </p>
                <p>
                  <strong>7.</strong> <span className="text-emerald-600">Reflection Agent</span> evaluates quality and triggers retry if needed
                </p>
                <p>
                  <strong>8.</strong> <span className="text-emerald-600">SOC Code Verifier</span> filters career codes for relevance
                </p>
                <p>
                  <strong>9.</strong> <span className="text-emerald-600">Response Formatter</span> presents everything clearly
                </p>
                <p>
                  <strong>10.</strong> <span className="text-emerald-600">Web Search Agent</span> (if enabled) adds current industry insights
                </p>
                <p>
                  <strong>11.</strong> <span className="text-emerald-600">Market Intelligence</span> adds Hawaii career data
                </p>
                <p className="text-sm italic mt-4">
                  All while the <span className="text-emerald-600">Conversational Agent</span> keeps the conversation natural and the <span className="text-emerald-600">Profile Agent</span> remembers your preferences!
                </p>
              </div>
            </div>
          </div>
        </Section>

        {/* Technology Stack */}
        <Section
          id="tech"
          title="Technology Stack"
          isExpanded={expandedSection === "tech"}
          onToggle={() => toggleSection("tech")}
        >
          <div className="grid md:grid-cols-2 gap-6">
            <TechStack
              category="Modern Web Technology"
              technologies={[
                { name: "Next.js", description: "Latest web framework" },
                { name: "TypeScript", description: "Reliable code" },
                { name: "PostgreSQL + pgvector", description: "Vector database" },
                { name: "Tailwind CSS", description: "Beautiful design" },
              ]}
            />
            <TechStack
              category="AI Technology"
              technologies={[
                {
                  name: "Advanced AI Models",
                  description: "Cutting-edge language understanding",
                },
                { name: "Vector Embeddings", description: "Semantic search with OpenAI" },
                { name: "Neural Web Search", description: "Exa-powered research" },
                { name: "Smart Caching", description: "Fast repeat searches" },
              ]}
            />
            <TechStack
              category="Hawaii Data"
              technologies={[
                { name: "11,000+ UH Programs", description: "All islands with degree levels" },
                {
                  name: "Hawaii Career Explorer",
                  description: "Real job market data",
                },
                { name: "Vector Search Database", description: "Semantic program matching" },
                { name: "Web Search Integration", description: "Current industry trends" },
              ]}
            />
            <TechStack
              category="User Experience"
              technologies={[
                { name: "Natural Conversation", description: "Just ask questions" },
                { name: "Visual Pathways", description: "See your journey" },
                { name: "Personalized Results", description: "Tailored to you" },
              ]}
            />
          </div>
        </Section>

        {/* CTA Section */}
        <div className="mt-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Explore?</h2>
          <p className="text-emerald-100 text-lg mb-8 max-w-2xl mx-auto">
            Start your journey to discover educational pathways and career
            opportunities in Hawaiʻi
          </p>
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 bg-white text-emerald-600 px-8 py-4 rounded-full font-semibold hover:bg-emerald-50 transition-all hover:scale-105"
          >
            Start Talking
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// Component Definitions
function Section({
  title,
  isExpanded,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-8">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-6 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
      >
        <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
        {isExpanded ? (
          <ChevronDown className="w-6 h-6 text-slate-600" />
        ) : (
          <ChevronRight className="w-6 h-6 text-slate-600" />
        )}
      </button>
      {isExpanded && (
        <div className="mt-6 animate-in slide-in-from-top-2 duration-300">
          {children}
        </div>
      )}
    </div>
  );
}

// function FeatureCard({
//   title,
//   description,
//   color,
// }: {
//   title: string;
//   description: string;
//   color: string;
// }) {
//   const colorClasses = {
//     emerald: "bg-emerald-50 border-emerald-200 text-emerald-900",
//     blue: "bg-blue-50 border-blue-200 text-blue-900",
//     purple: "bg-purple-50 border-purple-200 text-purple-900",
//   };

//   return (
//     <div
//       className={`p-6 rounded-xl border-2 ${colorClasses[color as keyof typeof colorClasses]}`}
//     >
//       <h3 className="font-bold mb-2">{title}</h3>
//       <p className="text-sm opacity-80">{description}</p>
//     </div>
//   );
// }

function FlowStep({
  number,
  title,
  description,
  color,
  details,
}: {
  number: number;
  title: string;
  description: string;
  color: string;
  details?: string[];
}) {
  const colorClasses = {
    slate: "bg-slate-100 text-slate-900 border-slate-300",
    emerald: "bg-emerald-100 text-emerald-900 border-emerald-300",
    blue: "bg-blue-100 text-blue-900 border-blue-300",
    purple: "bg-purple-100 text-purple-900 border-purple-300",
    amber: "bg-amber-100 text-amber-900 border-amber-300",
  };

  return (
    <div
      className={`rounded-xl p-6 border-2 ${colorClasses[color as keyof typeof colorClasses]}`}
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white flex items-center justify-center font-bold text-lg">
          {number}
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold mb-2">{title}</h3>
          <p className="opacity-80 mb-3">{description}</p>
          {details && (
            <ul className="space-y-2 text-sm opacity-70">
              {details.map((detail, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span>→</span>
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// function SubStep({
//   number,
//   title,
//   description,
//   details,
// }: {
//   number: string;
//   title: string;
//   description: string;
//   details?: string[];
// }) {
//   return (
//     <div className="bg-white rounded-lg p-5 border border-blue-200">
//       <div className="flex items-start gap-3">
//         <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-bold text-sm text-blue-900">
//           {number}
//         </div>
//         <div className="flex-1">
//           <h4 className="font-bold text-slate-900 mb-1">{title}</h4>
//           <p className="text-sm text-slate-600 mb-2">{description}</p>
//           {details && (
//             <ul className="space-y-1 text-xs text-slate-500">
//               {details.map((detail, idx) => (
//                 <li key={idx} className="flex items-start gap-2">
//                   <span>•</span>
//                   <span>{detail}</span>
//                 </li>
//               ))}
//             </ul>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

function FlowArrow() {
  return (
    <div className="flex justify-center">
      <div className="text-4xl text-slate-300">↓</div>
    </div>
  );
}

// function FlowBranch({
//   branches,
// }: {
//   branches: { label: string; description: string }[];
// }) {
//   return (
//     <div className="grid md:grid-cols-3 gap-4">
//       {branches.map((branch, idx) => (
//         <div
//           key={idx}
//           className="bg-slate-50 rounded-lg p-4 border border-slate-200 text-center"
//         >
//           <div className="font-bold text-slate-900 mb-1">{branch.label}</div>
//           <div className="text-sm text-slate-600">{branch.description}</div>
//         </div>
//       ))}
//     </div>
//   );
// }

function QualityBranch() {
  return (
    <div className="bg-amber-50 rounded-xl p-6 border-2 border-amber-200">
      <div className="text-center mb-4">
        <div className="text-lg font-bold text-amber-900">Quality Check</div>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="font-bold text-green-900 mb-2">✓ Quality ≥ 7</div>
          <div className="text-sm text-green-700">Continue to next step</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <div className="font-bold text-red-900 mb-2">✗ Quality &lt; 7</div>
          <div className="text-sm text-red-700">
            Retry with adjustments (up to 3 attempts)
          </div>
        </div>
      </div>
    </div>
  );
}

function FinalStep({
  title,
  description,
  color,
}: {
  title: string;
  description: string;
  color: string;
}) {
  const colorClasses = {
    emerald:
      "bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-300",
    blue: "bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300",
  };

  return (
    <div
      className={`rounded-xl p-6 border-2 ${colorClasses[color as keyof typeof colorClasses]}`}
    >
      <h3 className="text-lg font-bold text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-700">{description}</p>
    </div>
  );
}

// function DatabaseCard({ title, files }: { title: string; files: string[] }) {
//   return (
//     <div className="bg-white rounded-lg p-4 border border-slate-200">
//       <h5 className="font-bold text-slate-900 mb-2">{title}</h5>
//       <ul className="space-y-1">
//         {files.map((file, idx) => (
//           <li key={idx} className="text-xs text-slate-600 font-mono">
//             {file}
//           </li>
//         ))}
//       </ul>
//     </div>
//   );
// }

// function ReportComponent({
//   title,
//   description,
//   icon,
// }: {
//   title: string;
//   description: string;
//   icon: string;
// }) {
//   return (
//     <div className="bg-white rounded-xl p-6 border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all">
//       <div className="text-4xl mb-3">{icon}</div>
//       <h4 className="font-bold text-slate-900 mb-2">{title}</h4>
//       <p className="text-sm text-slate-600">{description}</p>
//     </div>
//   );
// }

// function MetricCard({
//   title,
//   value,
//   description,
//   color,
// }: {
//   title: string;
//   value: string;
//   description: string;
//   color: string;
// }) {
//   const colorClasses = {
//     emerald: "bg-emerald-50 text-emerald-900 border-emerald-200",
//     blue: "bg-blue-50 text-blue-900 border-blue-200",
//     purple: "bg-purple-50 text-purple-900 border-purple-200",
//   };

//   return (
//     <div
//       className={`rounded-xl p-6 border-2 ${colorClasses[color as keyof typeof colorClasses]}`}
//     >
//       <div className="text-3xl font-bold mb-2">{value}</div>
//       <div className="font-semibold mb-1">{title}</div>
//       <div className="text-sm opacity-70">{description}</div>
//     </div>
//   );
// }

// function OptimizationItem({
//   title,
//   description,
// }: {
//   title: string;
//   description: string;
// }) {
//   return (
//     <div className="flex items-start gap-3">
//       <div className="flex-shrink-0 w-2 h-2 rounded-full bg-emerald-500 mt-2"></div>
//       <div>
//         <div className="font-semibold text-slate-900">{title}</div>
//         <div className="text-sm text-slate-600">{description}</div>
//       </div>
//     </div>
//   );
// }

function AgentCard({
  name,
  icon,
  role,
  description,
}: {
  name: string;
  icon: string;
  role: string;
  description: string;
}) {
  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 hover:border-emerald-300 hover:shadow-lg transition-all group">
      <div className="flex items-start gap-3 mb-3">
        <div className="text-3xl group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-slate-900 text-lg">{name}</h4>
          <div className="text-sm text-emerald-600 font-medium">{role}</div>
        </div>
      </div>
      <p className="text-slate-600 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function TechStack({
  category,
  technologies,
}: {
  category: string;
  technologies: { name: string; description: string }[];
}) {
  return (
    <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
      <h4 className="font-bold text-slate-900 mb-4">{category}</h4>
      <div className="space-y-3">
        {technologies.map((tech, idx) => (
          <div key={idx} className="flex items-start gap-3">
            <div className="flex-shrink-0 w-2 h-2 rounded-full bg-slate-400 mt-2"></div>
            <div>
              <div className="font-medium text-slate-900">{tech.name}</div>
              <div className="text-sm text-slate-600">{tech.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
