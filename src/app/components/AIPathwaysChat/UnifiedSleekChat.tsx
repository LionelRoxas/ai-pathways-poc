/* eslint-disable react-hooks/exhaustive-deps */
// components/AIPathwaysChat/UnifiedSleekChat.tsx (Updated with auto data panel)
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef } from "react";
import { Menu, PanelRight, Activity, Globe } from "lucide-react";
import { Language } from "../LanguageSelection";

// Import other components (same as before)
import ChatMessages from "./ChatMessages";
import ChatInput from "./ChatInput";
import LeftSidebar from "./LeftSidebar";
import DataPanel from "./DataPanel";
import { Message, UserProfile, CurrentData } from "./types";

const PROFILE_UPDATE_INTERVALS = [15, 25, 35, 50];

interface UnifiedSleekChatProps {
  selectedLanguage: Language | null;
}

// Language-specific greetings
const getInitialGreeting = (language: Language | null): string => {
  if (!language)
    return "Aloha! I'm your Hawaii Education & Career Advisor. I'll help you explore educational pathways from high school to college, using real data from Hawaii's schools and universities. What's your current situation - are you in high school, college, working, or exploring your options?";

  switch (language.code) {
    case "haw":
      return "Aloha! ʻO wau kou kōkua no nā ala hoʻonaʻauao a me nā ʻoihana ma Hawaiʻi. E kōkua ana au iā ʻoe e ʻimi i nā ala hoʻonaʻauao mai ke kula kiʻekiʻe a hiki i ke kulanui. He aha kou kūlana i kēia manawa?";

    case "hwp":
      return "Eh howzit! I stay your Hawaii Education & Career Advisor. I going help you check out all da educational pathways from high school to college, using real data from Hawaii schools and universities yeah. So wat, you stay in high school, college, working, or jus checking out your options?";

    case "tl":
      return "Kumusta! Ako ang iyong tagapayo para sa Edukasyon at Karera sa Hawaii. Tutulungan kitang tuklasin ang mga landas ng edukasyon mula high school hanggang kolehiyo, gamit ang tunay na datos mula sa mga paaralan at unibersidad ng Hawaii. Ano ang iyong kasalukuyang sitwasyon - nasa high school ka ba, kolehiyo, nagtatrabaho, o nag-eeksplora ng mga pagpipilian?";

    default:
      return "Aloha! I'm your Hawaii Education & Career Advisor. I'll help you explore educational pathways from high school to college, using real data from Hawaii's schools and universities. What's your current situation - are you in high school, college, working, or exploring your options?";
  }
};

// Language-specific suggested questions
const getInitialSuggestions = (language: Language | null): string[] => {
  if (!language || language.code === "en") {
    return [
      "I'm a high school student",
      "I'm looking at UH programs",
      "I want to explore career pathways",
      "Show me programs on my island",
    ];
  }

  switch (language.code) {
    case "haw":
      return [
        "He haumāna kula kiʻekiʻe au",
        "Ke nānā nei au i nā papahana UH",
        "Makemake au e ʻimi i nā ala ʻoihana",
        "E hōʻike mai i nā papahana ma koʻu mokupuni",
      ];

    case "hwp":
      return [
        "I stay one high school student",
        "I stay looking at UH programs",
        "I like explore career pathways",
        "Show me programs on my island",
      ];

    case "tl":
      return [
        "Ako ay estudyante ng high school",
        "Tumitingin ako sa mga programa ng UH",
        "Gusto kong tuklasin ang mga landas ng karera",
        "Ipakita ang mga programa sa aking isla",
      ];

    default:
      return [
        "I'm a high school student",
        "I'm looking at UH programs",
        "I want to explore career pathways",
        "Show me programs on my island",
      ];
  }
};

