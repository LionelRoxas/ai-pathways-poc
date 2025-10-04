/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/mcp/pathways-mcp-server.ts
import { PrismaClient } from "@prisma/client";
import {
  LightcastApiResponse,
  LightcastCareerData,
} from "@/app/components/AIPathwaysChat/types";

const prisma = new PrismaClient();

// Configuration for limits
const DEFAULT_LIMITS = {
  UH_PROGRAMS: 50,
  DOE_PROGRAMS: 30,
  PATHWAYS: 50,
  SEARCH: 40,
  MAX_INITIAL_FETCH: 500,
  ABSOLUTE_MAX: 200,
};

// Core Types
export interface MCPRequest {
  tool: string;
  params: Record<string, any>;
}

export interface MCPResponse {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    totalAvailable?: number;
    returned?: number;
    filtered?: boolean;
    searchMode?: "direct_search" | "profile_based";
    searchTerms?: string[];
  };
}

// Helper function to expand term variations
function expandTermVariations(term: string): string[] {
  const variations = new Set<string>();
  const termLower = term.toLowerCase();

  // Common abbreviation expansions
  const expansions: Record<string, string[]> = {
    "comp sci": ["computer science", "computing"],
    cs: ["computer science", "computing"],
    bio: ["biology", "biological sciences"],
    chem: ["chemistry", "chemical"],
    psych: ["psychology", "psychological"],
    econ: ["economics", "economic"],
    "poli sci": ["political science", "politics"],
    "phys ed": ["physical education", "kinesiology"],
    bus: ["business", "business administration"],
    eng: ["engineering"],
    it: ["information technology", "information systems"],
    math: ["mathematics", "mathematical"],
    stats: ["statistics", "statistical"],
    comm: ["communication", "communications"],
    ed: ["education", "educational"],
    nursing: ["nurse", "nursing science", "BSN"],
    med: ["medicine", "medical", "pre-med"],
    law: ["legal studies", "pre-law", "paralegal"],
  };

  // Check if term is an abbreviation
  if (expansions[termLower]) {
    expansions[termLower].forEach(v => variations.add(v));
  }

  // Check if term contains abbreviations
  for (const [abbr, fullTerms] of Object.entries(expansions)) {
    if (termLower.includes(abbr)) {
      fullTerms.forEach(fullTerm => {
        variations.add(termLower.replace(abbr, fullTerm));
      });
    }
  }

  return Array.from(variations);
}

// Calculate search-only relevance (for when ignoreProfile is true)
function calculateSearchRelevance(program: any, searchTerms: string[]): number {
  let score = 0;

  if (!searchTerms.length) return 0;

  const programKeywords = new Set(
    [
      program.programName?.toLowerCase(),
      program.cipCategory?.toLowerCase(),
      ...(program.searchKeywords || []),
      ...(program.careerOutcomes || []).map((c: string) => c.toLowerCase()),
      program.description?.toLowerCase(),
    ].filter(Boolean)
  );

  for (const term of searchTerms) {
    const termLower = term.toLowerCase();

    // Exact match in program name = 100 points
    if (program.programName?.toLowerCase() === termLower) {
      score += 100;
    }
    // Contains in program name = 50 points
    else if (program.programName?.toLowerCase().includes(termLower)) {
      score += 50;
    }

    // Exact match in keywords = 40 points
    if (program.searchKeywords?.includes(termLower)) {
      score += 40;
    }

    // CIP category match = 30 points
    if (program.cipCategory?.toLowerCase().includes(termLower)) {
      score += 30;
    }

    // Description contains = 20 points
    if (program.description?.toLowerCase().includes(termLower)) {
      score += 20;
    }

    // Career outcomes match = 25 points
    const careerMatch = program.careerOutcomes?.some((outcome: string) =>
      outcome.toLowerCase().includes(termLower)
    );
    if (careerMatch) {
      score += 25;
    }

    // Check for partial matches
    for (const keyword of programKeywords) {
      if (keyword.includes(termLower) || termLower.includes(keyword)) {
        score += 10;
        break;
      }
    }
  }

  return score;
}

// Calculate relevance score for UH programs (profile-based)
function calculateUHProgramRelevance(
  program: any,
  userProfile: {
    interests?: string[];
    educationLevel?: string;
    gradeLevel?: number;
    location?: string;
    careerGoals?: string[];
  }
): number {
  let score = program.relevanceScore || 0;

  // Keyword matching (40 points max)
  if (userProfile.interests?.length) {
    const programKeywords = new Set(
      [
        ...program.searchKeywords,
        program.programName.toLowerCase(),
        program.cipCategory?.toLowerCase(),
      ].filter(Boolean)
    );

    let keywordScore = 0;
    userProfile.interests.forEach(interest => {
      const interestLower = interest.toLowerCase();
      if (programKeywords.has(interestLower)) {
        keywordScore += 10;
      }
      // Partial matches
      for (const keyword of programKeywords) {
        if (
          keyword.includes(interestLower) ||
          interestLower.includes(keyword)
        ) {
          keywordScore += 5;
          break;
        }
      }
    });
    score += Math.min(keywordScore, 40);
  }

  // Career goal matching (30 points max)
  if (userProfile.careerGoals?.length && program.careerOutcomes?.length) {
    const careerMatches = userProfile.careerGoals.filter(goal =>
      program.careerOutcomes.some((outcome: string) =>
        outcome.toLowerCase().includes(goal.toLowerCase())
      )
    );
    score += careerMatches.length * 15;
  }

  // Degree type appropriateness (20 points max)
  if (userProfile.educationLevel) {
    const appropriateDegrees: Record<string, string[]> = {
      high_school: [
        "AS",
        "AA",
        "AAS",
        "CERT",
        "CO",
        "CA",
        "Certificate",
        "Associate in Science",
        "Associate in Arts",
      ],
      some_college: [
        "AS",
        "AA",
        "AAS",
        "BA",
        "BS",
        "BBA",
        "Bachelor of Arts",
        "Bachelor of Science",
      ],
      associates: [
        "BA",
        "BS",
        "BBA",
        "BEd",
        "BFA",
        "BSN",
        "Bachelor of Arts",
        "Bachelor of Science",
      ],
      bachelors: ["MA", "MS", "MBA", "MEd", "PhD", "MD"],
    };

    const appropriate = appropriateDegrees[userProfile.educationLevel] || [];
    const degreeMatch = appropriate.some(
      deg =>
        program.degree === deg ||
        program.degree?.includes(deg) ||
        deg.includes(program.degree)
    );
    if (degreeMatch) {
      score += 20;
    }
  }

  // Campus proximity (15 points max)
  if (userProfile.location && program.campus) {
    const campusIsland: Record<string, string> = {
      "UH Manoa": "Oahu",
      "UH West Oahu": "Oahu",
      "Honolulu CC": "Oahu",
      "Kapiolani CC": "Oahu",
      "Leeward CC": "Oahu",
      "Windward CC": "Oahu",
      "UH Hilo": "Hawaii Island",
      "Hawaii CC": "Hawaii Island",
      "UH Maui College": "Maui",
      "Kauai CC": "Kauai",
    };

    if (campusIsland[program.campus] === userProfile.location) {
      score += 15;
    }
  }

  return score;
}

// Calculate relevance for DOE programs
function calculateDOEProgramRelevance(
  program: any,
  userProfile: {
    interests?: string[];
    gradeLevel?: number;
    careerGoals?: string[];
  }
): number {
  let score = program.relevanceScore || 0;

  // Interest matching (40 points max)
  if (userProfile.interests?.length) {
    const programKeywords = new Set(
      [
        ...program.searchKeywords,
        program.programOfStudy.toLowerCase(),
        program.careerCluster?.toLowerCase(),
      ].filter(Boolean)
    );

    let keywordScore = 0;
    userProfile.interests.forEach(interest => {
      const interestLower = interest.toLowerCase();
      if (programKeywords.has(interestLower)) {
        keywordScore += 15;
      }
      // Check cluster match
      if (program.careerCluster?.toLowerCase().includes(interestLower)) {
        keywordScore += 10;
      }
    });
    score += Math.min(keywordScore, 40);
  }

  // Grade level appropriateness (20 points)
  if (userProfile.gradeLevel) {
    if (userProfile.gradeLevel <= 10) {
      score += 20; // Plenty of time
    } else if (userProfile.gradeLevel === 11) {
      score += 15; // Still good timing
    } else if (userProfile.gradeLevel === 12) {
      score += 10; // Can still benefit
    }
  }

  // Number of UH pathways available (up to 30 points)
  if (program.uhPathways?.length) {
    score += Math.min(program.uhPathways.length * 5, 30);
  }

  return score;
}

