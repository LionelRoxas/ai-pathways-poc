/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/lib/data/jsonl-reader.ts
import fs from "fs";
import path from "path";

export class JSONLReader {
  private dataPath: string;
  private cache: Map<string, any[]> = new Map();

  constructor() {
    // Correct path for src/app structure
    this.dataPath = path.join(
      process.cwd(),
      "src",
      "app",
      "lib",
      "data",
      "jsonl"
    );

    if (!fs.existsSync(this.dataPath)) {
      console.error(`JSONL directory not found at: ${this.dataPath}`);
      fs.mkdirSync(this.dataPath, { recursive: true });
    }

    // List available files
    try {
      const files = fs.readdirSync(this.dataPath);
      console.log(`Found ${files.length} JSONL files:`, files);
    } catch (error) {
      console.error("Could not list JSONL files:", error);
    }
  }

  async readFile(filename: string): Promise<any[]> {
    if (this.cache.has(filename)) {
      return this.cache.get(filename)!;
    }

    const filePath = path.join(this.dataPath, filename);

    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      return [];
    }

    try {
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const fileExtension = path.extname(filename).toLowerCase();
      let results: any[] = [];

      if (fileExtension === '.json') {
        // Handle standard JSON file
        try {
          const parsed = JSON.parse(fileContent);
          // If it's already an array, use it directly
          // If it's an object, wrap it in an array
          results = Array.isArray(parsed) ? parsed : [parsed];
          console.log(`Loaded ${results.length} items from JSON file ${filename}`);
        } catch (error) {
          console.error(`Error parsing JSON file ${filename}:`, error);
          return [];
        }
      } else {
        // Handle JSONL file (default behavior)
        const lines = fileContent.split("\n");

        for (const line of lines) {
          if (line.trim()) {
            try {
              results.push(JSON.parse(line));
            } catch (error) {
              console.error(`Error parsing line in ${filename}`);
            }
          }
        }
        console.log(`Loaded ${results.length} items from JSONL file ${filename}`);
      }

      this.cache.set(filename, results);
      return results;
    } catch (error) {
      console.error(`Error reading file ${filename}:`, error);
      return [];
    }
  }

  clearCache() {
    this.cache.clear();
  }

  getCacheStats() {
    return {
      files: this.cache.size,
      totalItems: Array.from(this.cache.values()).reduce(
        (sum, items) => sum + items.length,
        0
      ),
    };
  }
}

let readerInstance: JSONLReader | null = null;

export function getJSONLReader(): JSONLReader {
  if (!readerInstance) {
    readerInstance = new JSONLReader();
  }
  return readerInstance;
}
