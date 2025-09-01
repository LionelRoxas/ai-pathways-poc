// components/LanguageSelection.tsx
import React, { useState } from "react";
import { Globe, Check, ArrowRight } from "lucide-react";

export interface Language {
  code: string;
  name: string;
  nativeName: string;
  greeting: string;
  description: string;
}

const languages: Language[] = [
  {
    code: "en",
    name: "English",
    nativeName: "English",
    greeting: "Hello! Let's explore your educational journey.",
    description: "Standard English conversation",
  },
  {
    code: "haw",
    name: "Hawaiian",
    nativeName: "ʻŌlelo Hawaiʻi",
    greeting: "Aloha! E hoʻomaka kākou i kou huakaʻi hoʻonaʻauao.",
    description: "Converse in Hawaiian language",
  },
  {
    code: "hwp",
    name: "Pidgin",
    nativeName: "Pidgin",
    greeting: "Howzit! We go talk story bout your future, yeah?",
    description: "Talk story in local Pidgin",
  },
  {
    code: "tl",
    name: "Tagalog",
    nativeName: "Tagalog",
    greeting: "Kumusta! Pag-usapan natin ang iyong kinabukasan.",
    description: "Makipag-usap sa Tagalog",
  },
];

interface LanguageSelectionProps {
  onLanguageSelect: (language: Language) => void;
  onBack: () => void;
}

export default function LanguageSelection({
  onLanguageSelect,
  onBack,
}: LanguageSelectionProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleLanguageSelect = (language: Language) => {
    setSelectedLanguage(language.code);
    setIsAnimating(true);

    // Small delay for animation
    setTimeout(() => {
      onLanguageSelect(language);
    }, 300);
  };

  return (
    <div
      className="h-screen w-screen bg-white flex items-center justify-center overflow-hidden"
      style={{
        fontFamily:
          '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
      {/* Back button */}
      <button
        onClick={onBack}
        className="absolute top-8 left-8 text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-2 text-sm"
      >
        <ArrowRight className="w-4 h-4 rotate-180" />
        <span>Back</span>
      </button>

      {/* Main Content */}
      <div
        className={`max-w-4xl px-8 w-full transition-all duration-500 ${
          isAnimating ? "opacity-0 scale-95" : "opacity-100 scale-100"
        }`}
      >
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Globe className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Choose your language
          </h2>
        </div>

        {/* Language Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
          {languages.map(language => (
            <button
              key={language.code}
              onClick={() => handleLanguageSelect(language)}
              className={`
                group relative p-6 rounded-2xl border-2 transition-all duration-200
                hover:scale-[1.02] hover:shadow-lg
                ${
                  selectedLanguage === language.code
                    ? "border-black bg-gray-50"
                    : "border-gray-200 hover:border-gray-400 bg-white"
                }
              `}
            >
              {/* Selection indicator */}
              {selectedLanguage === language.code && (
                <div className="absolute top-4 right-4">
                  <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                </div>
              )}

              {/* Language info */}
              <div className="text-left">
                <div className="flex items-baseline gap-3 mb-2">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {language.name}
                  </h3>
                  {language.name !== language.nativeName && (
                    <span className="text-sm text-gray-500">
                      {language.nativeName}
                    </span>
                  )}
                </div>

                <p className="text-sm text-gray-600 mb-3">
                  {language.description}
                </p>

                <div className="pt-3 border-t border-gray-100">
                  <p className="text-sm text-gray-700 italic">
                    &quot;{language.greeting}&quot;
                  </p>
                </div>
              </div>

              {/* Hover effect arrow */}
              <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </div>
            </button>
          ))}
        </div>

      </div>

      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-50 rounded-full filter blur-3xl opacity-30" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-green-50 rounded-full filter blur-3xl opacity-30" />
      </div>
    </div>
  );
}