// Calculate DOE search relevance
function calculateDOESearchRelevance(
  program: any,
  searchTerms: string[]
): number {
  let score = 0;

  for (const term of searchTerms) {
    const termLower = term.toLowerCase();

    // Exact match in program name = 80 points
    if (program.programOfStudy?.toLowerCase() === termLower) {
      score += 80;
    }
    // Contains in program name = 40 points
    else if (program.programOfStudy?.toLowerCase().includes(termLower)) {
      score += 40;
    }

    // Keyword match = 30 points
    if (program.searchKeywords?.includes(termLower)) {
      score += 30;
    }

    // Career cluster match = 25 points
    if (program.careerCluster?.toLowerCase().includes(termLower)) {
      score += 25;
    }
  }

  return score;
}

function calculateCareerRelevance(
  career: LightcastCareerData,
  searchTerms: string[]
): number {
  let score = 0;
  const subjectAreaLower = career.subjectArea.toLowerCase();

  for (const term of searchTerms) {
    const termLower = term.toLowerCase();

    // Exact match = 100 points
    if (subjectAreaLower === termLower) {
      score += 100;
    }
    // Contains match = 50 points
    else if (subjectAreaLower.includes(termLower)) {
      score += 50;
    }
    // Partial word match = 25 points
    else if (
      termLower.includes(subjectAreaLower) ||
      subjectAreaLower.includes(termLower)
    ) {
      score += 25;
    }
  }

  // Boost score based on job market demand
  if (score > 0 && career.uniquePostings > 20) {
    score += 15; // High demand bonus
  }
  if (score > 0 && career.uniquePostings > 30) {
    score += 10; // Very high demand bonus
  }

  return score;
}

