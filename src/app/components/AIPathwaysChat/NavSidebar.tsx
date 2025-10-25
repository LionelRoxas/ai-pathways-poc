// components/AIPathwaysChat/NavSidebar.tsx
import React from "react";
import {
  PanelLeft,
  MessageSquarePlus,
  User,
  Briefcase,
  Trash2,
} from "lucide-react";
import { Language } from "../LanguageSelection";

interface ChatSession {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

interface NavSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  currentLanguage: Language;
  onDataPanelToggle?: () => void;
  dataPanelOpen?: boolean;
  hasDataToShow?: boolean;
  onProfileClick: () => void;
  onNewChat?: () => void;
  chatSessions?: ChatSession[];
  currentChatId?: string;
  onSwitchChat?: (chatId: string) => void;
  onDeleteChat?: (chatId: string) => void;
}

export default function NavSidebar({
  isOpen,
  onToggle,
  onDataPanelToggle,
  dataPanelOpen,
  hasDataToShow,
  onProfileClick,
  onNewChat,
  chatSessions = [],
  currentChatId,
  onSwitchChat,
  onDeleteChat,
}: NavSidebarProps) {
  return (
    <div
      style={{
        fontFamily:
          '"SF Pro Display", "Inter", -apple-system, BlinkMacSystemFont, sans-serif',
      }}
      className={`fixed top-0 left-0 bottom-0 ${
        isOpen ? "w-64" : "w-14"
      } bg-white border-r flex flex-col border-slate-200 z-20 transition-all duration-300 ease-in-out`}
    >
      {/* Header with Toggle */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 p-3 flex items-center justify-between">
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

      {/* Navigation Items - Scrollable Area */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {/* New Chat Button */}
        <button
          onClick={onNewChat}
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
        {isOpen && chatSessions.length > 0 && (
          <div className="py-2">
            <div className="border-t border-slate-200"></div>
          </div>
        )}

        {/* Chat History Section */}
        {isOpen && chatSessions.length > 0 && (
          <div className="px-3 py-2">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
              Recent Chats
            </h3>
          </div>
        )}

        {/* Chat history items */}
        {isOpen && chatSessions.length > 0 && (
          <div className="space-y-1">
            {chatSessions.map(session => (
              <div
                key={session.id}
                className={`group flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  currentChatId === session.id
                    ? "bg-slate-200"
                    : "hover:bg-slate-100"
                }`}
              >
                <button
                  onClick={() => onSwitchChat?.(session.id)}
                  className="flex-1 flex items-center gap-3 text-left min-w-0"
                >
                  <span className="text-sm text-slate-600 truncate whitespace-nowrap">
                    {session.title}
                  </span>
                </button>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onDeleteChat?.(session.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-100 rounded transition-all"
                  aria-label="Delete chat"
                  title="Delete chat"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Section */}
      <div className="flex-shrink-0 border-t border-slate-200 p-2 space-y-1 bg-white">
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
