/* eslint-disable @typescript-eslint/no-explicit-any */
// components/AIPathwaysChat/JobTitlesCompaniesVisualizer.tsx
// UPDATED: Uses Next.js API proxy instead of direct external API call
import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Briefcase, MapPin } from "lucide-react";

interface Company {
  median_salary: number | null;
  name: string;
  significance: number;
  unique_postings: number;
}

interface JobTitle {
  median_salary: number;
  name: string;
  ranking: {
    buckets: Company[];
    facet: string;
    limit: number;
    rank_by: string;
  };
  unique_postings: number;
}

interface ApiResponse {
  data: {
    ranking: {
      buckets: JobTitle[];
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

interface JobTitlesCompaniesVisualizerProps {
  socCodes: string[]; // e.g., ["11-3121", "13-1071"]
}

const JobTitlesCompaniesVisualizer: React.FC<
  JobTitlesCompaniesVisualizerProps
> = ({ socCodes }) => {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedJobs, setExpandedJobs] = useState<Record<string, boolean>>({});
  const [selectedJobFilter, setSelectedJobFilter] = useState<string>("all");

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
          `/api/soc/jobtitles-companies?soc5=${socCodesParam}`
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `API error: ${response.status}`);
        }

        const result = await response.json();
        setData(result);
      } catch (err: any) {
        setError(err?.message || "Failed to fetch data");
        console.error("Error fetching companies data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [socCodes]);

  const toggleJobExpansion = (jobName: string) => {
    setExpandedJobs(prev => ({
      ...prev,
      [jobName]: !prev[jobName],
    }));
  };

  const formatSalary = (salary: number | null) => {
    if (salary === null) return "N/A";
    return `$${salary.toLocaleString()}`;
  };

  const getSignificanceColor = (significance: number) => {
    if (significance >= 10000) return "text-purple-700 bg-purple-50";
    if (significance >= 5000) return "text-blue-700 bg-blue-50";
    if (significance >= 1000) return "text-green-700 bg-green-50";
    if (significance >= 500) return "text-amber-700 bg-amber-50";
    return "text-gray-600 bg-gray-50";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-gray-600">Loading hiring companies...</p>
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
        <p className="text-sm text-gray-600">No companies data available</p>
      </div>
    );
  }

  const jobTitles = data.data.ranking.buckets;
  const totals = data.data.totals;

  // Filter job titles if a filter is selected
  const filteredJobTitles =
    selectedJobFilter === "all"
      ? jobTitles
      : jobTitles.filter((job: any) => job.name === selectedJobFilter);

  return (
    <div className="space-y-4">
      {/* Header with Totals */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border border-green-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          Companies Hiring Analysis
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-lg p-3">
            <p className="text-xs text-gray-600 mb-1">Total Job Postings</p>
            <p className="text-xl font-bold text-blue-700">
              {totals.unique_postings.toLocaleString()}
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

      {/* Job Title Filter */}
      {jobTitles.length > 3 && (
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <label className="text-xs font-semibold text-gray-700 mb-2 block">
            Filter by Job Title
          </label>
          <select
            value={selectedJobFilter}
            onChange={e => setSelectedJobFilter(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-gray-50 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Job Titles ({jobTitles.length})</option>
            {jobTitles.map((job: any, idx: number) => (
              <option key={`filter-${idx}`} value={job.name}>
                {job.name} ({job.unique_postings})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Job Titles & Companies List */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-gray-700 flex items-center gap-1">
          {selectedJobFilter === "all"
            ? `All Job Titles (${filteredJobTitles.length})`
            : `Companies Hiring: ${selectedJobFilter}`}
        </h4>

        {filteredJobTitles.map((job: any, idx: number) => {
          const isExpanded = expandedJobs[job.name] || false;
          const topCompanies = job.ranking.buckets.slice(0, 8);
          const remainingCompaniesCount = job.ranking.buckets.length - 8;

          return (
            <div
              key={`${job.name}-${idx}`}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Job Title Header */}
              <div
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleJobExpansion(job.name)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h5 className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-gray-500" />
                      {job.name}
                    </h5>
                    <p className="text-xs text-gray-500 mt-1">
                      {job.unique_postings} openings •{" "}
                      {job.ranking.buckets.length} companies
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
                      {formatSalary(job.median_salary)}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">median salary</span>
                </div>
              </div>

              {/* Companies Section (Expandable) */}
              {isExpanded && (
                <div className="border-t border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <h6 className="text-xs font-semibold text-gray-700">
                      Top Hiring Companies
                    </h6>
                  </div>

                  <div className="space-y-2">
                    {topCompanies.map((company: any, companyIdx: number) => (
                      <div
                        key={`${company.name}-${companyIdx}`}
                        className="bg-white rounded-lg p-3 hover:bg-gray-50 transition-colors border border-gray-100"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3 h-3 text-gray-400" />
                              <p className="text-xs font-semibold text-gray-900">
                                {company.name}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${getSignificanceColor(company.significance)}`}
                          >
                            {Math.round(company.significance)}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs">
                          {company.median_salary && (
                            <span className="flex items-center gap-1 text-green-700 bg-green-50 px-2 py-0.5 rounded">
                              {formatSalary(company.median_salary)}
                            </span>
                          )}
                          <span className="text-gray-600">
                            {company.unique_postings}{" "}
                            {company.unique_postings === 1
                              ? "opening"
                              : "openings"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {remainingCompaniesCount > 0 && (
                    <p className="text-xs text-gray-500 text-center mt-3">
                      +{remainingCompaniesCount} more companies hiring
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
        <p className="text-xs font-semibold text-gray-700 mb-2">
          Significance Score Legend
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-purple-100 border border-purple-300"></span>
            <span className="text-gray-600">10,000+ (Very High)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-blue-100 border border-blue-300"></span>
            <span className="text-gray-600">5,000-9,999 (High)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-green-100 border border-green-300"></span>
            <span className="text-gray-600">1,000-4,999 (Medium)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-amber-100 border border-amber-300"></span>
            <span className="text-gray-600">500-999 (Moderate)</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2 italic">
          Higher significance indicates more relevant or specialized hiring
          activity
        </p>
      </div>
    </div>
  );
};

export default JobTitlesCompaniesVisualizer;