// MCP Tools
export const mcpTools = {
  // Get UH Programs with intelligent filtering and ranking
  async getUHPrograms(params: {
    interests?: string[];
    educationLevel?: string;
    gradeLevel?: number;
    location?: string;
    careerGoals?: string[];
    degreeTypes?: string[];
    campuses?: string[];
    limit?: number;
    getAllMatches?: boolean;
    ignoreProfile?: boolean; // NEW: Skip profile-based filtering
  }): Promise<MCPResponse> {
    try {
      // Build query
      const where: any = {};

      if (params.degreeTypes?.length) {
        where.degree = { in: params.degreeTypes };
      }

      if (params.campuses?.length) {
        where.campus = { in: params.campuses };
      }

      // Enhanced keyword search with expanded terms
      if (params.interests?.length || params.careerGoals?.length) {
        const searchTerms = [
          ...(params.interests || []),
          ...(params.careerGoals || []),
        ];

        // Create comprehensive OR conditions for each search term
        const orConditions = [];
        for (const term of searchTerms) {
          const termLower = term.toLowerCase();
          const termConditions = [
            { programName: { contains: term, mode: "insensitive" } },
            { searchKeywords: { has: termLower } },
            { cipCategory: { contains: term, mode: "insensitive" } },
            { careerOutcomes: { has: term } },
            { description: { contains: term, mode: "insensitive" } },
          ];

          // Add variations for common abbreviations
          const expansions = expandTermVariations(term);
          for (const expansion of expansions) {
            termConditions.push(
              { programName: { contains: expansion, mode: "insensitive" } },
              { searchKeywords: { has: expansion.toLowerCase() } }
            );
          }

          orConditions.push({ OR: termConditions });
        }

        where.OR = orConditions;
      }

      // Determine fetch limit
      const fetchLimit = params.getAllMatches
        ? undefined
        : DEFAULT_LIMITS.MAX_INITIAL_FETCH;

      // Get programs
      const programs = await prisma.uHProgram.findMany({
        where,
        include: {
          doePathways: {
            include: {
              doeProgram: true,
            },
          },
        },
        take: fetchLimit,
      });

      // Calculate relevance scores
      let scoredPrograms;

      if (params.ignoreProfile) {
        // When ignoring profile, score based on search term matching only
        scoredPrograms = programs.map((program: any) => ({
          ...program,
          calculatedScore: calculateSearchRelevance(program, [
            ...(params.interests || []),
            ...(params.careerGoals || []),
          ]),
        }));
      } else {
        // Use full profile-based scoring
        scoredPrograms = programs.map((program: any) => ({
          ...program,
          calculatedScore: calculateUHProgramRelevance(program, params),
        }));
      }

      // Sort by score
      scoredPrograms.sort(
        (a: { calculatedScore: number }, b: { calculatedScore: number }) =>
          b.calculatedScore - a.calculatedScore
      );

      // Determine return limit
      let returnLimit = params.limit || DEFAULT_LIMITS.UH_PROGRAMS;
      if (params.getAllMatches) {
        returnLimit = Math.min(
          scoredPrograms.length,
          DEFAULT_LIMITS.ABSOLUTE_MAX
        );
      }

      const topPrograms = scoredPrograms.slice(0, returnLimit);

      // Format response
      return {
        success: true,
        data: topPrograms.map(
          (program: {
            id: any;
            campus: any;
            program: any;
            degree: any;
            concentration: any;
            programName: any;
            description: any;
            cipCategory: any;
            estimatedDuration: any;
            deliveryMode: any;
            calculatedScore: any;
            doePathways: any[];
          }) => ({
            id: program.id,
            campus: program.campus,
            program: program.program,
            degree: program.degree,
            concentration: program.concentration,
            programName: program.programName,
            description: program.description,
            cipCategory: program.cipCategory,
            estimatedDuration: program.estimatedDuration,
            deliveryMode: program.deliveryMode,
            relevanceScore: program.calculatedScore,
            doePathways: program.doePathways.map((pathway: any) => ({
              programOfStudy: pathway.doeProgram.programOfStudy,
              careerCluster: pathway.doeProgram.careerCluster,
            })),
          })
        ),
        metadata: {
          totalAvailable: programs.length,
          returned: topPrograms.length,
          filtered: programs.length > topPrograms.length,
          searchMode: params.ignoreProfile ? "direct_search" : "profile_based",
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get UH programs: ${error}`,
      };
    }
  },

  // Get DOE Programs with intelligent filtering
  async getDOEPrograms(params: {
    interests?: string[];
    gradeLevel?: number;
    careerGoals?: string[];
    careerClusters?: string[];
    limit?: number;
    getAllMatches?: boolean;
    ignoreProfile?: boolean;
  }): Promise<MCPResponse> {
    try {
      const where: any = {};

      if (params.careerClusters?.length) {
        where.careerCluster = { in: params.careerClusters };
      }

      // Enhanced keyword search
      if (params.interests?.length || params.careerGoals?.length) {
        const searchTerms = [
          ...(params.interests || []),
          ...(params.careerGoals || []),
        ];

        const orConditions = [];
        for (const term of searchTerms) {
          const termLower = term.toLowerCase();
          const termConditions = [
            { programOfStudy: { contains: term, mode: "insensitive" } },
            { searchKeywords: { has: termLower } },
            { careerCluster: { contains: term, mode: "insensitive" } },
          ];

          // Add variations
          const expansions = expandTermVariations(term);
          for (const expansion of expansions) {
            termConditions.push(
              { programOfStudy: { contains: expansion, mode: "insensitive" } },
              { searchKeywords: { has: expansion.toLowerCase() } }
            );
          }

          orConditions.push({ OR: termConditions });
        }

        where.OR = orConditions;
      }

      // Get all DOE programs (there are only 50 total)
      const programs = await prisma.dOEProgram.findMany({
        where,
        include: {
          uhPathways: {
            include: {
              uhProgram: true,
            },
          },
        },
      });

      // Calculate relevance scores
      let scoredPrograms;

      if (params.ignoreProfile) {
        // Search-based scoring only
        scoredPrograms = programs.map((program: any) => ({
          ...program,
          calculatedScore: calculateDOESearchRelevance(program, [
            ...(params.interests || []),
            ...(params.careerGoals || []),
          ]),
        }));
      } else {
        // Profile-based scoring
        scoredPrograms = programs.map((program: any) => ({
          ...program,
          calculatedScore: calculateDOEProgramRelevance(program, params),
        }));
      }

      // Sort by score
      scoredPrograms.sort(
        (a: { calculatedScore: number }, b: { calculatedScore: number }) =>
          b.calculatedScore - a.calculatedScore
      );

      // Determine return limit
      let returnLimit = params.limit || DEFAULT_LIMITS.DOE_PROGRAMS;
      if (params.getAllMatches) {
        returnLimit = scoredPrograms.length;
      }

      const topPrograms = scoredPrograms.slice(0, returnLimit);

      // Format response
      return {
        success: true,
        data: topPrograms.map(
          (program: {
            id: any;
            programOfStudy: any;
            careerCluster: any;
            grade9Courses: any;
            grade10Courses: any;
            grade11Courses: any;
            grade12Courses: any;
            electiveCourses: any;
            gradRequirements: any;
            calculatedScore: any;
            uhPathways: any[];
          }) => ({
            id: program.id,
            programOfStudy: program.programOfStudy,
            careerCluster: program.careerCluster,
            courseSequence: {
              grade9: program.grade9Courses,
              grade10: program.grade10Courses,
              grade11: program.grade11Courses,
              grade12: program.grade12Courses,
              electives: program.electiveCourses,
            },
            gradRequirements: program.gradRequirements,
            relevanceScore: program.calculatedScore,
            uhPathways: program.uhPathways.map((pathway: any) => ({
              campus: pathway.campus,
              programName: pathway.uhProgram.programName,
              degree: pathway.uhProgram.degree,
            })),
            totalUHPathways: program.uhPathways.length,
          })
        ),
        metadata: {
          totalAvailable: programs.length,
          returned: topPrograms.length,
          filtered: programs.length > topPrograms.length,
          searchMode: params.ignoreProfile ? "direct_search" : "profile_based",
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get DOE programs: ${error}`,
      };
    }
  },

  // Get complete pathways from DOE to UH
  async getEducationPathways(params: {
    doeProgramId?: string;
    interests?: string[];
    gradeLevel?: number;
    location?: string;
    limit?: number;
    getAllMatches?: boolean;
  }): Promise<MCPResponse> {
    try {
      const where: any = {};

      if (params.doeProgramId) {
        where.doeProgramId = params.doeProgramId;
      }

      if (params.location) {
        // Map location to campuses
        const campusByLocation: Record<string, string[]> = {
          Oahu: [
            "UH Manoa",
            "UH West Oahu",
            "Honolulu CC",
            "Kapiolani CC",
            "Leeward CC",
            "Windward CC",
          ],
          "Hawaii Island": ["UH Hilo", "Hawaii CC"],
          Maui: ["UH Maui College"],
          Kauai: ["Kauai CC"],
        };

        const campuses = campusByLocation[params.location];
        if (campuses) {
          where.campus = { in: campuses };
        }
      }

      const limit = params.getAllMatches
        ? undefined
        : params.limit || DEFAULT_LIMITS.PATHWAYS;

      const pathways = await prisma.dOEProgramPathway.findMany({
        where,
        include: {
          doeProgram: true,
          uhProgram: true,
        },
        take: limit,
      });

      // Group by DOE program for better organization
      const pathwayMap = new Map<string, any>();

      for (const pathway of pathways) {
        const doeId = pathway.doeProgram.id;
        if (!pathwayMap.has(doeId)) {
          pathwayMap.set(doeId, {
            doeProgram: {
              id: pathway.doeProgram.id,
              programOfStudy: pathway.doeProgram.programOfStudy,
              careerCluster: pathway.doeProgram.careerCluster,
              courseSequence: {
                grade9: pathway.doeProgram.grade9Courses,
                grade10: pathway.doeProgram.grade10Courses,
                grade11: pathway.doeProgram.grade11Courses,
                grade12: pathway.doeProgram.grade12Courses,
                electives: pathway.doeProgram.electiveCourses,
              },
            },
            uhPrograms: [],
          });
        }

        pathwayMap.get(doeId).uhPrograms.push({
          id: pathway.uhProgram.id,
          campus: pathway.uhProgram.campus,
          programName: pathway.uhProgram.programName,
          degree: pathway.uhProgram.degree,
          concentration: pathway.uhProgram.concentration,
          estimatedDuration: pathway.uhProgram.estimatedDuration,
        });
      }

      const results = Array.from(pathwayMap.values());

      return {
        success: true,
        data: results,
        metadata: {
          totalAvailable: pathways.length,
          returned: results.length,
          filtered: false,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get education pathways: ${error}`,
      };
    }
  },

  // Search across all programs with expanded term support
  async searchPrograms(params: {
    query: string;
    expandedTerms?: string[];
    type?: "uh" | "doe" | "all";
    limit?: number;
    getAllMatches?: boolean;
  }): Promise<MCPResponse> {
    try {
      const results: any = {
        uhPrograms: [],
        doePrograms: [],
      };

      // Use expanded terms if provided, otherwise expand the query
      const searchTerms = params.expandedTerms || [
        params.query,
        ...expandTermVariations(params.query),
      ];

      const limit = params.getAllMatches
        ? undefined
        : params.limit || DEFAULT_LIMITS.SEARCH;

      if (params.type !== "doe") {
        // Build comprehensive OR conditions for UH programs
        const uhOrConditions = [];

        for (const term of searchTerms) {
          const termLower = term.toLowerCase();
          uhOrConditions.push(
            { programName: { contains: term, mode: "insensitive" } },
            { searchKeywords: { has: termLower } },
            { cipCategory: { contains: term, mode: "insensitive" } },
            { campus: { contains: term, mode: "insensitive" } },
            { degree: { contains: term, mode: "insensitive" } },
            { description: { contains: term, mode: "insensitive" } }
          );
        }

        const uhPrograms = await prisma.uHProgram.findMany({
          where: { OR: uhOrConditions as any }, // Add 'as any' temporarily
          take: limit
            ? Math.min(limit, DEFAULT_LIMITS.ABSOLUTE_MAX)
            : DEFAULT_LIMITS.ABSOLUTE_MAX,
        });

        // Score and sort results
        const scoredUHPrograms = uhPrograms.map((program: any) => ({
          ...program,
          relevanceScore: calculateSearchRelevance(program, searchTerms),
        }));

        scoredUHPrograms.sort(
          (a: { relevanceScore: number }, b: { relevanceScore: number }) =>
            b.relevanceScore - a.relevanceScore
        );
        results.uhPrograms = scoredUHPrograms;
      }

      if (params.type !== "uh") {
        // Build comprehensive OR conditions for DOE programs
        const doeOrConditions = [];

        for (const term of searchTerms) {
          const termLower = term.toLowerCase();
          doeOrConditions.push(
            { programOfStudy: { contains: term, mode: "insensitive" } },
            { searchKeywords: { has: termLower } },
            { careerCluster: { contains: term, mode: "insensitive" } }
          );
        }

        const doePrograms = await prisma.dOEProgram.findMany({
          where: { OR: doeOrConditions as any },
          take: limit,
        });

        // Score and sort DOE results
        const scoredDOEPrograms = doePrograms.map((program: any) => ({
          ...program,
          relevanceScore: calculateDOESearchRelevance(program, searchTerms),
        }));

        scoredDOEPrograms.sort(
          (a: { relevanceScore: number }, b: { relevanceScore: number }) =>
            b.relevanceScore - a.relevanceScore
        );
        results.doePrograms = scoredDOEPrograms;
      }

      return {
        success: true,
        data: results,
        metadata: {
          totalAvailable:
            results.uhPrograms.length + results.doePrograms.length,
          returned: results.uhPrograms.length + results.doePrograms.length,
          filtered: false,
          searchTerms: searchTerms,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to search programs: ${error}`,
      };
    }
  },

  // Get statistics about the database
  async getDatabaseStats(): Promise<MCPResponse> {
    try {
      const [
        uhProgramCount,
        doeProgramCount,
        pathwayCount,
        campuses,
        degrees,
        clusters,
      ] = await Promise.all([
        prisma.uHProgram.count(),
        prisma.dOEProgram.count(),
        prisma.dOEProgramPathway.count(),
        prisma.uHProgram.findMany({
          select: { campus: true },
          distinct: ["campus"],
        }),
        prisma.uHProgram.findMany({
          select: { degree: true },
          distinct: ["degree"],
        }),
        prisma.dOEProgram.findMany({
          select: { careerCluster: true },
          distinct: ["careerCluster"],
        }),
      ]);

      return {
        success: true,
        data: {
          totalUHPrograms: uhProgramCount,
          totalDOEPrograms: doeProgramCount,
          totalPathways: pathwayCount,
          availableCampuses: campuses.map((c: { campus: any }) => c.campus),
          availableDegrees: degrees.map((d: { degree: any }) => d.degree),
          careerClusters: clusters
            .map((c: { careerCluster: any }) => c.careerCluster)
            .filter(Boolean),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get database stats: ${error}`,
      };
    }
  },

  // Add to mcpTools object
  async getLightcastCareerData(params: {
    programName?: string;
    interests?: string[];
    limit?: number;
  }): Promise<MCPResponse> {
    try {
      const response = await fetch(
        "https://careerexplorer.hawaii.edu/api_lightcast/majors_to_skills.php"
      );

      if (!response.ok) {
        return {
          success: false,
          error: `Lightcast API returned ${response.status}`,
        };
      }

      const apiData: LightcastApiResponse = await response.json();

      // Transform - extract each subject area as individual career entry
      const transformedData: LightcastCareerData[] = [];

      if (apiData.data?.ranking?.buckets) {
        for (const cipBucket of apiData.data.ranking.buckets) {
          const cipCode = cipBucket.name;

          // Extract each specialized skill/subject as its own entry
          if (cipBucket.ranking?.buckets) {
            for (const subjectBucket of cipBucket.ranking.buckets) {
              transformedData.push({
                cipCode: cipCode,
                subjectArea: subjectBucket.name,
                medianSalary: subjectBucket.median_salary,
                uniqueCompanies: subjectBucket.unique_companies,
                uniquePostings: subjectBucket.unique_postings,
              });
            }
          }
        }
      }

      // Filter/score based on interests if provided
      let filteredData = transformedData;
      if (params.interests?.length || params.programName) {
        const searchTerms = [
          ...(params.interests || []),
          ...(params.programName ? [params.programName] : []),
        ].map(t => t.toLowerCase());

        filteredData = transformedData
          .map(career => ({
            ...career,
            relevanceScore: calculateCareerRelevance(career, searchTerms),
          }))
          .filter(c => c.relevanceScore && c.relevanceScore > 0)
          .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
      }

      const limit = params.limit || 20;

      return {
        success: true,
        data: filteredData.slice(0, limit),
        metadata: {
          totalAvailable: transformedData.length,
          returned: Math.min(filteredData.length, limit),
          filtered: filteredData.length > limit,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch Lightcast data: ${error}`,
      };
    }
  },
};

// Main MCP handler
export async function handleMCPRequest(
  request: MCPRequest
): Promise<MCPResponse> {
  const tool = request.tool as keyof typeof mcpTools;
  const handler = mcpTools[tool];

  if (!handler) {
    return {
      success: false,
      error: `Unknown tool: ${request.tool}`,
    };
  }

  try {
    return await (handler as any)(request.params);
  } catch (error) {
    return {
      success: false,
      error: `MCP execution failed: ${error}`,
    };
  }
}

// Export for use in API routes
const mcpServer = {
  handleMCPRequest,
  tools: Object.keys(mcpTools),
};

export default mcpServer;
