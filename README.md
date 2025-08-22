
# AI Pathways POC - Implementation Plan

## Overview

Build a proof-of-concept for an intelligent education-to-workforce guidance system that matches users with appropriate career pathways based on their current education level and interests.

**Timeline**: 7 days  
**Focus**: High school students exploring career paths  
**Tech Stack**: React (chat UI) + Next.js (MCP server) + PostgreSQL (Neon) + Vercel deployment

---

## Core Concept

The system will:

1. Ask 3-4 qualifying questions to understand the user's context
2. Use an MCP server to query relevant data sources based on user profile
3. Provide personalized career pathway recommendations
4. Demonstrate intelligent data routing (different data sources for different user types)

---

## Key Use Cases (POC Scope)

1. **"I want to be a software developer"** - Show education pathway from high school → college programs → job market
2. **"What careers are good for someone who likes math and science?"** - Demonstrate interest-based recommendations
3. **"I'm not sure about college, what are my options?"** - Show alternative pathways (trade schools, certifications)

---

## Data Sources (Simulated)

Based on the Excel analysis, we'll simulate these priority sources:

### Primary Sources:

- **Hawaii Career Explorer**: Basic career information, salary ranges, job outlook
- **DOE Course & Test Scores**: High school course recommendations
- **UH Campuses**: College program information, admission requirements

### Secondary Sources:

- **Lightcast LMI**: Job market data, skills demand
- **CIP-SOC Mapping**: Career codes and occupation alignment

---

## Technical Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Chat    │    │   Next.js MCP   │    │  PostgreSQL     │
│   Interface     │◄──►│     Server      │◄──►│   (Neon)       │
│                 │    │                 │    │                 │
│ - User profiling│    │ - Query routing │    │ - Career data   │
│ - Chat UI       │    │ - Data fetching │    │ - Education     │
│ - Recommendations│    │ - Response gen  │    │ - Job market    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## Implementation Milestones

### Day 1-2: Foundation & Database Setup

#### Tasks:

- [ ] **Set up Neon PostgreSQL database**
  - Create database instance on Neon
  - Design schema for simulated data
  - Create sample data for all sources

#### Database Schema:

```sql
-- User profiling data
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY,
  education_level VARCHAR(50),
  grade_level INTEGER,
  interests TEXT[],
  career_goals TEXT,
  timeline VARCHAR(50),
  created_at TIMESTAMP
);

-- Career information
CREATE TABLE careers (
  id UUID PRIMARY KEY,
  title VARCHAR(200),
  description TEXT,
  salary_min INTEGER,
  salary_max INTEGER,
  job_outlook VARCHAR(50),
  required_education VARCHAR(100),
  skills TEXT[],
  industries TEXT[]
);

-- Education pathways
CREATE TABLE education_programs (
  id UUID PRIMARY KEY,
  institution VARCHAR(200),
  program_name VARCHAR(200),
  degree_type VARCHAR(50),
  duration_years INTEGER,
  admission_requirements TEXT[],
  related_careers UUID[],
  cip_code VARCHAR(10)
);

-- Skills and certifications
CREATE TABLE skills_certifications (
  id UUID PRIMARY KEY,
  name VARCHAR(200),
  type VARCHAR(50), -- 'skill' or 'certification'
  demand_level VARCHAR(20), -- 'high', 'medium', 'low'
  related_careers UUID[]
);

-- Job market data
CREATE TABLE job_market (
  id UUID PRIMARY KEY,
  occupation_code VARCHAR(10),
  location VARCHAR(100),
  job_postings_count INTEGER,
  growth_rate DECIMAL,
  companies TEXT[],
  updated_at TIMESTAMP
);
```

#### Sample Data Creation:

- **50+ careers** across different industries
- **20+ UH programs** with admission requirements
- **High school courses** mapped to career interests
- **Job market data** for Hawaii region

#### Deliverables:

- Working database with sample data
- Connection strings and access configured

---

### Day 3: MCP Server Development

#### Tasks:

- [ ] **Set up Next.js project for MCP server**
  - Initialize Next.js project
  - Configure database connection
  - Set up API routes for MCP functions

#### Core MCP Functions:

```javascript
// /api/mcp/profile-user
async function profileUser(responses) {
  // Analyze user responses and create profile
  // Return user context and recommended data sources
}

// /api/mcp/get-career-recommendations
async function getCareerRecommendations(userProfile) {
  // Query careers table based on interests and education level
  // Return ranked list of career options
}

// /api/mcp/get-education-pathways
async function getEducationPathways(careerIds, userProfile) {
  // Query education programs for specific careers
  // Filter by user's current education level
}

// /api/mcp/get-market-data
async function getMarketData(careerIds) {
  // Get job market information for selected careers
  // Include salary, growth, and company data
}
```

