/* eslint-disable @typescript-eslint/no-explicit-any */
// components/AIPathwaysChat/PathwayOverlay.tsx
'use client';

import React, { useState, useEffect } from 'react';

interface PathwayOverlayProps {
  isLoading: boolean;
  onAccept: () => void;
}

export default function PathwayOverlay({ isLoading, onAccept }: PathwayOverlayProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // When loading completes, show the prompt
    if (!isLoading && !showPrompt && !isAnimating) {
      setTimeout(() => setShowPrompt(true), 300);
    }
  }, [isLoading, showPrompt, isAnimating]);

  const handleAccept = () => {
    setShowPrompt(false);
    setIsAnimating(true);
    
    // After animation, fade out
    setTimeout(() => {
      setIsAnimating(false);
      setIsFadingOut(true);
      
      // Complete fade out and notify parent
      setTimeout(() => {
        onAccept();
      }, 800);
    }, 1500);
  };

  if (isFadingOut) {
    return (
      <div className="absolute inset-0 bg-white z-50 flex items-center justify-center animate-fade-out">
        {/* Drag button on left border */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-[60]">
          <div className="bg-white border-2 border-slate-300 rounded-lg px-1.5 py-3">
            <div className="flex flex-col gap-1 items-center">
              <div className="w-0.5 h-4 bg-slate-400"></div>
              <div className="w-0.5 h-4 bg-slate-400"></div>
              <div className="w-0.5 h-4 bg-slate-400"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isAnimating) {
    return (
      <div className="absolute inset-0 bg-white z-50 flex items-center justify-center">
        {/* Drag button on left border */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-[60]">
          <div className="bg-white border-2 border-slate-200 rounded-lg px-1.5 py-3">
            <div className="flex flex-col gap-1 items-center">
              <div className="w-0.5 h-4 bg-slate-400"></div>
              <div className="w-0.5 h-4 bg-slate-400"></div>
              <div className="w-0.5 h-4 bg-slate-400"></div>
            </div>
          </div>
        </div>
        
        <div className="text-gray-900 text-center animate-scale-in">
          <div className="flex justify-center gap-2 mb-4">
            <div className="w-2 h-2 bg-gray-900 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-gray-900 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-gray-900 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
          <p className="text-sm text-gray-500">Loading pathway...</p>
        </div>
      </div>
    );
  }

  if (showPrompt) {
    return (
      <div className="absolute inset-0 bg-white z-50 flex items-center justify-center animate-fade-in">
        {/* Drag button on left border */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-[60]">
          <div className="bg-white border-2 border-slate-200 rounded-lg px-1.5 py-3">
            <div className="flex flex-col gap-1 items-center">
              <div className="w-0.5 h-4 bg-slate-400"></div>
              <div className="w-0.5 h-4 bg-slate-400"></div>
              <div className="w-0.5 h-4 bg-slate-400"></div>
            </div>
          </div>
        </div>
        
        <div className="text-center px-8 animate-slide-up max-w-md">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">
            Your Pathway Is Ready
          </h2>
          <p className="text-gray-600 mb-8 leading-relaxed">
            We've mapped out your educational journey based on your goals and background.
          </p>
          
          <button
            onClick={handleAccept}
            className="px-8 py-2.5 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
          >
            Show me
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="absolute inset-0 bg-white z-50 flex items-center justify-center">
        {/* Drag button on left border */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-[60]">
          <div className="bg-white border-2 border-slate-200 rounded-lg px-1.5 py-3">
            <div className="flex flex-col gap-1 items-center">
              <div className="w-0.5 h-4 bg-slate-400"></div>
              <div className="w-0.5 h-4 bg-slate-400"></div>
              <div className="w-0.5 h-4 bg-slate-400"></div>
            </div>
          </div>
        </div>
        
        <div className="text-center">
          <div className="flex justify-center gap-2 mb-4">
            <div className="w-2 h-2 bg-gray-900 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-gray-900 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-gray-900 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
          <p className="text-sm text-gray-500">Analyzing...</p>
        </div>
      </div>
    );
  }

  return null;
}
