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

    // The displayed career title is actually the SOC code itself
    // Just use the title directly as the SOC code
    const displayedSocCode = displayedCareer.title;
    
    // Validate it looks like a SOC code (XX-XXXX format)
    if (displayedSocCode && /^\d{2}-\d{4}$/.test(displayedSocCode)) {
      matchedCount++;
      console.log(`[SOC Extraction]    ✅ Using displayed SOC code directly: ${displayedSocCode}`);
      socCodes.push(displayedSocCode);
    } else {
      console.log(`[SOC Extraction]    ❌ Invalid SOC code format: "${displayedSocCode}"`);
    }
  });

  // Remove duplicates
  const uniqueSocCodes = [...new Set(socCodes)];

  console.log(`\n[SOC Extraction] ✅ EXTRACTION COMPLETE:`);
  console.log(
    `[SOC Extraction]    - Displayed careers: ${displayedCareers.length}`
  );
  console.log(`[SOC Extraction]    - Valid SOC codes extracted: ${matchedCount}`);
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

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  userProfile: UserProfile | null;
  currentData: CurrentData | null;
  displayedSocCodes: string[];
  createdAt: Date;
  updatedAt: Date;
}

export default function UnifiedSleekChat({
  selectedLanguage,
}: UnifiedSleekChatProps) {
  // Chat session management
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string>("");
  
  // Current chat state
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
  const [activeDataTab, setActiveDataTab] = useState<string>("active-posts");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const lastUpdateRef = useRef<number>(0);
  const [displayedSocCodes, setDisplayedSocCodes] = useState<string[]>([]);
  const isInitializing = useRef(false);

  const currentLanguage = selectedLanguage || {
    code: "en",
    name: "English",
    nativeName: "English",
    greeting: "",
    description: "",
  };

  // 🎯 Effect to set initial tab based on context
  useEffect(() => {
    if (userProfile?.extracted?.currentStatus === "working") {
      setActiveDataTab("companies"); // Focus on companies for working professionals
    } else if (userProfile?.extracted?.educationLevel === "high_school") {
      setActiveDataTab("skills"); // Focus on skills for high school students
    } else {
      setActiveDataTab("active-posts"); // Default for everyone else
    }
  }, [userProfile?.extracted]);

  useEffect(() => {
    const greeting = getInitialGreeting(currentLanguage);
    
    // Try to load chat sessions from localStorage
    const savedSessions = localStorage.getItem('chatSessions');
    const savedCurrentId = localStorage.getItem('currentChatId');
    
    if (savedSessions && savedCurrentId) {
      try {
        const sessions: ChatSession[] = JSON.parse(savedSessions).map((s: any) => ({
          ...s,
          createdAt: new Date(s.createdAt),
          updatedAt: new Date(s.updatedAt),
        }));
        
        isInitializing.current = true;
        setChatSessions(sessions);
        setCurrentChatId(savedCurrentId);
        
        // Load the current session
        const currentSession = sessions.find(s => s.id === savedCurrentId);
        if (currentSession) {
          setMessages(currentSession.messages);
          setUserProfile(currentSession.userProfile);
          setCurrentData(currentSession.currentData);
          setDisplayedSocCodes(currentSession.displayedSocCodes);
          setDataPanelOpen(currentSession.displayedSocCodes.length > 0);
        }
        setTimeout(() => { isInitializing.current = false; }, 100);
      } catch (error) {
        console.error('Failed to load chat sessions:', error);
        // Initialize new session if loading fails
        initializeNewSession(greeting);
      }
    } else {
      // Initialize first chat session
      initializeNewSession(greeting);
    }
    
    setSuggestedQuestions(getInitialSuggestions(currentLanguage));
  }, []);

  const initializeNewSession = (greeting: string) => {
    const initialChatId = `chat-${Date.now()}`;
    const initialSession: ChatSession = {
      id: initialChatId,
      title: "New Conversation",
      messages: [{ role: "assistant", content: greeting }],
      userProfile: null,
      currentData: null,
      displayedSocCodes: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    isInitializing.current = true;
    setMessages([{ role: "assistant", content: greeting }]);
    setChatSessions([initialSession]);
    setCurrentChatId(initialChatId);
    
    // Save to localStorage immediately
    localStorage.setItem('chatSessions', JSON.stringify([initialSession]));
    localStorage.setItem('currentChatId', initialChatId);
    
    setTimeout(() => { isInitializing.current = false; }, 100);
  };

  // Save current chat session whenever state changes
  useEffect(() => {
    if (isInitializing.current) {
      return; // Skip during initialization
    }
    
    if (currentChatId && messages.length > 0) {
      setChatSessions(prev => {
        // Check if this session already exists
        const sessionExists = prev.some(s => s.id === currentChatId);
        
        const updated = sessionExists
          ? prev.map(session => 
              session.id === currentChatId
                ? {
                    ...session,
                    messages,
                    userProfile, // ✅ Save this chat's unique profile
                    currentData,
                    displayedSocCodes,
                    updatedAt: new Date(),
                    // Auto-generate title from first user message
                    title: messages.find(m => m.role === "user")?.content.slice(0, 50) || "New Conversation",
                  }
                : session
            )
          : prev; // Don't modify if session doesn't exist (it was just created by initializeNewSession)
        
        // Save to localStorage
        localStorage.setItem('chatSessions', JSON.stringify(updated));
        localStorage.setItem('currentChatId', currentChatId);
        
        return updated;
      });
    }
  }, [currentChatId, messages, userProfile, currentData, displayedSocCodes]);

  // Create new chat
  const createNewChat = () => {
    const newChatId = `chat-${Date.now()}`;
    const greeting = getInitialGreeting(currentLanguage);
    
    const newSession: ChatSession = {
      id: newChatId,
      title: "New Conversation",
      messages: [{ role: "assistant", content: greeting }],
      userProfile: null, // ✅ Each chat starts with no profile
      currentData: null,
      displayedSocCodes: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    setChatSessions(prev => {
      const updated = [newSession, ...prev];
      localStorage.setItem('chatSessions', JSON.stringify(updated));
      localStorage.setItem('currentChatId', newChatId);
      return updated;
    });
    setCurrentChatId(newChatId);
    
    // ✅ Reset ALL current state including profile
    setMessages([{ role: "assistant", content: greeting }]);
    setUserProfile(null); // Reset profile for new chat
    setCurrentData(null);
    setDisplayedSocCodes([]);
    setSuggestedQuestions(getInitialSuggestions(currentLanguage));
    setDataPanelOpen(false);
    setIsAnalyzing(false);
    setIsUpdatingProfile(false);
    lastUpdateRef.current = 0; // Reset profile update counter
  };

  // Switch to a different chat
  const switchToChat = (chatId: string) => {
    const session = chatSessions.find(s => s.id === chatId);
    if (session) {
      setCurrentChatId(chatId);
      
      // ✅ Restore ALL state including the profile specific to this chat
      setMessages(session.messages);
      setUserProfile(session.userProfile); // Restore this chat's profile
      setCurrentData(session.currentData);
      setDisplayedSocCodes(session.displayedSocCodes);
      setDataPanelOpen(session.displayedSocCodes.length > 0);
      
      // Reset profile update counter based on this chat's message count
      const userMessageCount = session.messages.filter(m => m.role === "user").length;
      lastUpdateRef.current = PROFILE_UPDATE_INTERVALS.filter(interval => interval < userMessageCount).pop() || 0;
      
      // Update localStorage
      localStorage.setItem('currentChatId', chatId);
    }
  };

  // Delete a chat session
  const deleteChat = (chatId: string) => {
    const isDeletingCurrent = chatId === currentChatId;
    
    setChatSessions(prev => {
      const updated = prev.filter(s => s.id !== chatId);
      
      // Update localStorage
      localStorage.setItem('chatSessions', JSON.stringify(updated));
      
      return updated;
    });
    
    // Handle switching after state update
    if (isDeletingCurrent) {
      // Wait for state to update, then switch or create new chat
      setTimeout(() => {
        setChatSessions(current => {
          if (current.length > 0) {
            // Switch to the most recent remaining chat
            const mostRecent = current[0];
            const session = current.find(s => s.id === mostRecent.id);
            if (session) {
              setCurrentChatId(mostRecent.id);
              setMessages(session.messages);
              setUserProfile(session.userProfile);
              setCurrentData(session.currentData);
              setDisplayedSocCodes(session.displayedSocCodes);
              setDataPanelOpen(session.displayedSocCodes.length > 0);
              
              const userMessageCount = session.messages.filter(m => m.role === "user").length;
              lastUpdateRef.current = PROFILE_UPDATE_INTERVALS.filter(interval => interval < userMessageCount).pop() || 0;
              
              localStorage.setItem('currentChatId', mostRecent.id);
            }
          } else {
            // No chats left, create a new one
            const greeting = getInitialGreeting(currentLanguage);
            const newChatId = `chat-${Date.now()}`;
            const newSession: ChatSession = {
              id: newChatId,
              title: "New Conversation",
              messages: [{ role: "assistant", content: greeting }],
              userProfile: null,
              currentData: null,
              displayedSocCodes: [],
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            
            setCurrentChatId(newChatId);
            setMessages([{ role: "assistant", content: greeting }]);
            setUserProfile(null);
            setCurrentData(null);
            setDisplayedSocCodes([]);
            setSuggestedQuestions(getInitialSuggestions(currentLanguage));
            setDataPanelOpen(false);
            setIsAnalyzing(false);
            setIsUpdatingProfile(false);
            lastUpdateRef.current = 0;
            
            localStorage.setItem('chatSessions', JSON.stringify([newSession]));
            localStorage.setItem('currentChatId', newChatId);
            
            return [newSession];
          }
          return current;
        });
      }, 0);
    }
  };

  // ✅ NEW: Extract SOC codes from displayed careers when messages or data changes
    const prevSocCodesRef = useRef<string[]>([]);
    useEffect(() => {
      console.log(
        "\n[Parent] 🔄 Messages or currentData changed, triggering SOC extraction"
      );
      console.log(`[Parent]    - Total messages: ${messages.length}`);
      console.log(`[Parent]    - CurrentData available: ${!!currentData}`);

      const extractedSocCodes = extractDisplayedSocCodes(messages, currentData);

      // Only update displayedSocCodes if they actually changed
      const codesChanged =
        extractedSocCodes.length !== prevSocCodesRef.current.length ||
        extractedSocCodes.some((code, idx) => code !== prevSocCodesRef.current[idx]);

      if (codesChanged) {
        console.log(
          `[Parent] 🎯 Setting displayedSocCodes to ${extractedSocCodes.length} codes`
        );
        setDisplayedSocCodes(extractedSocCodes);
        prevSocCodesRef.current = extractedSocCodes;

        // Auto-open DataPanel when SOC codes are available
        if (extractedSocCodes.length > 0 && !dataPanelOpen) {
          console.log("[Parent] 🎯 Opening DataPanel with extracted SOC codes");
          setDataPanelOpen(true);
          setActiveDataTab("active-posts");
        }
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
          const newProfile = {
            profileSummary: data.profile,
            extracted: data.extracted,
            isComplete: true,
            confidence: data.confidence,
          };
          
          setUserProfile(newProfile);

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

          // ✅ NEW: Automatically call pathway API with the last user message
          const lastUserMessage = allMessages[allMessages.length - 1];
          
          setIsAnalyzing(false);
          setIsLoading(true);
          
          try {
            const pathwayResponse = await fetch("/api/pathway", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                message: lastUserMessage.content,
                conversationHistory: allMessages.map(msg => ({
                  role: msg.role,
                  content: msg.content,
                })),
                language: currentLanguage.code,
                userProfile: {
                  summary: data.profile,
                  extracted: data.extracted,
                },
              }),
            });

            if (pathwayResponse.ok) {
              const pathwayData = await pathwayResponse.json();

              if (pathwayData.data && Object.keys(pathwayData.data).length > 0) {
                setCurrentData(pathwayData.data);

                const hasActualData =
                  (pathwayData.data.highSchoolPrograms &&
                    pathwayData.data.highSchoolPrograms.length > 0) ||
                  (pathwayData.data.collegePrograms && 
                    pathwayData.data.collegePrograms.length > 0) ||
                  (pathwayData.data.careers && 
                    pathwayData.data.careers.length > 0) ||
                  (pathwayData.data.uhPrograms && 
                    pathwayData.data.uhPrograms.length > 0) ||
                  (pathwayData.data.doePrograms && 
                    pathwayData.data.doePrograms.length > 0) ||
                  (pathwayData.data.pathways && 
                    pathwayData.data.pathways.length > 0) ||
                  (pathwayData.data.searchResults &&
                    ((pathwayData.data.searchResults.uhPrograms &&
                      pathwayData.data.searchResults.uhPrograms.length > 0) ||
                      (pathwayData.data.searchResults.doePrograms &&
                        pathwayData.data.searchResults.doePrograms.length > 0)));

                if (hasActualData && !dataPanelOpen) {
                  setDataPanelOpen(true);
                  setActiveDataTab("active-posts");
                }
              }

              if (pathwayData.suggestedQuestions) {
                setSuggestedQuestions(pathwayData.suggestedQuestions);
              }

              const assistantMessage: Message = {
                role: "assistant",
                content: pathwayData.message,
                data: pathwayData.data,
                metadata: pathwayData.metadata,
              };

              setMessages(prev => [...prev, assistantMessage]);
            }
          } catch (error) {
            console.error("Error calling pathway API:", error);
          }
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
      setIsLoading(false);
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
          // Always set to a valid tab for the SOC-based DataPanel
          setActiveDataTab("active-posts");
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
        onDataPanelToggle={() => {
          const newPanelState = !dataPanelOpen;
          setDataPanelOpen(newPanelState);
          if (newPanelState) {
            setActiveDataTab("active-posts");
          }
        }}
        dataPanelOpen={dataPanelOpen}
        hasDataToShow={hasDataToShow()}
        onProfileClick={() => setSidebarOpen(!sidebarOpen)}
        onNewChat={createNewChat}
        chatSessions={chatSessions}
        currentChatId={currentChatId}
        onSwitchChat={switchToChat}
        onDeleteChat={deleteChat}
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
          userMessageCount={getUserMessageCount()}
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
