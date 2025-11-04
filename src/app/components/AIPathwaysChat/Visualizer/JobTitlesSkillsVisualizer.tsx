/* eslint-disable @typescript-eslint/no-explicit-any */
// components/AIPathwaysChat/JobTitlesSkillsVisualizer.tsx
// UPDATED: Uses Next.js API proxy instead of direct external API call
import React, { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface Skill {
  median_salary: number | null;
  name: string;
  significance: number;
  unique_postings: number;
}

interface JobTitle {
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

interface JobTitlesSkillsVisualizerProps {
  socCodes: string[]; // e.g., ["11-3121", "13-1071"]
}

const JobTitlesSkillsVisualizer: React.FC<JobTitlesSkillsVisualizerProps> = ({
  socCodes,
}) => {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedJobs, setExpandedJobs] = useState<Record<string, boolean>>({});

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
          `/api/soc/jobtitles-skills?soc5=${socCodesParam}`
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `API error: ${response.status}`);
        }

        const result = await response.json();
        setData(result);
      } catch (err: any) {
        setError(err?.message || "Failed to fetch data");
        console.error("Error fetching job titles and skills:", err);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-gray-600">
            Loading job titles and skills...
          </p>
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
        <p className="text-sm text-gray-600">No job titles data available</p>
      </div>
    );
  }

  const jobTitles = data.data.ranking.buckets;
  
  return (
    <div className="space-y-4">

      {/* Job Titles List */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-black uppercase tracking-wide">
          Job Titles ({jobTitles.length})
        </h4>

        {jobTitles.map((job: any, idx: number) => {
          const isExpanded = expandedJobs[job.name] || false;
          const topSkills = job.ranking.buckets.slice(0, 8);
          const remainingSkillsCount = job.ranking.buckets.length - 8;

          return (
            <div
              key={`${job.name}-${idx}`}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:border-black hover:shadow-sm transition-all"
            >
              {/* Job Title Header */}
              <div
                className="p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleJobExpansion(job.name)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h5 className="font-semibold text-sm text-black">
                      {job.name}
                    </h5>
                    <p className="text-xs text-gray-600 mt-1">
                      {job.unique_postings.toLocaleString()} openings • {formatSalary(job.median_salary)}
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
                            <p className="text-xs font-semibold text-black mb-1">
                              {skill.name}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <span>{skill.unique_postings} postings</span>
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
                      +{remainingSkillsCount} more skills
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default JobTitlesSkillsVisualizer;
