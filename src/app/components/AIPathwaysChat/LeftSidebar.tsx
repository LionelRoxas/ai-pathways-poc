/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { X, User, Target, MapPin, Clock } from "lucide-react";
import { UserProfile } from "./types";

// Enhanced profile completeness utility
function getEnhancedProfileCompleteness(profile: any): {
  score: number;
  categoryScores: {
    basics: { score: number; items: string[] };
    goals: { score: number; items: string[] };
    preferences: { score: number; items: string[] };
    context: { score: number; items: string[] };
  };
  highlights: string[];
  nextSteps: string[];
} {
  const categories = {
    basics: { score: 0, items: [] as string[] },
    goals: { score: 0, items: [] as string[] },
    preferences: { score: 0, items: [] as string[] },
    context: { score: 0, items: [] as string[] },
  };

  let totalScore = 0;
  const highlights: string[] = [];
  const nextSteps: string[] = [];

  // Basics (40% weight)
  let basicsCount = 0;
  if (profile.educationLevel) {
    basicsCount++;
    categories.basics.items.push(
      `${profile.educationLevel.replace(/_/g, " ")}`
    );
  } else {
    nextSteps.push("Education level");
  }

  if (profile.currentStatus) {
    basicsCount++;
    categories.basics.items.push(`${profile.currentStatus.replace(/_/g, " ")}`);
  } else {
    nextSteps.push("Current status");
  }

  if (profile.interests && profile.interests.length > 0) {
    basicsCount++;
    categories.basics.items.push(
      `${profile.interests.length} interests identified`
    );
    if (profile.interests.length >= 3)
      highlights.push("Strong interest profile");
  } else {
    nextSteps.push("Interests and passions");
  }

  categories.basics.score = (basicsCount / 3) * 100;
  totalScore += categories.basics.score * 0.4;

  // Goals and Motivations (30% weight)
  let goalsCount = 0;
  if (profile.careerGoals && profile.careerGoals.length > 0) {
    goalsCount++;
    categories.goals.items.push(`${profile.careerGoals.length} career goals`);
    if (profile.careerGoals.length >= 2)
      highlights.push("Clear career direction");
  } else {
    nextSteps.push("Career goals");
  }

  if (profile.motivations && profile.motivations.length > 0) {
    goalsCount++;
    categories.goals.items.push(`${profile.motivations.length} motivations`);
  }

  if (profile.timeline) {
    goalsCount++;
    categories.goals.items.push(
      `Timeline: ${profile.timeline.replace(/_/g, " ")}`
    );
    highlights.push("Timeline established");
  } else {
    nextSteps.push("Timeline");
  }

  categories.goals.score = (goalsCount / 3) * 100;
  totalScore += categories.goals.score * 0.3;

  // Preferences (20% weight)
  let preferencesCount = 0;
  if (profile.location) {
    preferencesCount++;
    categories.preferences.items.push(
      `Location: ${profile.location.replace(/_/g, " ")}`
    );
  } else {
    nextSteps.push("Location preference");
  }

  if (profile.workPreferences) {
    const workPrefCount = Object.values(profile.workPreferences).filter(
      v => v && v !== "null"
    ).length;
    if (workPrefCount > 0) {
      preferencesCount++;
      categories.preferences.items.push(`${workPrefCount} work preferences`);
    }
  }

  categories.preferences.score = (preferencesCount / 2) * 100;
  totalScore += categories.preferences.score * 0.2;

  // Context and Support (10% weight)
  let contextCount = 0;
  if (profile.strengths && profile.strengths.length > 0) {
    contextCount++;
    categories.context.items.push(
      `${profile.strengths.length} strengths identified`
    );
    highlights.push("Strengths identified");
  }

  if (profile.challenges && profile.challenges.length > 0) {
    contextCount++;
    categories.context.items.push(
      `${profile.challenges.length} challenges noted`
    );
  }

  if (profile.supportNeeds && profile.supportNeeds.length > 0) {
    contextCount++;
    categories.context.items.push(
      `${profile.supportNeeds.length} support needs`
    );
  }

  categories.context.score = (contextCount / 3) * 100;
  totalScore += categories.context.score * 0.1;

  return {
    score: Math.round(totalScore),
    categoryScores: categories,
    highlights: highlights.slice(0, 3),
    nextSteps: nextSteps.slice(0, 3),
  };
}

interface LeftSidebarProps {
  sidebarOpen: boolean;
  userProfile: UserProfile | null;
  onClose: () => void;
  userMessageCount: number;
}

