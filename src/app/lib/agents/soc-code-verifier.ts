/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/lib/agents/soc-code-verifier.ts

/**
 * SOC CODE VERIFIER AGENT
 * 
 * Validates and filters SOC (Standard Occupational Classification) codes 
 * BEFORE they reach Market Intelligence API.
 * 
 * KEY USE CASE: User asks for "photography" but SOC codes include software engineering
 * → Agent detects mismatch and filters out irrelevant SOC codes
 * 
 * SOC codes are national standards (Bureau of Labor Statistics)
 */

import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

interface SOCCodeValidation {
  originalCode: string;
  isRelevant: boolean;
  socFamily: string;
  socTitle: string;
  confidence: number;
  reasoning?: string;
}

interface VerifiedCareerMapping {
  cipCode: string;
  originalSOCCodes: string[];
  filteredSOCCodes: string[];
  removedSOCCodes: string[];
  socValidations: SOCCodeValidation[];
}

/**
 * SOC CODE VERIFIER AGENT CLASS
 */
export class SOCCodeVerifierAgent {
  
  /**
   * Verify and filter SOC codes based on conversational context
   */
  async verifySOCCodes(
    careerMappings: Array<{ cipCode: string; socCodes: string[] }>,
    userQuery?: string,
    conversationHistory?: any[],
    programContext?: any[]
  ): Promise<VerifiedCareerMapping[]> {
    if (!careerMappings || careerMappings.length === 0) {
      console.log('[SOCVerifier] No career mappings to verify');
      return [];
    }

    console.log(`[SOCVerifier] 🔍 Verifying SOC codes for ${careerMappings.length} CIP codes`);
    if (userQuery) {
      console.log(`[SOCVerifier] 💬 User Query: "${userQuery}"`);
    }
    
    const verified: VerifiedCareerMapping[] = [];
    const allSOCCodes = new Set<string>();
    const socByCIP = new Map<string, string[]>();
    
    // Collect all unique SOC codes
    careerMappings.forEach(mapping => {
      mapping.socCodes.forEach(soc => allSOCCodes.add(soc));
      socByCIP.set(mapping.cipCode, mapping.socCodes);
    });
    
    console.log(`[SOCVerifier] Found ${allSOCCodes.size} unique SOC codes to verify`);
    
    // Validate SOC codes with conversational context
    const socValidations = await this.validateSOCCodesWithContext(
      Array.from(allSOCCodes),
      userQuery,
      conversationHistory,
      programContext
    );
    const socMap = new Map(socValidations.map(v => [v.originalCode, v]));
    
    // Filter SOC codes for each CIP
    for (const mapping of careerMappings) {
      const originalSOCs = mapping.socCodes;
      const validations = originalSOCs.map(soc => 
        socMap.get(soc) || this.createFallbackValidation(soc)
      );
      
      // Keep only relevant SOC codes
      const filteredSOCs = validations
        .filter(v => v.isRelevant)
        .map(v => v.originalCode);
      
      const removedSOCs = validations
        .filter(v => !v.isRelevant)
        .map(v => v.originalCode);
      
      verified.push({
        cipCode: mapping.cipCode,
        originalSOCCodes: originalSOCs,
        filteredSOCCodes: filteredSOCs,
        removedSOCCodes: removedSOCs,
        socValidations: validations,
      });
      
      if (removedSOCs.length > 0) {
        console.log(`[SOCVerifier] 🗑️  CIP ${mapping.cipCode}: Filtered out ${removedSOCs.length} irrelevant SOC codes`);
        removedSOCs.forEach(soc => {
          const validation = socMap.get(soc);
          if (validation) {
            console.log(`[SOCVerifier]    ❌ ${soc} (${validation.socTitle}): ${validation.reasoning}`);
          }
        });
      }
    }
    
    // Log summary
    const totalRemoved = verified.reduce((sum, v) => sum + v.removedSOCCodes.length, 0);
    const totalKept = verified.reduce((sum, v) => sum + v.filteredSOCCodes.length, 0);
    
    console.log(`[SOCVerifier] ✅ Verification complete:`);
    console.log(`[SOCVerifier]    - Kept: ${totalKept} relevant SOC codes`);
    console.log(`[SOCVerifier]    - Filtered: ${totalRemoved} irrelevant SOC codes`);
    
    return verified;
  }
  
  /**
   * Extract conversation context from query and history
   */
  private extractConversationContext(
    userQuery?: string,
    conversationHistory?: any[],
    programContext?: any[]
  ): string {
    const contexts: string[] = [];
    
    if (userQuery) {
      contexts.push(`Current query: "${userQuery}"`);
    }
    
    if (conversationHistory && conversationHistory.length > 0) {
      const recentMessages = conversationHistory
        .filter(m => m.role === 'user')
        .slice(-3)
        .map(m => m.content);
      
      if (recentMessages.length > 0) {
        contexts.push(`Recent conversation: ${recentMessages.join(' | ')}`);
      }
    }
    
    if (programContext && programContext.length > 0) {
      const programNames = programContext.slice(0, 5).map(p => 
        p.programFamily || p.programName || p.title || 'Unknown'
      );
      contexts.push(`Programs found: ${programNames.join(', ')}`);
    }
    
    return contexts.join('\n') || 'No context available';
  }
  
