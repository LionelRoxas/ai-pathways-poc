/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/lib/agents/market-intelligence-agent.ts
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

interface MarketIntelligenceData {
  jobTitlesSkills: any;
  jobTitlesCompanies: any;
  companiesSkills: any;
  activePosts: any;
}

interface MarketReport {
  markdown: string;
  summary: {
    totalCompanies: number;
    totalSkills: number;
    topCompanies: string[];
    topSkills: string[];
    activePosts: number;
    skillDemandData?: Array<[string, number]>; // [skillName, postingCount]
  };
}

/**
 * Market Intelligence Agent
 * 
 * Aggregates data from all SOC visualizers and generates an intelligent
 * market analysis report using AI.
 */
export class MarketIntelligenceAgent {
  /**
   * Fetch all market data from SOC APIs
   * NOTE: This runs SERVER-SIDE ONLY, so we call external API directly
   */
  async fetchMarketData(socCodes: string[]): Promise<MarketIntelligenceData> {
    console.log('[MarketIntelligence] 📊 Fetching data for SOC codes:', socCodes);
    
    // Join SOC codes with commas for query parameter
    const socCodesParam = socCodes.join(',');

    // Call external API directly (server-side only, not through Next.js proxy)
    const externalBaseUrl = 'https://careerexplorer.hawaii.edu/api_pathways';

    try {
      // Fetch all 4 SOC endpoints in parallel (all use GET with query params)
      console.log('[MarketIntelligence] 🔄 Calling external SOC APIs...');
      const [jobTitlesSkills, jobTitlesCompanies, companiesSkills, activePosts] = await Promise.all([
        fetch(`${externalBaseUrl}/soc5_to_jobtitles_skills.php?soc5=${socCodesParam}`, {
          headers: { Accept: 'application/json' },
        })
          .then(res => {
            console.log('[MarketIntelligence] jobtitles-skills status:', res.status);
            if (!res.ok) throw new Error(`jobtitles-skills API error: ${res.status}`);
            return res.json();
          }),
        fetch(`${externalBaseUrl}/soc5_to_jobtitles_companies.php?soc5=${socCodesParam}`, {
          headers: { Accept: 'application/json' },
        })
          .then(res => {
            console.log('[MarketIntelligence] jobtitles-companies status:', res.status);
            if (!res.ok) throw new Error(`jobtitles-companies API error: ${res.status}`);
            return res.json();
          }),
        fetch(`${externalBaseUrl}/soc5_to_companies_skills.php?soc5=${socCodesParam}`, {
          headers: { Accept: 'application/json' },
        })
          .then(res => {
            console.log('[MarketIntelligence] companies-skills status:', res.status);
            if (!res.ok) throw new Error(`companies-skills API error: ${res.status}`);
            return res.json();
          }),
        fetch(`${externalBaseUrl}/soc5_to_active_posts.php?soc5=${socCodesParam}`, {
          headers: { Accept: 'application/json' },
        })
          .then(res => {
            console.log('[MarketIntelligence] active-posts status:', res.status);
            if (!res.ok) throw new Error(`active-posts API error: ${res.status}`);
            return res.json();
          }),
      ]);

      console.log('[MarketIntelligence] ✅ Data fetched successfully');
      console.log('[MarketIntelligence] Data summary:', {
        jobTitlesSkills: jobTitlesSkills?.data ? 'OK' : 'MISSING',
        jobTitlesCompanies: jobTitlesCompanies?.data ? 'OK' : 'MISSING',
        companiesSkills: companiesSkills?.data ? 'OK' : 'MISSING',
        activePosts: activePosts?.data ? 'OK' : 'MISSING',
      });

      return {
        jobTitlesSkills,
        jobTitlesCompanies,
        companiesSkills,
        activePosts,
      };
    } catch (error) {
      console.error('[MarketIntelligence] ❌ Error fetching data:', error);
      throw error;
    }
  }