export default function UnifiedSleekChat({
  selectedLanguage,
}: UnifiedSleekChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dataPanelOpen, setDataPanelOpen] = useState(false);
  const [currentData, setCurrentData] = useState<CurrentData | null>(null);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [activeDataTab, setActiveDataTab] = useState<string>("overview");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const lastUpdateRef = useRef<number>(0);

  // Use the selected language, default to English if not provided
  const currentLanguage = selectedLanguage || {
    code: "en",
    name: "English",
    nativeName: "English",
    greeting: "",
    description: "",
  };

  useEffect(() => {
    const greeting = getInitialGreeting(currentLanguage);
    setMessages([{ role: "assistant", content: greeting }]);
    setSuggestedQuestions(getInitialSuggestions(currentLanguage));
  }, []);

  const getUserMessageCount = () => {
    return messages.filter(msg => msg.role === "user").length;
  };

  const shouldUpdateProfile = (userMessageCount: number): boolean => {
    if (!userProfile?.isComplete) return false;
    const shouldUpdate = PROFILE_UPDATE_INTERVALS.some(
      interval =>
        userMessageCount === interval && lastUpdateRef.current < interval
    );
    if (shouldUpdate) {
      lastUpdateRef.current = userMessageCount;
    }
    return shouldUpdate;
  };

  const updateProfile = async (allMessages: Message[]) => {
    setIsUpdatingProfile(true);
    try {
      const transcript = allMessages
        .map(
          msg =>
            `${msg.role === "user" ? "Student" : "Advisor"}: ${msg.content}`
        )
        .join("\n\n");

      const userMessages = allMessages.filter(msg => msg.role === "user");
      const avgLength =
        userMessages.length > 0
          ? userMessages.reduce((sum, msg) => sum + msg.content.length, 0) /
            userMessages.length
          : 0;

      const response = await fetch("/api/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          existingProfile: userProfile?.profileSummary,
          existingExtracted: userProfile?.extracted,
          userMessageCount: userMessages.length,
          conversationMetrics: {
            totalMessages: allMessages.length,
            userMessages: userMessages.length,
            averageLength: avgLength,
          },
          language: currentLanguage.code,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.profile && data.extracted) {
          setUserProfile({
            profileSummary: data.profile,
            extracted: data.extracted,
            isComplete: true,
            confidence: data.confidence,
          });

          try {
            const suggestionsResponse = await fetch(
              "/api/personalized-suggestions",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  profileSummary: data.profile,
                  extractedProfile: data.extracted,
                  language: currentLanguage.code,
                }),
              }
            );

            if (suggestionsResponse.ok) {
              const suggestionsData = await suggestionsResponse.json();
              if (
                suggestionsData.suggestions &&
                Array.isArray(suggestionsData.suggestions)
              ) {
                setSuggestedQuestions(suggestionsData.suggestions);
              }
            }
          } catch (error) {
            console.error("Error updating suggestions:", error);
          }

          console.log("Profile updated with new conversation data");
        }
      }
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const buildProfile = async (
    transcript: string,
    currentUserMessageCount: number,
    allMessages: Message[]
  ) => {
    setIsAnalyzing(true);
    try {
      console.log(
        "Building profile with user message count:",
        currentUserMessageCount
      );

      const userMessages = allMessages.filter(msg => msg.role === "user");
      const avgLength =
        userMessages.length > 0
          ? userMessages.reduce((sum, msg) => sum + msg.content.length, 0) /
            userMessages.length
          : 0;

      const response = await fetch("/api/generate-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          userMessageCount: currentUserMessageCount,
          conversationMetrics: {
            totalMessages: allMessages.length,
            userMessages: currentUserMessageCount,
            averageLength: avgLength,
          },
          language: currentLanguage.code,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.profile && data.extracted) {
          setUserProfile({
            profileSummary: data.profile,
            extracted: data.extracted,
            isComplete: true,
            confidence: data.confidence,
          });

          lastUpdateRef.current = currentUserMessageCount;

          try {
            const suggestionsResponse = await fetch(
              "/api/personalized-suggestions",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  profileSummary: data.profile,
                  extractedProfile: data.extracted,
                  language: currentLanguage.code,
                }),
              }
            );

            let personalizedSuggestions =
              getInitialSuggestions(currentLanguage);

            if (suggestionsResponse.ok) {
              const suggestionsData = await suggestionsResponse.json();
              if (
                suggestionsData.suggestions &&
                Array.isArray(suggestionsData.suggestions)
              ) {
                personalizedSuggestions = suggestionsData.suggestions;
              }
            }

            setSuggestedQuestions(personalizedSuggestions);
          } catch (error) {
            console.error("Error generating personalized suggestions:", error);
            setSuggestedQuestions(getInitialSuggestions(currentLanguage));
          }

          const profileReadyMessage = getProfileReadyMessage(currentLanguage);
          setMessages(prev => [
            ...prev,
            {
              role: "assistant",
              content: profileReadyMessage,
            },
          ]);
        }
      } else {
        const errorData = await response.json();
        console.error(
          "Failed to generate profile:",
          response.status,
          errorData
        );
      }
    } catch (error) {
      console.error("Error building profile:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getProfileReadyMessage = (language: Language): string => {
    switch (language.code) {
      case "haw":
        return "Maikaʻi! Ua loaʻa iaʻu ka ʻike e pili ana iā ʻoe. ʻIke ʻoe i ka papa ma ka ʻaoʻao hema. Hiki iaʻu ke hāʻawi i nā manaʻo kūpono no nā papahana hoʻonaʻauao a me nā ala ʻoihana ma Hawaiʻi. He aha kāu makemake e ʻike?";

      case "hwp":
        return "Shoots! I get plenny info about you now. You can check your profile on da left side yeah. Now I can give you da kine personalized recommendations for Hawaii education programs and career pathways. Wat you like know about?";

      case "tl":
        return "Mahusay! Nakuha ko na ang iyong profile batay sa ating pag-uusap. Makikita mo ito sa kaliwang bahagi. Handa na akong magbigay ng personalized na rekomendasyon para sa mga programang pang-edukasyon at career pathways sa Hawaii. Ano ang gusto mong malaman?";

      default:
        return "Excellent! I've built a comprehensive profile based on our conversation. You can see it in the sidebar. I'm now ready to provide personalized recommendations for Hawaii's educational programs and pathways. What would you like to explore?";
    }
  };

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage = { role: "user" as const, content: message };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setMessage("");
    setIsLoading(true);

    const currentUserCount = newMessages.filter(
      msg => msg.role === "user"
    ).length;
    if (shouldUpdateProfile(currentUserCount)) {
      updateProfile(newMessages);
    }

    try {
      let apiEndpoint = "/api/profiling-chat";
      let requestBody: any;

      if (userProfile?.isComplete) {
        apiEndpoint = "/api/ai-pathways";
        requestBody = {
          message: userMessage.content,
          messages: newMessages.map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
          userProfile: userProfile.profileSummary,
          extractedProfile: userProfile.extracted,
          language: currentLanguage.code,
        };
      } else {
        requestBody = {
          messages: newMessages.map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
          language: currentLanguage.code,
        };
      }

      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error:", response.status, errorText);
        throw new Error(`Failed to get response: ${response.status}`);
      }

      const data = await response.json();

      if (data.readyForProfile && !userProfile?.isComplete) {
        console.log("Profile building triggered by profiling-chat API");
        const transcript = newMessages
          .map(
            msg =>
              `${msg.role === "user" ? "Student" : "Advisor"}: ${msg.content}`
          )
          .join("\n\n");

        const currentUserCount = newMessages.filter(
          msg => msg.role === "user"
        ).length;

        await buildProfile(transcript, currentUserCount, newMessages);
        return;
      }

      // AUTO DATA PANEL OPENING - THIS IS THE NEW ADDITION
      if (data.data && Object.keys(data.data).length > 0) {
        setCurrentData(data.data);

        // Check if there's actual data to display
        const hasActualData =
          (data.data.uhPrograms && data.data.uhPrograms.length > 0) ||
          (data.data.doePrograms && data.data.doePrograms.length > 0) ||
          (data.data.pathways && data.data.pathways.length > 0) ||
          (data.data.searchResults &&
            ((data.data.searchResults.uhPrograms &&
              data.data.searchResults.uhPrograms.length > 0) ||
              (data.data.searchResults.doePrograms &&
                data.data.searchResults.doePrograms.length > 0)));

        // Auto-open data panel if there's data and it's not already open
        if (hasActualData && !dataPanelOpen) {
          setDataPanelOpen(true);

          // Set the appropriate tab based on data type
          if (data.data.uhPrograms && data.data.uhPrograms.length > 0) {
            setActiveDataTab("uh");
          } else if (
            data.data.doePrograms &&
            data.data.doePrograms.length > 0
          ) {
            setActiveDataTab("doe");
          } else if (data.data.searchResults) {
            setActiveDataTab("search");
          } else if (data.data.pathways && data.data.pathways.length > 0) {
            setActiveDataTab("pathways");
          }
        }
      }

      if (data.suggestedQuestions) {
        setSuggestedQuestions(data.suggestedQuestions);
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: data.message,
        data: data.data,
        metadata: data.metadata,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error:", error);
      const errorMessage = getErrorMessage(currentLanguage);
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: errorMessage,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const getErrorMessage = (language: Language): string => {
    switch (language.code) {
      case "haw":
        return "E kala mai, ua loaʻa kekahi pilikia i ka hoʻokele ʻana i ka ʻikepili. E ʻoluʻolu e hoʻāʻo hou.";

      case "hwp":
        return "Ho brah, get one problem wit da database right now. Try ask again yeah?";

      case "tl":
        return "Pasensya na, nagkaproblema sa pag-access ng database. Pakisubukan ulit ang iyong tanong.";

      default:
        return "I'm having trouble accessing the education database right now. Could you try your question again?";
    }
  };

  const hasDataToShow = () => {
    if (!currentData) return false;
    return (
      (currentData.uhPrograms && currentData.uhPrograms.length > 0) ||
      (currentData.doePrograms && currentData.doePrograms.length > 0) ||
      (currentData.pathways && currentData.pathways.length > 0) ||
      (currentData.searchResults &&
        ((currentData.searchResults.uhPrograms &&
          currentData.searchResults.uhPrograms.length > 0) ||
          (currentData.searchResults.doePrograms &&
            currentData.searchResults.doePrograms.length > 0))) ||
      currentData.stats
    );
  };

  return (
    <div
      className="h-screen flex bg-slate-50"
      style={{
        fontFamily:
          '"Inter", "Segoe UI", "Roboto", "Helvetica Neue", sans-serif',
      }}
    >
      <LeftSidebar
        sidebarOpen={sidebarOpen}
        userProfile={userProfile}
        onClose={() => setSidebarOpen(false)}
        userMessageCount={getUserMessageCount()}
      />

      <div className="flex-1 flex flex-col">
        {/* Header with language indicator */}
        <div className="border-b border-slate-200 p-3 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Menu className="w-4 h-4 text-slate-600" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-slate-900 rounded-lg flex items-center justify-center">
                <Activity className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-bold text-slate-900 text-sm">
                Kamaʻāina Pathways
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language indicator */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-lg">
              <Globe className="w-3.5 h-3.5 text-slate-600" />
              <span className="text-xs font-medium text-slate-700">
                {currentLanguage.name}
              </span>
            </div>

            {/* Show button once profile is complete or there's data */}
            {(userProfile?.isComplete || hasDataToShow()) && (
              <button
                onClick={() => setDataPanelOpen(!dataPanelOpen)}
                className={`p-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                  dataPanelOpen
                    ? "bg-black text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <PanelRight
                  className={`w-4 h-4 transition-transform ${dataPanelOpen ? "rotate-180" : ""}`}
                />
                {hasDataToShow() && (
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                )}
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 flex">
          <div className="flex-1 flex flex-col">
            <ChatMessages
              messages={messages}
              isLoading={isLoading}
              isAnalyzing={isAnalyzing || isUpdatingProfile}
              suggestedQuestions={suggestedQuestions}
              setSuggestedQuestions={setSuggestedQuestions}
              setMessage={setMessage}
              userProfile={userProfile}
              sidebarOpen={sidebarOpen}
              dataPanelOpen={dataPanelOpen}
              setSidebarOpen={setSidebarOpen}
            />
          </div>
        </div>

        <DataPanel
          dataPanelOpen={dataPanelOpen}
          setDataPanelOpen={setDataPanelOpen}
          currentData={currentData}
          activeDataTab={activeDataTab}
          setActiveDataTab={setActiveDataTab}
        />

        <ChatInput
          message={message}
          setMessage={setMessage}
          handleSend={handleSend}
          isLoading={isLoading}
          userProfile={userProfile}
          messagesLength={messages.length}
          dataPanelOpen={dataPanelOpen}
          sidebarOpen={sidebarOpen}
        />
      </div>
    </div>
  );
}
