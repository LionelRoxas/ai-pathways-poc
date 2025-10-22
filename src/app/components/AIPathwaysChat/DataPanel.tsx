/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
// components/AIPathwaysChat/DataPanel.tsx
// CLEANED UP VERSION - Only 4 SOC Visualizers, SOC codes passed as prop
import React from "react";
import {
  Briefcase,
  PanelRight,
  Building2,
  Sparkles,
  Target,
} from "lucide-react";

// Import all 4 SOC Visualizers
import JobTitlesSkillsVisualizer from "./JobTitlesSkillsVisualizer";
import JobTitlesCompaniesVisualizer from "./JobTitlesCompaniesVisualizer";
import CompaniesSkillsVisualizer from "./CompaniesSkillsVisualizer";
import ActivePostsVisualizer from "./ActivePostsVisualizer";

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
  icon: any;
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

  // Don't render if panel is closed or no SOC codes
  if (!dataPanelOpen || socCodes.length === 0) return null;

  // Only 4 tabs - all SOC-based visualizers
  const tabs: Tab[] = [
    {
      id: "active-posts",
      label: "Jobs",
      icon: Briefcase,
    },
    {
      id: "companies",
      label: "Companies",
      icon: Building2,
    },
    {
      id: "skills",
      label: "Skills",
      icon: Sparkles,
    },
    {
      id: "company-skills",
      label: "Demand",
      icon: Target,
    },
  ];

  return (
    <div className="fixed top-0 right-0 bottom-0 w-96 bg-white border-l border-gray-200 z-40">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="p-3 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 text-sm tracking-tight">
                Career Market Data
              </h3>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                {socCodes.length} SOC {socCodes.length === 1 ? "code" : "codes"}
              </span>
            </div>
            <button
              onClick={() => setDataPanelOpen(false)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              aria-label="Close panel"
            >
              <PanelRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* Tabs - Only 4 visualizers */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveDataTab(tab.id)}
                className={`
                  px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5
                  ${
                    activeDataTab === tab.id
                      ? "bg-black text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }
                `}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content - Only visualizers */}
        <div className="flex-1 overflow-y-auto p-3">
          {/* Active Job Postings */}
          {activeDataTab === "active-posts" && (
            <div className="space-y-3">
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                <h4 className="text-sm font-semibold text-blue-900 mb-1">
                  Active Job Postings
                </h4>
                <p className="text-xs text-blue-700">
                  Real-time job market data for {socCodes.length} occupation
                  {socCodes.length > 1 ? "s" : ""}
                </p>
              </div>
              <ActivePostsVisualizer socCodes={socCodes} />
            </div>
          )}

          {/* Companies Hiring */}
          {activeDataTab === "companies" && (
            <div className="space-y-3">
              <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                <h4 className="text-sm font-semibold text-green-900 mb-1">
                  Top Hiring Companies
                </h4>
                <p className="text-xs text-green-700">
                  Companies actively hiring for these roles
                </p>
              </div>
              <JobTitlesCompaniesVisualizer socCodes={socCodes} />
            </div>
          )}

          {/* Skills Analysis */}
          {activeDataTab === "skills" && (
            <div className="space-y-3">
              <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                <h4 className="text-sm font-semibold text-purple-900 mb-1">
                  In-Demand Skills
                </h4>
                <p className="text-xs text-purple-700">
                  Most requested skills for these careers
                </p>
              </div>
              <JobTitlesSkillsVisualizer socCodes={socCodes} />
            </div>
          )}

          {/* Skills Demand by Company */}
          {activeDataTab === "company-skills" && (
            <div className="space-y-3">
              <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                <h4 className="text-sm font-semibold text-orange-900 mb-1">
                  Skill Demand Analysis
                </h4>
                <p className="text-xs text-orange-700">
                  Skills sought by top employers
                </p>
              </div>
              <CompaniesSkillsVisualizer socCodes={socCodes} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