  /**
   * Generate intelligent market report using LLM
   */
  async generateReport(
    marketData: MarketIntelligenceData,
    socCodes: string[],
    conversationContext?: any[],
    userProfile?: any
  ): Promise<MarketReport> {
    console.log('[MarketIntelligence] 🤖 Generating AI report...');

    // Extract key insights from the data
    const summary = this.extractSummary(marketData);

    // Analyze conversation context to understand student's interests
    const contextInsights = this.analyzeConversationContext(conversationContext, userProfile);

    const systemPrompt = `You are a career pathway advisor creating a clean, visual career roadmap. Generate a streamlined report focused on actionable career guidance.

YOUR TASK:
Create a visual career pathway guide that shows students:
1. Top 5 most in-demand skills (BE CREATIVE - infer from SOC codes and career field)
2. Top 5 companies hiring (use provided data when valid, otherwise infer typical employers)
3. 3-4 PERSONALIZED actionable insights based on their interests and conversation

CRITICAL APPROACH TO SKILLS:
- **BE CREATIVE AND SMART**: The provided skill data may be inaccurate or incomplete
- **Use your knowledge** of the career field associated with the SOC codes
- **Infer essential skills** based on the career path, not just the raw data
- Think: "What skills would someone ACTUALLY need for this career?"
- Prioritize TECHNICAL skills, certifications, tools, and methodologies
- Use the provided data as a REFERENCE, not gospel
- If provided skills seem irrelevant, IGNORE them and use your domain knowledge

EXAMPLE - For Electrical Engineering (SOC 17-2071):
- Instead of generic "Communication", list "Circuit Design", "AutoCAD", "MATLAB", "Power Systems", "Electrical Code Standards"
- Instead of relying on messy data, think: "What do electrical engineers actually use?"

FORMATTING RULES - USE THESE COMPONENTS:

1. SKILL BAR (NO percentages shown - just visual ranking):
<div data-component="skill-bar" data-skill="Python Programming" data-percentage="95" data-level=""></div>
Note: Use percentage 95, 85, 75, 65, 55 for top 5 skills (for visual ranking only)

2. COMPANY CARD (minimal):
<div data-component="company-card" data-company="Google" data-jobs="0" data-badge="Top Employer"></div>

3. INSIGHT BOX (1-2 sentences max):
<div data-component="insight-box" data-type="info" data-title="Quick Tip">
One actionable sentence.
</div>

Types: "success" (positive), "info" (neutral action), "warning" (important note)

REPORT STRUCTURE (SIDEBAR OPTIMIZED):

## Key Skills Required

<div class="space-y-2 my-3">
<div data-component="skill-bar" data-skill="[Most Important Skill]" data-percentage="95" data-level=""></div>
<div data-component="skill-bar" data-skill="[Second Priority Skill]" data-percentage="85" data-level=""></div>
<div data-component="skill-bar" data-skill="[Third Priority Skill]" data-percentage="75" data-level=""></div>
<div data-component="skill-bar" data-skill="[Fourth Priority Skill]" data-percentage="65" data-level=""></div>
<div data-component="skill-bar" data-skill="[Fifth Priority Skill]" data-percentage="55" data-level=""></div>
</div>

## Hiring Companies

<div class="space-y-2 my-3">
<div data-component="company-card" data-company="Company 1" data-jobs="0" data-badge="Top Employer"></div>
<div data-component="company-card" data-company="Company 2" data-jobs="0"></div>
<div data-component="company-card" data-company="Company 3" data-jobs="0"></div>
<div data-component="company-card" data-company="Company 4" data-jobs="0"></div>
<div data-component="company-card" data-company="Company 5" data-jobs="0"></div>
</div>

## Recommended Actions

<div class="space-y-2">
<div data-component="insight-box" data-type="success" data-title="Getting Started">
PERSONALIZED first action based on their interest, grade level, and top skills.
Example: "Enroll in the Cybersecurity program at Honolulu Community College to build Python skills"
</div>

<div data-component="insight-box" data-type="info" data-title="Portfolio Development">
SPECIFIC project idea using UHCC program courses that connects to their career interest.
Example: "Complete the capstone project in the Network Security course at Leeward CC"
</div>

<div data-component="insight-box" data-type="info" data-title="Professional Network">
WHO to connect with at Hawaii companies and UHCC career services.
Example: "Connect with ${summary.topCompanies[0]} recruiters through Kapiolani CC Career Center"
</div>

<div data-component="insight-box" data-type="warning" data-title="Competitive Edge">
What makes candidates competitive using UHCC certifications and Hawaii opportunities.
Example: "Earn CompTIA Security+ through Windward CC's certification program for Hawaii employers"
</div>
</div>

CRITICAL PERSONALIZATION RULES:
- Reference student's specific interests from conversation (e.g., "based on your interest in cybersecurity...")
- Connect top skills to their mentioned programs or careers
- Reference their grade level or current stage
- **ONLY recommend University of Hawaii Community College (UHCC) programs, courses, and certifications**
- **Recommend specific UHCC campuses and programs mentioned in the conversation**
- **Reference Hawaii-based companies, internships, and local career opportunities**
- Name-drop target companies from the data (prioritize Hawaii-based companies)
- Make recommendations achievable for their current level through UHCC pathways
- NO generic online platforms (Codecademy, Coursera, etc.) - ONLY Hawaii/UHCC resources
- Focus on Hawaii workforce development and local career pathways

STRICT FORMATTING RULES:
- NO emojis or decorative symbols
- NO statistics or numbers in text
- NO "active postings" counts - always use data-jobs="0"
- Use ONLY top 5 skills and top 5 companies
- Keep descriptions under 15 words
- 3-4 action step insights required
- Each insight 1-2 sentences max
- Professional, enterprise-level tone
- **All recommendations must be Hawaii/UHCC-specific**

OUTPUT ONLY THE MARKDOWN - No explanation.`;

    const userPrompt = `Create a PERSONALIZED career pathway guide for SOC codes: ${socCodes.join(', ')}

STUDENT CONTEXT:
${contextInsights}

REFERENCE DATA (Use as inspiration, NOT strict requirements):
- Sample Companies: ${summary.topCompanies.slice(0, 10).join(', ')}
- Sample Skills Found: ${summary.topSkills.slice(0, 15).join(', ')}
- Total Companies in Dataset: ${summary.totalCompanies}
- Total Skills in Dataset: ${summary.totalSkills}

YOUR CREATIVE TASK:
1. **SKILLS**: Based on the SOC codes and career field, what are the TOP 5 most important skills?
   - Use your domain knowledge of this profession
   - Think: "What would make someone successful in this career?"
   - Reference the sample skills IF they make sense, otherwise create your own
   - Prioritize: Technical skills, software/tools, certifications, methodologies
   - Be specific (e.g., "AutoCAD for Electrical Design" not "CAD")

2. **COMPANIES**: Who typically hires for these roles?
   - Use provided companies if they're legitimate and relevant
   - Add well-known companies in this industry (especially Hawaii-based)
   - Think: Major employers, government agencies, local Hawaii companies
   - Prioritize Hawaii employers when possible

3. **ACTIONS**: Connect skills to UHCC programs
   - Which UHCC programs teach these skills?
   - What certifications can students earn?
   - How can students build a portfolio using UHCC resources?
   - Where can they network in Hawaii's job market?

Generate a personalized UHCC career roadmap with realistic, industry-relevant skills and Hawaii-focused opportunities.`;

    try {
      const response = await groq.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.7, // Higher temperature for creativity
      });

