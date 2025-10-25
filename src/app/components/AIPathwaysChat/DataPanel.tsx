/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
// components/AIPathwaysChat/DataPanel.tsx
// CLEANED UP VERSION - Only 4 SOC Visualizers, SOC codes passed as prop
import React from "react";
import {
  // Briefcase,
  X,
} from "lucide-react";

// Import all 4 SOC Visualizers
import JobTitlesSkillsVisualizer from "./Visualizer/JobTitlesSkillsVisualizer";
import JobTitlesCompaniesVisualizer from "./Visualizer/JobTitlesCompaniesVisualizer";
import CompaniesSkillsVisualizer from "./Visualizer/CompaniesSkillsVisualizer";
// import ActivePostsVisualizer from "./Visualizer/ActivePostsVisualizer";

interface DataPanelProps {
  dataPanelOpen: boolean;
  setDataPanelOpen: (open: boolean) => void;
  socCodes: string[]; // ✅ Now passed directly as prop
  activeDataTab: string;
  setActiveDataTab: (tab: string) => void;
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
}: DataPanelProps) {
  console.log(
    `[DataPanel] 🎯 Received ${socCodes.length} SOC codes:`,
    socCodes
  );
  console.log(`[DataPanel] 🎯 Active tab:`, activeDataTab);

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
    <div className="fixed top-0 right-0 bottom-0 w-96 bg-white border-l border-gray-200 z-40">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="p-3 border-b border-gray-200">
          <div className="flex items-center justify-between mb-0">
            {/* Tabs and X in same row */}
            <div className="flex items-center gap-2 flex-1">
              <div
                className="flex items-center gap-1.5 overflow-x-auto pb-1 bg-gray-50 border border-gray-200 rounded-xl p-1 shadow-sm"
                role="tablist"
                aria-label="Market data views"
              >
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    id={`tab-${tab.id}`}
                    onClick={() => setActiveDataTab(tab.id)}
                    role="tab"
                    aria-selected={activeDataTab === tab.id}
                    aria-controls={`panel-${tab.id}`}
                    tabIndex={activeDataTab === tab.id ? 0 : -1}
                    className={`
                      px-3.5 py-1.5 rounded-lg text-xs font-medium tracking-wide transition-all duration-200 relative whitespace-nowrap
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-white
                      ${
                        activeDataTab === tab.id
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-600 hover:text-gray-900 hover:bg-white"
                      }
                    `}
                  >
                    {tab.label}
                    {activeDataTab === tab.id && (
                      <span className="pointer-events-none absolute left-2 right-2 -bottom-2 h-0.5 rounded bg-black" />
                    )}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => setDataPanelOpen(false)}
              className="p-1 hover:bg-gray-100 rounded transition-colors ml-2"
              aria-label="Close panel"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Content - All visualizers always mounted, only visible if active tab */}
        <div className="flex-1 overflow-y-auto p-3">
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
      </div>
    </div>
  );
}
