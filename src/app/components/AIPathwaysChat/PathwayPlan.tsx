/* eslint-disable @typescript-eslint/no-explicit-any */
// components/AIPathwaysChat/PathwayPlan.tsx
import React, { useEffect, useState } from "react";
import { Loader2, Map, Download } from "lucide-react";
import { pathwayMDXComponents } from "./PathwayMDXComponents";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

interface PathwayPlanProps {
  userProfile?: any;
  messages?: any[];
  programsData?: any;
  onLoadingChange?: (loading: boolean) => void;
  onShowOverlay?: (show: boolean) => void;
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
  onLoadingChange,
  onShowOverlay,
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

  // Ref to track if we're currently generating to prevent double calls
  const isGeneratingRef = React.useRef(false);

  const handleSaveAsPDF = () => {
    // Get the pathway content
    const pathwayContent = document.getElementById('pathway-content');
    if (!pathwayContent) return;

    // Clone the content so we don't affect the actual page
    const contentClone = pathwayContent.cloneNode(true) as HTMLElement;

    // Temporarily show all hidden content in the clone
    // Remove all inline styles that hide content (from both H2 and H3 collapsing)
    const hiddenElements = contentClone.querySelectorAll('[style*="display: none"], [style*="height: 0"]');
    hiddenElements.forEach(el => {
      (el as HTMLElement).style.cssText = '';
    });

    // Remove all phase-content-hidden classes
    const phaseHiddenElements = contentClone.querySelectorAll('.phase-content-hidden');
    phaseHiddenElements.forEach(el => {
      el.classList.remove('phase-content-hidden');
      (el as HTMLElement).style.cssText = '';
    });

    // Make sr-only H3 elements visible for PDF
    const srOnlyH3s = contentClone.querySelectorAll('h3.sr-only');
    srOnlyH3s.forEach(h3 => {
      (h3 as HTMLElement).classList.remove('sr-only');
      (h3 as HTMLElement).classList.add('print-visible');
    });

    // Remove all buttons (collapsible arrows)
    const buttons = contentClone.querySelectorAll('button');
    buttons.forEach(btn => btn.remove());

    // Remove all SVG icons
    const svgs = contentClone.querySelectorAll('svg');
    svgs.forEach(svg => svg.remove());

    // Remove separator divs (the horizontal lines with arrows)
    const separators = contentClone.querySelectorAll('.flex.items-center.justify-center');
    separators.forEach(sep => sep.remove());

    // Create a new window with the cleaned content
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Write the content with proper styling
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Pathway Plan</title>
          <style>
            /* Hide browser print headers/footers */
            @page {
              margin: 0.5in;
            }
            @media print {
              header, footer {
                display: none !important;
              }
            }
            
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              max-width: 800px;
              margin: 0 auto;
            }
            h1, h2, h3, h4 { 
              margin-top: 1.5em; 
              margin-bottom: 0.5em;
              color: #000;
              display: block !important;
            }
            h2 {
              border-bottom: 2px solid #000;
              padding-bottom: 0.5em;
            }
            h3 {
              font-size: 1.17em;
              font-weight: bold;
            }
            .print-visible {
              position: static !important;
              width: auto !important;
              height: auto !important;
              padding: 0 !important;
              margin: 1.5em 0 0.5em 0 !important;
              overflow: visible !important;
              clip: auto !important;
              white-space: normal !important;
            }
            p { 
              line-height: 1.6; 
              margin-bottom: 1em;
            }
            ul, ol { 
              margin-left: 1.5em; 
              margin-bottom: 1em;
              list-style-type: disc;
            }
            li { 
              margin-bottom: 0.5em;
              display: list-item;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 1em 0;
            }
            th, td { 
              border: 1px solid #ddd; 
              padding: 8px; 
              text-align: left; 
            }
            th { 
              background-color: #000; 
              color: white;
              font-weight: bold;
            }
            strong { 
              font-weight: 600; 
            }
            /* Clean up section IDs */
            [id^="section-"], [id^="phase-"] {
              margin-bottom: 0.5em !important;
            }
          </style>
        </head>
        <body>
          ${contentClone.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    
    // Wait for content to load, then print
    setTimeout(() => {
      printWindow.focus();
      
      printWindow.onbeforeprint = () => {
        printWindow.document.body.style.margin = '0';
      };
      
      printWindow.print();
      
      // Close after a delay to allow printing to complete
      setTimeout(() => {
        printWindow.close();
      }, 1000);
    }, 250);
  };

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

    // Skip if we're already generating (prevents double calls in StrictMode)
    if (isGeneratingRef.current) {
      console.log("[PathwayPlan] ⏭️  Skipping - generation already in progress");
      return;
    }

    console.log(
      "[PathwayPlan] 🔄 Regenerating pathway due to dependency change"
    );

    const generatePlan = async () => {
      isGeneratingRef.current = true;
      setPlan(null);
      setLoading(true);
      onLoadingChange?.(true);
      onShowOverlay?.(true);
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
        onLoadingChange?.(false);
      } catch (err) {
        console.error("[PathwayPlan] ❌ Error generating pathway plan:", err);
        setError(
          err instanceof Error ? err.message : "Failed to generate pathway plan"
        );
        onLoadingChange?.(false);
        onShowOverlay?.(false);
      } finally {
        setLoading(false);
        isGeneratingRef.current = false; // Reset the flag
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
    <div>
      {/* MDX Content */}
      <div className="bg-white p-4" id="pathway-content">
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

      {/* Save as PDF Button - Bottom Center */}
      <div className="flex justify-center">
        <button
          onClick={handleSaveAsPDF}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 shadow-sm hover:shadow-md transition-all"
          aria-label="Save pathway as PDF"
        >
          <Download className="w-4 h-4" />
          Save as PDF
        </button>
      </div>

      {/* Footer Note */}
      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 mt-6">
        <p className="text-xs text-slate-600 leading-relaxed">
          <strong className="text-slate-900">Note:</strong> This plan is
          personalized based on your profile and interests. Timelines and
          requirements may vary. Always verify program details with the
          institution directly.
        </p>
      </div>
    </div>
  );
}
