/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
// src/app/components/AIPathwaysChat/MarketIntelligenceReport.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { TrendingUp, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { mdxComponents, StatCard, SkillBar, CompanyCard, InsightBox, ProgressIndicator, PathwayStep } from './MDXComponents';

interface MarketIntelligenceReportProps {
  socCodes: string[];
  messages?: any[];
  userProfile?: any;
}

export default function MarketIntelligenceReport({ socCodes, messages, userProfile }: MarketIntelligenceReportProps) {
  const [report, setReport] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastGeneratedKey, setLastGeneratedKey] = useState<string>('');
  
  // Create stable string representation for comparison
  const socCodesKey = socCodes.sort().join(',');
  // ✅ DON'T use messages.length - it changes on every message!
  // Market intelligence should ONLY regenerate when SOC codes change, not on every chat message
  
  // Create stable key for userProfile (avoid object reference changes triggering re-renders)
  const userProfileKey = userProfile ? JSON.stringify({
    interests: userProfile.extracted?.interests?.length || 0,
    careerGoals: userProfile.extracted?.careerGoals?.length || 0,
    educationLevel: userProfile.extracted?.educationLevel,
  }) : '';
  const currentKey = `${socCodesKey}-${userProfileKey}`; // ✅ Removed messagesKey!

  useEffect(() => {
    if (socCodes.length === 0) {
      setLoading(false);
      setReport('');
      setLastGeneratedKey('');
      return;
    }
    
    // Skip if we already generated for this exact combination
    if (currentKey === lastGeneratedKey) {
      console.log('[MarketReport] ⏭️  Skipping - already generated for this key');
      return;
    }
    
    console.log('[MarketReport] 🔄 Regenerating report due to dependency change');
    console.log('[MarketReport] 📊 SOC codes:', socCodes);
    console.log('[MarketReport] 👤 Profile key:', userProfileKey);

    async function generateReport() {
      // ✅ CRITICAL: Clear old report IMMEDIATELY when SOC codes change
      setReport('');
      setLoading(true);
      setError(null);

      try {
        console.log('[MarketReport] 📊 Requesting report for SOC codes:', socCodes);
        console.log('[MarketReport] 💬 Conversation context:', messages?.length || 0, 'messages');
        console.log('[MarketReport] 👤 User profile:', userProfile);
        
        // Call server-side API route
        const response = await fetch('/api/market-intelligence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            socCodes, 
            conversationContext: messages,
            userProfile 
          }),
        });

        const data = await response.json();
        
        if (!response.ok) {
          console.error('[MarketReport] ❌ API error:', data);
          throw new Error(data.error || data.details || 'Failed to generate report');
        }
        
        if (!data.success) {
          console.error('[MarketReport] ❌ Response not successful:', data);
          throw new Error(data.error || data.details || 'Failed to generate report');
        }

        setReport(data.markdown);
        setLastGeneratedKey(currentKey); // Mark this combination as generated
        console.log('[MarketReport] ✅ Report received successfully');
      } catch (err: any) {
        console.error('[MarketReport] ❌ Error:', err);
        console.error('[MarketReport] ❌ Error details:', err.message);
        setError(err.message || 'Failed to generate market intelligence report. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    generateReport();
  }, [socCodesKey, userProfileKey, currentKey, lastGeneratedKey]); // ✅ Only SOC codes and profile - NOT messages!

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
        <p className="text-sm text-gray-600">Analyzing market data...</p>
        <p className="text-xs text-gray-400 mt-2">Generating interactive insights for your interests</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12">
        <div className="text-red-500 text-sm mb-2">⚠️ {error}</div>
        <button
          onClick={() => window.location.reload()}
          className="text-xs text-blue-600 hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (socCodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 text-gray-500">
        <TrendingUp className="w-12 h-12 mb-4 text-gray-300" />
        <p className="text-sm">No market data available</p>
        <p className="text-xs text-gray-400 mt-2">Search for programs to see market intelligence</p>
      </div>
    );
  }

  // Custom component renderer that handles our interactive components
  // We'll use data-attributes in HTML to identify which component to render
  const components = {
    ...mdxComponents,
    // Transform divs with data-component attributes into our custom components
    div: ({ node, ...props }: any) => {
      const dataComponent = props['data-component'];
      
      if (dataComponent === 'stat-card') {
        return <StatCard title={props['data-title']} value={props['data-value']} subtitle={props['data-subtitle']} />;
      }
      if (dataComponent === 'skill-bar') {
        return <SkillBar skill={props['data-skill']} percentage={Number(props['data-percentage'])} level={props['data-level']} />;
      }
      if (dataComponent === 'company-card') {
        return <CompanyCard company={props['data-company']} jobs={Number(props['data-jobs'])} badge={props['data-badge']} />;
      }
      if (dataComponent === 'insight-box') {
        return <InsightBox type={props['data-type'] as any} title={props['data-title']}>{props.children}</InsightBox>;
      }
      if (dataComponent === 'progress-indicator') {
        return <ProgressIndicator label={props['data-label']} value={Number(props['data-value'])} max={Number(props['data-max']) || 100} />;
      }
      if (dataComponent === 'pathway-step') {
        return <PathwayStep icon={props['data-icon']} title={props['data-title']} description={props['data-description']} color={props['data-color'] as any} />;
      }
      
      // Regular div
      const Component = mdxComponents.div;
      return <Component {...props} />;
    },
  };

  return (
    <div className="prose prose-sm max-w-none prose-headings:mt-0 prose-headings:mb-3">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={components as any}
      >
        {report}
      </ReactMarkdown>
    </div>
  );
}
