/* eslint-disable @typescript-eslint/no-explicit-any */
// components/AIPathwaysChat/ActivePostsVisualizer.tsx
// UPDATED: Uses Next.js API proxy instead of direct external API call
import React, { useState, useEffect } from "react";
import {
  Briefcase,
  Loader2,
  TrendingUp,
  Building2,
  DollarSign,
  MapPin,
} from "lucide-react";

interface ActivePostsVisualizerProps {
  socCodes: string[];
}

interface ActivePost {
  job_title: string;
  company_name: string;
  median_salary?: number;
  total_postings: number;
  location?: string;
}

interface ApiResponse {
  data: {
    ranking: {
      buckets: ActivePost[];
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

export default function ActivePostsVisualizer({
  socCodes,
}: ActivePostsVisualizerProps) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🔥 UPDATED: Now calls your Next.js API proxy (no CORS issues!)
  useEffect(() => {
    const fetchData = async () => {
      if (!socCodes || socCodes.length === 0) {
        setIsLoading(false);
        setError("No SOC codes provided");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Join SOC codes with commas
        const socCodesParam = socCodes.join(",");

        // ✅ CHANGED: Call your Next.js API proxy instead of external API
        const url = `/api/soc/active-posts?soc5=${socCodesParam}`;

        console.log("[ActivePostsVisualizer] 📡 Fetching:", url);

        const response = await fetch(url);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `API returned ${response.status}`);
        }

        const result = await response.json();
        console.log("[ActivePostsVisualizer] ✅ Data received:", result);

        setData(result);
      } catch (err) {
        console.error("[ActivePostsVisualizer] ❌ Error:", err);
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [socCodes]);

  const formatSalary = (salary: number | null | undefined) => {
    if (!salary) return "N/A";
    return `$${salary.toLocaleString()}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-sm text-gray-600">
            Loading active job postings...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm text-red-600">
          <strong>Error:</strong> {error}
        </p>
      </div>
    );
  }

  if (!data || !data.data || !data.data.ranking || !data.data.ranking.buckets) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <Briefcase className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-xs text-gray-600">No active job postings found</p>
      </div>
    );
  }

  const posts = data.data.ranking.buckets;
  const totals = data.data.totals;

  // Sort by total postings (descending)
  const sortedPosts = [...posts].sort(
    (a, b) => (b.total_postings || 0) - (a.total_postings || 0)
  );

  const topPosts = sortedPosts.slice(0, 15);

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Active Job Market
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-lg p-3">
            <p className="text-xs text-gray-600 mb-1">Total Postings</p>
            <p className="text-2xl font-bold text-blue-700">
              {totals.unique_postings.toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <p className="text-xs text-gray-600 mb-1">Median Salary</p>
            <p className="text-2xl font-bold text-green-700">
              {formatSalary(totals.median_salary)}
            </p>
          </div>
        </div>
      </div>

      {/* Job Postings List */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-gray-700 flex items-center gap-1">
          <Briefcase className="w-3 h-3" />
          Top Active Positions ({topPosts.length})
        </h4>

        {topPosts.map((post: any, idx: number) => (
          <div
            key={`${post.job_title}-${post.company_name}-${idx}`}
            className="bg-white rounded-lg p-3 border border-gray-200 hover:shadow-md transition-shadow"
          >
            {/* Job Title & Company */}
            <div className="mb-2">
              <h5 className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-600" />
                {post.job_title}
              </h5>
              <div className="flex items-center gap-2 mt-1">
                <Building2 className="w-3 h-3 text-gray-400" />
                <p className="text-xs text-gray-600">{post.company_name}</p>
              </div>
              {post.location && (
                <div className="flex items-center gap-2 mt-1">
                  <MapPin className="w-3 h-3 text-gray-400" />
                  <p className="text-xs text-gray-500">{post.location}</p>
                </div>
              )}
            </div>

            {/* Metrics */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded">
                <TrendingUp className="w-3 h-3 text-blue-700" />
                <span className="text-xs font-semibold text-blue-700">
                  {post.total_postings}{" "}
                  {post.total_postings === 1 ? "opening" : "openings"}
                </span>
              </div>
              {post.median_salary && (
                <div className="flex items-center gap-1 bg-green-50 px-2 py-1 rounded">
                  <DollarSign className="w-3 h-3 text-green-700" />
                  <span className="text-xs font-semibold text-green-700">
                    {formatSalary(post.median_salary)}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {sortedPosts.length > 15 && (
        <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
          <p className="text-xs text-gray-600">
            +{sortedPosts.length - 15} more job postings available
          </p>
        </div>
      )}
    </div>
  );
}
