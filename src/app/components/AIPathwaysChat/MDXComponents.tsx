/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
// src/app/components/AIPathwaysChat/MDXComponents.tsx
'use client';

import React from 'react';
import { TrendingUp, Building2, CheckCircle, AlertCircle, Info, Sparkles, ArrowRight, Target, Briefcase, GraduationCap } from 'lucide-react';

/**
 * PathwayStep - Flow chart step component
 */
export const PathwayStep = ({ 
  icon, 
  title, 
  description,
  color = 'blue'
}: { 
  icon: string; 
  title: string; 
  description: string;
  color?: 'blue' | 'green' | 'purple' | 'amber';
}) => {
  const colorStyles = {
    blue: 'from-blue-500 to-blue-600 border-blue-300',
    green: 'from-emerald-500 to-emerald-600 border-emerald-300',
    purple: 'from-purple-500 to-purple-600 border-purple-300',
    amber: 'from-amber-500 to-amber-600 border-amber-300',
  };

  const IconComponent = icon === 'target' ? Target : 
                        icon === 'briefcase' ? Briefcase :
                        icon === 'graduation' ? GraduationCap :
                        TrendingUp;

  return (
    <div className="relative">
      <div className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-all">
        <div className={`w-10 h-10 bg-gradient-to-br ${colorStyles[color]} rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm`}>
          <IconComponent className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-gray-900 mb-1">
            {title}
          </div>
          <div className="text-xs text-gray-600 leading-relaxed">
            {description}
          </div>
        </div>
      </div>
      <div className="flex justify-center my-2">
        <ArrowRight className="w-4 h-4 text-gray-400 rotate-90" />
      </div>
    </div>
  );
};

/**
 * StatCard - Display key metrics (simplified for sidebar)
 */
export const StatCard = ({ 
  title, 
  value, 
  subtitle 
}: { 
  title: string; 
  value: string | number; 
  subtitle?: string;
}) => (
  <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg p-3 text-white shadow-sm">
    <div className="text-xs opacity-90 mb-0.5">
      {title}
    </div>
    <div className="text-xl font-bold">
      {value}
    </div>
    {subtitle && (
      <div className="text-xs opacity-75 mt-0.5">
        {subtitle}
      </div>
    )}
  </div>
);

/**
 * SkillBar - Simple skill list (no percentages or bars)
 */
export const SkillBar = ({ 
  skill, 
  percentage, 
  level 
}: { 
  skill: string; 
  percentage: number; 
  level: string;
}) => {
  return (
    <div className="group bg-white border border-gray-200 rounded-lg p-3 hover:border-black hover:shadow-sm transition-all">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 bg-black rounded-full flex-shrink-0"></div>
        <span className="text-sm font-semibold text-black">{skill}</span>
      </div>
    </div>
  );
};

/**
 * CompanyCard - Display hiring company info (enterprise minimal)
 */
export const CompanyCard = ({ 
  company, 
  jobs, 
  badge 
}: { 
  company: string; 
  jobs: number; 
  badge?: string;
}) => (
  <div className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-black hover:shadow-sm transition-all">
    <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
      <Building2 className="w-5 h-5 text-white" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-sm font-semibold text-black truncate">
        {company}
      </div>
      {badge && (
        <div className="flex items-center gap-1 mt-0.5">
          <div className="w-1.5 h-1.5 bg-black rounded-full"></div>
          <span className="text-xs text-gray-700 font-medium">
            {badge}
          </span>
        </div>
      )}
    </div>
  </div>
);

/**
 * InsightBox - Highlight key insights and recommendations (enterprise)
 */
export const InsightBox = ({ 
  type = 'info', 
  title, 
  children 
}: { 
  type?: 'success' | 'warning' | 'info';
  title: string;
  children: React.ReactNode;
}) => {
  const getStyles = () => {
    switch (type) {
      case 'success':
        return {
          container: 'bg-gray-50 border-gray-300',
          icon: <CheckCircle className="w-4 h-4 text-black" />,
          title: 'text-black',
          text: 'text-gray-800',
          accent: 'bg-black',
        };
      case 'warning':
        return {
          container: 'bg-gray-50 border-gray-300',
          icon: <AlertCircle className="w-4 h-4 text-gray-700" />,
          title: 'text-black',
          text: 'text-gray-700',
          accent: 'bg-gray-700',
        };
      default:
        return {
          container: 'bg-gray-50 border-gray-200',
          icon: <Info className="w-4 h-4 text-gray-600" />,
          title: 'text-black',
          text: 'text-gray-700',
          accent: 'bg-gray-600',
        };
    }
  };

  const styles = getStyles();

  return (
    <div className={`relative border rounded-lg p-3 pl-4 ${styles.container} hover:shadow-sm transition-shadow`}>
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${styles.accent}`}></div>
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0 mt-0.5">
          {styles.icon}
        </div>
        <div className="flex-1">
          <div className={`text-xs font-bold uppercase tracking-wide mb-1.5 ${styles.title}`}>
            {title}
          </div>
          <div className={`text-sm ${styles.text} leading-relaxed`}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * ProgressIndicator - Show market health/activity level
 */
export const ProgressIndicator = ({ 
  label, 
  value, 
  max = 100 
}: { 
  label: string; 
  value: number; 
  max?: number;
}) => {
  const percentage = (value / max) * 100;
  
  const getStatus = () => {
    if (percentage >= 70) return { color: 'text-green-600', bg: 'bg-green-500', label: 'Strong' };
    if (percentage >= 40) return { color: 'text-blue-600', bg: 'bg-blue-500', label: 'Moderate' };
    return { color: 'text-gray-600', bg: 'bg-gray-400', label: 'Growing' };
  };

  const status = getStatus();

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-900">{label}</span>
        </div>
        <span className={`text-xs font-semibold ${status.color}`}>
          {status.label}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div 
          className={`h-full ${status.bg} transition-all duration-500 ease-out rounded-full`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

/**
 * Highlight - Styled highlight for important text
 */
export const Highlight = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-900 rounded font-medium">
    <Sparkles className="w-3 h-3" />
    {children}
  </span>
);

/**
 * MDX Components mapping
 */
export const mdxComponents = {
  StatCard,
  SkillBar,
  CompanyCard,
  InsightBox,
  ProgressIndicator,
  Highlight,
  PathwayStep,
  // Standard HTML elements with custom styling
  h2: ({ children }: { children: React.ReactNode }) => (
    <h2 className="text-base font-bold text-black mt-0 mb-4 pb-2 border-b-2 border-black uppercase tracking-wide">
      {children}
    </h2>
  ),
  h3: ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-sm font-bold text-black mt-4 mb-2 uppercase tracking-wide">
      {children}
    </h3>
  ),
  p: ({ children }: { children: React.ReactNode }) => (
    <p className="text-sm text-gray-700 leading-relaxed my-2">
      {children}
    </p>
  ),
  ul: ({ children }: { children: React.ReactNode }) => (
    <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 my-2">
      {children}
    </ul>
  ),
  ol: ({ children }: { children: React.ReactNode }) => (
    <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700 my-2">
      {children}
    </ol>
  ),
  li: ({ children }: { children: React.ReactNode }) => (
    <li className="text-sm text-gray-700">
      {children}
    </li>
  ),
  strong: ({ children }: { children: React.ReactNode }) => (
    <strong className="font-bold text-black">
      {children}
    </strong>
  ),
  div: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>
      {children}
    </div>
  ),
};
