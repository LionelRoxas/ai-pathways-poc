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
 * Intelligently extract base program name from a full program name
 * Handles multiple formats and edge cases
 * 
 * Examples:
 * - "Agriculture (Bachelor of Science - Agribusiness)" → "Agriculture"
 * - "Information& Computer Sciences (Associate...)" → "Information & Computer Sciences" (fixes spacing)
 * - "Computer Science (BS)" → "Computer Science"
 */
function extractBaseProgramName(fullName: string): string {
  // STEP 1: Fix common data issues (missing spaces around &)
  const cleaned = fullName.replace(/(\w)&(\w)/g, '$1 & $2'); // "Information&Computer" → "Information & Computer"
  
  // STEP 2: Remove everything in parentheses
  const baseName = cleaned.replace(/\s*\([^)]*\)/g, "").trim();
  
  // STEP 3: Convert & to "and" (with proper spacing)
  const withAnd = baseName.replace(/\s*&\s*/g, ' and '); // "Information & Computer" → "Information and Computer"
  
  // STEP 4: Clean up extra whitespace
  const normalized = withAnd.replace(/\s+/g, ' ').trim();
  
  return normalized || fullName; // Fallback to full name if extraction fails
}

/**
 * Intelligent program name selector - finds the most representative program name
 * Uses multi-tier prioritization for maximum accuracy
 */
function findRepresentativeProgramName(programNames: string[]): string {
  if (programNames.length === 0) return "";
  if (programNames.length === 1) return programNames[0];

  console.log(`[Aggregator] Analyzing ${programNames.length} program variants to find best representative name`);

  // PRIORITY 1: Bachelor's degree WITHOUT specialization (e.g., "Computer Science (Bachelor of Science)")
  // This is the cleanest, most canonical form
  const cleanBachelor = programNames.find(name => 
    /\(Bachelor of (Science|Arts)\)$/i.test(name) // Must end with "(Bachelor of Science)" or "(Bachelor of Arts)"
  );
  
  if (cleanBachelor) {
    console.log(`[Aggregator] ✓ Found clean Bachelor's degree: "${cleanBachelor}"`);
    return cleanBachelor;
  }

  // PRIORITY 2: Bachelor's degree with specialization (e.g., "Computer Science (Bachelor of Science - Data Science)")
  const bachelorWithSpec = programNames.find(name => 
    /Bachelor of (Science|Arts)\s*-/i.test(name)
  );
  
  if (bachelorWithSpec) {
    console.log(`[Aggregator] ✓ Found Bachelor's with specialization: "${bachelorWithSpec}"`);
    return bachelorWithSpec;
  }

  // PRIORITY 3: Associate degree (second most common entry point)
  const associate = programNames.find(name => 
    /Associate (in|of) (Science|Arts|Applied Science)(?!\s*-)/i.test(name)
  );
  
  if (associate) {
    console.log(`[Aggregator] ✓ Found Associate degree: "${associate}"`);
    return associate;
  }

  // PRIORITY 4: Find the most common base name across all variants
  // This handles cases where there's no standard degree format
  const baseNames = programNames.map(name => extractBaseProgramName(name));
  const nameCounts = new Map<string, number>();
  
  baseNames.forEach(base => {
    nameCounts.set(base, (nameCounts.get(base) || 0) + 1);
  });

  // Find the base name that appears most frequently
  let mostCommonBase = baseNames[0];
  let maxCount = 0;
  
  nameCounts.forEach((count, baseName) => {
    // Prefer longer, more specific base names when counts are equal
    if (count > maxCount || (count === maxCount && baseName.length > mostCommonBase.length)) {
      maxCount = count;
      mostCommonBase = baseName;
    }
  });

  console.log(`[Aggregator] ✓ Most common base name: "${mostCommonBase}" (appears ${maxCount}/${programNames.length} times)`);

  // PRIORITY 5: Among programs with the most common base, prefer:
  // 1. Shortest program name (less specialized)
  // 2. One without "Certificate" or "Graduate" (undergraduate focus)
  const matchingPrograms = programNames.filter(name => 
    extractBaseProgramName(name) === mostCommonBase
  );

  // Filter out certificates and graduate-only programs if we have other options
  let preferred = matchingPrograms.filter(name => 
    !/(Certificate|Graduate Certificate|Subject Certificate)/i.test(name)
  );

  if (preferred.length === 0) {
    preferred = matchingPrograms; // Fall back if all are certificates
  }

  // Sort by length (shorter = more general = better representative)
  preferred.sort((a, b) => a.length - b.length);

  const selected = preferred[0];
  console.log(`[Aggregator] ✓ Final selection: "${selected}"`);
  
  return selected;
}

