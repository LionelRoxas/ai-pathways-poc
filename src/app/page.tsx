/* eslint-disable @next/next/no-img-element */
"use client"

import React, { useState } from "react";
import {
  Bot,
  Users,
  TrendingUp,
  GraduationCap,
  ChevronRight,
  Play,
  BarChart3,
  Building,
  X,
} from "lucide-react";

// Import your existing components
import UserProfiling from "./components/UserProfiling";
import AIPathwaysChat from "./components/AIPathwaysChat";

// Types
interface UserProfile {
  education_level: string;
  grade_level?: number;
  interests: string[];
  career_goals?: string;
  timeline: string;
  college_plans: string;
}

interface SuccessStory {
  name: string;
  from: string;
  to: string;
  image: string;
  story: string;
  pathway: string;
}

interface StatCard {
  icon: React.ReactNode;
  title: string;
  value: string;
  description: string;
  color: string;
}

// Demo Modal Component
function DemoModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">AI Pathways Demo</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg mb-6 flex items-center justify-center">
            <div className="text-center">
              <Play className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Interactive Demo
              </h3>
              <p className="text-gray-600">
                See how AI Pathways guides students to their perfect career
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">
                Assessment Process
              </h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• 4-step personalized questionnaire</li>
                <li>• Interest and skill mapping</li>
                <li>• Education level assessment</li>
                <li>• Career timeline planning</li>
              </ul>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <h4 className="font-semibold text-green-900 mb-2">
                AI Recommendations
              </h4>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Personalized career matches</li>
                <li>• UH education pathways</li>
                <li>• Local job market data</li>
                <li>• Salary and growth projections</li>
              </ul>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <h4 className="font-semibold text-purple-900 mb-2">
                Real-time Data
              </h4>
              <ul className="text-sm text-purple-800 space-y-1">
                <li>• Current Hawaii job openings</li>
                <li>• Company hiring trends</li>
                <li>• Skills in demand</li>
                <li>• Industry growth rates</li>
              </ul>
            </div>

            <div className="bg-orange-50 rounded-lg p-4">
              <h4 className="font-semibold text-orange-900 mb-2">
                Actionable Guidance
              </h4>
              <ul className="text-sm text-orange-800 space-y-1">
                <li>• Step-by-step career roadmap</li>
                <li>• Course recommendations</li>
                <li>• Certification suggestions</li>
                <li>• Networking opportunities</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={onClose}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all mr-3"
            >
              Try It Yourself
            </button>
            <button
              onClick={onClose}
              className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Close Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main App Component
