/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/lib/agents/pathway-planning-agent.ts
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

interface UserProfile {
  educationLevel: string | null;
  interests: string[];
  careerGoals: string[];
  location: string | null;
}

interface PathwayPlanningInput {
  userProfile?: UserProfile;
  conversationContext?: string | any[];
  programsFound?: any[];
  socCodes?: string[];
}

interface PathwayPlanningResult {
  markdown: string;
  summary: {
    currentStage: string;
    recommendedPath: string;
    timeframe: string;
    keyMilestones: number;
  };
}

export class PathwayPlanningAgent {
  async generatePathwayPlan(input: PathwayPlanningInput): Promise<PathwayPlanningResult> {
    console.log('[PathwayPlanning] 🗺️  Generating personalized pathway plan');

    const { userProfile, conversationContext, programsFound, socCodes } = input;

    const systemPrompt = `You are an educational pathway planner for Hawaii. Create a clear, flexible pathway in markdown that adapts to different educational goals.

CRITICAL RULES:
1. Write ALL program and school names in plain text with **bold** - NEVER use brackets, commas before names, or placeholders
2. Be INTELLIGENT about the path - not everyone needs a 4-year degree:
   - Certificate programs: 1 phase (6-12 months)
   - Associate degree: 2 phases (2 years)
   - Bachelor's degree: 3 phases (4 years)
   - Career change/upskilling: Focus on relevant skills only
3. Only create phases that make sense for THEIR specific goal
4. Write complete sentences - never leave things incomplete or use placeholders

GOOD EXAMPLES:
✅ "Enroll in **Web Development Certificate** at **Honolulu Community College**"
✅ "Take **Introduction to Programming** and **Database Fundamentals** courses"
✅ "Consider the **Nursing Assistant Program** at **Kapiolani Community College**"

BAD EXAMPLES (NEVER DO THIS):
❌ "Take courses in ,[object Object],"
❌ "Enroll in [program] at [school]"
❌ "Take elective courses in ,[object Object], or ,[object Object],"
❌ Any incomplete sentence with commas and no content

STRUCTURE (adjust phases based on their goal):

Brief intro paragraph about their specific journey.

## Current Position
2-3 sentences about where they are now.

## Your Educational Pathway

[Create ONLY the phases they need - 1, 2, or 3 phases based on their goal]

### Phase 1: [Foundation/Core Skills/etc - 6 months to 2 years depending on goal]
- **Goal:** [Clear, specific objective for this phase]
- **Action Steps:**
  - [Simple, clear action item]
  - [Another clear action item]
  - [Another clear action item]
- **Programs to Consider:**
  - **[Program Name]** at **[School Name]** - [brief description]
  - **[Program Name]** at **[School Name]** - [brief description]

[ONLY include Phase 2 and Phase 3 if they make sense for the educational goal]

---

[Only add Phase 2 if they need an associate or bachelor's degree]

[Only add Phase 3 if they need a bachelor's degree]

---

## Career Outlook in Hawaii

| Career | Salary | Growth | Location |
|--------|--------|--------|----------|
| [Actual Job Title] | $XX,XXX | XX% | [Actual City] |

Brief paragraph about real career opportunities.

## Next Steps

1. **This Week:** Specific immediate action
2. **This Month:** Concrete short-term goal  
3. **This Quarter:** Clear milestone

Encouraging message about their specific path.

REMEMBER:
- Certificate path = 1 phase
- Associate degree = 2 phases  
- Bachelor's degree = 3 phases
- Career pivot = Focus on skills needed
- NO Pro Tips or advice sections
- NEVER use brackets, placeholders, or incomplete sentences
- Write COMPLETE sentences with REAL program names or generic descriptions`;

    const userPrompt = this.buildUserPrompt(conversationContext, userProfile, programsFound, socCodes);

    try {
      const response = await groq.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        model: "openai/gpt-oss-120b",
        temperature: 0.6,
      });

      let markdown = response.choices[0].message.content || '';
      
