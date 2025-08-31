/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef } from "react";
import { Menu, PanelRight, Activity } from "lucide-react";

// Import components
import ChatMessages from "./ChatMessages";
import ChatInput from "./ChatInput";
import LeftSidebar from "./LeftSidebar";
import DataPanel from "./DataPanel";

// Import types
import { Message, UserProfile, CurrentData } from "./types";

// Profile update intervals
const PROFILE_UPDATE_INTERVALS = [15, 25, 35, 50]; // Update at these message counts

export default function UnifiedSleekChat() {
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

  useEffect(() => {
    const greeting =
      "Aloha! I'm your Hawaii Education & Career Advisor. I'll help you explore educational pathways from high school to college, using real data from Hawaii's schools and universities. What's your current situation - are you in high school, college, working, or exploring your options?";
    setMessages([{ role: "assistant", content: greeting }]);

    // Set initial suggested questions for Hawaii education context
    setSuggestedQuestions([
      "I'm a high school student",
      "I'm looking at UH programs",
      "I want to explore career pathways",
      "Show me programs on my island",
    ]);
  }, []);

  // Get user message count (excluding AI responses)
  const getUserMessageCount = () => {
    return messages.filter(msg => msg.role === "user").length;
  };

  // Check if profile should be updated
  const shouldUpdateProfile = (userMessageCount: number): boolean => {
    // Only update if we have a complete profile
    if (!userProfile?.isComplete) return false;

    // Check if we've hit an update interval
    const shouldUpdate = PROFILE_UPDATE_INTERVALS.some(
      interval =>
        userMessageCount === interval && lastUpdateRef.current < interval
    );

    if (shouldUpdate) {
      lastUpdateRef.current = userMessageCount;
    }

    return shouldUpdate;
  };

  // Update existing profile with new conversation data
  const updateProfile = async (allMessages: Message[]) => {
    setIsUpdatingProfile(true);

    try {
      // Build updated transcript
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
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.profile && data.extracted) {
          // Update the profile with new data
          setUserProfile({
            profileSummary: data.profile,
            extracted: data.extracted,
            isComplete: true,
            confidence: data.confidence,
          });

          // Generate new personalized suggestions
          try {
            const suggestionsResponse = await fetch(
              "/api/personalized-suggestions",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  profileSummary: data.profile,
                  extractedProfile: data.extracted,
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

          // Add a subtle notification that profile was updated
          console.log("Profile updated with new conversation data");
        }
      }
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Auto-open data panel when data is received
  useEffect(() => {
    if (currentData && Object.keys(currentData).length > 0) {
      // Check if there's any actual data
      const hasData =
        (currentData.uhPrograms && currentData.uhPrograms.length > 0) ||
        (currentData.doePrograms && currentData.doePrograms.length > 0) ||
        (currentData.pathways && currentData.pathways.length > 0) ||
        (currentData.searchResults &&
          ((currentData.searchResults.uhPrograms &&
            currentData.searchResults.uhPrograms.length > 0) ||
            (currentData.searchResults.doePrograms &&
              currentData.searchResults.doePrograms.length > 0)));

      if (hasData) {
        setDataPanelOpen(true);

        // Set appropriate tab based on what data we have
        if (currentData.doePrograms && currentData.doePrograms.length > 0) {
          setActiveDataTab("doe");
        } else if (
          currentData.uhPrograms &&
          currentData.uhPrograms.length > 0
        ) {
          setActiveDataTab("uh");
        } else if (currentData.pathways && currentData.pathways.length > 0) {
          setActiveDataTab("pathways");
        } else if (currentData.searchResults) {
          setActiveDataTab("search");
        } else if (currentData.stats) {
          setActiveDataTab("overview");
        }
      }
    }
  }, [currentData]);

  // Handle profile building when profiling-chat says it's ready
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

      // Calculate metrics from the provided messages array
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

          // Set the last update reference
          lastUpdateRef.current = currentUserMessageCount;

          // Generate personalized suggested questions using API endpoint
          try {
            const suggestionsResponse = await fetch(
              "/api/personalized-suggestions",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  profileSummary: data.profile,
                  extractedProfile: data.extracted,
                }),
              }
            );

            let personalizedSuggestions = [
              "Show me UH programs that match my interests",
              "What high school courses should I take?",
              "Find programs on my island",
              "Show me pathways to college",
            ];

            if (suggestionsResponse.ok) {
              const suggestionsData = await suggestionsResponse.json();
              if (
                suggestionsData.suggestions &&
                Array.isArray(suggestionsData.suggestions)
              ) {
                personalizedSuggestions = suggestionsData.suggestions;
              }
            }

            // Set personalized suggested questions
            setSuggestedQuestions(personalizedSuggestions);
          } catch (error) {
            console.error("Error generating personalized suggestions:", error);
            // Use fallback suggestions for Hawaii education
            setSuggestedQuestions([
              "Show me UH programs that match my interests",
              "What high school courses should I take?",
              "Find programs on my island",
              "Show me pathways to college",
            ]);
          }

          // Add a system message to let user know profile is ready
          setMessages(prev => [
            ...prev,
            {
              role: "assistant",
              content:
                "Excellent! I've built a comprehensive profile based on our conversation. You can see it in the sidebar. I'm now ready to provide personalized recommendations for Hawaii's educational programs and pathways. What would you like to explore?",
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

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage = { role: "user" as const, content: message };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setMessage("");
    setIsLoading(true);

    // Check if profile should be updated
    const currentUserCount = newMessages.filter(
      msg => msg.role === "user"
    ).length;
    if (shouldUpdateProfile(currentUserCount)) {
      // Update profile in background (non-blocking)
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
        };
      } else {
        requestBody = {
          messages: newMessages.map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
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

      // Check if profiling-chat says it's ready to build profile
      if (data.readyForProfile && !userProfile?.isComplete) {
        console.log("Profile building triggered by profiling-chat API");

        // Build the profile immediately
        const transcript = newMessages
          .map(
            msg =>
              `${msg.role === "user" ? "Student" : "Advisor"}: ${msg.content}`
          )
          .join("\n\n");

        // Calculate the correct user message count from newMessages
        const currentUserCount = newMessages.filter(
          msg => msg.role === "user"
        ).length;
        console.log(
          "Calculated user count from newMessages:",
          currentUserCount
        );

        await buildProfile(transcript, currentUserCount, newMessages);

        // Don't add the "ready for profile" message since we're building it now
        return;
      }

      if (data.data && Object.keys(data.data).length > 0) {
        setCurrentData(data.data);
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
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content:
            "I'm having trouble accessing the education database right now. Could you try your question again?",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Check if we have meaningful data to show
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
      {/* Left Sidebar */}
      <LeftSidebar
        sidebarOpen={sidebarOpen}
        userProfile={userProfile}
        onClose={() => setSidebarOpen(false)}
        userMessageCount={getUserMessageCount()}
      />

      {/* Main Application Area */}
      <div className="flex-1 flex flex-col">
        {/* Minimal Header */}
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
            <div
              className={`px-2 py-1 rounded-md text-xs font-semibold ${
                isUpdatingProfile
                  ? "bg-amber-50 text-amber-700 border border-amber-200 animate-pulse"
                  : userProfile?.isComplete
                    ? ""
                    : "bg-slate-100 text-slate-700 border border-slate-200"
              }`}
            >
              {isUpdatingProfile
                ? "UPDATING..."
                : userProfile?.isComplete
                  ? ""
                  : `DISCOVERY ${getUserMessageCount()}/7`}
            </div>

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
                <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
              )}
            </button>
          </div>
        </div>

        {/* Chat Area */}
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

        {/* Data Panel */}
        <DataPanel
          dataPanelOpen={dataPanelOpen}
          setDataPanelOpen={setDataPanelOpen}
          currentData={currentData}
          activeDataTab={activeDataTab}
          setActiveDataTab={setActiveDataTab}
        />

        {/* Input */}
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
