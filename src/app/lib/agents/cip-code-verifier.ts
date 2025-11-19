/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/lib/agents/cip-code-verifier.ts

/**
 * CIP CODE VERIFIER AGENT
 * 
 * Validates and corrects CIP codes before data reaches the Data Panel.
 * CIP codes are national standards (NCES - National Center for Education Statistics)
 * 
 * Responsibilities:
 * - Validate CIP code format (XX.XXXX)
 * - Verify CIP codes exist in national taxonomy
 * - Correct malformed CIP codes
 * - Enrich with CIP family and category information
 * - Log discrepancies for data quality monitoring
 */

import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

interface CIPCodeValidation {
  originalCode: string;
  validatedCode: string;
  isValid: boolean;
  corrected: boolean;
  cipFamily: string;
  cipCategory: string;
  confidence: number;
  reasoning?: string;
}

interface VerifiedProgram {
  program: any;
  cipValidation: CIPCodeValidation;
  [key: string]: any;
}

/**
 * CIP CODE VERIFIER AGENT CLASS
 */
export class CIPCodeVerifierAgent {
  
  /**
   * Verify and correct CIP codes for college programs
   */
  async verifyCollegePrograms(
    programs: any[],
    userQuery?: string,
    conversationHistory?: any[]
  ): Promise<VerifiedProgram[]> {
    if (!programs || programs.length === 0) {
      console.log('[CIPVerifier] No programs to verify');
      return [];
    }

    console.log(`[CIPVerifier] 🔍 Verifying ${programs.length} college programs`);
    if (userQuery) {
      console.log(`[CIPVerifier] 💬 User Query: "${userQuery}"`);
    }
    
    const verified: VerifiedProgram[] = [];
    const cipCodes = new Set<string>();
    const programsByCIP = new Map<string, any[]>();
    
    // Extract unique CIP codes and group programs
    programs.forEach(prog => {
      const cipCode = prog.program?.cipCode || prog.program?.CIP_CODE || prog.cipCode;
      if (cipCode) {
        cipCodes.add(cipCode);
        if (!programsByCIP.has(cipCode)) {
          programsByCIP.set(cipCode, []);
        }
        programsByCIP.get(cipCode)!.push(prog);
      }
    });
    
    console.log(`[CIPVerifier] Found ${cipCodes.size} unique CIP codes to verify`);
    
    // Validate CIP codes with conversational context
    const cipValidations = await this.validateCIPCodesBatchWithContext(
      Array.from(cipCodes),
      programsByCIP,
      userQuery,
      conversationHistory
    );
    const cipMap = new Map(cipValidations.map(v => [v.originalCode, v]));
    
    // Apply validations to programs
    for (const prog of programs) {
      const cipCode = prog.program?.cipCode || prog.program?.CIP_CODE || prog.cipCode;
      const validation = cipMap.get(cipCode) || {
        originalCode: cipCode || 'UNKNOWN',
        validatedCode: cipCode || 'UNKNOWN',
        isValid: false,
        corrected: false,
        cipFamily: 'Unknown',
        cipCategory: 'Unknown',
        confidence: 0,
        reasoning: 'No CIP code found'
      };
      
      // Create verified program with enriched data
      const verifiedProg: VerifiedProgram = {
        ...prog,
        cipValidation: validation,
        // Update program with validated CIP code if corrected
        program: {
          ...prog.program,
          cipCode: validation.validatedCode,
          CIP_CODE: validation.validatedCode,
          cipFamily: validation.cipFamily,
          cipCategory: validation.cipCategory,
        }
      };
      
      verified.push(verifiedProg);
      
      if (validation.corrected) {
        console.log(`[CIPVerifier] ✏️  Corrected: ${validation.originalCode} → ${validation.validatedCode}`);
      }
    }
    
    // Log summary
    const corrected = verified.filter(v => v.cipValidation.corrected).length;
    const invalid = verified.filter(v => !v.cipValidation.isValid).length;
    
    console.log(`[CIPVerifier] ✅ Verification complete:`);
    console.log(`[CIPVerifier]    - Valid: ${verified.length - invalid}`);
    console.log(`[CIPVerifier]    - Corrected: ${corrected}`);
    console.log(`[CIPVerifier]    - Invalid: ${invalid}`);
    
    return verified;
  }
  
