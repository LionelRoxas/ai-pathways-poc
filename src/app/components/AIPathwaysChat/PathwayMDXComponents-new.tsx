/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/components/AIPathwaysChat/PathwayMDXComponents.tsx
'use client';

import React from 'react';
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
 * Simple, clean MDX components for pathway rendering
 */
export const pathwayMDXComponents = {
  // Headers
  h1: ({ children }: { children: React.ReactNode }) => (
    <h1 className="text-2xl font-bold text-gray-900 mt-0 mb-4">
      {cleanText(children)}
    </h1>
  ),

  h2: ({ children }: { children: React.ReactNode }) => (
    <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4 pb-2 border-b-2 border-gray-900 first:mt-0">
      {cleanText(children)}
    </h2>
  ),

  h3: ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-lg font-bold text-gray-900 mt-6 mb-3">
      {cleanText(children)}
    </h3>
  ),

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
    const text = String(cleanText(children));
    
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

  // Horizontal rule
  hr: () => (
    <hr className="my-8 border-t-2 border-gray-200" />
  ),

  // Blockquote
  blockquote: ({ children }: { children: React.ReactNode }) => (
    <blockquote className="border-l-4 border-blue-400 bg-blue-50 pl-4 py-3 my-4 italic text-sm text-blue-900">
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
