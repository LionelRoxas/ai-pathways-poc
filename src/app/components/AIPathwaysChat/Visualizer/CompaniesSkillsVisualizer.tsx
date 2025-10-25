/* eslint-disable @typescript-eslint/no-explicit-any */
// components/AIPathwaysChat/CompaniesSkillsVisualizer.tsx
// UPDATED: Uses Next.js API proxy instead of direct external API call
import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Search } from "lucide-react";

interface Skill {
  median_salary: number | null;
  name: string;
  significance: number;
  unique_postings: number;
}

interface Company {
  median_salary: number;
  name: string;
  ranking: {
    buckets: Skill[];
    facet: string;
    limit: number;
    rank_by: string;
  };
  unique_postings: number;
}

interface ApiResponse {
  data: {
    ranking: {
      buckets: Company[];
      facet: string;
      limit: number;
      rank_by: string;
    };
    totals: {
      median_salary: number;
      unique_postings: number;
    };
  };
}

interface CompaniesSkillsVisualizerProps {
  socCodes: string[]; // e.g., ["11-3121", "13-1071"]
}

const CompaniesSkillsVisualizer: React.FC<CompaniesSkillsVisualizerProps> = ({
  socCodes,
}) => {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCompanies, setExpandedCompanies] = useState<
    Record<string, boolean>
  >({});
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      if (!socCodes || socCodes.length === 0) {
        setError("No SOC codes provided");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const socCodesParam = socCodes.join(",");
        // ✅ CHANGED: Call Next.js API proxy instead of external API
        const response = await fetch(
          `/api/soc/companies-skills?soc5=${socCodesParam}`
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `API error: ${response.status}`);
        }

        const result = await response.json();
        setData(result);
      } catch (err: any) {
        setError(err?.message || "Failed to fetch data");
        console.error("Error fetching companies skills data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [socCodes]);

  const toggleCompanyExpansion = (companyName: string) => {
    setExpandedCompanies(prev => ({
      ...prev,
      [companyName]: !prev[companyName],
    }));
  };

  const formatSalary = (salary: number | null) => {
    if (salary === null) return "N/A";
    return `$${salary.toLocaleString()}`;
  };

  const getSignificanceColor = (significance: number) => {
    if (significance >= 2000) return "text-purple-700 bg-purple-50";
    if (significance >= 1000) return "text-blue-700 bg-blue-50";
    if (significance >= 500) return "text-green-700 bg-green-50";
    if (significance >= 200) return "text-amber-700 bg-amber-50";
    return "text-gray-600 bg-gray-50";
  };

  const getTopSkillBadgeColor = (index: number) => {
    if (index === 0) return "bg-yellow-100 text-yellow-800 border-yellow-300";
    if (index === 1) return "bg-gray-100 text-gray-700 border-gray-300";
    if (index === 2) return "bg-orange-100 text-orange-700 border-orange-300";
    return "bg-blue-50 text-blue-700 border-blue-200";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-gray-600">Loading skills by company...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm text-red-800">
          <strong>Error:</strong> {error}
        </p>
      </div>
    );
  }

  if (!data || !data.data || !data.data.ranking || !data.data.ranking.buckets) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-600">
          No companies skills data available
        </p>
      </div>
    );
  }

  const companies = data.data.ranking.buckets;
  const totals = data.data.totals;

  // Filter companies based on search term
  const filteredCompanies = searchTerm
    ? companies.filter((company: any) =>
        company.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : companies;

  return (
    <div className="space-y-4">
      {/* Header with Totals */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          Skills in Demand by Company
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-lg p-3">
            <p className="text-xs text-gray-600 mb-1">Total Companies</p>
            <p className="text-xl font-bold text-purple-700">
              {companies.length}
            </p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <p className="text-xs text-gray-600 mb-1">Median Salary</p>
            <p className="text-xl font-bold text-green-700">
              {formatSalary(totals.median_salary)}
            </p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search companies..."
            className="w-full pl-10 pr-3 py-2 text-sm bg-gray-50 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
          />
        </div>
        {searchTerm && (
          <p className="text-xs text-gray-500 mt-2">
            Found {filteredCompanies.length} of {companies.length} companies
          </p>
        )}
      </div>

      {/* Companies List */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-gray-700 flex items-center gap-1">
          Companies & Their Skill Requirements ({filteredCompanies.length})
        </h4>

        {filteredCompanies.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-600">
              No companies found matching &quot;{searchTerm}&quot;
            </p>
          </div>
        ) : (
          filteredCompanies.map((company: any, idx: number) => {
            const isExpanded = expandedCompanies[company.name] || false;
            const topSkills = company.ranking.buckets.slice(0, 10);
            const remainingSkillsCount = company.ranking.buckets.length - 10;

            return (
              <div
                key={`${company.name}-${idx}`}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Company Header */}
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleCompanyExpansion(company.name)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h5 className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                        {company.name}
                      </h5>
                      <p className="text-xs text-gray-500 mt-1">
                        {company.unique_postings} job postings •{" "}
                        {company.ranking.buckets.length} skills requested
                      </p>
                    </div>
                    <button className="p-1 hover:bg-gray-200 rounded transition-colors">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-600" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-600" />
                      )}
                    </button>
                  </div>

                  {/* Salary Badge */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-green-50 px-2 py-1 rounded">
                      <span className="text-xs font-semibold text-green-700">
                        {formatSalary(company.median_salary)}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">median salary</span>
                  </div>
                </div>

                {/* Skills Section (Expandable) */}
                {isExpanded && (
                  <div className="border-t border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-center gap-2 mb-3">
\                      <h6 className="text-xs font-semibold text-gray-700">
                        Top Skills & Requirements
                      </h6>
                    </div>

                    <div className="space-y-2">
                      {topSkills.map((skill: any, skillIdx: number) => (
                        <div
                          key={`${skill.name}-${skillIdx}`}
                          className="bg-white rounded-lg p-3 hover:bg-gray-50 transition-colors border border-gray-100"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                {skillIdx < 3 && (
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-xs font-bold border ${getTopSkillBadgeColor(skillIdx)}`}
                                  >
                                    #{skillIdx + 1}
                                  </span>
                                )}
                                <p className="text-xs font-semibold text-gray-900">
                                  {skill.name}
                                </p>
                              </div>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium ${getSignificanceColor(skill.significance)}`}
                            >
                              {Math.round(skill.significance)}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs">
                            {skill.median_salary && (
                              <span className="flex items-center gap-1 text-green-700 bg-green-50 px-2 py-0.5 rounded">
                                {formatSalary(skill.median_salary)}
                              </span>
                            )}
                            <span className="text-gray-600">
                              {skill.unique_postings}{" "}
                              {skill.unique_postings === 1
                                ? "posting"
                                : "postings"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {remainingSkillsCount > 0 && (
                      <p className="text-xs text-gray-500 text-center mt-3">
                        +{remainingSkillsCount} more skills required
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Legend */}
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
        <p className="text-xs font-semibold text-gray-700 mb-2">
          Significance Score Legend
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-purple-100 border border-purple-300"></span>
            <span className="text-gray-600">2,000+ (Critical)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-blue-100 border border-blue-300"></span>
            <span className="text-gray-600">1,000-1,999 (High)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-green-100 border border-green-300"></span>
            <span className="text-gray-600">500-999 (Moderate)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-amber-100 border border-amber-300"></span>
            <span className="text-gray-600">200-499 (Desired)</span>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-gray-300">
          <p className="text-xs font-semibold text-gray-700 mb-1">
            Ranking Badges
          </p>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-1.5 py-0.5 rounded border bg-yellow-100 text-yellow-800 border-yellow-300 font-bold">
              #1
            </span>
            <span className="px-1.5 py-0.5 rounded border bg-gray-100 text-gray-700 border-gray-300 font-bold">
              #2
            </span>
            <span className="px-1.5 py-0.5 rounded border bg-orange-100 text-orange-700 border-orange-300 font-bold">
              #3
            </span>
            <span className="text-gray-600">
              = Top 3 most sought-after skills
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompaniesSkillsVisualizer;
