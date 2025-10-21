/**
 * CIP Code Index System
 *
 * Pre-loads and indexes all CIP code mappings for fast lookups.
 * Serves as the central data access layer for the orchestrator-agent system.
 */

import { JSONLReader, getJSONLReader } from './jsonl-reader';

// Type definitions for JSONL data structures
export interface HSPOSToCIP2Digit {
  PROGRAM_OF_STUDY: string;
  CIP_2DIGIT: string[];
}

export interface CIP2DigitToCIP {
  CATEGORY_NAME: string;
  CIP_2DIGIT: string;
  CIP_CODE: string[];
}

export interface CIPToCampus {
  CIP_CODE: string;
  CAMPUS: string[];
}

export interface CIPToProgram {
  CIP_CODE: string;
  PROGRAM_NAME: string[];
}

export interface CIPToSOC {
  CIP_CODE: string;
  SOC_CODE: string[];
}

export interface POSToCoursesByGrade {
  PROGRAM_OF_STUDY: string;
  '9TH_GRADE_COURSES'?: string[];
  '10TH_GRADE_COURSES'?: string[];
  '11TH_GRADE_COURSES'?: string[];
  '12TH_GRADE_COURSES'?: string[];
}

export interface POSToRecommendedCourses {
  PROGRAM_OF_STUDY: string;
  RECOMMENDED_COURSES?: string[];
  LEVEL_1_POS_COURSES?: string[];
  LEVEL_2_POS_COURSES?: string[];
  LEVEL_3_POS_COURSES?: string[];
  LEVEL_4_POS_COURSES?: string[];
}

export interface POSToHighSchool {
  PROGRAM_OF_STUDY: string;
  HIGH_SCHOOL?: string[];
}

/**
 * CIP Index - Central data access for all CIP mappings
 */
export class CIPIndex {
  private jsonlReader: JSONLReader;
  private initialized: boolean = false;

  // High School to CIP Mappings
  private hsPOSToCIP2: Map<string, string[]> = new Map();
  private cip2ToHSPOS: Map<string, string[]> = new Map(); // Reverse index

  // CIP Category Mappings
  private cip2ToFull: Map<string, string[]> = new Map();
  private fullToCip2: Map<string, string> = new Map(); // Reverse index

  // College Program Mappings
  private cipToCampus: Map<string, string[]> = new Map();
  private cipToProgram: Map<string, string[]> = new Map();
  private campusToCIP: Map<string, string[]> = new Map(); // Reverse index

  // Workforce Mappings
  private cipToSOC: Map<string, string[]> = new Map();
  private socToCIP: Map<string, string[]> = new Map(); // Reverse index

  // High School Program Details
  private posCoursesByGrade: Map<string, POSToCoursesByGrade> = new Map();
  private posRecommendedCourses: Map<string, POSToRecommendedCourses> = new Map();
  private posSchoolInfo: Map<string, POSToHighSchool> = new Map();

  // Keyword search indices
  private keywordToCIP: Map<string, Set<string>> = new Map();
  private keywordToPOS: Map<string, Set<string>> = new Map();

  constructor() {
    this.jsonlReader = getJSONLReader();
  }

  /**
   * Initialize all mappings
   * This should be called once at application startup
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    console.log('Initializing CIP Index...');

    try {
      await Promise.all([
        this.loadHighSchoolMappings(),
        this.loadCIPCategoryMappings(),
        this.loadCollegeMappings(),
        this.loadWorkforceMappings(),
        this.loadHighSchoolDetails()
      ]);

      this.buildKeywordIndices();
      this.initialized = true;

      console.log('CIP Index initialized successfully', {
        highSchoolPrograms: this.hsPOSToCIP2.size,
        cipCategories: this.cip2ToFull.size,
        fullCIPCodes: this.fullToCip2.size,
        collegePrograms: this.cipToProgram.size,
        workforceCodes: this.cipToSOC.size
      });
    } catch (error) {
      console.error('Failed to initialize CIP Index:', error);
      throw error;
    }
  }

  /**
   * Load high school program to CIP mappings
   */
  private async loadHighSchoolMappings(): Promise<void> {
    const data = await this.jsonlReader.loadFile<HSPOSToCIP2Digit>(
      'highschool/highschool_pos_to_cip2digit_mapping.jsonl'
    );

    for (const item of data) {
      const pos = item.PROGRAM_OF_STUDY;
      const cipCodes = item.CIP_2DIGIT;

      this.hsPOSToCIP2.set(pos, cipCodes);

      // Build reverse index
      for (const cip of cipCodes) {
        if (!this.cip2ToHSPOS.has(cip)) {
          this.cip2ToHSPOS.set(cip, []);
        }
        this.cip2ToHSPOS.get(cip)!.push(pos);
      }
    }
  }

