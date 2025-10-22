/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/lib/helpers/pathway-aggregator.ts

import { HSDataTool } from "@/app/lib/tools/jsonl-tools";

interface AggregatedHSProgram {
  name: string;
  schools: string[];
  schoolCount: number;
  details?: {
    coursesByGrade?: {
      "9TH_GRADE_COURSES"?: string[];
      "10TH_GRADE_COURSES"?: string[];
      "11TH_GRADE_COURSES"?: string[];
      "12TH_GRADE_COURSES"?: string[];
    };
    coursesByLevel?: {
      LEVEL_1_POS_COURSES?: string[];
      LEVEL_2_POS_COURSES?: string[];
      LEVEL_3_POS_COURSES?: string[];
      LEVEL_4_POS_COURSES?: string[];
      RECOMMENDED_COURSES?: string[];
    };
  };
}

interface AggregatedCollegeProgram {
  cipCode: string;
  programFamily: string; // Base program name (e.g., "Agriculture")
  programNames: string[]; // All specific variants
  campuses: string[];
  campusCount: number;
  variantCount: number; // How many specializations
}

/**
 * Aggregates high school programs and removes duplicates
 * This is critical for preventing the same program from appearing multiple times
 * when it has multiple POS levels
 */
export async function aggregateHighSchoolPrograms(
  programs: Array<{ program: any; schools: string[] }>
): Promise<AggregatedHSProgram[]> {
  const hsDataTool = new HSDataTool();

  // Use a Map to deduplicate by program name
  const programMap = new Map<string, AggregatedHSProgram>();

  for (const { program, schools } of programs) {
    const programName = program.PROGRAM_OF_STUDY;

    // If we've already seen this program, just update schools if needed
    if (programMap.has(programName)) {
      const existing = programMap.get(programName)!;
      // Merge schools (remove duplicates)
      const mergedSchools = Array.from(
        new Set([...existing.schools, ...schools])
      );
      existing.schools = mergedSchools;
      existing.schoolCount = mergedSchools.length;
      continue;
    }

    // First time seeing this program - fetch all course details
    try {
      const [coursesByGrade, coursesByLevel] = await Promise.all([
        hsDataTool.getCoursesByGrade(programName),
        hsDataTool.getCoursesByLevel(programName),
      ]);

      const aggregatedProgram: AggregatedHSProgram = {
        name: programName,
        schools: schools,
        schoolCount: schools.length,
        details: {
          coursesByGrade: coursesByGrade
            ? {
                "9TH_GRADE_COURSES": coursesByGrade["9TH_GRADE_COURSES"],
                "10TH_GRADE_COURSES": coursesByGrade["10TH_GRADE_COURSES"],
                "11TH_GRADE_COURSES": coursesByGrade["11TH_GRADE_COURSES"],
                "12TH_GRADE_COURSES": coursesByGrade["12TH_GRADE_COURSES"],
              }
            : undefined,
          coursesByLevel: coursesByLevel
            ? {
                LEVEL_1_POS_COURSES: coursesByLevel.LEVEL_1_POS_COURSES,
                LEVEL_2_POS_COURSES: coursesByLevel.LEVEL_2_POS_COURSES,
                LEVEL_3_POS_COURSES: coursesByLevel.LEVEL_3_POS_COURSES,
                LEVEL_4_POS_COURSES: coursesByLevel.LEVEL_4_POS_COURSES,
                RECOMMENDED_COURSES: coursesByLevel.RECOMMENDED_COURSES,
              }
            : undefined,
        },
      };

      programMap.set(programName, aggregatedProgram);
    } catch (error) {
      console.error(`Error fetching course details for ${programName}:`, error);
      // Still add the program without details
      programMap.set(programName, {
        name: programName,
        schools: schools,
        schoolCount: schools.length,
      });
    }
  }

  // Convert map to array and sort by name
  return Array.from(programMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

/**
 * Extract base program name from a full program name
 * Example: "Agriculture (Bachelor of Science - Agribusiness)" -> "Agriculture"
 */
function extractBaseProgramName(fullName: string): string {
  // Remove everything in parentheses and trim
  const baseName = fullName.replace(/\s*\([^)]*\)/g, "").trim();
  return baseName || fullName; // Fallback to full name if extraction fails
}

/**
 * Aggregates college programs by CIP code, properly handling all program name variants
 * This is CRITICAL because each CIP can have 10-20 different program variants
 */
export function aggregateCollegePrograms(
  programs: Array<{ program: any; campuses: string[] }>
): AggregatedCollegeProgram[] {
  // Group by CIP code since that's the real identifier
  const cipMap = new Map<
    string,
    {
      cipCode: string;
      programFamily: string;
      allProgramNames: Set<string>;
      campuses: Set<string>;
    }
  >();

  for (const { program, campuses } of programs) {
    const cipCode = program.CIP_CODE;

    // Handle both single strings and arrays of program names
    const programNames = Array.isArray(program.PROGRAM_NAME)
      ? program.PROGRAM_NAME
      : [program.PROGRAM_NAME];

    if (!cipMap.has(cipCode)) {
      // Extract base name from first program variant
      const baseName = extractBaseProgramName(programNames[0]);

      cipMap.set(cipCode, {
        cipCode,
        programFamily: baseName,
        allProgramNames: new Set(programNames),
        campuses: new Set(campuses),
      });
    } else {
      const existing = cipMap.get(cipCode)!;
      // Add all program name variants
      programNames.forEach((name: string) => existing.allProgramNames.add(name));
      // Merge campuses
      campuses.forEach(c => existing.campuses.add(c));
    }
  }

  // Convert to final format
  return Array.from(cipMap.values())
    .map(({ cipCode, programFamily, allProgramNames, campuses }) => ({
      cipCode,
      programFamily,
      programNames: Array.from(allProgramNames).sort(),
      campuses: Array.from(campuses).sort(),
      campusCount: campuses.size,
      variantCount: allProgramNames.size,
    }))
    .sort((a, b) => a.programFamily.localeCompare(b.programFamily));
}

/**
 * Format for frontend - simplified version without all variants
 */
export function formatCollegeProgramsForFrontend(
  aggregatedPrograms: AggregatedCollegeProgram[]
): Array<{
  name: string;
  campuses: string[];
  campusCount: number;
  variants?: string[]; // Optional: include top variants
}> {
  return aggregatedPrograms.map(prog => {
    // Include top 3 variants as examples
    const topVariants = prog.programNames.slice(0, 3);

    return {
      name: prog.programFamily,
      campuses: prog.campuses,
      campusCount: prog.campusCount,
      variants: prog.variantCount > 1 ? topVariants : undefined,
    };
  });
}

/**
 * Creates a formatted response with proper aggregation
 */
export async function formatPathwayResponse(pathwayData: {
  highSchoolPrograms: Array<{ program: any; schools: string[] }>;
  collegePrograms: Array<{ program: any; campuses: string[] }>;
  careers: any[];
}): Promise<{
  highSchoolPrograms: AggregatedHSProgram[];
  collegePrograms: Array<{
    name: string;
    campuses: string[];
    campusCount: number;
    variants?: string[];
  }>;
  careers: Array<{ title: string; cipCode: string }>;
  summary: {
    totalHighSchoolPrograms: number;
    totalHighSchools: number;
    totalCollegePrograms: number;
    totalCollegeCampuses: number;
    totalCareerPaths: number;
  };
}> {
  // Aggregate and deduplicate high school programs
  const aggregatedHSPrograms = await aggregateHighSchoolPrograms(
    pathwayData.highSchoolPrograms
  );

  // Aggregate college programs by CIP code
  const aggregatedCollegePrograms = aggregateCollegePrograms(
    pathwayData.collegePrograms
  );

  // Format for frontend
  const formattedCollegePrograms = formatCollegeProgramsForFrontend(
    aggregatedCollegePrograms
  );

  // Count unique high schools
  const uniqueHighSchools = new Set<string>();
  aggregatedHSPrograms.forEach(prog =>
    prog.schools.forEach(s => uniqueHighSchools.add(s))
  );

  // Count unique college campuses
  const uniqueCollegeCampuses = new Set<string>();
  aggregatedCollegePrograms.forEach(prog =>
    prog.campuses.forEach(c => uniqueCollegeCampuses.add(c))
  );

  // Format careers
  const formattedCareers = pathwayData.careers.map(career => ({
    title:
      career.SOC_TITLE ||
      career.TITLE ||
      career.SOC_CODE ||
      "Career Opportunity",
    cipCode: career.CIP_CODE || "",
  }));

  return {
    highSchoolPrograms: aggregatedHSPrograms,
    collegePrograms: formattedCollegePrograms,
    careers: formattedCareers,
    summary: {
      totalHighSchoolPrograms: aggregatedHSPrograms.length,
      totalHighSchools: uniqueHighSchools.size,
      totalCollegePrograms: aggregatedCollegePrograms.length, // Now counts by CIP, not by variant
      totalCollegeCampuses: uniqueCollegeCampuses.size,
      totalCareerPaths: formattedCareers.length,
    },
  };
}
