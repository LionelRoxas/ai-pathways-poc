/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect } from "react";
import { ArrowRight } from "lucide-react";
import UnifiedSleekChat from "./components/AIPathwaysChat/UnifiedSleekChat";
// import LanguageSelection, { Language } from "./components/LanguageSelection";
import { Language } from "./components/LanguageSelection";

export default function MainPage() {
  const [currentView, setCurrentView] = useState<"home" | "language" | "chat">(
    "home"
  );
  const [selectedLanguage] = useState<Language | null>({
    code: "en",
    name: "English",
    nativeName: "English",
    greeting: "Hello! Let's explore your educational journey.",
    description: "Standard English conversation",
  }); // Auto-set to English
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleStartChat = () => {
    // Skip language selection and go directly to chat
    setCurrentView("chat");
    // setCurrentView("language");
  };

  // const handleLanguageSelect = (language: Language) => {
  //   setSelectedLanguage(language);
  //   setCurrentView("chat");
  // };

  // const handleBackFromLanguage = () => {
  //   setCurrentView("home");
  // };

  // Language selection view - commented out for now
  // if (currentView === "language") {
  //   return (
  //     <LanguageSelection
  //       onLanguageSelect={handleLanguageSelect}
  //       onBack={handleBackFromLanguage}
  //     />
  //   );
  // }

  if (currentView === "chat") {
    return <UnifiedSleekChat selectedLanguage={selectedLanguage} />;
  }

  return (
    <div
      className="h-screen w-screen bg-white flex items-center justify-center overflow-hidden"
      style={{
        fontFamily:
          '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
      {/* Simple corner logo */}
      <div className="absolute top-8 left-8">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">
            Kamaʻāina Pathways
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div
        className={`max-w-3xl px-8 text-center transition-all duration-1000 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        {/* Main heading */}
        <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
          Find your path in
          <span className="block mt-2">Hawaiʻi</span>
        </h1>

        {/* Subheading */}
        <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-2xl mx-auto font-light">
          Have a conversation with AI about your interests and discover
          education and career opportunities tailored to you.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            onClick={handleStartChat}
            className="group bg-black hover:bg-gray-800 text-white px-8 py-4 rounded-full text-lg font-medium transition-all duration-200 hover:scale-105 flex items-center gap-3 min-w-[200px] justify-center"
          >
            <span>Start talking</span>
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </button>

          <button className="text-gray-600 hover:text-gray-900 px-8 py-4 text-lg transition-colors">
            Learn more
          </button>
        </div>

        {/* Simple footer text */}
        <div className="mt-16 text-sm text-gray-500">
          <div className="flex items-center justify-center gap-2">
            <img
              src="/images/uhcc-logo-3.png"
              alt="UHCC Logo"
              className="w-10 h-10 object-contain"
            />
            <span>Sponsored by UHCC</span>
          </div>
        </div>
      </div>

      {/* Bottom corner info */}
      <div className="absolute bottom-8 left-8 text-xs text-gray-500">
        Free • No signup required
      </div>

      <div className="absolute bottom-8 right-8 text-xs text-gray-500">
        Built for Hawaiʻi students
      </div>

      {/* Subtle background pattern */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gray-50 rounded-full filter blur-3xl opacity-50 animate-pulse" />
        <div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gray-50 rounded-full filter blur-3xl opacity-50 animate-pulse"
          style={{ animationDelay: "2s" }}
        />
      </div>
    </div>
  );
}