  /**
   * Load CIP 2-digit to full CIP code mappings
   */
  private async loadCIPCategoryMappings(): Promise<void> {
    const data = await this.jsonlReader.loadFile<CIP2DigitToCIP>(
      'college/cip2digit_to_cip/cip2digit_to_cip_mapping.jsonl'
    );

    for (const item of data) {
      const cip2 = item.CIP_2DIGIT;
      const fullCodes = item.CIP_CODE;

      this.cip2ToFull.set(cip2, fullCodes);

      // Build reverse index
      for (const fullCode of fullCodes) {
        this.fullToCip2.set(fullCode, cip2);
      }
    }
  }

  /**
   * Load college program mappings
   */
  private async loadCollegeMappings(): Promise<void> {
    // Load CIP to Campus
    const campusData = await this.jsonlReader.loadFile<CIPToCampus>(
      'college/cip_to_campus/cip_to_campus_mapping.jsonl'
    );

    for (const item of campusData) {
      this.cipToCampus.set(item.CIP_CODE, item.CAMPUS);

      // Build reverse index
      for (const campus of item.CAMPUS) {
        if (!this.campusToCIP.has(campus)) {
          this.campusToCIP.set(campus, []);
        }
        this.campusToCIP.get(campus)!.push(item.CIP_CODE);
      }
    }

    // Load CIP to Program
    const programData = await this.jsonlReader.loadFile<CIPToProgram>(
      'college/cip_to_program/cip_to_program_mapping.jsonl'
    );

    for (const item of programData) {
      this.cipToProgram.set(item.CIP_CODE, item.PROGRAM_NAME);
    }
  }

  /**
   * Load workforce (SOC) mappings
   */
  private async loadWorkforceMappings(): Promise<void> {
    const data = await this.jsonlReader.loadFile<CIPToSOC>(
      'workforce/cip_to_soc_mapping.jsonl'
    );

    for (const item of data) {
      this.cipToSOC.set(item.CIP_CODE, item.SOC_CODE);

      // Build reverse index
      for (const socCode of item.SOC_CODE) {
        if (!this.socToCIP.has(socCode)) {
          this.socToCIP.set(socCode, []);
        }
        this.socToCIP.get(socCode)!.push(item.CIP_CODE);
      }
    }
  }

  /**
   * Load high school program details
   */
  private async loadHighSchoolDetails(): Promise<void> {
    // Load courses by grade
    const coursesData = await this.jsonlReader.loadFile<POSToCoursesByGrade>(
      'highschool/pos_to_courses_by_grade.jsonl'
    );

    for (const item of coursesData) {
      this.posCoursesByGrade.set(item.PROGRAM_OF_STUDY, item);
    }

    // Load recommended courses
    const recommendedData = await this.jsonlReader.loadFile<POSToRecommendedCourses>(
      'highschool/pos_to_recommended_and_level_courses.jsonl'
    );

    for (const item of recommendedData) {
      this.posRecommendedCourses.set(item.PROGRAM_OF_STUDY, item);
    }

    // Load school info
    const schoolData = await this.jsonlReader.loadFile<POSToHighSchool>(
      'highschool/pos_to_highschool_mapping.jsonl'
    );

    for (const item of schoolData) {
      this.posSchoolInfo.set(item.PROGRAM_OF_STUDY, item);
    }
  }

  /**
   * Build keyword search indices
   */
  private buildKeywordIndices(): void {
    // Index high school programs
    for (const [pos, cipCodes] of this.hsPOSToCIP2) {
      const keywords = this.extractKeywords(pos);
      for (const keyword of keywords) {
        if (!this.keywordToPOS.has(keyword)) {
          this.keywordToPOS.set(keyword, new Set());
        }
        this.keywordToPOS.get(keyword)!.add(pos);

        // Also map keywords to CIP codes
        for (const cip of cipCodes) {
          if (!this.keywordToCIP.has(keyword)) {
            this.keywordToCIP.set(keyword, new Set());
          }
          this.keywordToCIP.get(keyword)!.add(cip);

          // Expand to full CIP codes
          const fullCodes = this.cip2ToFull.get(cip) || [];
          for (const fullCode of fullCodes) {
            this.keywordToCIP.get(keyword)!.add(fullCode);
          }
        }
      }
    }

    // Index program names
    for (const [cipCode, programs] of this.cipToProgram) {
      for (const program of programs) {
        const keywords = this.extractKeywords(program);
        for (const keyword of keywords) {
          if (!this.keywordToCIP.has(keyword)) {
            this.keywordToCIP.set(keyword, new Set());
          }
          this.keywordToCIP.get(keyword)!.add(cipCode);
        }
      }
    }
  }

