/* eslint-disable @typescript-eslint/no-explicit-any */

// Message types for chat interface
export interface Message {
  role: "user" | "assistant";
  content: string;
  data?: any;
  metadata?: {
    intent: string;
    dataSource: string;
    queriesExecuted: string[];
    totalResults: number;
    relevanceScoring?: boolean;
    queryAnalysis?: QueryAnalysisResult; // NEW: Query analysis details
  };
}

// NEW: Query Analysis Result type
export interface QueryAnalysisResult {
  improvedQuery?: string;
  searchTerms?: string[];
  ignoreProfile?: boolean;
  intent?: "search" | "profile_based" | "mixed";
  expandedTerms?: Record<string, string[]>;
}

// User profile types
export interface UserProfile {
  profileSummary: string;
  extracted?: ExtractedProfile;
  isComplete: boolean;
  confidence?: {
    overall: number;
    dataQuality: number;
    completeness: number;
  };
}

export interface ExtractedProfile {
  // Core demographics
  educationLevel: string | null; // 'high_school', 'some_college', 'associates', 'bachelors', etc.
  gradeLevel?: number | null; // 9, 10, 11, 12
  currentStatus: string | null; // 'student', 'working', 'unemployed', 'career_change', etc.

  // Interests and motivations
  interests: string[];
  careerGoals: string[];
  motivations: string[];

  // Practical considerations
  timeline: string | null; // 'immediate', '1_year', '2_years', etc.
  location: string | null; // 'Oahu', 'Maui', 'Hawaii Island', 'Kauai'
  workPreferences: {
    environment?: string;
    schedule?: string;
    remoteWork?: string;
    salary?: string;
    benefits?: string[];
  };

  // Challenges and support
  challenges: string[];
  strengths: string[];
  supportNeeds: string[];

  // Learning and development
  learningStyle?: string;
  skillsToImprove: string[];
  experienceLevel: string | null;

  // Context and background
  familyInfluence?: string;
  culturalBackground?: string;
  financialSituation?: string;

  // Confidence and readiness
  confidenceLevel: string | null;
  readinessToStart: string | null;
}

// University of Hawaii Program Data
export interface UHProgramData {
  id: string;
  campus: string; // 'UH Manoa', 'UH Hilo', 'Hawaii CC', etc.
  program: string; // Program code/identifier
  degree: string; // 'BA', 'BS', 'AS', 'Certificate', etc.
  concentration?: string | null; // Optional concentration/specialization
  programName: string; // Full program name
  description?: string | null;
  cipCategory?: string | null; // 2-digit CIP category
  estimatedDuration?: string | null; // '2 years', '4 years', etc.
  deliveryMode?: string[]; // ['in_person', 'online', 'hybrid']
  relevanceScore: number; // Dynamic relevance score for ranking
  doePathways?: Array<{
    programOfStudy: string;
    careerCluster?: string | null;
  }>;
}

// Department of Education Program Data
export interface DOEProgramData {
  id: string;
  programOfStudy: string; // Name of the pathway
  careerCluster?: string | null; // 'STEM', 'Health', 'Business', etc.
  courseSequence: {
    grade9: string[];
    grade10: string[];
    grade11: string[];
    grade12: string[];
    electives: string[];
  };
  gradRequirements: string[];
  relevanceScore: number; // Dynamic relevance score
  uhPathways?: Array<{
    campus: string;
    programName: string;
    degree: string;
  }>;
  totalUHPathways: number; // Count of connected UH programs
}

// Education Pathway Data (DOE to UH connections)
export interface PathwayData {
  doeProgram: {
    id: string;
    programOfStudy: string;
    careerCluster?: string | null;
    courseSequence: {
      grade9: string[];
      grade10: string[];
      grade11: string[];
      grade12: string[];
      electives: string[];
    };
  };
  uhPrograms: Array<{
    id: string;
    campus: string;
    programName: string;
    degree: string;
    concentration?: string | null;
    estimatedDuration?: string | null;
  }>;
}

export interface LightcastCareerData {
  cipCode: string;
  subjectArea: string; // Changed from generic name
  medianSalary: number; // Individual salary for this subject
  uniqueCompanies: number;
  uniquePostings: number;
  relevanceScore?: number;
}
export interface LightcastApiResponse {
  data: {
    ranking: {
      buckets: Array<{
        median_salary: number;
        name: string; // CIP code
        ranking: {
          buckets: Array<{
            median_salary: number;
            name: string; // Skill name
            unique_companies: number;
            unique_postings: number;
          }>;
          facet: string;
          limit: number;
          rank_by: string;
        };
        significance: number;
        unique_companies: number;
        unique_postings: number;
      }>;
      facet: string;
      limit: number;
      rank_by: string;
    };
    totals: {
      median_salary: number;
      unique_companies: number;
      unique_postings: number;
    };
  };
}

