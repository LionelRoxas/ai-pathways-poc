/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/lib/agents/vector-soc-verifier.ts
import OpenAI from "openai";

// Lazy initialization to support testing
let openai: OpenAI | null = null;
function getOpenAI() {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

/**
 * VECTOR-BASED SOC CODE VERIFIER
 * 
 * Uses embedding similarity instead of LLM calls for 10-100x faster SOC validation.
 * 
 * Speed comparison:
 * - LLM verification: 10-30 seconds for 100 SOC codes (GPT-4 calls)
 * - Vector verification: 1-2 seconds for 100 SOC codes (embedding similarity)
 * 
 * How it works:
 * 1. Generate embedding for user query + context
 * 2. Generate embeddings for each SOC code title/description
 * 3. Calculate cosine similarity
 * 4. Filter by threshold (e.g., >0.3 = relevant)
 */

interface SOCMapping {
  cipCode: string;
  socCodes: string[];
  programName?: string;
}

interface VerifiedCareerMapping {
  cipCode: string;
  originalSOCCodes: string[];
  filteredSOCCodes: string[];
  removedSOCCodes: string[];
}

interface ConversationMessage {
  role: string;
  content: string;
}

// Common SOC code titles for caching
const SOC_TITLES: Record<string, string> = {
  "11-9013": "Farm, Ranch, and Aquacultural Managers",
  "13-1028": "Food Preparation Workers",
  "13-1074": "Environmental Compliance Inspectors",
  "15-1299": "Computer Occupations, All Other",
  "15-2041": "Software Developers, Applications",
  "17-2011": "Aerospace Engineers",
  "17-2021": "Agricultural Engineers",
  "17-2061": "Computer Hardware Engineers",
  "17-2071": "Electrical Engineers",
  "17-2081": "Environmental Engineers",
  "17-2199": "Engineers, All Other",
  "19-1011": "Animal Scientists",
  "19-1012": "Food Scientists and Technologists",
  "19-1013": "Soil and Plant Scientists",
  "19-1021": "Biochemists and Biophysicists",
  "19-1022": "Microbiologists",
  "19-1023": "Zoologists and Wildlife Biologists",
  "19-1029": "Biological Scientists, All Other",
  "19-1031": "Conservation Scientists",
  "19-1032": "Foresters",
  "19-1042": "Medical Scientists, Except Epidemiologists",
  "19-2041": "Environmental Scientists and Specialists",
  "19-2042": "Geoscientists, Except Hydrologists and Geographers",
  "19-2043": "Hydrologists",
  "19-3091": "Anthropologists and Archeologists",
  "19-3092": "Geographers",
  "19-4012": "Agricultural Technicians",
  "19-4042": "Environmental Science and Protection Technicians",
  "19-4099": "Life, Physical, and Social Science Technicians, All Other",
  "19-5011": "Medical Scientists, Except Epidemiologists",
  "25-1099": "Postsecondary Teachers, All Other",
  "25-2031": "Secondary School Teachers",
};

export class VectorSOCVerifier {
  private embeddingCache: Map<string, number[]> = new Map();

  /**
   * Verify SOC codes using vector similarity
   * Returns VerifiedCareerMapping to match SOCCodeVerifierAgent interface
   */
  async verifySOCCodes(
    careerMappings: SOCMapping[],
    userQuery?: string,
    conversationHistory?: any[],
    programContext?: any[]
  ): Promise<VerifiedCareerMapping[]> {
    if (!careerMappings || careerMappings.length === 0) {
      return [];
    }

    const startTime = Date.now();
    const totalSOCs = careerMappings.reduce((sum, m) => sum + m.socCodes.length, 0);
    
    console.log(
      `[VectorSOCVerifier] 🚀 Fast-verifying ${totalSOCs} SOC codes for ${careerMappings.length} CIP codes`
    );

    try {
      // Build query context
      const queryContext = this.buildQueryContext(
        userQuery,
        conversationHistory,
        programContext
      );

      // Get query embedding (single API call!)
      const queryEmbedding = await this.getEmbedding(queryContext);

      // Filter each mapping
      const verifiedMappings = await Promise.all(
        careerMappings.map(async (mapping) => {
          const relevantSOCs: string[] = [];
          const removedSOCs: string[] = [];

          for (const socCode of mapping.socCodes) {
            const socText = this.getSOCText(socCode);
            const socEmbedding = await this.getEmbedding(socText);
            const similarity = this.cosineSimilarity(queryEmbedding, socEmbedding);

            // Keep if similarity > 0.3 (30% match)
            if (similarity >= 0.3) {
              relevantSOCs.push(socCode);
            } else {
              removedSOCs.push(socCode);
            }
          }

          return {
            cipCode: mapping.cipCode,
            originalSOCCodes: mapping.socCodes,
            filteredSOCCodes: relevantSOCs,
            removedSOCCodes: removedSOCs,
          };
        })
      );

      const keptSOCs = verifiedMappings.reduce((sum, m) => sum + m.filteredSOCCodes.length, 0);
      const removedSOCsCount = verifiedMappings.reduce((sum, m) => sum + m.removedSOCCodes.length, 0);
      const elapsed = Date.now() - startTime;

      console.log(
        `[VectorSOCVerifier] ✅ Verified in ${elapsed}ms: kept ${keptSOCs} SOC codes, filtered ${removedSOCsCount}`
      );

      return verifiedMappings;
    } catch (error) {
      console.error("[VectorSOCVerifier] ❌ Error:", error);
      // Fallback: return all mappings with no filtering
      return careerMappings.map(m => ({
        cipCode: m.cipCode,
        originalSOCCodes: m.socCodes,
        filteredSOCCodes: m.socCodes,
        removedSOCCodes: [],
      }));
    }
  }

  /**
   * Build query context from user input and conversation
   */
  private buildQueryContext(
    userQuery?: string,
    conversationHistory?: ConversationMessage[],
    programContext?: any[]
  ): string {
    const parts: string[] = [];

    if (userQuery) {
      parts.push(`User is searching for: ${userQuery}`);
    }

    // Recent conversation context (last 3 user messages)
    if (conversationHistory && conversationHistory.length > 0) {
      const recentContext = conversationHistory
        .filter((m) => m.role === "user")
        .slice(-3)
        .map((m) => m.content)
        .join(". ");
      if (recentContext) {
        parts.push(`Recent conversation: ${recentContext}`);
      }
    }

    // Program names from context
    if (programContext && programContext.length > 0) {
      const programNames = programContext
        .slice(0, 5)
        .map((p) => p.programFamily || p.programName || p.title || "Unknown");
      parts.push(`Programs found: ${programNames.join(", ")}`);
    }

    return parts.join("\n") || "educational and career pathways";
  }

  /**
   * Get text representation of SOC code
   */
  private getSOCText(socCode: string): string {
    const title = SOC_TITLES[socCode] || "Unknown occupation";
    const majorGroup = socCode.substring(0, 2);

    // Add major group context
    const groupDesc = this.getSOCGroupDescription(majorGroup);

    return `${title}. ${groupDesc}`;
  }

  /**
   * Get SOC major group description
   */
  private getSOCGroupDescription(majorGroup: string): string {
    const descriptions: Record<string, string> = {
      "11": "Management occupations including executives and administrators",
      "13": "Business and financial operations",
      "15": "Computer and mathematical occupations including programmers and analysts",
      "17": "Architecture and engineering occupations including engineers and designers",
      "19": "Life, physical, and social science occupations including scientists and researchers",
      "21": "Community and social service occupations",
      "23": "Legal occupations",
      "25": "Education, training, and library occupations",
      "27": "Arts, design, entertainment, sports, and media occupations",
      "29": "Healthcare practitioners and technical occupations",
      "31": "Healthcare support occupations",
      "33": "Protective service occupations",
      "35": "Food preparation and serving occupations",
      "37": "Building and grounds cleaning and maintenance",
      "39": "Personal care and service occupations",
      "41": "Sales and related occupations",
      "43": "Office and administrative support",
      "45": "Farming, fishing, and forestry",
      "47": "Construction and extraction",
      "49": "Installation, maintenance, and repair",
      "51": "Production occupations",
      "53": "Transportation and material moving",
    };

    return descriptions[majorGroup] || "Other occupations";
  }

  /**
   * Get embedding for text (with caching)
   */
  private async getEmbedding(text: string): Promise<number[]> {
    const cacheKey = text.toLowerCase().trim();

    if (this.embeddingCache.has(cacheKey)) {
      return this.embeddingCache.get(cacheKey)!;
    }

    const response = await getOpenAI().embeddings.create({
      model: "text-embedding-3-small",
      input: text.substring(0, 8000), // Limit text length
    });

    const embedding = response.data[0].embedding;
    this.embeddingCache.set(cacheKey, embedding);

    return embedding;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error("Vectors must have same length");
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

export default VectorSOCVerifier;