export default function LeftSidebar({
  sidebarOpen,
  userProfile,
  onClose,
  userMessageCount,
}: LeftSidebarProps) {
  if (!sidebarOpen) return null;

  const completeness = userProfile?.extracted
    ? getEnhancedProfileCompleteness(userProfile.extracted)
    : null;

  return (
    <div
      className="fixed top-0 left-0 bottom-0 w-80 bg-white border-r border-gray-200 z-30 overflow-y-auto"
      style={{
        fontFamily:
          '"SF Pro Display", "Inter", -apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 p-3.5 flex items-center justify-between z-10">
        <div className="flex items-center">
          <h2 className="font-bold text-black text-sm">Your Profile</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition"
          aria-label="Close sidebar"
        >
          <X className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      <div className="p-5 space-y-5">
        {/* Profile Content */}
        {userProfile ? (
          <div className="space-y-5">
            {/* Status Header */}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs leading-relaxed text-gray-700">
                {userProfile.profileSummary}
              </p>
            </div>

            {completeness && (
              <>
                {/* <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-black text-sm">
                      Completeness
                    </span>
                    <span className="text-sm font-bold text-black">
                      {completeness.score}%
                    </span>
                  </div>

                  <div className="bg-gray-100 rounded-full h-2 mb-4">
                    <div
                      className="bg-black h-2 rounded-full transition-all duration-700"
                      style={{ width: `${completeness.score}%` }}
                    />
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Basics</span>
                      <span className="text-black font-medium">
                        {Math.round(completeness.categoryScores.basics.score)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Goals</span>
                      <span className="text-black font-medium">
                        {Math.round(completeness.categoryScores.goals.score)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Preferences</span>
                      <span className="text-black font-medium">
                        {Math.round(
                          completeness.categoryScores.preferences.score
                        )}
                        %
                      </span>
                    </div>
                  </div>
                </div> */}

                {/* Divider */}
                {/* <div className="border-t border-gray-100" /> */}

                {/* Highlights */}
                {completeness.highlights.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-black text-xs mb-3">
                      HIGHLIGHTS
                    </h4>
                    <div className="space-y-2">
                      {completeness.highlights.map((highlight, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div className="w-1 h-1 bg-black rounded-full" />
                          <span className="text-xs text-gray-700">
                            {highlight}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Key Information */}
                <div>
                  <h4 className="font-semibold text-black text-xs mb-3">
                    INFORMATION
                  </h4>

                  <div className="space-y-2 text-xs">
                    {userProfile.extracted?.educationLevel &&
                      userProfile.extracted.educationLevel !== "null" && (
                        <div className="flex items-center gap-2 text-gray-700">
                          <User className="w-3 h-3" />
                          <span>
                            {userProfile.extracted.educationLevel.replace(
                              /_/g,
                              " "
                            )}
                          </span>
                        </div>
                      )}

                    {userProfile.extracted?.location &&
                      userProfile.extracted.location !== "null" && (
                        <div className="flex items-center gap-2 text-gray-700">
                          <MapPin className="w-3 h-3" />
                          <span>
                            {userProfile.extracted.location.replace(/_/g, " ")}
                          </span>
                        </div>
                      )}

                    {userProfile.extracted?.timeline &&
                      userProfile.extracted.timeline !== "null" && (
                        <div className="flex items-center gap-2 text-gray-700">
                          <Clock className="w-3 h-3" />
                          <span>
                            {userProfile.extracted.timeline.replace(/_/g, " ")}
                          </span>
                        </div>
                      )}

                    {userProfile.extracted?.careerGoals &&
                      userProfile.extracted.careerGoals.length > 0 && (
                        <div className="flex items-center gap-2 text-gray-700">
                          <Target className="w-3 h-3" />
                          <span>
                            {userProfile.extracted.careerGoals.length} career
                            goal
                            {userProfile.extracted.careerGoals.length > 1
                              ? "s"
                              : ""}
                          </span>
                        </div>
                      )}
                  </div>
                </div>

                {/* Areas for Improvement */}
                {completeness.nextSteps.length > 0 &&
                  completeness.score < 90 && (
                    <>
                      <div className="border-t border-gray-100" />
                      <div>
                        <h4 className="font-semibold text-black text-xs mb-3">
                          COULD EXPLORE
                        </h4>
                        <div className="space-y-2">
                          {completeness.nextSteps.map((step, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <div className="w-1 h-1 bg-gray-400 rounded-full" />
                              <span className="text-xs text-gray-600">
                                {step}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
              </>
            )}
          </div>
        ) : (
          /* No Profile State */
          <div className="space-y-5">
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="font-semibold text-black text-sm mb-2">
                Building Your Profile
              </h3>
              <p className="text-xs text-gray-600 mb-4">
                Continue our conversation to create a personalized profile
              </p>

              {/* Progress Indicator */}
              <div className="max-w-48 mx-auto">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-gray-600">Progress</span>
                  <span className="text-xs text-black font-semibold">
                    {userMessageCount}/3
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className="bg-black h-1.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, (userMessageCount / 3) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Discovery Tips */}
            <div>
              <h4 className="font-semibold text-black text-xs mb-3">TIPS</h4>
              <ul className="space-y-2 text-xs text-gray-600">
                <li>• Share your current situation</li>
                <li>• Mention what interests you</li>
                <li>• Tell me about your goals</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
