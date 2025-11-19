"use client";

import React from "react";
import UnifiedSleekChat from "../components/AIPathwaysChat/UnifiedSleekChat";
import { Language } from "../components/LanguageSelection";

export default function ChatPage() {
  // Auto-set to English
  const selectedLanguage: Language = {
    code: "en",
    name: "English",
    nativeName: "English",
    greeting: "Hello! Let's explore your educational journey.",
    description: "Standard English conversation",
  };

  return <UnifiedSleekChat selectedLanguage={selectedLanguage} />;
}