#### Smart Data Routing Logic:

```javascript
function selectDataSources(userProfile) {
  const sources = [];

  if (userProfile.education_level === "high_school") {
    sources.push("hawaii_career_explorer", "doe_courses", "uh_programs");
  }

  if (userProfile.interests.includes("technology")) {
    sources.push("tech_skills_demand", "coding_bootcamps");
  }

  if (userProfile.timeline === "immediate") {
    sources.push("job_market_current", "certifications");
  }

  return sources;
}
```

#### Deliverables:

- Functional MCP server deployed to Vercel
- 4-5 core query functions implemented
- Database integration working
- API endpoints tested

---

### Day 4-5: React Chat Interface

#### Tasks:

- [ ] **Build React chat application**
  - Set up React project with modern UI components
  - Implement chat interface with message history
  - Create user onboarding flow

#### User Onboarding Questions:

1. **"What's your current education level?"**

   - Middle School (6-8th grade)
   - High School (9-12th grade)
   - College Student
   - Working Professional
   - Other

2. **"What subjects or activities interest you most?"** (Multi-select)

   - Math & Science
   - Technology & Computers
   - Arts & Creative
   - Business & Finance
   - Healthcare
   - Education & Social Work
   - Hands-on/Technical Work

3. **"When are you hoping to start a career?"**

   - After high school (1-2 years)
   - After college (3-6 years)
   - I'm ready now
   - I'm still exploring

4. **"Are you planning to go to college?"**
   - Yes, definitely
   - Maybe, still deciding
   - No, looking for alternatives
   - Already in college

#### Chat Interface Features:

- Clean, modern design with typing indicators
- Message bubbles with proper formatting
- Quick reply buttons for common responses
- Loading states during MCP queries
- Conversation history

#### MCP Integration:

```javascript
// Connect to MCP server
async function queryMCP(functionName, params) {
  const response = await fetch("/api/mcp/" + functionName, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return response.json();
}

// Example usage in chat
async function handleUserResponse(message, userProfile) {
  setLoading(true);

  // Query MCP server for recommendations
  const recommendations = await queryMCP("get-career-recommendations", {
    profile: userProfile,
    query: message,
  });

  // Format and display response
  setMessages((prev) => [
    ...prev,
    {
      type: "ai",
      content: formatRecommendations(recommendations),
      timestamp: new Date(),
    },
  ]);

  setLoading(false);
}
```

#### Deliverables:

- Working React chat interface
- User onboarding flow implemented
- MCP server integration functional
- Responsive design for mobile/desktop

---

### Day 6: Intelligence & Response Generation

#### Tasks:

- [ ] **Implement smart response generation**
  - Create response templates for different scenarios
  - Add contextual follow-up questions
  - Implement conversation memory

#### Response Templates:

```javascript
const responseTemplates = {
  career_recommendations: {
    intro:
      "Based on your interests in {interests} and your {education_level} level, here are some career paths to consider:",
    career_format:
      "**{title}** - {description}\n💰 Salary: ${salary_min}-${salary_max}\n📈 Job Outlook: {outlook}",
    followup:
      "Would you like me to show you the education pathway for any of these careers?",
  },

  education_pathway: {
    intro: "Here's how you can become a {career_title}:",
    steps:
      "1. **High School**: Focus on {recommended_courses}\n2. **College**: Consider these programs at UH:\n{programs}\n3. **Skills**: Develop these key skills: {skills}",
    followup:
      "Want to see current job opportunities or salary information for this field?",
  },

  job_market: {
    intro: "Here's the current job market for {career_title} in Hawaii:",
    stats:
      "📊 **{job_count}** current openings\n📈 **{growth_rate}%** projected growth\n🏢 **Top employers**: {companies}",
    followup:
      "Should I show you similar careers or different education options?",
  },
};
```

#### Conversation Flow Logic:

```javascript
function generateResponse(userQuery, userProfile, queryResults) {
  // Determine response type based on query and results
  const responseType = classifyQuery(userQuery);

  // Select appropriate template and data
  const template = responseTemplates[responseType];
  const formattedResponse = populateTemplate(template, queryResults);

  // Add contextual follow-ups
  const followUps = generateFollowUps(responseType, userProfile);

  return {
    message: formattedResponse,
    followUps: followUps,
    suggestedQuestions: getSuggestedQuestions(responseType),
  };
}
```

#### Deliverables:

- Intelligent response generation system
- Contextual follow-up questions
- Conversation memory implementation
- Multiple response formats (career info, pathways, market data)

