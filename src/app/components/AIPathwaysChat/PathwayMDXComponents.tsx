/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/components/AIPathwaysChat/PathwayMDXComponents.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle2, Lightbulb } from 'lucide-react';

/**
 * Clean text - remove any object references
 */
const cleanText = (content: React.ReactNode): React.ReactNode => {
  if (typeof content === 'string') {
    return content
      .replace(/\[object Object\]/gi, '')
      .replace(/\[program\s*name\]/gi, '')
      .replace(/\[school\s*name\]/gi, '')
      .trim();
  }
  return content;
};



/**
 * Collapsible H2 Component
 */
const CollapsibleH2: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(true); // Start collapsed
  const sectionId = `section-${String(children).toLowerCase().replace(/\s+/g, '-')}`;
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Small delay to ensure DOM is fully rendered
    const timer = setTimeout(() => {
      const element = document.getElementById(sectionId);
      if (!element) return;

      let nextElement = element.nextElementSibling;
      while (nextElement) {
        // Stop if we hit another section (div with section- id)
        if (nextElement.id?.startsWith('section-')) break;
        
        // Skip if this element contains an h2 (it's another collapsible section)
        if (nextElement.querySelector('h2')) {
          nextElement = nextElement.nextElementSibling;
          continue;
        }
        
        const htmlElement = nextElement as HTMLElement;
        if (isCollapsed) {
          htmlElement.style.height = '0';
          htmlElement.style.maxHeight = '0';
          htmlElement.style.opacity = '0';
          htmlElement.style.overflow = 'hidden';
          htmlElement.style.margin = '0';
          htmlElement.style.padding = '0';
          htmlElement.style.transition = isInitialized ? 'all 0.3s ease-in-out' : 'none';
          htmlElement.style.pointerEvents = 'none';
        } else {
          htmlElement.style.height = '';
          htmlElement.style.maxHeight = '';
          htmlElement.style.opacity = '';
          htmlElement.style.overflow = '';
          htmlElement.style.margin = '';
          htmlElement.style.padding = '';
          htmlElement.style.transition = 'all 0.3s ease-in-out';
          htmlElement.style.pointerEvents = '';
        }
        nextElement = nextElement.nextElementSibling;
      }
      
      if (!isInitialized) {
        setIsInitialized(true);
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [isCollapsed, sectionId, isInitialized]);

  return (
    <div className="flex flex-col items-center my-8" id={sectionId}>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
        {children}
      </h2>
      
      {/* Horizontal separator with centered collapsible arrow */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center justify-center w-full my-4 group cursor-pointer focus:outline-none"
        aria-label={isCollapsed ? "Expand section" : "Collapse section"}
        title={isCollapsed ? "Click to expand" : "Click to collapse"}
      >
        <div className="flex-grow h-px bg-gray-300 dark:bg-gray-600 transition-colors group-hover:bg-emerald-400"></div>
        <div className="mx-4 transition-transform duration-300" style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
          <svg 
            className="w-6 h-6 text-emerald-600 group-hover:text-emerald-700 transition-colors" 
            fill="currentColor" 
            viewBox="0 0 24 24"
          >
            <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
          </svg>
        </div>
        <div className="flex-grow h-px bg-gray-300 dark:bg-gray-600 transition-colors group-hover:bg-emerald-400"></div>
      </button>
    </div>
  );
};

/**
 * Collapsible H3 Component (for Phase sections)
 * Completely independent from H2 collapsible system
 */
const CollapsibleH3: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(true); // Start collapsed
  const phaseId = `phase-${String(children).toLowerCase().replace(/\s+/g, '-')}`;

  useEffect(() => {
    const timer = setTimeout(() => {
      const element = document.getElementById(phaseId);
      if (!element) return;

      // Find all sibling elements until we hit another H2, H3, or HR
      let nextElement = element.nextElementSibling;
      while (nextElement) {
        const htmlElement = nextElement as HTMLElement;
        
        // Stop if we hit another phase (H3) or main section (H2)
        if (htmlElement.id?.startsWith('phase-') || htmlElement.id?.startsWith('section-')) {
          break;
        }

        // Also stop at horizontal rules (section separators)
        if (htmlElement.tagName === 'HR' || htmlElement.querySelector('hr')) {
          break;
        }

        // Mark element and toggle visibility
        if (isCollapsed) {
          htmlElement.classList.add('phase-content-hidden');
          htmlElement.style.display = 'none';
        } else {
          htmlElement.classList.remove('phase-content-hidden');
          htmlElement.style.display = '';
        }

        nextElement = nextElement.nextElementSibling;
      }
    }, 150); // Slightly longer delay to run after H2 collapsing

    return () => clearTimeout(timer);
  }, [isCollapsed, phaseId]);

  return (
    <div className="mt-6 mb-3" id={phaseId}>
      {/* Arrow button - will be removed in PDF */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="collapsible-arrow-btn flex items-center gap-3 mb-2 w-full text-left group cursor-pointer focus:outline-none"
        aria-label={isCollapsed ? "Expand phase" : "Collapse phase"}
        title={isCollapsed ? "Click to expand" : "Click to collapse"}
      >
        <div 
          className="w-6 h-6 rounded bg-emerald-100 flex items-center justify-center transition-all duration-300 group-hover:bg-emerald-200"
          style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
        >
          <svg 
            className="w-4 h-4 text-emerald-600 group-hover:text-emerald-700" 
            fill="currentColor" 
            viewBox="0 0 24 24"
          >
            <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
          </svg>
        </div>
        <span className="text-lg font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
          {cleanText(children)}
        </span>
      </button>
      {/* Actual H3 for PDF - hidden from view but accessible for PDF export */}
      <h3 className="sr-only print-visible text-lg font-bold text-gray-900 mt-0 mb-2">
        {cleanText(children)}
      </h3>
    </div>
  );
};

/**
 * Simple, clean MDX components for pathway rendering
 */
export const pathwayMDXComponents = {
  // Headers
  h1: ({ children }: { children: React.ReactNode }) => (
    <h1 className="text-2xl font-bold text-gray-900 mt-0 mb-4">
      {cleanText(children)}
    </h1>
  ),

  h2: CollapsibleH2,

  h3: CollapsibleH3,

  h4: ({ children }: { children: React.ReactNode }) => (
    <h4 className="text-base font-semibold text-gray-900 mt-4 mb-2">
      {cleanText(children)}
    </h4>
  ),

  // Paragraph
  p: ({ children }: { children: React.ReactNode }) => {
    const text = String(cleanText(children));
    
    // Pro tip styling
    if (text.includes('💡')) {
      return (
        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 my-4 rounded-r">
          <div className="flex items-start gap-2">
            <Lightbulb className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-900">
              {text.replace('💡', '').replace('**Pro Tip:**', '').trim()}
            </p>
          </div>
        </div>
      );
    }

    return (
      <p className="text-sm text-gray-700 leading-relaxed mb-4">
        {cleanText(children)}
      </p>
    );
  },

  // Lists
  ul: ({ children }: { children: React.ReactNode }) => (
    <ul className="space-y-2 my-4">
      {children}
    </ul>
  ),

  ol: ({ children }: { children: React.ReactNode }) => (
    <ol className="space-y-2 my-4 list-decimal list-inside">
      {children}
    </ol>
  ),

  li: ({ children }: { children: React.ReactNode }) => {
    // Regular list item
    return (
      <li className="flex items-start gap-2 text-sm text-gray-700">
        <CheckCircle2 className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
        <span className="flex-1">{cleanText(children)}</span>
      </li>
    );
  },

  // Bold
  strong: ({ children }: { children: React.ReactNode }) => (
    <strong className="font-semibold text-gray-900">
      {cleanText(children)}
    </strong>
  ),

  // Italic
  em: ({ children }: { children: React.ReactNode }) => (
    <em className="italic text-gray-600">
      {cleanText(children)}
    </em>
  ),

  // Horizontal rule - simple separator line
  hr: () => (
    <div className="my-8">
      <div className="border-t-2 border-gray-300"></div>
    </div>
  ),

  // Blockquote
  blockquote: ({ children }: { children: React.ReactNode }) => (
    <blockquote className="border-l-4 border-emerald-400 bg-emerald-50 pl-4 py-3 my-4 italic text-sm text-emerald-900">
      {cleanText(children)}
    </blockquote>
  ),

  // Code
  code: ({ children }: { children: React.ReactNode }) => (
    <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-xs font-mono">
      {cleanText(children)}
    </code>
  ),

  // Table
  table: ({ children }: { children: React.ReactNode }) => (
    <div className="my-6 overflow-x-auto overflow-y-visible rounded-lg border border-gray-300 shadow-sm">
      <table className="min-w-full w-full">
        {children}
      </table>
    </div>
  ),

  thead: ({ children }: { children: React.ReactNode }) => (
    <thead className="bg-gray-900">
      {children}
    </thead>
  ),

  tbody: ({ children }: { children: React.ReactNode }) => (
    <tbody className="bg-white divide-y divide-gray-200">
      {children}
    </tbody>
  ),

  tr: ({ children }: { children: React.ReactNode }) => (
    <tr>
      {children}
    </tr>
  ),

  th: ({ children }: { children: React.ReactNode }) => (
    <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
      {cleanText(children)}
    </th>
  ),

  td: ({ children }: { children: React.ReactNode }) => (
    <td className="px-4 py-3 text-sm text-gray-700">
      {cleanText(children)}
    </td>
  ),
};

export default pathwayMDXComponents;
