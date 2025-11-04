/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
// components/AIPathwaysChat/DataPanel.tsx
// Market Intelligence Report with toggle to detailed visualizers
import React, { useState } from "react";
import {
  X,
  TrendingUp,
  ChevronDown,
} from "lucide-react";

// Import all 4 SOC Visualizers
import JobTitlesSkillsVisualizer from "./Visualizer/JobTitlesSkillsVisualizer";
import JobTitlesCompaniesVisualizer from "./Visualizer/JobTitlesCompaniesVisualizer";
import CompaniesSkillsVisualizer from "./Visualizer/CompaniesSkillsVisualizer";
import MarketIntelligenceReport from "./MarketIntelligenceReport";

interface DataPanelProps {
  dataPanelOpen: boolean;
  setDataPanelOpen: (open: boolean) => void;
  socCodes: string[]; // ✅ Now passed directly as prop
  activeDataTab: string;
  setActiveDataTab: (tab: string) => void;
  messages?: any[]; // Conversation context for personalized insights
  userProfile?: any; // User profile for personalized insights
}

interface Tab {
  id: string;
  label: string;
}

export default function DataPanel({
  dataPanelOpen,
  setDataPanelOpen,
  socCodes, // ✅ Use prop directly
  activeDataTab,
  setActiveDataTab,
  messages,
  userProfile,
}: DataPanelProps) {
  const [showDetails, setShowDetails] = useState(false);
  
  console.log(
    `[DataPanel] 🎯 Received ${socCodes.length} SOC codes:`,
    socCodes
  );
  console.log(`[DataPanel] 🎯 Active tab:`, activeDataTab);
  console.log(`[DataPanel] 🎯 Show details:`, showDetails);

  // 🎯 Only trigger tab validation if socCodes actually change
  const prevSocCodesRef = React.useRef<string[]>([]);

  React.useEffect(() => {
    const codesChanged =
      socCodes.length !== prevSocCodesRef.current.length ||
      socCodes.some((code, idx) => code !== prevSocCodesRef.current[idx]);
    if (socCodes.length > 0 && codesChanged) {
      const validTabs = ["companies", "skills", "company-skills"];
      if (!validTabs.includes(activeDataTab)) {
        setActiveDataTab("companies"); // Set default if current tab is invalid
      }
      prevSocCodesRef.current = socCodes;
    }
  }, [socCodes, activeDataTab, setActiveDataTab]);

  // Don't render if panel is closed or no SOC codes
  if (!dataPanelOpen || socCodes.length === 0) return null;

  // Only 4 tabs - all SOC-based visualizers
  const tabs: Tab[] = [
    {
      id: "companies",
      label: "Companies",
    },
    {
      id: "skills",
      label: "Skills",
    },
    {
      id: "company-skills",
      label: "Demand",
    },
  ];

  return (
    <div className="fixed top-0 right-0 bottom-0 w-96 bg-white border-l border-slate-200 shadow-xl z-40">
      <div className="h-full flex flex-col">
        {/* Toggleable Header */}
        <div className="px-4 py-3 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between gap-3">
            {/* Sliding Toggle */}
            <div className="flex-1 bg-gray-100 rounded-lg p-1 relative">
              <div className="grid grid-cols-2 gap-1 relative">
                <button
                  onClick={() => setShowDetails(false)}
                  className={`relative z-10 px-3 py-2 text-xs font-semibold rounded-md transition-colors ${
                    !showDetails
                      ? "text-white"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Summary
                </button>
                <button
                  onClick={() => setShowDetails(true)}
                  className={`relative z-10 px-3 py-2 text-xs font-semibold rounded-md transition-colors ${
                    showDetails
                      ? "text-white"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Detailed Data
                </button>
                {/* Sliding Background */}
                <div
                  className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-black rounded-md transition-transform duration-300 ease-out ${
                    showDetails ? "translate-x-[calc(100%+8px)]" : "translate-x-1"
                  }`}
                />
              </div>
            </div>
            
            {/* Close Button */}
            <button
              onClick={() => setDataPanelOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              aria-label="Close panel"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 bg-white">
          {!showDetails ? (
            /* Market Intelligence Report (Primary View) */
            <MarketIntelligenceReport 
              socCodes={socCodes} 
              messages={messages}
              userProfile={userProfile}
            />
          ) : (
            /* Detailed Visualizers (Secondary View) */
            <>
              {/* Tabs */}
              <div className="bg-gray-100 rounded-lg p-1 mb-4 relative">
                <div className="grid grid-cols-3 gap-1 relative">
                  {tabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveDataTab(tab.id)}
                      className={`relative z-10 px-3 py-2 text-xs font-semibold rounded-md transition-colors ${
                        activeDataTab === tab.id
                          ? "text-white"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                  {/* Sliding Background */}
                  <div
                    className={`absolute top-1 bottom-1 w-[calc(33.333%-4px)] bg-black rounded-md transition-transform duration-300 ease-out ${
                      activeDataTab === "companies" 
                        ? "translate-x-1" 
                        : activeDataTab === "skills"
                        ? "translate-x-[calc(100%+8px)]"
                        : "translate-x-[calc(200%+16px)]"
                    }`}
                  />
                </div>
              </div>

              {/* Visualizer Content */}
              <div
                style={{
                  display: activeDataTab === "companies" ? "block" : "none",
                }}
              >
                <JobTitlesCompaniesVisualizer socCodes={socCodes} />
              </div>
              <div
                style={{ display: activeDataTab === "skills" ? "block" : "none" }}
              >
                <JobTitlesSkillsVisualizer socCodes={socCodes} />
              </div>
              <div
                style={{
                  display: activeDataTab === "company-skills" ? "block" : "none",
                }}
              >
                <CompaniesSkillsVisualizer socCodes={socCodes} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