      const markdown = this.cleanMarkdown(response.choices[0].message.content || '');

      console.log('[MarketIntelligence] ✅ Report generated successfully');

      return {
        markdown,
        summary,
      };
    } catch (error) {
      console.error('[MarketIntelligence] ❌ Error generating report:', error);
      return this.generateFallbackReport(summary);
    }
  }

  /**
   * Analyze conversation context to extract student interests and situation
   */
  private analyzeConversationContext(messages?: any[], userProfile?: any): string {
    let context = '';

    // Add user profile information
    if (userProfile) {
      context += `Student Profile:\n`;
      if (userProfile.gradeLevel) context += `- Grade Level: ${userProfile.gradeLevel}\n`;
      if (userProfile.interests && userProfile.interests.length > 0) {
        context += `- Stated Interests: ${userProfile.interests.join(', ')}\n`;
      }
      if (userProfile.careerGoals) context += `- Career Goals: ${userProfile.careerGoals}\n`;
    }

    // Extract key themes from recent conversation
    if (messages && messages.length > 0) {
      context += `\nRecent Conversation Topics:\n`;
      
      // Get last 5 user messages to understand context
      const userMessages = messages
        .filter((m: any) => m.role === 'user')
        .slice(-5)
        .map((m: any) => m.content);
      
      if (userMessages.length > 0) {
        // Extract mentioned programs, careers, skills
        const mentionedPrograms: string[] = [];
        const mentionedCareers: string[] = [];
        const questions: string[] = [];
        
        userMessages.forEach((msg: string) => {
          // Look for program mentions
          if (msg.toLowerCase().includes('program') || msg.toLowerCase().includes('pathway')) {
            mentionedPrograms.push(msg);
          }
          // Look for career mentions
          if (msg.toLowerCase().includes('career') || msg.toLowerCase().includes('job') || msg.toLowerCase().includes('work')) {
            mentionedCareers.push(msg);
          }
          // Capture questions
          if (msg.includes('?')) {
            questions.push(msg);
          }
        });

        if (mentionedPrograms.length > 0) {
          context += `- Program Interests: ${mentionedPrograms.join('; ')}\n`;
        }
        if (mentionedCareers.length > 0) {
          context += `- Career Interests: ${mentionedCareers.join('; ')}\n`;
        }
        if (questions.length > 0) {
          context += `- Questions Asked: ${questions.slice(-2).join('; ')}\n`;
        }
      }
    }

    // If no context available, provide generic guidance
    if (!context) {
      context = 'No specific student context provided. Provide general career pathway guidance.';
    }

    return context;
  }

  /**
   * Validate if a skill name is meaningful (not junk data)
   */
  private isValidSkill(skill: string): boolean {
    if (!skill || skill.length < 2) return false;
    
    // Filter out common junk patterns
    const junkPatterns = [
      /^\d+$/,                    // Pure numbers
      /^[^a-zA-Z]+$/,             // No letters at all
      /^(na|n\/a|null|undefined|none)$/i,  // Placeholder values
      /^.{1,2}$/,                 // Too short (1-2 chars)
      /^(test|demo|sample)/i,     // Test data
    ];
    
    return !junkPatterns.some(pattern => pattern.test(skill.trim()));
  }

  /**
   * Validate if a company name is meaningful (not junk data)
   */
  private isValidCompany(company: string): boolean {
    if (!company || company.length < 2) return false;
    
    // Filter out common junk patterns
    const junkPatterns = [
      /^\d+$/,                    // Pure numbers
      /^[^a-zA-Z]+$/,             // No letters at all
      /^(na|n\/a|null|undefined|none|unknown|confidential)$/i,
      /^.{1,2}$/,                 // Too short
      /^(test|demo|sample)/i,
    ];
    
    return !junkPatterns.some(pattern => pattern.test(company.trim()));
  }

  /**
   * Extract summary statistics from market data with validation
   */
  private extractSummary(data: MarketIntelligenceData): MarketReport['summary'] {
    console.log('[MarketIntelligence] 🔍 Extracting and validating market data...');
    
    // Extract unique companies with validation
    const companies = new Set<string>();
    const jobTitlesBuckets = data.jobTitlesCompanies?.data?.ranking?.buckets;
    if (jobTitlesBuckets && Array.isArray(jobTitlesBuckets)) {
      jobTitlesBuckets.forEach((jobTitle: any) => {
        if (jobTitle.ranking?.buckets) {
          jobTitle.ranking.buckets.forEach((company: any) => {
            if (company.name && this.isValidCompany(company.name)) {
              companies.add(company.name);
            }
          });
        }
      });
    }
    console.log(`[MarketIntelligence] 📊 Found ${companies.size} valid companies (after filtering)`);

    // Extract unique skills with validation
    const skills = new Set<string>();
    const jobTitlesSkillsBuckets = data.jobTitlesSkills?.data?.ranking?.buckets;
    if (jobTitlesSkillsBuckets && Array.isArray(jobTitlesSkillsBuckets)) {
      jobTitlesSkillsBuckets.forEach((jobTitle: any) => {
        if (jobTitle.ranking?.buckets) {
          jobTitle.ranking.buckets.forEach((skill: any) => {
            if (skill.name && this.isValidSkill(skill.name)) {
              skills.add(skill.name);
            }
          });
        }
      });
    }
    console.log(`[MarketIntelligence] 📊 Found ${skills.size} valid skills (after filtering)`);

    // Get top companies by post count (with validation)
    const companyPostCounts: { [key: string]: number } = {};
    if (jobTitlesBuckets && Array.isArray(jobTitlesBuckets)) {
      jobTitlesBuckets.forEach((jobTitle: any) => {
        if (jobTitle.ranking?.buckets) {
          jobTitle.ranking.buckets.forEach((company: any) => {
            if (company.name && this.isValidCompany(company.name)) {
              companyPostCounts[company.name] = (companyPostCounts[company.name] || 0) + (company.unique_postings || 0);
            }
          });
        }
      });
    }

    const topCompanies = Object.entries(companyPostCounts)
      .filter(([name]) => this.isValidCompany(name))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name]) => name);

    // Get top skills by demand - aggregate from BOTH endpoints with validation
    const skillDemand: { [key: string]: number } = {};
    
    // Add skills from jobTitlesSkills endpoint
    if (jobTitlesSkillsBuckets && Array.isArray(jobTitlesSkillsBuckets)) {
      jobTitlesSkillsBuckets.forEach((jobTitle: any) => {
        if (jobTitle.ranking?.buckets) {
          jobTitle.ranking.buckets.forEach((skill: any) => {
            if (skill.name && this.isValidSkill(skill.name)) {
              skillDemand[skill.name] = (skillDemand[skill.name] || 0) + (skill.unique_postings || 0);
            }
          });
        }
      });
    }
    
    // Add skills from companiesSkills endpoint
    const companiesSkillsBuckets = data.companiesSkills?.data?.ranking?.buckets;
    if (companiesSkillsBuckets && Array.isArray(companiesSkillsBuckets)) {
      companiesSkillsBuckets.forEach((company: any) => {
        if (company.ranking?.buckets) {
          company.ranking.buckets.forEach((skill: any) => {
            if (skill.name && this.isValidSkill(skill.name)) {
              skillDemand[skill.name] = (skillDemand[skill.name] || 0) + (skill.unique_postings || 0);
            }
          });
        }
      });
    }

    const topSkillsWithCounts = Object.entries(skillDemand)
      .filter(([name]) => this.isValidSkill(name))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    const topSkills = topSkillsWithCounts.map(([name]) => name);

    // Count active posts
    const activePosts = data.activePosts?.data?.totals?.unique_postings || 0;

    console.log('[MarketIntelligence] 📊 Extracted summary:', {
      totalCompanies: companies.size,
      totalSkills: skills.size,
      topSkills: topSkills.slice(0, 5),
      topCompanies: topCompanies.slice(0, 5),
      skillDemandData: topSkillsWithCounts.slice(0, 5).map(([name, count]) => `${name}: ${count}`),
    });

    return {
      totalCompanies: companies.size,
      totalSkills: skills.size,
      topCompanies,
      topSkills,
      activePosts,
      skillDemandData: topSkillsWithCounts, // Include counts for LLM
    };
  }

  /**
   * Clean markdown formatting
   */
  private cleanMarkdown(markdown: string): string {
    return markdown
      .trim()
      .replace(/```markdown\s*/g, '')
      .replace(/```\s*/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/ +$/gm, '');
  }

  /**
   * Generate fallback report if LLM fails
   */
  private generateFallbackReport(summary: MarketReport['summary']): MarketReport {
    const markdown = `## In-Demand Skills

<div class="space-y-3 my-3">
${summary.topSkills.slice(0, 5).map((skill, idx) => {
  const percentage = Math.max(55, 95 - (idx * 10));
  return `<div data-component="skill-bar" data-skill="${skill}" data-percentage="${percentage}" data-level=""></div>`;
}).join('\n')}
</div>

## Hiring Companies

<div class="space-y-2 my-3">
${summary.topCompanies.slice(0, 5).map((company, idx) => 
  `<div data-component="company-card" data-company="${company}" data-jobs="0"${idx === 0 ? ' data-badge="Leading Employer"' : ''}></div>`
).join('\n')}
</div>

## Recommended Actions

<div class="space-y-2">
<div data-component="insight-box" data-type="success" data-title="Getting Started">
Explore relevant UHCC programs at campuses like Honolulu, Kapiolani, or Leeward Community College.
</div>

<div data-component="insight-box" data-type="info" data-title="Portfolio Development">
Complete hands-on projects through UHCC program coursework to build demonstrable skills.
</div>

<div data-component="insight-box" data-type="info" data-title="Professional Network">
Connect with Hawaii employers through your UHCC campus Career Center and job fairs.
</div>

<div data-component="insight-box" data-type="warning" data-title="Competitive Edge">
Pursue industry certifications available through UHCC to meet Hawaii workforce needs.
</div>
</div>`;

    return {
      markdown,
      summary,
    };
  }
}

export default MarketIntelligenceAgent;
