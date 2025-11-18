/**
 * Island Mapping Tools
 * 
 * Provides utilities for:
 * - Mapping islands to campuses
 * - Mapping islands to high schools
 * - Detecting island mentions in queries
 * - Mapping institution codes to full campus names
 */

import { getJSONLReader } from "./jsonl-reader";

/**
 * Institution code to campus name mappings
 */
const INSTITUTION_CODE_MAP: Record<string, string> = {
  'HAW': 'Hawaii Community College',
  'HON': 'Honolulu Community College',
  'KAP': 'Kapiolani Community College',
  'KAU': 'Kauai Community College',
  'LEE': 'Leeward Community College',
  'MAU': 'UH Maui College',
  'HIL': 'University of Hawaii at Hilo',
  'MAN': 'University of Hawaii at Manoa',
  'WHO': 'University of Hawaii at West Oahu',
  'WIN': 'Windward Community College'
};

/**
 * Island detection patterns with aliases and school names
 */
const ISLAND_PATTERNS: Record<string, string> = {
  // Oahu - Island name + cities + high schools
  'oahu': 'Oahu',
  "o'ahu": 'Oahu',
  'honolulu': 'Oahu',
  'pearl city': 'Oahu',
  'kaneohe': 'Oahu',
  'waipahu': 'Oahu',
  'aiea': 'Oahu',
  'mililani': 'Oahu',
  'campbell': 'Oahu',
  'farrington': 'Oahu',
  'kahuku': 'Oahu',
  'kailua': 'Oahu',
  'kaimuki': 'Oahu',
  'kaiser': 'Oahu',
  'kalaheo': 'Oahu',
  'kalani': 'Oahu',
  'kapolei': 'Oahu',
  'leilehua': 'Oahu',
  'mckinley': 'Oahu',
  'moanalua': 'Oahu',
  'nanakuli': 'Oahu',
  'radford': 'Oahu',
  'roosevelt': 'Oahu',
  'waialua': 'Oahu',
  'waianae': 'Oahu',
  'castle': 'Oahu',
  'anuenue': 'Oahu',
  
  // Maui - Island name + cities + high schools
  'maui': 'Maui',
  'kahului': 'Maui',
  'wailuku': 'Maui',
  'baldwin': 'Maui',
  'lahainaluna': 'Maui',
  'king kekaulike': 'Maui',
  'hana': 'Maui',
  'molokai': 'Maui',  // Served by Maui College
  'moloka\'i': 'Maui',
  'lanai': 'Maui',     // Served by Maui College
  'lana\'i': 'Maui',
  
  // Kauai - Island name + cities + high schools
  'kauai': 'Kauai',
  'kaua\'i': 'Kauai',
  'lihue': 'Kauai',
  'kapaa': 'Kauai',
  'waimea': 'Kauai',
  
  // Hawaii (Big Island) - Island name + cities + high schools
  'hawaii': 'Hawaii',
  'hawai\'i': 'Hawaii',
  'big island': 'Hawaii',
  'hilo': 'Hawaii',
  'kona': 'Hawaii',
  'waiakea': 'Hawaii',
  'honokaa': 'Hawaii',
  'keaau': 'Hawaii',
  'kealakehe': 'Hawaii',
  'kohala': 'Hawaii',
  'konawaena': 'Hawaii',
  'pahoa': 'Hawaii',
  'kau': 'Hawaii'
};

interface IslandCampusMapping {
  ISLAND: string;
  CAMPUSES: string[];
}

interface IslandSchoolMapping {
  ISLAND: string;
  HIGH_SCHOOLS: string[];
}

export class IslandMappingTool {
  private reader = getJSONLReader();
  private campusCache: Map<string, string[]> | null = null;
  private schoolCache: Map<string, string[]> | null = null;

  /**
   * Get all campuses for a specific island
   */
  async getCampusesByIsland(island: string): Promise<string[]> {
    if (!this.campusCache) {
      await this.loadCampusCache();
    }

    const normalizedIsland = this.normalizeIslandName(island);
    return this.campusCache?.get(normalizedIsland) || [];
  }

  /**
   * Get all high schools for a specific island
   */
  async getHighSchoolsByIsland(island: string): Promise<string[]> {
    if (!this.schoolCache) {
      await this.loadSchoolCache();
    }

    const normalizedIsland = this.normalizeIslandName(island);
    return this.schoolCache?.get(normalizedIsland) || [];
  }

