/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
// components/AIPathwaysChat/DataPanel.tsx
// Market Intelligence Report with toggle to detailed visualizers
import React, { useState } from "react";
import { X } from "lucide-react";

// Import all 4 SOC Visualizers + PathwayPlan
import JobTitlesSkillsVisualizer from "./Visualizer/JobTitlesSkillsVisualizer";
import JobTitlesCompaniesVisualizer from "./Visualizer/JobTitlesCompaniesVisualizer";
import CompaniesSkillsVisualizer from "./Visualizer/CompaniesSkillsVisualizer";
import MarketIntelligenceReport from "./MarketIntelligenceReport";
import PathwayPlan from "./PathwayPlan";

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
  const [showPathway, setShowPathway] = useState(true); // Default to Pathway view
  const [panelWidth, setPanelWidth] = useState(384); // Default 96 * 4 = 384px (w-96)
  const [isResizing, setIsResizing] = useState(false);

  // Create stable references for comparison
  const socCodesKey = socCodes.sort().join(",");
  const messagesCount = messages?.length || 0;

  console.log(
    `[DataPanel] 🎯 Received ${socCodes.length} SOC codes:`,
    socCodes
  );
  console.log(`[DataPanel] 🎯 SOC codes key:`, socCodesKey);
  console.log(`[DataPanel] 🎯 Messages count:`, messagesCount);
  console.log(`[DataPanel] 🎯 Active tab:`, activeDataTab);
  console.log(`[DataPanel] 🎯 Show details:`, showDetails);
  console.log(`[DataPanel] 🎯 Show pathway:`, showPathway);

  // 🎯 Only trigger tab validation if socCodes actually change
  const prevSocCodesRef = React.useRef<string[]>([]);

  React.useEffect(() => {
    const codesChanged =
      socCodes.length !== prevSocCodesRef.current.length ||
      socCodes.some((code, idx) => code !== prevSocCodesRef.current[idx]);
    if (socCodes.length > 0 && codesChanged) {
      console.log("[DataPanel] 🔄 SOC codes changed - validating active tab");
      const validTabs = ["companies", "skills", "company-skills"]; // Removed "pathway" - it's now top-level
      if (!validTabs.includes(activeDataTab)) {
        console.log("[DataPanel] ⚠️  Invalid tab - resetting to companies");
        setActiveDataTab("companies"); // Default to companies tab
      }
      prevSocCodesRef.current = socCodes;
    }
  }, [socCodes, activeDataTab, setActiveDataTab]);

  // Handle mouse resize
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const newWidth = window.innerWidth - e.clientX;
      // Min width: 384px (w-96), Max width: 80% of screen
      const minWidth = 484;
      const maxWidth = window.innerWidth * 0.8;
      
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Don't render if panel is closed or no SOC codes
  if (!dataPanelOpen || socCodes.length === 0) return null;

  // Tabs for detailed data view (3 tabs - Pathway is now top-level)
  const detailedDataTabs: Tab[] = [
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
    <div 
      className="fixed top-0 right-0 bottom-0 bg-white border-l border-slate-200 z-40"
      style={{ width: `${panelWidth}px` }}
    >
      {/* Resize Handle */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize"
        onMouseDown={handleMouseDown}
      >
        {/* Visible Drag Button */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2">
          <div className="bg-white border-2 border-slate-300 rounded-lg px-1.5 py-3 shadow-md hover:border-blue-500 hover:shadow-lg transition-all cursor-col-resize">
            <div className="flex flex-col gap-1 items-center">
              <div className="w-0.5 h-4 bg-slate-400"></div>
              <div className="w-0.5 h-4 bg-slate-400"></div>
              <div className="w-0.5 h-4 bg-slate-400"></div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="h-full flex flex-col">
        {/* Toggleable Header */}
        <div className="px-4 py-3 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between gap-3">
            {/* 3-Way Navigation Toggle */}
            <div className="flex-1 flex gap-6">
              <button
                onClick={() => {
                  setShowDetails(false);
                  setShowPathway(true);
                }}
                className={`px-1 py-2 text-sm font-medium transition-colors border-b-2 ${
                  showPathway
                    ? "text-black border-black"
                    : "text-gray-400 border-transparent hover:text-gray-600"
                }`}
              >
                Pathway
              </button>
              <button
                onClick={() => {
                  setShowDetails(false);
                  setShowPathway(false);
                }}
                className={`px-1 py-2 text-sm font-medium transition-colors border-b-2 ${
                  !showDetails && !showPathway
                    ? "text-black border-black"
                    : "text-gray-400 border-transparent hover:text-gray-600"
                }`}
              >
                Summary
              </button>
              <button
                onClick={() => {
                  setShowDetails(true);
                  setShowPathway(false);
                }}
                className={`px-1 py-2 text-sm font-medium transition-colors border-b-2 ${
                  showDetails && !showPathway
                    ? "text-black border-black"
                    : "text-gray-400 border-transparent hover:text-gray-600"
                }`}
              >
                Careers
              </button>
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
          {/* ✅ Summary View - Market Intelligence Report */}
          <div style={{ display: !showDetails && !showPathway ? "block" : "none" }}>
            <MarketIntelligenceReport
              socCodes={socCodes}
              messages={messages}
              userProfile={userProfile}
              key={socCodesKey}
            />
          </div>

          {/* ✅ Detailed Data View - Visualizers with tabs */}
          <div style={{ display: showDetails && !showPathway ? "block" : "none" }}>
            {/* Tabs */}
            <div className="flex gap-6 mb-4">
              {detailedDataTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveDataTab(tab.id)}
                  className={`px-1 py-2 text-sm font-medium transition-colors border-b-2 ${
                    activeDataTab === tab.id
                      ? "text-black border-black"
                      : "text-gray-400 border-transparent hover:text-gray-600"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ✅ All Visualizers ALWAYS mounted - just hide with CSS */}
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
          </div>

          {/* ✅ Pathway View - Personalized pathway planning */}
          <div style={{ display: showPathway ? "block" : "none" }}>
            <PathwayPlan 
              userProfile={userProfile} 
              messages={messages} 
              programsData={{ socCodes }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
