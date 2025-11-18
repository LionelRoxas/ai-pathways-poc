/* eslint-disable @typescript-eslint/no-explicit-any */
// components/AIPathwaysChat/PathwayPlan.tsx
import React, { useEffect, useState } from "react";
import { Loader2, Map } from "lucide-react";
import { pathwayMDXComponents } from "./PathwayMDXComponents-new";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

interface PathwayPlanProps {
  userProfile?: any;
  messages?: any[];
  programsData?: any;
}

interface PathwayPlanResult {
  markdown: string;
  summary: {
    currentStage: string;
    recommendedPath: string;
    timeframe: string;
    keyMilestones: number;
  };
}

export default function PathwayPlan({
  userProfile,
  messages,
  programsData,
}: PathwayPlanProps) {
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<PathwayPlanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastGeneratedKey, setLastGeneratedKey] = useState<string>("");

  // Create stable string representation for comparison (same as MarketIntelligenceReport)
  const socCodes = programsData?.socCodes || [];
  const socCodesKey = socCodes.sort().join(",");

  // Create stable key for userProfile
  const userProfileKey = userProfile
    ? JSON.stringify({
        interests: userProfile.extracted?.interests?.length || 0,
        careerGoals: userProfile.extracted?.careerGoals?.length || 0,
        educationLevel: userProfile.extracted?.educationLevel,
      })
    : "";

  const currentKey = `${socCodesKey}-${userProfileKey}`;

  useEffect(() => {
    if (socCodes.length === 0) {
      setLoading(false);
      setPlan(null);
      setLastGeneratedKey("");
      return;
    }

    // Skip if we already generated for this exact combination
    if (currentKey === lastGeneratedKey) {
      console.log(
        "[PathwayPlan] ⏭️  Skipping - already generated for this key"
      );
      return;
    }

    console.log(
      "[PathwayPlan] 🔄 Regenerating pathway due to dependency change"
    );

    const generatePlan = async () => {
      setPlan(null);
      setLoading(true);
      setError(null);

      try {
        // Extract programs from the last message with data (don't mutate messages array)
        const lastMessageWithData = messages
          ? [...messages].reverse().find(m => m.data)
          : null;
        const programsFound = lastMessageWithData?.data
          ? [
              ...(lastMessageWithData.data.highSchoolPrograms?.map(
                (p: any) => ({
                  ...p,
                  type: "high_school",
                })
              ) || []),
              ...(lastMessageWithData.data.collegePrograms?.map((p: any) => ({
                ...p,
                type: "college",
              })) || []),
            ]
          : [];

        console.log("[PathwayPlan] 🗺️  Generating pathway plan with:", {
          hasProfile: !!userProfile,
          messagesCount: messages?.length || 0,
          programsCount: programsFound.length,
          socCodesCount: socCodes.length,
        });

        // Send entire conversation context (like MarketIntelligenceReport does)
        const response = await fetch("/api/pathway-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userProfile,
            conversationContext: messages, // Send all messages, not just summary
            programsFound,
            socCodes,
          }),
        });

        if (!response.ok) {
          throw new Error(
            `Failed to generate pathway plan: ${response.statusText}`
          );
        }

        const result = await response.json();
        setPlan(result);
        setLastGeneratedKey(currentKey); // Mark this combination as generated
        console.log("[PathwayPlan] ✅ Pathway plan generated successfully");
      } catch (err) {
        console.error("[PathwayPlan] ❌ Error generating pathway plan:", err);
        setError(
          err instanceof Error ? err.message : "Failed to generate pathway plan"
        );
      } finally {
        setLoading(false);
      }
    };

    generatePlan();
  }, [socCodesKey, userProfileKey, currentKey, lastGeneratedKey]); // Only SOC codes and profile - NOT messages!

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-700">
          Mapping your personalized pathway...
        </p>
        <p className="text-xs text-slate-500 mt-2">
          Analyzing your profile and interests
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <span className="text-2xl">⚠️</span>
        </div>
        <p className="text-sm font-medium text-slate-700 mb-2">
          Unable to generate pathway plan
        </p>
        <p className="text-xs text-slate-500 text-center max-w-sm">{error}</p>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <Map className="w-10 h-10 text-slate-400 mb-4" />
        <p className="text-sm font-medium text-slate-700">
          No pathway plan available yet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* MDX Content */}
      <div className="bg-white p-4">
        <div className="prose prose-sm max-w-none prose-headings:mt-0 prose-headings:mb-3 prose-table:text-xs">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={pathwayMDXComponents as any}
          >
            {plan.markdown}
          </ReactMarkdown>
        </div>
      </div>

      {/* Footer Note */}
      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <p className="text-xs text-slate-600 leading-relaxed">
          <strong className="text-slate-900">Note:</strong> This pathway plan is
          personalized based on your profile and interests. Timelines and
          requirements may vary. Always verify program details with the
          institution directly.
        </p>
      </div>
    </div>
  );
}
