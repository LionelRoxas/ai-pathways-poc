// components/AIPathwaysChat/NavSidebar.tsx
import React from "react";
import {
  PanelLeft,
  MessageSquarePlus,
  User,
  Globe,
  Briefcase,
} from "lucide-react";
import { Language } from "../LanguageSelection";

interface NavSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  currentLanguage: Language;
  onDataPanelToggle?: () => void;
  dataPanelOpen?: boolean;
  hasDataToShow?: boolean;
  onProfileClick: () => void; // ADD THIS
}

export default function NavSidebar({
  isOpen,
  onToggle,
  currentLanguage,
  onDataPanelToggle,
  dataPanelOpen,
  hasDataToShow,
  onProfileClick, // ADD THIS
}: NavSidebarProps) {
  return (
    <div
      style={{
        fontFamily:
          '"SF Pro Display", "Inter", -apple-system, BlinkMacSystemFont, sans-serif',
      }}
      className={`fixed top-0 left-0 bottom-0 ${
        isOpen ? "w-64" : "w-14"
      } bg-white border-r flex flex-col border-slate-200 z-20 overflow-y-auto transition-all duration-300 ease-in-out`}
    >
      {/* Header with Toggle */}
      <div className="sticky top-0 bg-white border-b border-slate-200 p-3 flex items-center justify-between z-10">
        {isOpen && (
          <span className="font-bold text-slate-900 text-sm whitespace-nowrap">
            Kamaʻāina Pathways
          </span>
        )}
        <button
          onClick={onToggle}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors ml-auto"
          aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          <PanelLeft
            className={`w-4 h-4 text-slate-600 transition-transform ${
              isOpen ? "" : "rotate-180"
            }`}
          />
        </button>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 p-2 space-y-1">
        {/* New Chat Button */}
        <button
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-100 transition-colors text-left group ${
            !isOpen ? "justify-center px-0" : ""
          }`}
          aria-label="New chat"
        >
          <MessageSquarePlus className="w-5 h-5 text-slate-600 flex-shrink-0" />
          {isOpen && (
            <span className="text-sm font-medium text-slate-700 whitespace-nowrap">
              New Chat
            </span>
          )}
        </button>

        {/* Divider */}
        {isOpen && (
          <div className="py-2">
            <div className="border-slate-200"></div>
          </div>
        )}

        {/* Chat History Section */}
        {isOpen && (
          <div className="px-3 py-2">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
              Recent Chats
            </h3>
          </div>
        )}

        {/* Placeholder for chat history items */}
        {isOpen && (
          <div className="space-y-1">
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors text-left">
              <div className="w-2 h-2 bg-slate-300 rounded-full flex-shrink-0"></div>
              <span className="text-sm text-slate-600 truncate whitespace-nowrap">
                Previous chat placeholder
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Bottom Section */}
      <div className="sticky bottom-0 border-slate-200 p-2 space-y-1 bg-white">
        {/* Language Selector */}
        <button
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-100 transition-colors text-left ${
            !isOpen ? "justify-center px-0" : ""
          }`}
          aria-label="Language settings"
        >
          <Globe className="w-5 h-5 text-slate-600 flex-shrink-0" />
          {isOpen && (
            <span className="text-sm font-medium text-slate-700 whitespace-nowrap">
              {currentLanguage.name}
            </span>
          )}
        </button>

        {/* Data Panel Toggle */}
        {(hasDataToShow || dataPanelOpen) && (
          <button
            onClick={onDataPanelToggle}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left relative ${
              dataPanelOpen
                ? "bg-black text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            } ${!isOpen ? "justify-center px-0" : ""}`}
            aria-label="Toggle data panel"
          >
            <Briefcase
              className={`w-5 h-5 flex-shrink-0 transition-transform ${
                dataPanelOpen ? "" : ""
              }`}
            />
            {isOpen && (
              <span className="text-sm font-medium whitespace-nowrap">
                Careers
              </span>
            )}
          </button>
        )}

        {/* Profile Button - ADD onClick HERE */}
        <button
          onClick={onProfileClick}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-100 transition-colors text-left ${
            !isOpen ? "justify-center px-0" : ""
          }`}
          aria-label="View profile"
        >
          <User className="w-5 h-5 text-slate-600 flex-shrink-0" />
          {isOpen && (
            <span className="text-sm font-medium text-slate-700 whitespace-nowrap">
              Profile
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
