/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
// components/AIPathwaysChat/DataPanel.tsx
// Market Intelligence Report with toggle to detailed visualizers
import React, { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";

// Import all 4 SOC Visualizers + PathwayPlan + Overlay
import JobTitlesSkillsVisualizer from "./Visualizer/JobTitlesSkillsVisualizer";
import JobTitlesCompaniesVisualizer from "./Visualizer/JobTitlesCompaniesVisualizer";
import CompaniesSkillsVisualizer from "./Visualizer/CompaniesSkillsVisualizer";
import MarketIntelligenceReport from "./MarketIntelligenceReport";
import PathwayPlan from "./PathwayPlan";
import PathwayOverlay from "./PathwayOverlay";

interface DataPanelProps {
  dataPanelOpen: boolean;
  setDataPanelOpen: (open: boolean) => void;
  socCodes: string[]; // ✅ Now passed directly as prop
  activeDataTab: string;
  setActiveDataTab: (tab: string) => void;
  messages?: any[]; // Conversation context for personalized insights
  userProfile?: any; // User profile for personalized insights
  webSearchResults?: any[]; // Web search results from Exa
  requestShowWebTab?: boolean; // External trigger to show web tab
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
  webSearchResults = [],
  requestShowWebTab = false,
}: DataPanelProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showPathway, setShowPathway] = useState(true); // Default to Pathway view
  const [showWebSearch, setShowWebSearch] = useState(false);
  const [panelWidth, setPanelWidth] = useState(384); // Default 96 * 4 = 384px (w-96)
  const [isResizing, setIsResizing] = useState(false);
  const [pathwayLoading, setPathwayLoading] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [hasShownOverlay, setHasShownOverlay] = useState(false);
  const prevRequestShowWebTabRef = useRef(requestShowWebTab);

  // React to external request to show web tab - only when the value changes
  useEffect(() => {
    const hasChanged = prevRequestShowWebTabRef.current !== requestShowWebTab;
    if (hasChanged) {
      console.log("[DataPanel] 📨 Received request to show Web tab");
      setShowWebSearch(true);
      setShowDetails(false);
      setShowPathway(false);
      prevRequestShowWebTabRef.current = requestShowWebTab;
    }
  }, [requestShowWebTab]);

  // Check if overlay has been shown this session
  useEffect(() => {
    const overlayShown = sessionStorage.getItem('pathwayOverlayShown');
    if (overlayShown === 'true') {
      setHasShownOverlay(true);
    }
  }, []);

  // Handle showing overlay - only show if not shown before in this session
  const handleShowOverlay = (show: boolean) => {
    if (show && !hasShownOverlay) {
      setShowOverlay(true);
    } else if (!show) {
      setShowOverlay(false);
    }
  };

  // Mark overlay as shown when user accepts
  const handleOverlayAccept = () => {
    sessionStorage.setItem('pathwayOverlayShown', 'true');
    setHasShownOverlay(true);
    setShowOverlay(false);
  };

  // Create stable references for comparison
  const socCodesKey = socCodes.sort().join(",");

  // 🎯 Only trigger tab validation if socCodes actually change
  const prevSocCodesRef = useRef<string[]>([]);

  useEffect(() => {
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
      const minWidth = 384;
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

  // Determine which tabs to show based on available data (before early return)
  const hasCareerData = socCodes.length > 0;
  const hasWebData = webSearchResults.length > 0;

  // Auto-show Web tab if only web data is available (no career data)
  // This must be called BEFORE any early returns to maintain hook order
  useEffect(() => {
    if (!hasCareerData && hasWebData && !showWebSearch) {
      setShowWebSearch(true);
      setShowDetails(false);
      setShowPathway(false);
    }
  }, [hasCareerData, hasWebData, showWebSearch]);

  // Don't render if panel is closed or no data available
  if (!dataPanelOpen || (socCodes.length === 0 && webSearchResults.length === 0)) return null;

  // Tabs for detailed data view (3 tabs under Careers - Pathway and Web are now top-level)
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
          <div className="bg-white border-2 border-slate-200 rounded-lg px-1.5 py-3 shadow-md hover:border-blue-500 hover:shadow-lg transition-all cursor-col-resize">
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
            {/* Navigation Toggle - Show only tabs with data */}
            <div className="flex-1 flex gap-6">
              {hasCareerData && (
                <button
                  onClick={() => {
                    setShowDetails(false);
                    setShowPathway(true);
                    setShowWebSearch(false);
                  }}
                  className={`px-1 py-2 text-sm font-medium transition-colors border-b-2 ${
                    showPathway
                      ? "text-black border-black"
                      : "text-gray-400 border-transparent hover:text-gray-600"
                  }`}
                >
                  Pathway
                </button>
              )}
              {hasCareerData && (
                <button
                  onClick={() => {
                    setShowDetails(false);
                    setShowPathway(false);
                    setShowWebSearch(false);
                  }}
                  className={`px-1 py-2 text-sm font-medium transition-colors border-b-2 ${
                    !showDetails && !showPathway && !showWebSearch
                      ? "text-black border-black"
                      : "text-gray-400 border-transparent hover:text-gray-600"
                  }`}
                >
                  Summary
                </button>
              )}
              {hasCareerData && (
                <button
                  onClick={() => {
                    setShowDetails(true);
                    setShowPathway(false);
                    setShowWebSearch(false);
                  }}
                  className={`px-1 py-2 text-sm font-medium transition-colors border-b-2 ${
                    showDetails && !showPathway && !showWebSearch
                      ? "text-black border-black"
                      : "text-gray-400 border-transparent hover:text-gray-600"
                  }`}
                >
                  Careers
                </button>
              )}
              {hasWebData && (
                <button
                  onClick={() => {
                    setShowDetails(false);
                    setShowPathway(false);
                    setShowWebSearch(true);
                  }}
                  className={`px-1 py-2 text-sm font-medium transition-colors border-b-2 ${
                    showWebSearch
                      ? "text-emerald-600 border-emerald-600"
                      : "text-gray-400 border-transparent hover:text-emerald-500"
                  }`}
                >
                  Web
                </button>
              )}
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
          {/* ✅ Summary View - Market Intelligence Report (only show if has career data) */}
          {hasCareerData && (
            <div style={{ display: !showDetails && !showPathway && !showWebSearch ? "block" : "none" }}>
              <MarketIntelligenceReport
                socCodes={socCodes}
                messages={messages}
                userProfile={userProfile}
                key={socCodesKey}
              />
            </div>
          )}

          {/* ✅ Web Search View - Top Level with emerald green theme */}
          <div style={{ display: showWebSearch ? "block" : "none" }}>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Search Results</h3>
              {webSearchResults.length === 0 ? (
                <p className="text-gray-500 text-sm">No web search results available.</p>
              ) : (
                <div className="space-y-4">
                  {webSearchResults.map((result, index) => (
                    <div key={index} className="border border-emerald-200 rounded-lg p-4 hover:shadow-md hover:border-emerald-400 transition-all bg-gradient-to-br from-white to-emerald-50/30">
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-600 hover:text-emerald-800 font-medium text-base mb-2 block"
                      >
                        {result.title}
                      </a>
                      <p className="text-gray-600 text-sm mb-2 line-clamp-3">
                        {result.snippet}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span className="truncate">{new URL(result.url).hostname}</span>
                        {result.publishedDate && (
                          <>
                            <span>•</span>
                            <span>{new Date(result.publishedDate).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ✅ Detailed Data View - Visualizers with tabs (only show if has career data) */}
          {hasCareerData && (
            <div style={{ display: showDetails && !showPathway && !showWebSearch ? "block" : "none" }}>
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
          )}

          {/* ✅ Pathway View - Personalized pathway planning (only show if has career data) */}
          {hasCareerData && (
            <div style={{ display: showPathway && !showWebSearch ? "block" : "none" }}>
              <PathwayPlan 
                userProfile={userProfile} 
                messages={messages} 
                programsData={{ socCodes }}
                onLoadingChange={setPathwayLoading}
                onShowOverlay={handleShowOverlay}
              />
            </div>
          )}
        </div>
      </div>

      {/* Pathway Overlay - Only shows once per session */}
      {showPathway && showOverlay && !hasShownOverlay && (
        <PathwayOverlay
          isLoading={pathwayLoading}
          onAccept={handleOverlayAccept}
        />
      )}
    </div>
  );
}