      // Aggressive cleanup of object references and incomplete sentences
      markdown = markdown
        .replace(/```markdown\n?/g, "")
        .replace(/```\n?/g, "")
        // Remove [object Object] patterns with or without commas
        .replace(/,?\s*\[object\s+Object\]\s*,?/gi, "")
        .replace(/\[object\s+Object\]/gi, "")
        // Remove placeholder patterns
        .replace(/\[program\s*name\]/gi, "")
        .replace(/\[school\s*name\]/gi, "")
        .replace(/\[course\]/gi, "")
        .replace(/\[institution\]/gi, "")
        // Remove Pro Tip sections completely
        .replace(/💡\s*\*\*Pro Tip:\*\*.*$/gm, "")
        .replace(/\*\*Pro Tip:\*\*.*$/gm, "")
        // Remove incomplete phrases with dangling commas
        .replace(/,\s*or\s*,/g, " or ")
        .replace(/,\s*and\s*,/g, " and ")
        .replace(/in\s*,\s*,/g, "in ")
        // Clean up multiple commas
        .replace(/,\s*,+/g, ",")
        // Remove sentences that start with "Take courses in ," or similar incomplete patterns
        .replace(/Take\s+(?:elective\s+)?courses?\s+in\s*,\s*[,\s]*;/gi, "")
        .replace(/Enroll\s+in\s*,\s*[,\s]*at/gi, "Enroll in programs at")
        // Remove lines that are just ,[object Object],
        .replace(/^,\s*\[object\s+Object\]\s*,.*$/gm, "")
        // Clean up any remaining empty lines (more than 2 consecutive newlines)
        .replace(/\n{3,}/g, "\n\n")
        .trim();

      console.log('[PathwayPlanning] ✅ Plan generated');

      return {
        markdown,
        summary: this.extractSummary(markdown, userProfile),
      };
    } catch (error) {
      console.error('[PathwayPlanning] ❌ Error:', error);
      return this.getFallbackPlan(userProfile);
    }
  }

  private buildUserPrompt(
    conversationContext?: string | any[], 
    userProfile?: UserProfile, 
    programsFound?: any[], 
    socCodes?: string[]
  ): string {
    const parts: string[] = [];

    // Conversation
    if (conversationContext) {
      if (Array.isArray(conversationContext)) {
        const recent = conversationContext
          .slice(-6)
          .map(m => `${m.role}: ${m.content}`)
          .join("\n");
        parts.push(`Recent conversation:\n${recent}`);
      } else {
        parts.push(`Recent conversation:\n${conversationContext}`);
      }
    }

    // Profile
    if (userProfile) {
      const profile = [];
      if (userProfile.educationLevel) profile.push(`Education: ${userProfile.educationLevel}`);
      if (userProfile.interests?.length) profile.push(`Interests: ${userProfile.interests.join(", ")}`);
      if (userProfile.careerGoals?.length) profile.push(`Goals: ${userProfile.careerGoals.join(", ")}`);
      if (profile.length) parts.push(`Profile:\n${profile.join("\n")}`);
    }

    // Programs
    if (programsFound?.length) {
      parts.push(`Programs found: ${programsFound.length} programs available`);
    }

    // SOC codes
    if (socCodes?.length) {
      parts.push(`Career codes: ${socCodes.join(", ")}`);
    }

    parts.push(`\nIMPORTANT INSTRUCTIONS:
1. Determine the RIGHT educational path for their goal:
   - Quick certification? → 1 phase (6-12 months)
   - Associate degree? → 2 phases (2 years)
   - Bachelor's degree? → 3 phases (4 years)
   - Career change? → Focus on specific skills needed
   
2. Create ONLY the phases they actually need - don't force 3 phases if they just need a certificate

3. Write COMPLETE sentences with actual program names in **bold** or generic descriptions - NEVER leave incomplete phrases

4. Include a markdown table for Career Outlook in Hawaii

5. Be specific and actionable - every sentence should be complete and helpful`);

    return parts.join("\n\n");
  }

  private extractSummary(markdown: string, profile?: UserProfile) {
    let currentStage = "Exploring Options";
    if (profile?.educationLevel === "high_school") currentStage = "High School Student";
    if (profile?.educationLevel === "college") currentStage = "College Student";

    const bulletPoints = (markdown.match(/^[-*]\s/gm) || []).length;

    let recommendedPath = "Customized pathway";
    if (profile?.careerGoals?.length) recommendedPath = profile.careerGoals[0];
    else if (profile?.interests?.length) recommendedPath = profile.interests[0];

    return {
      currentStage,
      recommendedPath,
      timeframe: "2-4 years",
      keyMilestones: bulletPoints,
    };
  }

  private getFallbackPlan(profile?: UserProfile): PathwayPlanningResult {
    const interests = profile?.interests?.[0] || "your field of interest";

    const markdown = `## Your Educational Pathway

Let's explore educational opportunities in Hawaii together! 

## Current Position

You're at an exciting starting point. Tell me more about your interests and goals so I can create a detailed pathway plan for you.

## Next Steps

1. **Share your interests** - What subjects excite you?
2. **Tell me your goals** - What career are you exploring?
3. **Ask about programs** - Search for schools or programs

Once I know more, I'll create a personalized plan with specific programs, timelines, and career opportunities in Hawaii.`;

    return {
      markdown,
      summary: {
        currentStage: "Getting Started",
        recommendedPath: interests,
        timeframe: "To be determined",
        keyMilestones: 3,
      },
    };
  }
}

export default PathwayPlanningAgent;
