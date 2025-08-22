/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/mcp/pathways-mcp-server.ts
// Simplified MCP Server - Focus on clean database queries

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Core Types
export interface MCPRequest {
  tool: string;
  params: Record<string, any>;
}

export interface MCPResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// MCP Tools - Simple database queries
export const mcpTools = {
  // 1. Get careers with filters
  async getCareers(params: {
    interests?: string[];
    educationLevel?: string;
    limit?: number;
  }): Promise<MCPResponse> {
    try {
      const careers = await prisma.career.findMany({
        include: {
          jobMarket: true,
          careerSkills: {
            include: {
              skillCert: true,
            },
          },
          companyCareers: {
            include: {
              company: true,
            },
          },
        },
        take: params.limit || 10,
      });

      // Simple interest filtering if provided
      let filtered = careers;
      if (params.interests?.length) {
        const interestMap: Record<string, string[]> = {
          technology: [
            "Software Developer",
            "Data Analyst",
            "Cybersecurity Analyst",
          ],
          healthcare: ["Registered Nurse", "Physical Therapist"],
          business: ["Business Analyst", "Financial Advisor"],
          environment: ["Marine Biologist", "Solar Panel Installer"],
        };

        const relevantTitles = new Set<string>();
        params.interests.forEach(interest => {
          interestMap[interest]?.forEach(title => relevantTitles.add(title));
        });

        if (relevantTitles.size > 0) {
          filtered = careers.filter(c => relevantTitles.has(c.title));
        }
      }

      return {
        success: true,
        data: filtered.map(career => ({
          id: career.id,
          title: career.title,
          description: career.description,
          salaryMin: career.salaryMin,
          salaryMax: career.salaryMax,
          requiredEducation: career.requiredEducation,
          skills: career.skills,
          industries: career.industries,
          jobOutlook: career.jobOutlook,
          growthRate: career.growthRate,
          currentOpenings: career.companyCareers.reduce(
            (sum, cc) => sum + cc.currentOpenings,
            0
          ),
          hiringCompanies: career.companyCareers
            .map(cc => cc.company.name)
            .slice(0, 5),
        })),
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get careers: ${error}`,
      };
    }
  },

  // 2. Get education programs
  async getEducationPrograms(params: {
    careerIds?: string[];
    degreeTypes?: string[];
    maxDuration?: number;
    limit?: number;
  }): Promise<MCPResponse> {
    try {
      const where: any = {};

      if (params.careerIds?.length) {
        where.careerPathways = {
          some: {
            careerId: { in: params.careerIds },
          },
        };
      }

      if (params.degreeTypes?.length) {
        where.degreeType = { in: params.degreeTypes };
      }

      if (params.maxDuration) {
        where.durationYears = { lte: params.maxDuration };
      }

      const programs = await prisma.educationProgram.findMany({
        where,
        include: {
          careerPathways: {
            include: {
              career: true,
            },
          },
        },
        take: params.limit || 10,
      });

      return {
        success: true,
        data: programs.map(program => ({
          id: program.id,
          institution: program.institution,
          campus: program.campus,
          programName: program.programName,
          degreeType: program.degreeType,
          durationYears: program.durationYears,
          tuitionResident: program.tuitionResident,
          tuitionNonresident: program.tuitionNonresident,
          admissionRequirements: program.admissionRequirements,
          graduationRate: program.graduationRate,
          employmentRate: program.employmentRate,
          medianStartingSalary: program.medianStartingSalary,
          relatedCareers: program.careerPathways.map(cp => cp.career.title),
        })),
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get education programs: ${error}`,
      };
    }
  },

  // 3. Get job market data
  async getJobMarketData(params: {
    careerIds?: string[];
    region?: string;
  }): Promise<MCPResponse> {
    try {
      const where: any = {};

      if (params.careerIds?.length) {
        where.careerId = { in: params.careerIds };
      }

      if (params.region) {
        where.region = params.region;
      }

      const marketData = await prisma.jobMarket.findMany({
        where,
        include: {
          career: true,
        },
      });

      // Aggregate statistics
      const stats = {
        totalOpenings: marketData.reduce(
          (sum, d) => sum + d.jobPostingsCount,
          0
        ),
        avgGrowthRate:
          marketData.length > 0
            ? marketData.reduce(
                (sum, d) => sum + (d.jobPostingsGrowth || 0),
                0
              ) / marketData.length
            : 0,
        avgRemotePercentage:
          marketData.length > 0
            ? marketData.reduce(
                (sum, d) => sum + (d.remoteWorkPercentage || 0),
                0
              ) / marketData.length
            : 0,
        regions: [...new Set(marketData.map(d => d.region).filter(Boolean))],
      };

      return {
        success: true,
        data: {
          stats,
          details: marketData.map(data => ({
            careerId: data.careerId,
            careerTitle: data.career.title,
            region: data.region,
            location: data.location,
            occupationCode: data.occupationCode,
            jobPostingsCount: data.jobPostingsCount,
            jobPostingsGrowth: data.jobPostingsGrowth,
            uniqueCompaniesHiring: data.uniqueCompaniesHiring,
            remoteWorkPercentage: data.remoteWorkPercentage,
            hybridWorkPercentage: data.hybridWorkPercentage,
            competitionLevel: data.competitionLevel,
            avgTimeToFillDays: data.avgTimeToFillDays,
            seasonalDemand: data.seasonalDemand,
            peakHiringMonths: data.peakHiringMonths,
          })),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get job market data: ${error}`,
      };
    }
  },

  // 4. Get skills and certifications
  async getSkills(params: {
    careerIds?: string[];
    category?: string;
    onlineOnly?: boolean;
    limit?: number;
  }): Promise<MCPResponse> {
    try {
      const where: any = {};

      if (params.careerIds?.length) {
        where.careerSkills = {
          some: {
            careerId: { in: params.careerIds },
          },
        };
      }

      if (params.category) {
        where.category = params.category;
      }

      if (params.onlineOnly) {
        where.onlineAvailable = true;
      }

      const skills = await prisma.skillCertification.findMany({
        where,
        include: {
          careerSkills: {
            include: {
              career: true,
            },
          },
        },
        take: params.limit || 10,
      });

      return {
        success: true,
        data: skills.map(skill => ({
          id: skill.id,
          name: skill.name,
          type: skill.type,
          category: skill.category,
          demandLevel: skill.demandLevel,
          growthTrend: skill.growthTrend,
          timeToAcquireMonths: skill.timeToAcquireMonths,
          costEstimate: skill.costEstimate,
          onlineAvailable: skill.onlineAvailable,
          hawaiiSpecific: skill.hawaiiSpecific,
          avgSalaryBoost: skill.avgSalaryBoost,
          relatedCareers: skill.careerSkills.map(cs => cs.career.title),
        })),
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get skills: ${error}`,
      };
    }
  },

  // 5. Get companies
  async getCompanies(params: {
    careerIds?: string[];
    industry?: string;
    entryLevelOnly?: boolean;
    limit?: number;
  }): Promise<MCPResponse> {
    try {
      const where: any = {};

      if (params.careerIds?.length) {
        where.companyCareers = {
          some: {
            careerId: { in: params.careerIds },
          },
        };
      }

      if (params.industry) {
        where.industry = params.industry;
      }

      if (params.entryLevelOnly) {
        where.entryLevelFriendly = true;
      }

      const companies = await prisma.company.findMany({
        where,
        include: {
          companyCareers: {
            include: {
              career: true,
            },
          },
        },
        take: params.limit || 10,
      });

      return {
        success: true,
        data: companies.map(company => ({
          id: company.id,
          name: company.name,
          industry: company.industry,
          sizeCategory: company.sizeCategory,
          hawaiiLocations: company.hawaiiLocations,
          website: company.website,
          entryLevelFriendly: company.entryLevelFriendly,
          remoteWorkPolicy: company.remoteWorkPolicy,
          currentOpenings: company.companyCareers.reduce(
            (sum, cc) => sum + cc.currentOpenings,
            0
          ),
          hiringForCareers: company.companyCareers.map(cc => cc.career.title),
        })),
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get companies: ${error}`,
      };
    }
  },

  // 6. Get DOE courses
  async getDoeCourses(params: {
    careerCodes?: string[];
    subjectArea?: string;
    limit?: number;
  }): Promise<MCPResponse> {
    try {
      const where: any = {};

      if (params.careerCodes?.length) {
        where.careerRelevance = {
          hasSome: params.careerCodes,
        };
      }

      if (params.subjectArea) {
        where.subjectArea = params.subjectArea;
      }

      const courses = await prisma.doeCourse.findMany({
        where,
        take: params.limit || 10,
      });

      return {
        success: true,
        data: courses.map(course => ({
          id: course.id,
          courseCode: course.courseCode,
          courseName: course.courseName,
          subjectArea: course.subjectArea,
          gradeLevels: course.gradeLevels,
          courseType: course.courseType,
          description: course.description,
          skillsDeveloped: course.skillsDeveloped,
          collegeCreditAvailable: course.collegeCreditAvailable,
          careerRelevance: course.careerRelevance,
        })),
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get DOE courses: ${error}`,
      };
    }
  },

  // 7. Get training programs
  async getTrainingPrograms(params: {
    courseType?: string;
    format?: string;
    limit?: number;
  }): Promise<MCPResponse> {
    try {
      const where: any = {};

      if (params.courseType) {
        where.courseType = params.courseType;
      }

      if (params.format) {
        where.format = params.format;
      }

      const programs = await prisma.nonCreditCourse.findMany({
        where,
        orderBy: {
          nextStartDate: "asc",
        },
        take: params.limit || 10,
      });

      return {
        success: true,
        data: programs.map(program => ({
          id: program.id,
          provider: program.provider,
          courseName: program.courseName,
          courseType: program.courseType,
          durationWeeks: program.durationWeeks,
          cost: program.cost,
          format: program.format,
          scheduleType: program.scheduleType,
          jobPlacementRate: program.jobPlacementRate,
          nextStartDate: program.nextStartDate,
          registrationUrl: program.registrationUrl,
          learningOutcomes: program.learningOutcomes,
        })),
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get training programs: ${error}`,
      };
    }
  },

  // 8. Get database statistics
  async getDatabaseStats(): Promise<MCPResponse> {
    try {
      const [
        careerCount,
        programCount,
        marketCount,
        skillCount,
        companyCount,
        doeCount,
        trainingCount,
      ] = await Promise.all([
        prisma.career.count(),
        prisma.educationProgram.count(),
        prisma.jobMarket.count(),
        prisma.skillCertification.count(),
        prisma.company.count(),
        prisma.doeCourse.count(),
        prisma.nonCreditCourse.count(),
      ]);

      return {
        success: true,
        data: {
          careers: careerCount,
          educationPrograms: programCount,
          jobMarketData: marketCount,
          skills: skillCount,
          companies: companyCount,
          doeCourses: doeCount,
          trainingPrograms: trainingCount,
          total:
            careerCount +
            programCount +
            marketCount +
            skillCount +
            companyCount +
            doeCount +
            trainingCount,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get database stats: ${error}`,
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
    return await handler(request.params);
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
