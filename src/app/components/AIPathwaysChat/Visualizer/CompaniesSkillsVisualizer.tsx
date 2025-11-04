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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
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

  // Filter companies based on search term
  const filteredCompanies = searchTerm
    ? companies.filter((company: any) =>
        company.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : companies;

  return (
    <div className="space-y-4">

      {/* Search Bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search companies..."
            className="w-full pl-10 pr-3 py-2 text-sm bg-gray-50 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
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
        <h4 className="text-xs font-bold text-black uppercase tracking-wide">
          Companies ({filteredCompanies.length})
        </h4>

        {filteredCompanies.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-6 text-center border border-gray-200">
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
                className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:border-black hover:shadow-sm transition-all"
              >
                {/* Company Header */}
                <div
                  className="p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleCompanyExpansion(company.name)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h5 className="font-semibold text-sm text-black">
                        {company.name}
                      </h5>
                      <p className="text-xs text-gray-600 mt-1">
                        {company.unique_postings.toLocaleString()} postings • {company.ranking.buckets.length} skills • {formatSalary(company.median_salary)}
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
                </div>

                {/* Skills Section (Expandable) */}
                {isExpanded && (
                  <div className="border-t border-gray-200 bg-gray-50 p-3">
                    <h6 className="text-xs font-bold text-black mb-2 uppercase tracking-wide">
                      Required Skills
                    </h6>

                    <div className="space-y-2">
                      {topSkills.map((skill: any, skillIdx: number) => (
                        <div
                          key={`${skill.name}-${skillIdx}`}
                          className="bg-white rounded-lg p-2.5 border border-gray-200 hover:border-black transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                {skillIdx < 3 && (
                                  <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-black text-white">
                                    #{skillIdx + 1}
                                  </span>
                                )}
                                <p className="text-xs font-semibold text-black">
                                  {skill.name}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-600">
                                <span>{skill.unique_postings} {skill.unique_postings === 1 ? "posting" : "postings"}</span>
                                {skill.median_salary && (
                                  <>
                                    <span>•</span>
                                    <span className="font-medium text-black">
                                      {formatSalary(skill.median_salary)}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
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
    </div>
  );
};

export default CompaniesSkillsVisualizer;
