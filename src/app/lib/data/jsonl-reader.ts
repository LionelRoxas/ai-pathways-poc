/**
 * JSONL Reader Utility
 *
 * Provides efficient loading and parsing of JSONL (JSON Lines) files.
 * Supports both streaming and batch loading strategies.
 */

import fs from 'fs';
import readline from 'readline';
import path from 'path';

export interface JSONLReaderOptions {
  /**
   * Base directory for JSONL files
   * Defaults to project root /data directory
   */
  baseDir?: string;

  /**
   * Enable caching of loaded data in memory
   * Default: true
   */
  cache?: boolean;

  /**
   * Maximum number of lines to read (0 = unlimited)
   * Default: 0
   */
  maxLines?: number;
}

export class JSONLReader {
  private baseDir: string;
  private cache: Map<string, any[]>;
  private cacheEnabled: boolean;

  constructor(options: JSONLReaderOptions = {}) {
    this.baseDir = options.baseDir || path.join(process.cwd(), 'data');
    this.cacheEnabled = options.cache !== false;
    this.cache = new Map();
  }

  /**
   * Load entire JSONL file into memory
   * Good for smaller files that fit comfortably in memory
   */
  async loadFile<T = any>(filePath: string): Promise<T[]> {
    const fullPath = this.resolvePath(filePath);

    // Check cache first
    if (this.cacheEnabled && this.cache.has(fullPath)) {
      return this.cache.get(fullPath) as T[];
    }

    const data: T[] = [];

    try {
      const fileContent = await fs.promises.readFile(fullPath, 'utf-8');
      const lines = fileContent.split('\n').filter(line => line.trim());

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          data.push(parsed);
        } catch (parseError) {
          console.warn(`Failed to parse line in ${filePath}:`, line.substring(0, 100));
        }
      }

      // Cache the result
      if (this.cacheEnabled) {
        this.cache.set(fullPath, data);
      }

      return data;
    } catch (error) {
      console.error(`Error reading JSONL file ${fullPath}:`, error);
      throw new Error(`Failed to load JSONL file: ${filePath}`);
    }
  }

  /**
   * Stream JSONL file line by line
   * Good for large files or when you need to process data incrementally
   */
  async *streamFile<T = any>(filePath: string): AsyncGenerator<T, void, unknown> {
    const fullPath = this.resolvePath(filePath);

    const fileStream = fs.createReadStream(fullPath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    for await (const line of rl) {
      if (line.trim()) {
        try {
          yield JSON.parse(line) as T;
        } catch (parseError) {
          console.warn(`Failed to parse line in ${filePath}:`, line.substring(0, 100));
        }
      }
    }
  }

  /**
   * Load JSONL file and build a Map index by a specified key
   * Useful for fast lookups
   */
  async loadAsMap<T = any>(
    filePath: string,
    keyField: string
  ): Promise<Map<string, T>> {
    const data = await this.loadFile<T>(filePath);
    const map = new Map<string, T>();

    for (const item of data) {
      const key = (item as any)[keyField];
      if (key !== undefined) {
        map.set(String(key), item);
      }
    }

    return map;
  }

  /**
   * Load JSONL file and build a Map with arrays for one-to-many relationships
   */
  async loadAsMultiMap<T = any>(
    filePath: string,
    keyField: string
  ): Promise<Map<string, T[]>> {
    const data = await this.loadFile<T>(filePath);
    const map = new Map<string, T[]>();

    for (const item of data) {
      const key = (item as any)[keyField];
      if (key !== undefined) {
        const keyStr = String(key);
        if (!map.has(keyStr)) {
          map.set(keyStr, []);
        }
        map.get(keyStr)!.push(item);
      }
    }

    return map;
  }

  /**
   * Load JSONL file and filter by predicate function
   */
  async loadFiltered<T = any>(
    filePath: string,
    predicate: (item: T) => boolean
  ): Promise<T[]> {
    const data = await this.loadFile<T>(filePath);
    return data.filter(predicate);
  }

  /**
   * Count lines in JSONL file without loading into memory
   */
  async countLines(filePath: string): Promise<number> {
    const fullPath = this.resolvePath(filePath);
    let count = 0;

    const fileStream = fs.createReadStream(fullPath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    for await (const line of rl) {
      if (line.trim()) {
        count++;
      }
    }

    return count;
  }

  /**
   * Clear cache for a specific file or all files
   */
  clearCache(filePath?: string): void {
    if (filePath) {
      const fullPath = this.resolvePath(filePath);
      this.cache.delete(fullPath);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { cachedFiles: number; totalEntries: number } {
    let totalEntries = 0;
    for (const entries of this.cache.values()) {
      totalEntries += entries.length;
    }

    return {
      cachedFiles: this.cache.size,
      totalEntries
    };
  }

  /**
   * Resolve relative path to absolute path
   */
  private resolvePath(filePath: string): string {
    if (path.isAbsolute(filePath)) {
      return filePath;
    }
    return path.join(this.baseDir, filePath);
  }

  /**
   * Check if file exists
   */
  async fileExists(filePath: string): Promise<boolean> {
    const fullPath = this.resolvePath(filePath);
    try {
      await fs.promises.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Singleton instance for shared caching
 */
let sharedInstance: JSONLReader | null = null;

export function getJSONLReader(options?: JSONLReaderOptions): JSONLReader {
  if (!sharedInstance) {
    sharedInstance = new JSONLReader(options);
  }
  return sharedInstance;
}