export default function AIPathwaysApp() {
  const [currentView, setCurrentView] = useState<"home" | "profiling" | "chat">(
    "home"
  );
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showDemo, setShowDemo] = useState(false);

  // Sample data for the landing page
  const stats: StatCard[] = [
    {
      icon: <Users className="w-6 h-6" />,
      title: "Students Guided",
      value: "2,500+",
      description: "Hawaii students have found their career paths",
      color: "bg-blue-500",
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: "Career Matches",
      value: "95%",
      description: "Accuracy rate for personalized recommendations",
      color: "bg-green-500",
    },
    {
      icon: <Building className="w-6 h-6" />,
      title: "Local Employers",
      value: "150+",
      description: "Hawaii companies actively hiring our users",
      color: "bg-purple-500",
    },
    {
      icon: <GraduationCap className="w-6 h-6" />,
      title: "UH Programs",
      value: "200+",
      description: "Academic pathways mapped and tracked",
      color: "bg-orange-500",
    },
  ];

  const successStories: SuccessStory[] = [
    {
      name: "Maria K.",
      from: "High School Student",
      to: "UH Software Engineering",
      image: "/api/placeholder/80/80",
      story:
        "AI Pathways helped me discover my love for coding and guided me to the perfect UH program.",
      pathway: "Technology → UH Manoa CS → Software Developer",
    },
    {
      name: "David L.",
      from: "Career Changer",
      to: "Healthcare Professional",
      image: "/api/placeholder/80/80",
      story:
        "Transitioned from retail to nursing with a clear roadmap from AI Pathways.",
      pathway: "Career Change → Community College → RN Program",
    },
    {
      name: "Sarah M.",
      from: "Undecided Student",
      to: "Business Analyst",
      image: "/api/placeholder/80/80",
      story:
        "Found my perfect match in business analysis through AI-powered career exploration.",
      pathway: "Exploration → UH Business → Local Company",
    },
  ];

  const featuredCareers = [
    {
      title: "Software Developer",
      growth: "+22%",
      salary: "$65K-$120K",
      openings: "245+",
      description: "High demand in Hawaii's growing tech sector",
    },
    {
      title: "Registered Nurse",
      growth: "+15%",
      salary: "$70K-$95K",
      openings: "320+",
      description: "Critical need in Hawaii's healthcare system",
    },
    {
      title: "Data Analyst",
      growth: "+25%",
      salary: "$55K-$85K",
      openings: "180+",
      description: "Growing demand across all industries",
    },
  ];

  const handleProfilingComplete = (profile: UserProfile) => {
    setUserProfile(profile);
    setCurrentView("chat");
  };

  const handleBackToProfiling = () => {
    setCurrentView("profiling");
    setUserProfile(null);
  };

  const handleStartAssessment = () => {
    setCurrentView("profiling");
  };

  if (currentView === "profiling") {
    return <UserProfiling onComplete={handleProfilingComplete} />;
  }

  if (currentView === "chat" && userProfile) {
    return (
      <AIPathwaysChat
        userProfile={userProfile}
        onBack={handleBackToProfiling}
      />
    );
  }

  // Home/Landing Page
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Demo Modal */}
      <DemoModal isOpen={showDemo} onClose={() => setShowDemo(false)} />

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-2">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">AI Pathways</h1>
                <p className="text-sm text-gray-600">Hawaii Career Guidance</p>
              </div>
            </div>
            <nav className="hidden md:flex space-x-6">
              <a
                href="#how-it-works"
                className="text-gray-600 hover:text-blue-600 transition-colors"
              >
                How It Works
              </a>
              <a
                href="#careers"
                className="text-gray-600 hover:text-blue-600 transition-colors"
              >
                Careers
              </a>
              <a
                href="#success-stories"
                className="text-gray-600 hover:text-blue-600 transition-colors"
              >
                Success Stories
              </a>
              <a
                href="#about"
                className="text-gray-600 hover:text-blue-600 transition-colors"
              >
                About
              </a>
            </nav>
            <button
              onClick={handleStartAssessment}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg"
            >
              Start Assessment
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Discover Your Perfect
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {" "}
                Career Path
              </span>
              <br />
              in Hawaii
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
              AI-powered career guidance that connects your interests to real
              opportunities in Hawaii&apos;s job market
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={handleStartAssessment}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg flex items-center gap-2"
              >
                <Play className="w-5 h-5" />
                Start Your Journey
              </button>
              <button
                onClick={() => setShowDemo(true)}
                className="bg-white text-gray-700 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-50 transition-colors border border-gray-200 flex items-center gap-2"
              >
                <BarChart3 className="w-5 h-5" />
                View Demo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow"
              >
                <div className="flex items-center">
                  <div className={`${stat.color} text-white p-3 rounded-lg`}>
                    {stat.icon}
                  </div>
                  <div className="ml-4">
                    <h3 className="text-2xl font-bold text-gray-900">
                      {stat.value}
                    </h3>
                    <p className="text-sm font-medium text-gray-600">
                      {stat.title}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-3">{stat.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How AI Pathways Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Our intelligent system guides you through a personalized journey
              to career success
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Assessment
              </h3>
              <p className="text-gray-600">
                Tell us about your education level, interests, and career
                timeline through our smart questionnaire
              </p>
            </div>

            <div className="text-center">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                AI Analysis
              </h3>
              <p className="text-gray-600">
                Our AI analyzes Hawaii&apos;s job market, education programs,
                and your profile to find perfect matches
              </p>
            </div>

            <div className="text-center">
              <div className="bg-gradient-to-r from-pink-500 to-red-500 text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Guidance
              </h3>
              <p className="text-gray-600">
                Get personalized career recommendations, education pathways, and
                actionable next steps
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Careers Section */}
      <section id="careers" className="py-16 bg-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Hot Careers in Hawaii
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Discover high-demand careers with strong growth potential in
              Hawaii&apos;s economy
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredCareers.map((career, index) => (
              <div
                key={index}
                className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow border border-gray-100"
              >
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {career.title}
                </h3>
                <p className="text-gray-600 mb-4">{career.description}</p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Growth Rate</span>
                    <span className="text-sm font-semibold text-green-600">
                      {career.growth}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Salary Range</span>
                    <span className="text-sm font-semibold text-blue-600">
                      {career.salary}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      Current Openings
                    </span>
                    <span className="text-sm font-semibold text-purple-600">
                      {career.openings}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleStartAssessment}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2"
                >
                  Explore Path <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Success Stories Section */}
      <section id="success-stories" className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Success Stories
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Real Hawaii students who found their dream careers through AI
              Pathways
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {successStories.map((story, index) => (
              <div
                key={index}
                className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow"
              >
                <div className="flex items-center mb-4">
                  <img
                    src={story.image}
                    alt={story.name}
                    className="w-12 h-12 rounded-full bg-gray-200"
                  />
                  <div className="ml-3">
                    <h4 className="font-semibold text-gray-900">
                      {story.name}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {story.from} → {story.to}
                    </p>
                  </div>
                </div>

                <p className="text-gray-600 mb-4 italic">
                  &quot;{story.story}&quot;
                </p>

                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-sm text-blue-800 font-medium">Pathway:</p>
                  <p className="text-sm text-blue-600">{story.pathway}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Discover Your Future?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of Hawaii students who&apos;ve found their perfect
            career path
          </p>
          <button
            onClick={handleStartAssessment}
            className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-50 transition-all transform hover:scale-105 shadow-lg"
          >
            Start Your Assessment Now
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-2">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold">AI Pathways</span>
              </div>
              <p className="text-gray-400">
                Empowering Hawaii&apos;s students with AI-driven career guidance
                and personalized education pathways.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a
                    href="#how-it-works"
                    className="hover:text-white transition-colors"
                  >
                    How It Works
                  </a>
                </li>
                <li>
                  <a
                    href="#careers"
                    className="hover:text-white transition-colors"
                  >
                    Featured Careers
                  </a>
                </li>
                <li>
                  <a
                    href="#success-stories"
                    className="hover:text-white transition-colors"
                  >
                    Success Stories
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Data Sources</h4>
              <ul className="space-y-2 text-gray-400">
                <li>University of Hawaii System</li>
                <li>Hawaii DOE Career Data</li>
                <li>Local Job Market Analytics</li>
                <li>Industry Partnerships</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <div className="space-y-2 text-gray-400">
                <p>University of Hawaii</p>
                <p>Career Guidance Initiative</p>
                <p>Honolulu, Hawaii</p>
                <p>info@aipathways.hawaii.edu</p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>
              &copy; 2024 AI Pathways Hawaii. Empowering students with
              intelligent career guidance.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