// Current data structure for data panel
export interface CurrentData {
  uhPrograms?: UHProgramData[];
  doePrograms?: DOEProgramData[];
  pathways?: PathwayData[];
  searchResults?: {
    uhPrograms: UHProgramData[];
    doePrograms: DOEProgramData[];
  };
  stats?: {
    totalUHPrograms: number;
    totalDOEPrograms: number;
    totalPathways: number;
    availableCampuses: string[];
    availableDegrees: string[];
    careerClusters: string[];
  };
  careerData?: LightcastCareerData[]; // ADD THIS LINE
}

// UI Tab configuration
export interface Tab {
  id: string;
  label: string;
  icon: any; // Lucide icon component
  show: boolean;
}

// Database statistics (for overview)
export interface DataStats {
  totalUHPrograms: number;
  totalDOEPrograms: number;
  totalPathways: number;
  availableCampuses: number;
  availableDegrees: number;
  careerClusters: number;
}

// API Response structure - UPDATED
export interface AIPathwaysResponse {
  message: string;
  data: CurrentData;
  metadata: {
    intent:
      | "uh_programs"
      | "doe_programs"
      | "pathways"
      | "general"
      | "search"
      | "profile_based" // NEW: Added from query analysis
      | "mixed" // NEW: Added from query analysis
      | "error";
    dataSource: "hawaii_education_db";
    queriesExecuted: string[];
    totalResults: number;
    relevanceScoring: boolean;
    queryAnalysis?: QueryAnalysisResult; // NEW: Query analysis metadata
  };
  suggestedQuestions: string[];
  userProfile: string;
}

// MCP Query Plan structure - UPDATED
export interface MCPQueryPlan {
  intent:
    | "search"
    | "profile_based"
    | "mixed"
    | "uh_programs"
    | "doe_programs"
    | "pathways"
    | "general";
  queries: Array<{
    tool: string;
    params: Record<string, any> & {
      ignoreProfile?: boolean; // NEW: Flag to skip profile filtering
      expandedTerms?: string[]; // NEW: Expanded search terms
      getAllMatches?: boolean; // NEW: Get all matches flag
    };
    priority: "primary" | "supporting";
  }>;
  extractedContext: {
    improvedQuery?: string; // NEW: Improved/cleaned query
    searchTerms?: string[]; // UPDATED: Now properly typed
    ignoreProfile?: boolean; // NEW: Whether to ignore profile
    educationLevel?: string;
    gradeLevel?: number;
    interests?: string[];
    careerGoals?: string[];
    location?: string;
    timeline?: string;
  };
}

// NEW: MCP Tool Parameters types
export interface MCPToolParams {
  // Base params shared by multiple tools
  interests?: string[];
  gradeLevel?: number;
  location?: string;
  careerGoals?: string[];
  limit?: number;
  getAllMatches?: boolean;

  // UH Program specific
  educationLevel?: string;
  degreeTypes?: string[];
  campuses?: string[];
  ignoreProfile?: boolean;

  // Search specific
  query?: string;
  expandedTerms?: string[];
  type?: "uh" | "doe" | "all";

  // Pathway specific
  doeProgramId?: string;
  careerClusters?: string[];
}

// NEW: MCP Response metadata type
export interface MCPResponseMetadata {
  totalAvailable?: number;
  returned?: number;
  filtered?: boolean;
  searchMode?: "direct_search" | "profile_based";
  searchTerms?: string[];
}

// Survey/Feedback types
export interface Survey {
  id: string;
  rating: number; // 1-5 stars
  feedback?: string | null;
  sessionId?: string | null;
  createdAt: Date;
}

// Conversation tracking
export interface Conversation {
  id: string;
  userProfileId: string;
  sessionId: string;
  messages: Message[];
  extractedProfile?: ExtractedProfile;
  currentContext?: any;
  conversationStatus: "active" | "completed" | "abandoned";
  lastActivity: Date;
  createdAt: Date;
  updatedAt: Date;
}

// User interaction tracking
export interface UserInteraction {
  id: string;
  userProfileId: string;
  interactionType:
    | "search"
    | "view_program"
    | "pathway_explore"
    | "direct_query";
  searchQuery?: string | null;
  queryAnalysis?: QueryAnalysisResult; // NEW: Track how queries were analyzed
  viewedPrograms: string[]; // UH program IDs
  viewedPathways: string[]; // DOE program IDs
  responseData?: any;
  userFeedback?: number | null; // 1-5 rating
  createdAt: Date;
}