  /**
   * Extract searchable keywords from text
   */
  private extractKeywords(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2); // Filter out short words
  }

  // ==================== Public Query Methods ====================

  /**
   * Get CIP 2-digit codes for a high school program
   */
  getCIP2ForHSProgram(programOfStudy: string): string[] {
    return this.hsPOSToCIP2.get(programOfStudy) || [];
  }

  /**
   * Get high school programs for a CIP 2-digit code
   */
  getHSProgramsForCIP2(cip2Digit: string): string[] {
    return this.cip2ToHSPOS.get(cip2Digit) || [];
  }

  /**
   * Get full CIP codes for a 2-digit CIP category
   */
  getFullCIPsForCIP2(cip2Digit: string): string[] {
    return this.cip2ToFull.get(cip2Digit) || [];
  }

  /**
   * Get CIP 2-digit category for a full CIP code
   */
  getCIP2ForFullCIP(fullCIP: string): string | undefined {
    return this.fullToCip2.get(fullCIP);
  }

  /**
   * Get campuses offering programs for a CIP code
   */
  getCampusesForCIP(cipCode: string): string[] {
    return this.cipToCampus.get(cipCode) || [];
  }

  /**
   * Get program names for a CIP code
   */
  getProgramsForCIP(cipCode: string): string[] {
    return this.cipToProgram.get(cipCode) || [];
  }

  /**
   * Get SOC codes for a CIP code
   */
  getSOCsForCIP(cipCode: string): string[] {
    return this.cipToSOC.get(cipCode) || [];
  }

  /**
   * Get CIP codes for a SOC code
   */
  getCIPsForSOC(socCode: string): string[] {
    return this.socToCIP.get(socCode) || [];
  }

  /**
   * Get course sequence for a high school program
   */
  getCoursesForPOS(programOfStudy: string): POSToCoursesByGrade | undefined {
    return this.posCoursesByGrade.get(programOfStudy);
  }

  /**
   * Get recommended courses for a high school program
   */
  getRecommendedCoursesForPOS(programOfStudy: string): POSToRecommendedCourses | undefined {
    return this.posRecommendedCourses.get(programOfStudy);
  }

  /**
   * Get school info for a high school program
   */
  getSchoolInfoForPOS(programOfStudy: string): POSToHighSchool | undefined {
    return this.posSchoolInfo.get(programOfStudy);
  }

  /**
   * Search for CIP codes by keywords
   */
  searchCIPsByKeywords(keywords: string[]): Set<string> {
    const results = new Set<string>();

    for (const keyword of keywords) {
      const normalizedKeyword = keyword.toLowerCase();
      const matches = this.keywordToCIP.get(normalizedKeyword);

      if (matches) {
        for (const cip of matches) {
          results.add(cip);
        }
      }
    }

    return results;
  }

  /**
   * Search for high school programs by keywords
   */
  searchHSProgramsByKeywords(keywords: string[]): Set<string> {
    const results = new Set<string>();

    for (const keyword of keywords) {
      const normalizedKeyword = keyword.toLowerCase();
      const matches = this.keywordToPOS.get(normalizedKeyword);

      if (matches) {
        for (const pos of matches) {
          results.add(pos);
        }
      }
    }

    return results;
  }

  /**
   * Get all high school programs
   */
  getAllHSPrograms(): string[] {
    return Array.from(this.hsPOSToCIP2.keys());
  }

  /**
   * Get all CIP 2-digit categories
   */
  getAllCIP2Categories(): string[] {
    return Array.from(this.cip2ToFull.keys());
  }

  /**
   * Get all full CIP codes
   */
  getAllFullCIPs(): string[] {
    return Array.from(this.fullToCip2.keys());
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      highSchoolPrograms: this.hsPOSToCIP2.size,
      cip2Categories: this.cip2ToFull.size,
      fullCIPCodes: this.fullToCip2.size,
      collegePrograms: this.cipToProgram.size,
      campuses: this.campusToCIP.size,
      socCodes: this.socToCIP.size,
      keywordIndexEntries: this.keywordToCIP.size,
      posKeywordIndexEntries: this.keywordToPOS.size,
      initialized: this.initialized
    };
  }
}

/**
 * Singleton instance
 */
let cipIndexInstance: CIPIndex | null = null;

export function getCIPIndex(): CIPIndex {
  if (!cipIndexInstance) {
    cipIndexInstance = new CIPIndex();
  }
  return cipIndexInstance;
}
