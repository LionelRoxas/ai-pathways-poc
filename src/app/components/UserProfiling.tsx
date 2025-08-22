import React, { useState } from 'react';
import { ChevronRight, GraduationCap, BookOpen, Briefcase, User } from 'lucide-react';

interface UserProfile {
  education_level: string;
  grade_level?: number;
  interests: string[];
  career_goals?: string;
  timeline: string;
  college_plans: string;
}

interface UserProfilingProps {
  onComplete: (profile: UserProfile) => void;
}

export default function UserProfiling({ onComplete }: UserProfilingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [profile, setProfile] = useState<UserProfile>({
    education_level: '',
    interests: [],
    timeline: '',
    college_plans: ''
  });

  const educationLevels = [
    { id: 'middle_school', label: 'Middle School (6-8th grade)', icon: <BookOpen size={20} /> },
    { id: 'high_school', label: 'High School (9-12th grade)', icon: <GraduationCap size={20} /> },
    { id: 'college', label: 'College Student', icon: <User size={20} /> },
    { id: 'working', label: 'Working Professional', icon: <Briefcase size={20} /> },
    { id: 'other', label: 'Other', icon: <User size={20} /> }
  ];

  const interests = [
    { id: 'math_science', label: 'Math & Science', color: 'bg-blue-50 border-blue-300 hover:border-blue-500' },
    { id: 'technology', label: 'Technology & Computers', color: 'bg-purple-50 border-purple-300 hover:border-purple-500' },
    { id: 'arts_creative', label: 'Arts & Creative', color: 'bg-pink-50 border-pink-300 hover:border-pink-500' },
    { id: 'business_finance', label: 'Business & Finance', color: 'bg-green-50 border-green-300 hover:border-green-500' },
    { id: 'healthcare', label: 'Healthcare', color: 'bg-red-50 border-red-300 hover:border-red-500' },
    { id: 'education_social', label: 'Education & Social Work', color: 'bg-yellow-50 border-yellow-300 hover:border-yellow-500' },
    { id: 'hands_on', label: 'Hands-on/Technical Work', color: 'bg-orange-50 border-orange-300 hover:border-orange-500' },
    { id: 'not_sure', label: 'Not sure yet', color: 'bg-gray-50 border-gray-300 hover:border-gray-500' }
  ];

  const timelines = [
    { id: 'immediate', label: 'I\'m ready now', desc: 'Looking for immediate opportunities' },
    { id: 'short_term', label: 'After high school (1-2 years)', desc: 'Planning for after graduation' },
    { id: 'medium_term', label: 'After college (3-6 years)', desc: 'Long-term career planning' },
    { id: 'exploring', label: 'I\'m still exploring', desc: 'Just getting started with planning' }
  ];

  const collegePlans = [
    { id: 'yes_definitely', label: 'Yes, definitely', desc: 'Planning to attend college' },
    { id: 'maybe', label: 'Maybe, still deciding', desc: 'Considering different options' },
    { id: 'no_alternatives', label: 'No, looking for alternatives', desc: 'Interested in other pathways' },
    { id: 'already_in', label: 'Already in college', desc: 'Currently enrolled' }
  ];

  const handleEducationSelect = (level: string) => {
    const gradeLevel = level === 'high_school' ? 10 : level === 'middle_school' ? 8 : undefined;
    setProfile({ ...profile, education_level: level, grade_level: gradeLevel });
    setCurrentStep(1);
  };

  const handleInterestToggle = (interestId: string) => {
    const newInterests = profile.interests.includes(interestId)
      ? profile.interests.filter(i => i !== interestId)
      : [...profile.interests, interestId];
    setProfile({ ...profile, interests: newInterests });
  };

  const handleNext = () => {
    if (currentStep === 1 && profile.interests.length > 0) {
      setCurrentStep(2);
    } else if (currentStep === 2 && profile.timeline) {
      setCurrentStep(3);
    }
  };

  const handleComplete = () => {
    if (profile.college_plans) {
      onComplete(profile);
    }
  };

  const steps = [
    { title: 'Education Level', desc: 'Tell us about your current situation' },
    { title: 'Interests', desc: 'What subjects or activities interest you?' },
    { title: 'Timeline', desc: 'When are you hoping to start a career?' },
    { title: 'College Plans', desc: 'Are you planning to go to college?' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            AI Pathways Assessment
          </h1>
          <p className="text-gray-600">
            Let&apos;s learn about you to provide personalized career guidance
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {steps.map((step, index) => (
              <div
                key={index}
                className={`flex items-center ${index < steps.length - 1 ? 'flex-1' : ''}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    index <= currentStep
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`h-1 flex-1 mx-2 ${
                      index < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="text-center">
            <h3 className="font-semibold text-gray-800">{steps[currentStep]?.title}</h3>
            <p className="text-sm text-gray-600">{steps[currentStep]?.desc}</p>
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          {currentStep === 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                What&apos;s your current education level?
              </h3>
              {educationLevels.map((level) => (
                <button
                  key={level.id}
                  onClick={() => handleEducationSelect(level.id)}
                  className="w-full flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all"
                >
                  <div className="text-blue-600">{level.icon}</div>
                  <span className="font-medium text-gray-800">{level.label}</span>
                  <ChevronRight size={20} className="ml-auto text-gray-400" />
                </button>
              ))}
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                What subjects or activities interest you most? (Select all that apply)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {interests.map((interest) => (
                  <button
                    key={interest.id}
                    onClick={() => handleInterestToggle(interest.id)}
                    className={`p-4 border-2 rounded-lg transition-all text-left ${
                      profile.interests.includes(interest.id)
                        ? `${interest.color} border-opacity-100 shadow-md`
                        : `${interest.color} border-opacity-50`
                    }`}
                  >
                    <span className="font-medium text-gray-800">{interest.label}</span>
                    {profile.interests.includes(interest.id) && (
                      <div className="text-blue-600 font-bold ml-2 inline">✓</div>
                    )}
                  </button>
                ))}
              </div>
              <button
                onClick={handleNext}
                disabled={profile.interests.length === 0}
                className="w-full mt-6 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Continue ({profile.interests.length} selected)
              </button>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                When are you hoping to start a career?
              </h3>
              {timelines.map((timeline) => (
                <button
                  key={timeline.id}
                  onClick={() => setProfile({ ...profile, timeline: timeline.id })}
                  className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                    profile.timeline === timeline.id
                      ? 'border-blue-400 bg-blue-50 shadow-md'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-25'
                  }`}
                >
                  <div className="font-medium text-gray-800">{timeline.label}</div>
                  <div className="text-sm text-gray-600">{timeline.desc}</div>
                </button>
              ))}
              <button
                onClick={handleNext}
                disabled={!profile.timeline}
                className="w-full mt-6 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Continue
              </button>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Are you planning to go to college?
              </h3>
              {collegePlans.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => setProfile({ ...profile, college_plans: plan.id })}
                  className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                    profile.college_plans === plan.id
                      ? 'border-blue-400 bg-blue-50 shadow-md'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-25'
                  }`}
                >
                  <div className="font-medium text-gray-800">{plan.label}</div>
                  <div className="text-sm text-gray-600">{plan.desc}</div>
                </button>
              ))}
              <button
                onClick={handleComplete}
                disabled={!profile.college_plans}
                className="w-full mt-6 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Start Career Guidance
              </button>
            </div>
          )}
        </div>

        {/* Back Button */}
        {currentStep > 0 && (
          <button
            onClick={() => setCurrentStep(currentStep - 1)}
            className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Go Back
          </button>
        )}
      </div>
    </div>
  );
}