/**
 * Intelligently aggregates college programs by CIP code
 * Handles all program name variants and selects the best representative name
 */
export function aggregateCollegePrograms(
  programs: Array<{ program: any; campuses: string[] }>
): AggregatedCollegeProgram[] {
  console.log(`[Aggregator] Starting aggregation of ${programs.length} college program entries`);
  
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
      // First time seeing this CIP code - select the best representative name
      console.log(`[Aggregator] 📚 New CIP ${cipCode}: Analyzing ${programNames.length} variants`);
      
      const representativeName = findRepresentativeProgramName(programNames);
      const baseName = extractBaseProgramName(representativeName);

      console.log(`[Aggregator] → Selected display name: "${baseName}" (from "${representativeName}")`);

      cipMap.set(cipCode, {
        cipCode,
        programFamily: baseName,
        allProgramNames: new Set(programNames),
        campuses: new Set(campuses),
      });
    } else {
      // Already seen this CIP - merge data
      const existing = cipMap.get(cipCode)!;
      
      // Add any new program name variants
      const newVariants = programNames.filter((name: string) => !existing.allProgramNames.has(name));
      if (newVariants.length > 0) {
        console.log(`[Aggregator] → CIP ${cipCode}: Adding ${newVariants.length} new variants`);
        programNames.forEach((name: string) => existing.allProgramNames.add(name));
      }
      
      // Merge campuses
      const newCampuses = campuses.filter(c => !existing.campuses.has(c));
      if (newCampuses.length > 0) {
        console.log(`[Aggregator] → CIP ${cipCode}: Adding ${newCampuses.length} new campuses`);
        campuses.forEach(c => existing.campuses.add(c));
      }
    }
  }

  // Convert to final format
  const results = Array.from(cipMap.values())
    .map(({ cipCode, programFamily, allProgramNames, campuses }) => ({
      cipCode,
      programFamily,
      programNames: Array.from(allProgramNames).sort(),
      campuses: Array.from(campuses).sort(),
      campusCount: campuses.size,
      variantCount: allProgramNames.size,
    }))
    .sort((a, b) => a.programFamily.localeCompare(b.programFamily));

  console.log(`[Aggregator] ✅ Aggregated ${programs.length} entries → ${results.length} unique programs`);
  console.log(`[Aggregator] Program breakdown:`);
  results.slice(0, 5).forEach(prog => {
    console.log(`  • ${prog.programFamily} (CIP ${prog.cipCode}): ${prog.variantCount} variants, ${prog.campusCount} campuses`);
  });

  return results;
}

/**
 * Intelligently format programs for frontend display
 * Selects the most relevant variants to show users
 */
export function formatCollegeProgramsForFrontend(
  aggregatedPrograms: AggregatedCollegeProgram[]
): Array<{
  name: string;
  campuses: string[];
  campusCount: number;
  variants?: string[]; // Optional: include top variants
  variantCount?: number;
}> {
  return aggregatedPrograms.map(prog => {
    // Smart variant selection: Show the most common degree types
    const variants = prog.programNames;
    
    // Prioritize showing these types in order:
    const priorityOrder = [
      (name: string) => /\(Bachelor of Science\)$/i.test(name), // Clean BS
      (name: string) => /\(Bachelor of Arts\)$/i.test(name), // Clean BA
      (name: string) => /\(Associate in Science\)$/i.test(name), // Clean AS
      (name: string) => /Bachelor of Science - /i.test(name), // BS with specialization
      (name: string) => /Bachelor of Arts - /i.test(name), // BA with specialization
      (name: string) => /Associate/i.test(name), // Any associate
      (name: string) => /Certificate of Achievement/i.test(name), // Certificates
      (name: string) => /Master/i.test(name), // Graduate programs
      (name: string) => /Doctor/i.test(name), // Doctoral programs
    ];

    // Score each variant based on priority
    const scoredVariants = variants.map(name => {
      const priorityIndex = priorityOrder.findIndex(test => test(name));
      return {
        name,
        score: priorityIndex >= 0 ? priorityOrder.length - priorityIndex : 0
      };
    });

    // Sort by score (highest first) - show all variants
    const topVariants = scoredVariants
      .sort((a, b) => b.score - a.score)
      .map(v => v.name);

    return {
      name: prog.programFamily,
      campuses: prog.campuses,
      campusCount: prog.campusCount,
      variants: prog.variantCount > 1 ? topVariants : undefined,
      variantCount: prog.variantCount,
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
