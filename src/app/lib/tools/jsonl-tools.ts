/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/lib/tools/jsonl-tools.ts
import { getJSONLReader } from "@/app/lib/tools/jsonl-reader";
import { DirectSearchTracer } from "./direct-search-tracer";

/**
 * ENHANCED JSONL PARSING TOOLS WITH COMPLETE RELATIONSHIP TRACING
 * These tools now include comprehensive relationship mapping methods
 */

export interface HSProgram {
  COURSES_BY_GRADE: any;
  PROGRAM_OF_STUDY: string;
  CIP_2DIGIT?: string[];
  HIGH_SCHOOL?: string[];
  "9TH_GRADE_COURSES"?: string[];
  "10TH_GRADE_COURSES"?: string[];
  "11TH_GRADE_COURSES"?: string[];
  "12TH_GRADE_COURSES"?: string[];
  LEVEL_1_POS_COURSES?: string[];
  LEVEL_2_POS_COURSES?: string[];
  LEVEL_3_POS_COURSES?: string[];
  LEVEL_4_POS_COURSES?: string[];
  RECOMMENDED_COURSES?: string[];
}

export interface CollegeProgram {
  CIP_CODE: string;
  PROGRAM_NAME: string | string[];
  CAMPUS?: string | string[];
}

export interface CIPMapping {
  CIP_2DIGIT: string;
  CIP_CODE?: string[];
  CATEGORY_NAME?: string;
}

export interface CareerMapping {
  CIP_CODE: string;
  SOC_CODE?: string[];
}

export interface CompletePathway {
  highSchoolPrograms: Array<{
    program: HSProgram;
    schools: string[];
    courses: any;
  }>;
  collegePrograms: Array<{
    program: CollegeProgram;
    campuses: string[];
  }>;
  careers: CareerMapping[];
  cipMappings: CIPMapping[];
}

/**
 * Enhanced High School Data Tool with relationship tracing
 */
export class HSDataTool {
  private reader: any;

  constructor() {
    this.reader = getJSONLReader();
  }

  async getAllPrograms(): Promise<HSProgram[]> {
    return await this.reader.readFile(
      "highschool_pos_to_cip2digit_mapping.jsonl"
    );
  }

  async getProgramsByCIP2Digit(cip2Digits: string[]): Promise<HSProgram[]> {
    const allPrograms = await this.getAllPrograms();
    return allPrograms.filter(program =>
      program.CIP_2DIGIT?.some(cip => cip2Digits.includes(cip))
    );
  }

  async getProgramByName(name: string): Promise<HSProgram | null> {
    const allPrograms = await this.getAllPrograms();
    return (
      allPrograms.find(
        p => p.PROGRAM_OF_STUDY.toLowerCase() === name.toLowerCase()
      ) || null
    );
  }

  async getCoursesByGrade(programName: string): Promise<any> {
    const courses = await this.reader.readFile("pos_to_courses_by_grade.jsonl");
    return courses.find((c: any) => c.PROGRAM_OF_STUDY === programName);
  }

  async getCoursesByLevel(programName: string): Promise<any> {
    const courses = await this.reader.readFile("pos_to_courses_by_level.jsonl");
    return courses.find((c: any) => c.PROGRAM_OF_STUDY === programName);
  }

  async getSchoolsForProgram(programName: string): Promise<string[]> {
    const schools = await this.reader.readFile(
      "pos_to_highschool_mapping.jsonl"
    );
    const record = schools.find((s: any) => s.PROGRAM_OF_STUDY === programName);
    return record?.HIGH_SCHOOL || [];
  }

  /**
   * NEW: Get complete program information including all relationships
   */
  async getCompleteProgramInfo(programName: string): Promise<{
    program: HSProgram | null;
    schools: string[];
    coursesByGrade: any;
    coursesByLevel: any;
  }> {
    const [program, schools, coursesByGrade, coursesByLevel] =
      await Promise.all([
        this.getProgramByName(programName),
        this.getSchoolsForProgram(programName),
        this.getCoursesByGrade(programName),
        this.getCoursesByLevel(programName),
      ]);

    return {
      program,
      schools,
      coursesByGrade,
      coursesByLevel,
    };
  }

  /**
   * NEW: Search programs with fuzzy matching and get all details
   */
  async searchProgramsWithDetails(keywords: string[]): Promise<
    Array<{
      program: HSProgram;
      schools: string[];
      matchScore: number;
    }>
  > {
    const allPrograms = await this.getAllPrograms();
    const results = [];

    for (const program of allPrograms) {
      let score = 0;
      const programNameLower = program.PROGRAM_OF_STUDY.toLowerCase();

      for (const keyword of keywords) {
        const keywordLower = keyword.toLowerCase();
        if (programNameLower === keywordLower) score += 10;
        else if (programNameLower.includes(keywordLower)) score += 5;
        else if (
          programNameLower
            .split(/[\s-_]+/)
            .some(word => word.startsWith(keywordLower))
        )
          score += 3;
      }

      if (score > 0) {
        const schools = await this.getSchoolsForProgram(
          program.PROGRAM_OF_STUDY
        );
        results.push({ program, schools, matchScore: score });
      }
    }

    return results.sort((a, b) => b.matchScore - a.matchScore);
  }
}

/**
 * Enhanced College Data Tool with comprehensive campus tracking
 */
export class CollegeDataTool {
  private reader: any;

  constructor() {
    this.reader = getJSONLReader();
  }

  async getAllPrograms(): Promise<CollegeProgram[]> {
    return await this.reader.readFile("cip_to_program_mapping.jsonl");
  }

  async getProgramsByCIP(cipCodes: string[]): Promise<CollegeProgram[]> {
    const allPrograms = await this.getAllPrograms();
    return allPrograms.filter(p => cipCodes.includes(p.CIP_CODE));
  }

  async getCampusesByCIP(cipCode: string): Promise<string[]> {
    const campuses = await this.reader.readFile("cip_to_campus_mapping.jsonl");
    const record = campuses.find((c: any) => c.CIP_CODE === cipCode);
    if (!record?.CAMPUS) return [];
    return Array.isArray(record.CAMPUS) ? record.CAMPUS : [record.CAMPUS];
  }

  async getAllCampuses(): Promise<Record<string, string[]>> {
    const campuses = await this.reader.readFile("cip_to_campus_mapping.jsonl");
    const campusMap: Record<string, string[]> = {};

    for (const record of campuses) {
      if (record.CAMPUS) {
        campusMap[record.CIP_CODE] = Array.isArray(record.CAMPUS)
          ? record.CAMPUS
          : [record.CAMPUS];
      }
    }

    return campusMap;
  }

  /**
   * NEW: Get programs with all campus information
   */
  async getProgramsWithCampuses(cipCodes: string[]): Promise<
    Array<{
      program: CollegeProgram;
      campuses: string[];
    }>
  > {
    const programs = await this.getProgramsByCIP(cipCodes);
    const results = [];

    for (const program of programs) {
      const campuses = await this.getCampusesByCIP(program.CIP_CODE);
      results.push({ program, campuses });
    }

    return results;
  }

  /**
   * NEW: Search college programs and include campus information
   */
  async searchProgramsWithCampuses(keywords: string[]): Promise<
    Array<{
      program: CollegeProgram;
      campuses: string[];
      matchScore: number;
    }>
  > {
    const allPrograms = await this.getAllPrograms();
    const results = [];

    for (const program of allPrograms) {
      let score = 0;
      const programNames = Array.isArray(program.PROGRAM_NAME)
        ? program.PROGRAM_NAME
        : [program.PROGRAM_NAME];

      for (const name of programNames) {
        const nameLower = name.toLowerCase();
        for (const keyword of keywords) {
          const keywordLower = keyword.toLowerCase();
          if (nameLower === keywordLower) score += 10;
          else if (nameLower.includes(keywordLower)) score += 5;
          else if (
            nameLower
              .split(/[\s-_]+/)
              .some(word => word.startsWith(keywordLower))
          )
            score += 3;
        }
      }

      if (score > 0) {
        const campuses = await this.getCampusesByCIP(program.CIP_CODE);
        results.push({ program, campuses, matchScore: score });
      }
    }

    return results.sort((a, b) => b.matchScore - a.matchScore);
  }
}

/**
 * Enhanced CIP Mapping Tool with bidirectional mapping
 */
export class CIPMappingTool {
  private reader: any;
  private cacheMap: Map<string, any> = new Map();

  constructor() {
    this.reader = getJSONLReader();
  }

  async expandCIP2Digits(cip2Digits: string[]): Promise<string[]> {
    const mappings = await this.reader.readFile(
      "cip2digit_to_cip_mapping.jsonl"
    );

    const fullCIPs = new Set<string>();
    for (const mapping of mappings) {
      if (cip2Digits.includes(mapping.CIP_2DIGIT)) {
        if (Array.isArray(mapping.CIP_CODE)) {
          mapping.CIP_CODE.forEach((code: string) => fullCIPs.add(code));
        }
      }
    }

    return Array.from(fullCIPs);
  }

  async getCIPCategories(cip2Digits: string[]): Promise<string[]> {
    const mappings = await this.reader.readFile(
      "cip2digit_to_cip_mapping.jsonl"
    );

    const categories = new Set<string>();
    for (const mapping of mappings) {
      if (cip2Digits.includes(mapping.CIP_2DIGIT) && mapping.CATEGORY_NAME) {
        categories.add(mapping.CATEGORY_NAME);
      }
    }

    return Array.from(categories);
  }

