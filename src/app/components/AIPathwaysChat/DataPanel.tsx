/* eslint-disable @typescript-eslint/no-explicit-any */
// components/DataPanel.tsx
import React, { useState } from "react";
import {
  X,
  Database,
  BarChart3,
  GraduationCap,
  School,
  MapPin,
  Clock,
  ChevronRight,
  Search,
  Loader2,
} from "lucide-react";
import {
  CurrentData,
  Tab,
  UHProgramData,
  DOEProgramData,
  PathwayData,
} from "./types";

interface DataPanelProps {
  dataPanelOpen: boolean;
  setDataPanelOpen: (open: boolean) => void;
  currentData: CurrentData | null;
  activeDataTab: string;
  setActiveDataTab: (tab: string) => void;
}

// Simplified helper functions
const getRelevanceColor = (score: number) => {
  if (score >= 80) return "text-green-700 bg-green-50";
  if (score >= 60) return "text-blue-700 bg-blue-50";
  if (score >= 40) return "text-amber-700 bg-amber-50";
  return "text-gray-600 bg-gray-50";
};

export default function DataPanel({
  dataPanelOpen,
  setDataPanelOpen,
  currentData,
  activeDataTab,
  setActiveDataTab,
}: DataPanelProps) {
  const [expandedGrades, setExpandedGrades] = React.useState<
    Record<string, boolean>
  >({});

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<{
    uhPrograms: UHProgramData[];
    doePrograms: DOEProgramData[];
  } | null>(null);

  const toggleGrade = (programId: string, grade: string) => {
    const key = `${programId}-${grade}`;
    setExpandedGrades(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Handle direct search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch("/api/direct-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery }),
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results);
      } else {
        console.error("Search failed");
        setSearchResults({ uhPrograms: [], doePrograms: [] });
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults({ uhPrograms: [], doePrograms: [] });
    } finally {
      setIsSearching(false);
    }
  };

  // Clear search when switching tabs
  React.useEffect(() => {
    if (activeDataTab !== "search") {
      setSearchResults(null);
      setSearchQuery("");
    }
  }, [activeDataTab]);

  if (!dataPanelOpen || !currentData) return null;

  // Determine available tabs based on data
  const tabs: Tab[] = [
    {
      id: "overview",
      label: "Overview",
      icon: BarChart3,
      show: !!currentData.stats,
    },
    {
      id: "doe",
      label: "HS",
      icon: School,
      show: (currentData.doePrograms?.length ?? 0) > 0,
    },
    {
      id: "uh",
      label: "UH",
      icon: GraduationCap,
      show: (currentData.uhPrograms?.length ?? 0) > 0,
    },
    {
      id: "pathways",
      label: "Paths",
      icon: ChevronRight,
      show: (currentData.pathways?.length ?? 0) > 0,
    },
    {
      id: "search",
      label: "Search",
      icon: Search,
      show: true,
    },
  ].filter(tab => tab.show);

  // Determine what search results to show
  const displaySearchResults = searchResults || currentData.searchResults;
  const hasSearchResults =
    displaySearchResults &&
    (displaySearchResults.uhPrograms?.length > 0 ||
      displaySearchResults.doePrograms?.length > 0);

  return (
    <div className="fixed top-0 right-0 bottom-0 w-96 bg-white border-l border-gray-200 z-40">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-black" />
              <h3 className="font-semibold text-black text-sm">Data Panel</h3>
            </div>
            <button
              onClick={() => setDataPanelOpen(false)}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveDataTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-all font-medium flex-1 justify-center ${
                  activeDataTab === tab.id
                    ? "bg-black text-white"
                    : "hover:bg-gray-100 text-gray-600"
                }`}
              >
                <tab.icon className="w-3 h-3" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-white p-4">
          {/* Overview Tab */}
          {activeDataTab === "overview" && currentData.stats && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <GraduationCap className="w-3 h-3 text-blue-600" />
                    <span className="text-xs text-gray-600">UH Programs</span>
                  </div>
                  <div className="text-2xl font-bold text-black">
                    {currentData.stats.totalUHPrograms}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <School className="w-3 h-3 text-purple-600" />
                    <span className="text-xs text-gray-600">HS Pathways</span>
                  </div>
                  <div className="text-2xl font-bold text-black">
                    {currentData.stats.totalDOEPrograms}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <ChevronRight className="w-3 h-3 text-green-600" />
                    <span className="text-xs text-gray-600">Connections</span>
                  </div>
                  <div className="text-2xl font-bold text-black">
                    {currentData.stats.totalPathways}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-3 h-3 text-orange-600" />
                    <span className="text-xs text-gray-600">Campuses</span>
                  </div>
                  <div className="text-2xl font-bold text-black">
                    {currentData.stats.availableCampuses.length}
                  </div>
                </div>
              </div>

              <div className="bg-black text-white rounded-lg p-4">
                <h4 className="font-semibold text-sm mb-3">
                  Available Options
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="opacity-80">Degree Types</span>
                    <span className="font-semibold">
                      {currentData.stats.availableDegrees.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-80">Career Clusters</span>
                    <span className="font-semibold">
                      {currentData.stats.careerClusters.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-80">Islands Covered</span>
                    <span className="font-semibold">4</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DOE Programs Tab */}
          {activeDataTab === "doe" && currentData.doePrograms && (
            <div className="space-y-3">
              {currentData.doePrograms.map((program: DOEProgramData) => (
                <div
                  key={program.id}
                  className="bg-white rounded-lg p-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h5 className="font-semibold text-black text-sm">
                      {program.programOfStudy}
                    </h5>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${getRelevanceColor(program.relevanceScore)}`}
                    >
                      {program.relevanceScore}
                    </span>
                  </div>

                  {program.careerCluster && (
                    <p className="text-xs text-gray-600 mb-2">
                      {program.careerCluster}
                    </p>
                  )}

                  <div className="space-y-1">
                    {["grade9", "grade10", "grade11", "grade12"].map(grade => {
                      const gradeNum = grade.replace("grade", "");
                      const courses =
                        program.courseSequence[
                          grade as keyof typeof program.courseSequence
                        ];
                      const key = `${program.id}-${grade}`;
                      const isExpanded = expandedGrades[key];

                      if (!courses || courses.length === 0) return null;

                      return (
                        <div key={grade} className="text-xs">
                          <button
                            onClick={() => toggleGrade(program.id, grade)}
                            className="w-full py-1 flex items-center justify-between hover:bg-gray-100 rounded transition-colors"
                          >
                            <span className="font-medium text-gray-700">
                              Grade {gradeNum}
                            </span>
                            <ChevronRight
                              className={`w-3 h-3 text-gray-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                            />
                          </button>
                          {isExpanded && (
                            <div className="pl-4 py-1 text-gray-600">
                              {courses.join(", ")}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {program.totalUHPathways > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <span className="text-xs text-gray-600">
                        {program.totalUHPathways} college pathway
                        {program.totalUHPathways > 1 ? "s" : ""}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* UH Programs Tab */}
          {activeDataTab === "uh" && currentData.uhPrograms && (
            <div className="space-y-3">
              {currentData.uhPrograms.map((program: UHProgramData) => (
                <div
                  key={program.id}
                  className="bg-white rounded-lg p-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h5 className="font-semibold text-black text-sm flex-1">
                      {program.programName}
                    </h5>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${getRelevanceColor(program.relevanceScore)}`}
                    >
                      {program.relevanceScore}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-2 text-xs">
                    <span className="font-medium text-gray-700">
                      {program.degree}
                    </span>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-600">{program.campus}</span>
                  </div>

                  {program.concentration && (
                    <p className="text-xs text-gray-600 mb-2">
                      {program.concentration}
                    </p>
                  )}

                  {program.estimatedDuration && (
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <Clock className="w-3 h-3" />
                      <span>{program.estimatedDuration}</span>
                    </div>
                  )}

                  {program.doePathways && program.doePathways.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-500 mb-1">HS Pathways:</p>
                      <div className="flex flex-wrap gap-1">
                        {program.doePathways.map((pathway, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded"
                          >
                            {pathway.programOfStudy}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pathways Tab */}
          {activeDataTab === "pathways" && currentData.pathways && (
            <div className="space-y-3">
              {currentData.pathways.map((pathway: PathwayData, idx: number) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-3">
                  <h5 className="font-semibold text-black text-sm mb-3">
                    {pathway.doeProgram.programOfStudy}
                  </h5>

                  <div className="mb-3">
                    <p className="text-xs text-gray-600 mb-1">High School:</p>
                    <p className="text-xs text-gray-700">
                      4-year specialized course sequence
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-600 mb-2">
                      College Options ({pathway.uhPrograms.length}):
                    </p>
                    <div className="space-y-1">
                      {pathway.uhPrograms.slice(0, 3).map(uhProgram => (
                        <div
                          key={uhProgram.id}
                          className="bg-white rounded p-2 text-xs"
                        >
                          <div className="font-medium text-black">
                            {uhProgram.programName}
                          </div>
                          <div className="text-gray-600">
                            {uhProgram.degree} • {uhProgram.campus}
                          </div>
                        </div>
                      ))}
                      {pathway.uhPrograms.length > 3 && (
                        <p className="text-xs text-gray-500 text-center pt-1">
                          +{pathway.uhPrograms.length - 3} more
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Search Tab */}
          {activeDataTab === "search" && (
            <div className="space-y-4">
              {/* Search Bar */}
              <div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSearch()}
                    placeholder="Search programs..."
                    className="flex-1 px-3 py-2 text-sm bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-colors"
                  />
                  <button
                    onClick={handleSearch}
                    disabled={isSearching || !searchQuery.trim()}
                    className="px-4 py-2 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800 disabled:bg-gray-300 transition-colors flex items-center gap-1"
                  >
                    {isSearching ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Search className="w-3 h-3" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Search all programs and pathways
                </p>
              </div>

              {/* Search Results */}
              {hasSearchResults ? (
                <div className="space-y-4">
                  {displaySearchResults.uhPrograms &&
                    displaySearchResults.uhPrograms.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-700 mb-2">
                          UH Programs ({displaySearchResults.uhPrograms.length})
                        </h4>
                        <div className="space-y-2">
                          {displaySearchResults.uhPrograms
                            .slice(0, 10)
                            .map((program: UHProgramData) => (
                              <div
                                key={program.id}
                                className="bg-gray-50 rounded-lg p-2 hover:bg-gray-100 transition-colors"
                              >
                                <p className="text-xs font-semibold text-black">
                                  {program.programName}
                                </p>
                                <p className="text-xs text-gray-600">
                                  {program.degree} • {program.campus}
                                </p>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                  {displaySearchResults.doePrograms &&
                    displaySearchResults.doePrograms.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-700 mb-2">
                          HS Pathways ({displaySearchResults.doePrograms.length}
                          )
                        </h4>
                        <div className="space-y-2">
                          {displaySearchResults.doePrograms
                            .slice(0, 10)
                            .map((program: DOEProgramData) => (
                              <div
                                key={program.id}
                                className="bg-gray-50 rounded-lg p-2 hover:bg-gray-100 transition-colors"
                              >
                                <p className="text-xs font-semibold text-black">
                                  {program.programOfStudy}
                                </p>
                                {program.careerCluster && (
                                  <p className="text-xs text-gray-600">
                                    {program.careerCluster}
                                  </p>
                                )}
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                </div>
              ) : searchResults !== null ? (
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    No results found
                  </p>
                  <p className="text-xs text-gray-500">
                    Try different keywords
                  </p>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-6 text-center">
                  <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-600">
                    Enter keywords to search
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