  /**
   * Extract conversation context from query and history
   */
  private extractConversationContext(userQuery?: string, conversationHistory?: any[]): string {
    const contexts: string[] = [];
    
    if (userQuery) {
      contexts.push(`Current query: "${userQuery}"`);
    }
    
    if (conversationHistory && conversationHistory.length > 0) {
      // Get last 3 user messages
      const recentMessages = conversationHistory
        .filter(m => m.role === 'user')
        .slice(-3)
        .map(m => m.content);
      
      if (recentMessages.length > 0) {
        contexts.push(`Recent conversation: ${recentMessages.join(' | ')}`);
      }
    }
    
    return contexts.join('\n') || 'No context available';
  }
  
  /**
   * Validate multiple CIP codes with conversational context
   * This is the PRIMARY method that detects misaligned CIP codes
   */
  private async validateCIPCodesBatchWithContext(
    cipCodes: string[],
    programsByCIP: Map<string, any[]>,
    userQuery?: string,
    conversationHistory?: any[]
  ): Promise<CIPCodeValidation[]> {
    if (cipCodes.length === 0) return [];
    
    // Extract conversation context
    const conversationContext = this.extractConversationContext(userQuery, conversationHistory);
    
    console.log(`[CIPVerifier] 🎯 Checking CIP alignment with conversation...`);
    
    // Build program details for each CIP code
    const cipDetails = cipCodes.map(code => {
      const progs = programsByCIP.get(code) || [];
      const sampleTitles = progs.slice(0, 3).map(p => 
        p.program?.title || p.program?.PROGRAM_NAME || 'Unknown'
      );
      return `${code}: [${sampleTitles.join(', ')}]`;
    }).join('\n');
    
    try {
      const systemPrompt = `You are a CIP code validator with CONVERSATIONAL CONTEXT AWARENESS.

🎯 PRIMARY MISSION: Detect when CIP codes DON'T match what the user is asking for!

CIP CODES (National Standards):
- FORMAT: XX.XXXX (2-digit family + 4-digit specific)
- FAMILIES:
  * 01: Agriculture
  * 11: Computer Science & IT
  * 13: Education
  * 14: Engineering
  * 15: Engineering Technologies
  * 26: Biological Sciences
  * 51: Health Professions (NURSING, MEDICAL ASSISTANT, HEALTHCARE)
  * 52: Business & Management

🚨 CRITICAL CHECKS:
1. Does CIP family match user intent?
   - User asks "nursing" → CIP MUST be 51.XXXX (Health)
   - User asks "computer science" → CIP MUST be 11.XXXX (CS/IT)
   - User asks "business" → CIP MUST be 52.XXXX (Business)

2. If MISMATCH detected:
   - Set corrected: true
   - Find CORRECT CIP code for user's actual intent
   - Explain the mismatch clearly

EXAMPLE MISMATCHES:
❌ User: "show me nursing programs" + CIP: 11.0701 → WRONG! Should be 51.XXXX
❌ User: "computer science" + CIP: 51.1601 → WRONG! Should be 11.XXXX
❌ User: "business programs" + CIP: 26.0101 → WRONG! Should be 52.XXXX

Return JSON object:
{
  "validations": [
    {
      "originalCode": "input CIP",
      "validatedCode": "corrected CIP if misaligned",
      "isValid": true/false,
      "corrected": true/false (TRUE if context mismatch!),
      "cipFamily": "family name",
      "cipCategory": "category",
      "confidence": 0-100,
      "reasoning": "explain mismatch or validation"
    }
  ]
}`;

      const userPrompt = `CONVERSATION CONTEXT:
${conversationContext}

CIP CODES TO VALIDATE (with sample program titles):
${cipDetails}

CHECK: Do these CIP codes match what the user is asking for?
If nursing/healthcare query but CIP is NOT 51.XXXX → CORRECT IT!
If computer science query but CIP is NOT 11.XXXX → CORRECT IT!

Return validation results as JSON.`;

      const response = await groq.chat.completions.create({
        model: "openai/gpt-oss-120b", // Fast, cheap, accurate
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error("Empty response from LLM");

      const parsed = JSON.parse(content);
      const validations = parsed.validations || parsed.results || [];
      
      if (!Array.isArray(validations)) {
        throw new Error("Response is not an array");
      }
      
      const results = validations.map((v: any) => ({
        originalCode: v.originalCode || 'UNKNOWN',
        validatedCode: v.validatedCode || v.originalCode || 'UNKNOWN',
        isValid: v.isValid ?? false,
        corrected: v.corrected ?? false,
        cipFamily: v.cipFamily || 'Unknown',
        cipCategory: v.cipCategory || 'Unknown',
        confidence: v.confidence ?? 0,
        reasoning: v.reasoning,
      }));
      
      // Log corrections
      const correctedCodes = results.filter(r => r.corrected);
      if (correctedCodes.length > 0) {
        console.log(`[CIPVerifier] 🔄 Found ${correctedCodes.length} misaligned CIP codes!`);
        correctedCodes.forEach(c => {
          console.log(`[CIPVerifier]    ${c.originalCode} → ${c.validatedCode} (${c.reasoning})`);
        });
      }
      
      return results;
      
    } catch (error: any) {
      console.error('[CIPVerifier] ❌ Validation error:', error.message);
      
      // Fallback: Basic format validation without context checking
      return cipCodes.map(code => this.basicFormatValidation(code));
    }
  }
  
  /**
   * Basic CIP code format validation (fallback)
   */
  private basicFormatValidation(cipCode: string): CIPCodeValidation {
    const cipPattern = /^\d{2}\.\d{4}$/;
    const isValid = cipPattern.test(cipCode);
    
    let cipFamily = 'Unknown';
    let cipCategory = 'Unknown';
    
    if (isValid) {
      const series = cipCode.substring(0, 2);
      const familyMap: Record<string, string> = {
        '01': 'Agriculture',
        '11': 'Computer and Information Sciences',
        '13': 'Education',
        '14': 'Engineering',
        '15': 'Engineering Technologies',
        '23': 'English Language and Literature',
        '24': 'Liberal Arts and Sciences',
        '26': 'Biological and Biomedical Sciences',
        '27': 'Mathematics and Statistics',
        '40': 'Physical Sciences',
        '43': 'Homeland Security, Law Enforcement',
        '45': 'Social Sciences',
        '51': 'Health Professions',
        '52': 'Business, Management, Marketing',
      };
      
      cipFamily = familyMap[series] || `Series ${series}`;
      cipCategory = cipFamily;
    }
    
    return {
      originalCode: cipCode,
      validatedCode: cipCode,
      isValid,
      corrected: false,
      cipFamily,
      cipCategory,
      confidence: isValid ? 90 : 0,
      reasoning: isValid ? 'Valid format' : 'Invalid format - should be XX.XXXX'
    };
  }
  
  /**
   * Verify high school programs (usually don't have CIP codes, but validate if present)
   */
  async verifyHighSchoolPrograms(programs: any[]): Promise<VerifiedProgram[]> {
    if (!programs || programs.length === 0) {
      return [];
    }
    
    console.log(`[CIPVerifier] 📚 Checking ${programs.length} high school programs for CIP codes`);
    
    // Most HS programs don't have CIP codes, just pass through
    return programs.map(prog => ({
      ...prog,
      cipValidation: {
        originalCode: 'N/A',
        validatedCode: 'N/A',
        isValid: true,
        corrected: false,
        cipFamily: 'High School Program',
        cipCategory: 'Pre-College',
        confidence: 100,
      }
    }));
  }
}