  /**
   * Detect island name from a query string
   * Returns the normalized island name or null if none detected
   */
  detectIsland(query: string): string | null {
    const queryLower = query.toLowerCase();

    // Check each pattern
    for (const [pattern, island] of Object.entries(ISLAND_PATTERNS)) {
      if (queryLower.includes(pattern)) {
        console.log(`[IslandMapping] Detected island: ${island} (matched: "${pattern}")`);
        return island;
      }
    }

    return null;
  }

  /**
   * Map institution code to full campus name
   */
  mapInstitutionToCampus(iroCode: string): string {
    const campus = INSTITUTION_CODE_MAP[iroCode.toUpperCase()];
    if (!campus) {
      console.warn(`[IslandMapping] Unknown institution code: ${iroCode}`);
      return iroCode; // Return code as-is if not found
    }
    return campus;
  }

  /**
   * Get all institution codes for a specific island
   */
  async getInstitutionCodesByIsland(island: string): Promise<string[]> {
    const campuses = await this.getCampusesByIsland(island);
    const codes: string[] = [];

    // Reverse lookup: campus name → institution code
    for (const [code, campusName] of Object.entries(INSTITUTION_CODE_MAP)) {
      if (campuses.includes(campusName)) {
        codes.push(code);
      }
    }

    return codes;
  }

  /**
   * Check if a campus is on a specific island
   */
  async isCampusOnIsland(campusName: string, island: string): Promise<boolean> {
    const campuses = await this.getCampusesByIsland(island);
    return campuses.includes(campusName);
  }

  /**
   * Check if a high school is on a specific island
   */
  async isSchoolOnIsland(schoolName: string, island: string): Promise<boolean> {
    const schools = await this.getHighSchoolsByIsland(island);
    return schools.includes(schoolName);
  }

  /**
   * Get the island for a specific campus
   */
  async getIslandForCampus(campusName: string): Promise<string | null> {
    if (!this.campusCache) {
      await this.loadCampusCache();
    }

    for (const [island, campuses] of this.campusCache!.entries()) {
      if (campuses.includes(campusName)) {
        return island;
      }
    }

    return null;
  }

  /**
   * Get all supported islands
   */
  async getAllIslands(): Promise<string[]> {
    if (!this.campusCache) {
      await this.loadCampusCache();
    }
    return Array.from(this.campusCache!.keys());
  }

  // ========== Private Helper Methods ==========

  /**
   * Load and cache campus-to-island mappings
   */
  private async loadCampusCache(): Promise<void> {
    try {
      const data = await this.reader.readFile(
        "campuses_by_island.jsonl"
      ) as IslandCampusMapping[];

      this.campusCache = new Map();
      for (const record of data) {
        const island = this.normalizeIslandName(record.ISLAND);
        this.campusCache.set(island, record.CAMPUSES);
      }

      console.log(`[IslandMapping] Loaded ${this.campusCache.size} island→campus mappings`);
    } catch (error) {
      console.error("[IslandMapping] Failed to load campus mappings:", error);
      this.campusCache = new Map();
    }
  }

  /**
   * Load and cache school-to-island mappings
   */
  private async loadSchoolCache(): Promise<void> {
    try {
      const data = await this.reader.readFile(
        "highschools_by_island.jsonl"
      ) as IslandSchoolMapping[];

      this.schoolCache = new Map();
      for (const record of data) {
        const island = this.normalizeIslandName(record.ISLAND);
        this.schoolCache.set(island, record.HIGH_SCHOOLS);
      }

      console.log(`[IslandMapping] Loaded ${this.schoolCache.size} island→school mappings`);
    } catch (error) {
      console.error("[IslandMapping] Failed to load school mappings:", error);
      this.schoolCache = new Map();
    }
  }

  /**
   * Normalize island name to title case
   */
  private normalizeIslandName(island: string): string {
    // Handle special cases
    const special: Record<string, string> = {
      'oahu': 'Oahu',
      "o'ahu": 'Oahu',
      'maui': 'Maui',
      'kauai': 'Kauai',
      "kaua'i": 'Kauai',
      'hawaii': 'Hawaii',
      "hawai'i": 'Hawaii',
      'big island': 'Hawaii'
    };

    const lower = island.toLowerCase();
    return special[lower] || island.charAt(0).toUpperCase() + island.slice(1).toLowerCase();
  }
}

// Export singleton instance
let islandMappingTool: IslandMappingTool | null = null;

export function getIslandMappingTool(): IslandMappingTool {
  if (!islandMappingTool) {
    islandMappingTool = new IslandMappingTool();
  }
  return islandMappingTool;
}
