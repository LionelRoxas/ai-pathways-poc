/* eslint-disable react-hooks/exhaustive-deps */
// components/AIPathwaysChat/UnifiedSleekChat.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef } from "react";
import { Language } from "../LanguageSelection";

import ChatMessages from "./ChatMessages";
import ChatInput from "./ChatInput";
import LeftSidebar from "./LeftSidebar";
import NavSidebar from "./NavSidebar";
import DataPanel from "./DataPanel";
import { Message, UserProfile, CurrentData } from "./types";

const PROFILE_UPDATE_INTERVALS = [15, 25, 35, 50];

interface UnifiedSleekChatProps {
  selectedLanguage: Language | null;
}

/**
 * Extracts SOC codes from the most recent assistant message that contains career data
 * Returns empty array if no careers found
 */
const extractDisplayedSocCodes = (
  messages: Message[],
  currentData: CurrentData | null
): string[] => {
  console.log(
    "\n[SOC Extraction] ==================== Starting Extraction ===================="
  );

  // Find the most recent assistant message with career data
  const messageWithCareers = [...messages]
    .reverse()
    .find(
      msg =>
        msg.role === "assistant" &&
        msg.data?.careers &&
        Array.isArray(msg.data.careers) &&
        msg.data.careers.length > 0
    );

  if (!messageWithCareers?.data?.careers) {
    console.log("[SOC Extraction] ❌ No careers found in messages");
    return [];
  }

  const displayedCareers = messageWithCareers.data.careers;
  console.log(
    `[SOC Extraction] 📋 Found ${displayedCareers.length} displayed careers in message:`
  );
  displayedCareers.forEach((career: any, idx: number) => {
    console.log(
      `[SOC Extraction]    ${idx + 1}. "${career.title}" (CIP: ${career.cipCode || "N/A"})`
    );
  });

  if (!currentData?.careers || !Array.isArray(currentData.careers)) {
    console.log("[SOC Extraction] ❌ No currentData.careers available");
    return [];
  }

  console.log(
    `[SOC Extraction] 🗄️  Total careers in currentData: ${currentData.careers.length}`
  );

  // Extract SOC codes by matching displayed careers with currentData
  const socCodes: string[] = [];
  let matchedCount = 0;

  displayedCareers.forEach((displayedCareer: any, idx: number) => {
    console.log(
      `\n[SOC Extraction] 🔍 Career ${idx + 1}: "${displayedCareer.title}"`
    );

    // Match by title or cipCode
    const matchingCareer = currentData.careers?.find(
      (career: any) =>
        career.title === displayedCareer.title ||
        (displayedCareer.cipCode &&
          career.cipCode &&
          career.cipCode === displayedCareer.cipCode)
    );

    if (matchingCareer) {
      matchedCount++;
      console.log(`[SOC Extraction]    ✅ Found match in currentData`);

      if (matchingCareer.socCodes && Array.isArray(matchingCareer.socCodes)) {
        console.log(
          `[SOC Extraction]    ✅ Adding ${matchingCareer.socCodes.length} SOC codes: [${matchingCareer.socCodes.join(", ")}]`
        );
        socCodes.push(...matchingCareer.socCodes);
      } else {
        console.log(
          `[SOC Extraction]    ⚠️  Career matched but no SOC codes found`
        );
      }
    } else {
      console.log(`[SOC Extraction]    ❌ No match found in currentData`);
      console.log(
        `[SOC Extraction]       - Displayed title: "${displayedCareer.title}"`
      );
      console.log(
        `[SOC Extraction]       - Displayed CIP: ${displayedCareer.cipCode || "N/A"}`
      );
    }
  });

  // Remove duplicates
  const uniqueSocCodes = [...new Set(socCodes)];

  console.log(`\n[SOC Extraction] ✅ EXTRACTION COMPLETE:`);
  console.log(
    `[SOC Extraction]    - Displayed careers: ${displayedCareers.length}`
  );
  console.log(`[SOC Extraction]    - Matched careers: ${matchedCount}`);
  console.log(
    `[SOC Extraction]    - Total SOC codes (with duplicates): ${socCodes.length}`
  );
  console.log(
    `[SOC Extraction]    - Unique SOC codes: ${uniqueSocCodes.length}`
  );
  console.log(
    `[SOC Extraction]    - SOC codes: [${uniqueSocCodes.join(", ")}]`
  );
  console.log(
    "[SOC Extraction] ==================== End Extraction ====================\n"
  );

  return uniqueSocCodes;
};

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [navSidebarOpen, setNavSidebarOpen] = useState(false);
  const [dataPanelOpen, setDataPanelOpen] = useState(false);
  const [currentData, setCurrentData] = useState<CurrentData | null>(null);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [activeDataTab, setActiveDataTab] = useState<string>("active-posts"); // ✅ Changed default tab
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const lastUpdateRef = useRef<number>(0);
  const [displayedSocCodes, setDisplayedSocCodes] = useState<string[]>([]); // ✅ Added state

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

  // ✅ NEW: Extract SOC codes from displayed careers when messages or data changes
  useEffect(() => {
    console.log(
      "\n[Parent] 🔄 Messages or currentData changed, triggering SOC extraction"
    );
    console.log(`[Parent]    - Total messages: ${messages.length}`);
    console.log(`[Parent]    - CurrentData available: ${!!currentData}`);

    const extractedSocCodes = extractDisplayedSocCodes(messages, currentData);

    console.log(
      `[Parent] 🎯 Setting displayedSocCodes to ${extractedSocCodes.length} codes`
    );
    setDisplayedSocCodes(extractedSocCodes);

    // Auto-open DataPanel when SOC codes are available
    if (extractedSocCodes.length > 0 && !dataPanelOpen) {
      console.log("[Parent] 🎯 Opening DataPanel with extracted SOC codes");
      setDataPanelOpen(true);
      setActiveDataTab("active-posts");
    }
  }, [messages, currentData]);

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

  const generateProfile = async (
    transcript: string,
    currentUserMessageCount: number,
    allMessages: Message[]
  ) => {
    setIsAnalyzing(true);
    try {
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

    const userMessage = { role: "user" as const, content: message.trim() };
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
        apiEndpoint = "/api/pathway";
        requestBody = {
          message: userMessage.content,
          conversationHistory: newMessages.map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
          language: currentLanguage.code,
          userProfile: {
            summary: userProfile.profileSummary,
            extracted: userProfile.extracted,
          },
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

        await generateProfile(transcript, currentUserCount, newMessages);
        setIsLoading(false);
        return;
      }

      if (data.data && Object.keys(data.data).length > 0) {
        setCurrentData(data.data);

        const hasActualData =
          (data.data.highSchoolPrograms &&
            data.data.highSchoolPrograms.length > 0) ||
          (data.data.collegePrograms && data.data.collegePrograms.length > 0) ||
          (data.data.careers && data.data.careers.length > 0) ||
          (data.data.uhPrograms && data.data.uhPrograms.length > 0) ||
          (data.data.doePrograms && data.data.doePrograms.length > 0) ||
          (data.data.pathways && data.data.pathways.length > 0) ||
          (data.data.searchResults &&
            ((data.data.searchResults.uhPrograms &&
              data.data.searchResults.uhPrograms.length > 0) ||
              (data.data.searchResults.doePrograms &&
                data.data.searchResults.doePrograms.length > 0)));

        if (hasActualData && !dataPanelOpen) {
          setDataPanelOpen(true);

          // Determine which tab to open based on data priority
          if (data.data.careerData && data.data.careerData.length > 0) {
            setActiveDataTab("careers");
          } else if (
            data.data.highSchoolPrograms &&
            data.data.highSchoolPrograms.length > 0
          ) {
            setActiveDataTab("pathways");
          } else if (
            data.data.collegePrograms &&
            data.data.collegePrograms.length > 0
          ) {
            setActiveDataTab("pathways");
          } else if (data.data.uhPrograms && data.data.uhPrograms.length > 0) {
            setActiveDataTab("uh");
          } else if (
            data.data.doePrograms &&
            data.data.doePrograms.length > 0
          ) {
            setActiveDataTab("doe");
          } else if (data.data.pathways && data.data.pathways.length > 0) {
            setActiveDataTab("pathways");
          } else if (data.data.searchResults) {
            setActiveDataTab("search");
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
      (currentData.highSchoolPrograms &&
        currentData.highSchoolPrograms.length > 0) ||
      (currentData.collegePrograms && currentData.collegePrograms.length > 0) ||
      (currentData.careers && currentData.careers.length > 0) ||
      (currentData.uhPrograms && currentData.uhPrograms.length > 0) ||
      (currentData.doePrograms && currentData.doePrograms.length > 0) ||
      (currentData.pathways && currentData.pathways.length > 0) ||
      (currentData.searchResults &&
        ((currentData.searchResults.uhPrograms &&
          currentData.searchResults.uhPrograms.length > 0) ||
          (currentData.searchResults.doePrograms &&
            currentData.searchResults.doePrograms.length > 0))) ||
      !!currentData.stats
    );
  };

  const getLeftOffset = () => {
    if (sidebarOpen) {
      return 320; // LeftSidebar width only
    }
    return navSidebarOpen ? 256 : 56; // NavSidebar width
  };

  return (
    <div
      className="h-screen bg-slate-50"
      style={{
        fontFamily:
          '"Inter", "Segoe UI", "Roboto", "Helvetica Neue", sans-serif',
      }}
    >
      {/* Navigation Sidebar - z-20, fixed at left: 0 */}
      <NavSidebar
        isOpen={navSidebarOpen}
        onToggle={() => setNavSidebarOpen(!navSidebarOpen)}
        currentLanguage={currentLanguage}
        onDataPanelToggle={() => setDataPanelOpen(!dataPanelOpen)}
        dataPanelOpen={dataPanelOpen}
        hasDataToShow={hasDataToShow()}
        onProfileClick={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Profile Sidebar - z-30, fixed at left: 0, overlays NavSidebar */}
      {sidebarOpen && (
        <LeftSidebar
          sidebarOpen={sidebarOpen}
          userProfile={userProfile}
          onClose={() => setSidebarOpen(false)}
          userMessageCount={getUserMessageCount()}
        />
      )}

      {/* Main Content Area - ONLY shifts based on NavSidebar width */}
      <div
        className="flex flex-col h-screen transition-all duration-300"
        style={{
          left: `${getLeftOffset()}px`,
        }}
      >
        <div className="flex-1 flex overflow-hidden">
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
              navSidebarOpen={navSidebarOpen}
            />
          </div>
        </div>

        <ChatInput
          message={message}
          setMessage={setMessage}
          handleSend={handleSend}
          isLoading={isLoading}
          userProfile={userProfile}
          messagesLength={messages.length}
          dataPanelOpen={dataPanelOpen}
          sidebarOpen={sidebarOpen}
          navSidebarOpen={navSidebarOpen}
        />
      </div>

      {/* Data Panel - positioned as overlay */}
      <DataPanel
        dataPanelOpen={dataPanelOpen}
        setDataPanelOpen={setDataPanelOpen}
        socCodes={displayedSocCodes} // ✅ Pass extracted SOC codes from displayed careers
        activeDataTab={activeDataTab}
        setActiveDataTab={setActiveDataTab}
      />
    </div>
  );
}