  /**
   * Validate SOC codes with conversational context
   * This is the PRIMARY method that filters out misaligned SOC codes
   */
  private async validateSOCCodesWithContext(
    socCodes: string[],
    userQuery?: string,
    conversationHistory?: any[],
    programContext?: any[]
  ): Promise<SOCCodeValidation[]> {
    if (socCodes.length === 0) return [];
    
    // Extract conversation context
    const conversationContext = this.extractConversationContext(
      userQuery,
      conversationHistory,
      programContext
    );
    
    console.log(`[SOCVerifier] 🎯 Checking SOC relevance with conversation context...`);
    
    try {
      const systemPrompt = `You are a SOC (Standard Occupational Classification) code validator with CONVERSATIONAL CONTEXT AWARENESS.

🎯 PRIMARY MISSION: Detect when SOC codes DON'T match what the user is asking for!

SOC CODES (National Standards - Bureau of Labor Statistics):
- FORMAT: XX-XXXX (2-digit major group + 4-digit detailed occupation)
- MAJOR GROUPS:
  * 11-XXXX: Management Occupations
  * 15-XXXX: Computer and Mathematical Occupations
  * 17-XXXX: Architecture and Engineering Occupations
  * 25-XXXX: Education, Training, and Library Occupations
  * 27-XXXX: Arts, Design, Entertainment, Sports, and Media Occupations
  * 29-XXXX: Healthcare Practitioners and Technical Occupations
  * 31-XXXX: Healthcare Support Occupations
  * 43-XXXX: Office and Administrative Support Occupations
  * 51-XXXX: Production Occupations

🚨 CRITICAL CHECKS:
1. Does SOC family match user intent?
   - User asks "nursing/healthcare" → SOC MUST be 29-XXXX or 31-XXXX (Healthcare)
   - User asks "photography/arts" → SOC MUST be 27-XXXX (Arts/Media)
   - User asks "computer science" → SOC MUST be 15-XXXX (Computer/Math)
   - User asks "engineering" → SOC MUST be 17-XXXX (Engineering)

2. If MISMATCH detected:
   - Set isRelevant: false
   - Explain why it doesn't match

EXAMPLE MISMATCHES:
❌ User: "photography programs" + SOC: 15-1255 (Software Engineers) → IRRELEVANT!
❌ User: "nursing" + SOC: 27-1014 (Multimedia Artists) → IRRELEVANT!
❌ User: "business" + SOC: 29-1141 (Registered Nurses) → IRRELEVANT!

COMMON SOC CODES:
- 15-1251: Computer Programmers
- 15-1254: Web Developers
- 15-1255: Web and Digital Interface Designers
- 15-1299: Computer Occupations, All Other
- 17-1021: Cartographers and Photogrammetrists
- 27-1011: Art Directors
- 27-1014: Multimedia Artists and Animators
- 27-1021: Commercial and Industrial Designers
- 27-1024: Graphic Designers
- 27-2012: Producers and Directors
- 27-4021: Photographers
- 27-4032: Film and Video Editors
- 29-1141: Registered Nurses
- 29-1171: Nurse Practitioners
- 31-9092: Medical Assistants

Return JSON object:
{
  "validations": [
    {
      "originalCode": "SOC code",
      "isRelevant": true/false (FALSE if context mismatch!),
      "socFamily": "major group name",
      "socTitle": "occupation title",
      "confidence": 0-100,
      "reasoning": "explain why relevant or irrelevant"
    }
  ]
}`;

      const userPrompt = `CONVERSATION CONTEXT:
${conversationContext}

SOC CODES TO VALIDATE:
${socCodes.map((code, i) => `${i + 1}. ${code}`).join('\n')}

CHECK: Do these SOC codes match what the user is ACTUALLY asking for?
- If user asks for photography/arts but SOC is 15-XXXX (Computer/IT) → IRRELEVANT!
- If user asks for nursing but SOC is 27-XXXX (Arts/Media) → IRRELEVANT!
- If user asks for computer science but SOC is 29-XXXX (Healthcare) → IRRELEVANT!

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
        isRelevant: v.isRelevant ?? true,
        socFamily: v.socFamily || 'Unknown',
        socTitle: v.socTitle || 'Unknown',
        confidence: v.confidence ?? 0,
        reasoning: v.reasoning,
      }));
      
      // Log filtered SOC codes
      const filtered = results.filter(r => !r.isRelevant);
      if (filtered.length > 0) {
        console.log(`[SOCVerifier] 🔄 Found ${filtered.length} irrelevant SOC codes!`);
        filtered.forEach(c => {
          console.log(`[SOCVerifier]    ${c.originalCode} (${c.socTitle}): ${c.reasoning}`);
        });
      }
      
      return results;
      
    } catch (error: any) {
      console.error('[SOCVerifier] ❌ Validation error:', error.message);
      
      // Fallback: Accept all SOC codes if validation fails
      return socCodes.map(code => this.createFallbackValidation(code, true));
    }
  }
  
  /**
   * Create fallback validation when LLM fails
   */
  private createFallbackValidation(socCode: string, assumeValid = false): SOCCodeValidation {
    const socPattern = /^\d{2}-\d{4}$/;
    const isValid = socPattern.test(socCode);
    
    let socFamily = 'Unknown';
    let socTitle = 'Unknown Occupation';
    
    if (isValid) {
      const majorGroup = socCode.substring(0, 2);
      const familyMap: Record<string, string> = {
        '11': 'Management',
        '15': 'Computer and Mathematical',
        '17': 'Architecture and Engineering',
        '25': 'Education and Library',
        '27': 'Arts, Design, Entertainment, Sports, and Media',
        '29': 'Healthcare Practitioners',
        '31': 'Healthcare Support',
        '43': 'Office and Administrative Support',
        '51': 'Production',
      };
      
      socFamily = familyMap[majorGroup] || `Group ${majorGroup}`;
      socTitle = `${socFamily} Occupation`;
    }
    
    return {
      originalCode: socCode,
      isRelevant: assumeValid && isValid,
      socFamily,
      socTitle,
      confidence: assumeValid ? 50 : 0,
      reasoning: assumeValid 
        ? 'Fallback validation - assuming relevant' 
        : 'Invalid SOC code format - should be XX-XXXX'
    };
  }
}