  /**
   * NEW: Get complete CIP information
   */
  async getCompleteCIPInfo(cip2Digits: string[]): Promise<{
    fullCIPs: string[];
    categories: string[];
  }> {
    const [fullCIPs, categories] = await Promise.all([
      this.expandCIP2Digits(cip2Digits),
      this.getCIPCategories(cip2Digits),
    ]);

    return { fullCIPs, categories };
  }
}

/**
 * Enhanced Career Data Tool with detailed mapping
 */
export class CareerDataTool {
  private reader: any;

  constructor() {
    this.reader = getJSONLReader();
  }

  async getSOCCodesByCIP(cipCodes: string[]): Promise<CareerMapping[]> {
    const mappings = await this.reader.readFile("cip_to_soc_mapping.jsonl");
    return mappings.filter((m: { CIP_CODE: string; }) => cipCodes.includes(m.CIP_CODE));
  }

  async getAllSOCCodes(cipCodes: string[]): Promise<string[]> {
    const mappings = await this.getSOCCodesByCIP(cipCodes);
    const socCodes = new Set<string>();

    for (const mapping of mappings) {
      if (mapping.SOC_CODE) {
        mapping.SOC_CODE.forEach(soc => socCodes.add(soc));
      }
    }

    return Array.from(socCodes);
  }

  /**
   * NEW: Get detailed career information for CIP codes
   */
  async getDetailedCareerPaths(cipCodes: string[]): Promise<
    {
      cipCode: string;
      socCodes: string[];
      careerCount: number;
    }[]
  > {
    const mappings = await this.getSOCCodesByCIP(cipCodes);
    const results = [];

    for (const cipCode of cipCodes) {
      const cipMappings = mappings.filter(m => m.CIP_CODE === cipCode);
      const socCodes = new Set<string>();

      for (const mapping of cipMappings) {
        if (mapping.SOC_CODE) {
          mapping.SOC_CODE.forEach(soc => socCodes.add(soc));
        }
      }

      results.push({
        cipCode,
        socCodes: Array.from(socCodes),
        careerCount: socCodes.size,
      });
    }

    return results;
  }
}

/**
 * Enhanced Search Tool with relationship awareness
 */
export class SearchTool {
  /**
   * Fuzzy match for search terms
   */
  static fuzzyMatch(text: string, searchTerm: string): boolean {
    const textLower = text.toLowerCase();
    const termLower = searchTerm.toLowerCase();

    // Direct inclusion
    if (textLower.includes(termLower)) return true;

    // Word boundary match
    const words = textLower.split(/[\s-_]+/);
    return words.some(word => word.startsWith(termLower));
  }

  /**
   * Score relevance of a match
   */
  static scoreMatch(text: string, searchTerms: string[]): number {
    let score = 0;
    const textLower = text.toLowerCase();

    for (const term of searchTerms) {
      const termLower = term.toLowerCase();
      if (textLower === termLower)
        score += 10; // Exact match
      else if (textLower.startsWith(termLower))
        score += 5; // Starts with
      else if (textLower.includes(termLower)) score += 2; // Contains
    }

    return score;
  }

  /**
   * Filter and sort results by relevance
   */
  static rankResults<
    T extends { PROGRAM_OF_STUDY?: string; PROGRAM_NAME?: any },
  >(items: T[], searchTerms: string[]): T[] {
    const scored = items.map(item => {
      const text =
        item.PROGRAM_OF_STUDY ||
        (Array.isArray(item.PROGRAM_NAME)
          ? item.PROGRAM_NAME.join(" ")
          : item.PROGRAM_NAME) ||
        "";
      return {
        item,
        score: this.scoreMatch(text, searchTerms),
      };
    });

    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(s => s.item);
  }
}

/**
 * Wrapper class that provides the same interface as the original PathwayTracer
 * but uses DirectSearchTracer under the hood
 */
export class PathwayTracer {
  private directSearchTracer: DirectSearchTracer;

  constructor() {
    const hsDataTool = new HSDataTool();
    const collegeDataTool = new CollegeDataTool();
    const cipMappingTool = new CIPMappingTool();
    const careerDataTool = new CareerDataTool();

    this.directSearchTracer = new DirectSearchTracer(
      hsDataTool,
      collegeDataTool,
      cipMappingTool,
      careerDataTool
    );
  }

  async traceFromKeywords(keywords: string[]): Promise<CompletePathway> {
    return await this.directSearchTracer.traceFromKeywords(keywords);
  }

  async traceFromHighSchool(programName: string): Promise<CompletePathway> {
    return await this.directSearchTracer.traceFromHighSchool(programName);
  }
}

/**
 * Export all tools for easy access
 */
export const Tools = {
  HS: HSDataTool,
  College: CollegeDataTool,
  CIP: CIPMappingTool,
  Career: CareerDataTool,
  Search: SearchTool,
  PathwayTracer: PathwayTracer,
};

export default Tools;