---

### Day 7: Integration, Testing & Demo Prep

#### Tasks:

- [ ] **Complete integration and testing**
  - Connect all components end-to-end
  - Test all user pathways
  - Fix bugs and optimize performance

#### End-to-End Testing Scenarios:

1. **Software Developer Path**:

   - User: High school student interested in technology
   - Expected: Show CS programs at UH, coding skills, tech job market
   - Verify: Correct data sources queried, relevant recommendations

2. **Undecided Student Path**:

   - User: High school student unsure about college
   - Expected: Show both college and non-college options
   - Verify: Alternative pathways presented (trade schools, certifications)

3. **Interest-Based Discovery**:
   - User: "I like math and science but don't know what careers use those"
   - Expected: Multiple STEM career options with pathways
   - Verify: Different education requirements shown

#### Demo Preparation:

- [ ] **Create demo script** with key talking points
- [ ] **Prepare test scenarios** that showcase different features
- [ ] **Document system capabilities** and limitations
- [ ] **Create slides** explaining the architecture and data flow

#### Demo Script Outline:

1. **Problem Statement** (2 min)

   - Current challenge with career guidance
   - Need for personalized, intelligent routing

2. **Solution Overview** (3 min)

   - Show user onboarding flow
   - Demonstrate intelligent data source selection
   - Explain MCP server architecture

3. **Live Demo** (10 min)

   - Run through 2-3 user scenarios
   - Show different response types
   - Highlight data source integration

4. **Technical Architecture** (3 min)

   - Explain MCP server concept
   - Show database schema
   - Discuss scalability approach

5. **Next Steps** (2 min)
   - Production data integration plan
   - Additional user types
   - Advanced features roadmap

#### Deliverables:

- Fully functional POC system
- Demo script and presentation materials
- Documentation of architecture and capabilities
- Identified next steps and improvements

---

## Success Metrics for POC

### Technical Success:

- [ ] User can complete onboarding in <2 minutes
- [ ] MCP server responds to queries in <3 seconds
- [ ] Chat interface handles all test scenarios
- [ ] Different data sources are queried based on user profile

### Business Success:

- [ ] Demonstrates intelligent career guidance concept
- [ ] Shows clear value of personalized data routing
- [ ] Technical team understands implementation approach
- [ ] Identifies clear path to production system

### Demo Success:

- [ ] Runs smoothly without technical issues
- [ ] Clearly shows differentiated approach
- [ ] Stakeholders understand the system architecture
- [ ] Gets approval for next development phase

---

## Risk Mitigation

### Time Constraints (1 week timeline):

- **Risk**: Complex MCP integration takes longer than expected
- **Mitigation**: Start with simple API calls, add MCP wrapper later if needed

### Technical Complexity:

- **Risk**: Database queries become complex
- **Mitigation**: Keep initial queries simple, use pre-computed results

### Demo Issues:

- **Risk**: Live demo fails during presentation
- **Mitigation**: Record backup video, have local fallback version

---

## Post-POC Next Steps

### Immediate (Week 2-3):

1. **Real Data Integration**: Connect to actual Hawaii data sources
2. **Multiple User Types**: Expand beyond high school students
3. **Enhanced MCP**: Add more sophisticated query functions

### Medium Term (Month 2-3):

1. **Machine Learning**: Add recommendation engine
2. **User Accounts**: Persistent profiles and conversation history
3. **Advanced Analytics**: Track user pathways and outcomes

### Long Term (Month 4+):

1. **Full Production**: Scale for thousands of users
2. **Mobile App**: Native iOS/Android applications
3. **Integration**: Connect with school counseling systems

---

## Resource Requirements

### Development:

- 1 full-stack developer (you) - 7 days
- Vercel account (free tier sufficient for POC)
- Neon PostgreSQL (free tier: 512MB storage)

### Tools & Services:

- React development environment
- Next.js for MCP server
- Database GUI tool (TablePlus, pgAdmin)
- Git repository (GitHub)

### Estimated Costs:

- **Development**: $0 (your time)
- **Hosting**: $0 (free tiers)
- **Database**: $0 (Neon free tier)
- **Total POC Cost**: $0

---

## Conclusion

This POC will demonstrate the core value proposition: intelligent routing of career guidance data based on user context. The 7-day timeline is aggressive but achievable by focusing on the essential features and using simulated data.

The key innovation is the MCP server architecture that allows the chat interface to query different data sources based on the user's profile, making the system both scalable and personalized.

Success will be measured by the technical team's understanding of the approach and approval to move forward with real data integration and expanded functionality.
