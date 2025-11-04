# AI Pathways POC - University of Hawaii Career Pathways System

An intelligent educational pathway advisor system that helps students explore career paths through Hawaii's Community College (UHCC) programs. The system uses AI agents to provide personalized recommendations, market intelligence, and career guidance based on student profiles and conversational context.

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Groq API Key ([Get one here](https://console.groq.com))
- Upstash Redis instance ([Create one here](https://upstash.com))

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ai-pathways-poc
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

   Fill in your environment variables:
   ```bash
   # Required: Groq API for LLM processing
   GROQ_API_KEY="your_groq_api_key_here"

   # Required: Upstash Redis for caching and rate limiting
   UPSTASH_REDIS_REST_URL="your_upstash_redis_url"
   UPSTASH_REDIS_REST_TOKEN="your_upstash_redis_token"

   # Optional: Use LangGraph-Style Orchestrator (default: false)
   USE_LANGGRAPH_STYLE=true
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

---

## 📚 Architecture Overview

### System Design Philosophy

The AI Pathways system is built on a **multi-agent orchestration architecture** that combines:
- **LLM-powered intelligence** for understanding student needs
- **Data-driven recommendations** from Hawaii's educational databases
- **Iterative quality improvement** through reflection and verification
- **Context-aware personalization** using conversation history and user profiles

### System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            USER INTERACTION                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         1. LLM CLASSIFIER NODE                               │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  • Analyze user intent                                              │    │
│  │  • Classify query type: search | conversational | update_profile   │    │
│  │  • Determine if tools needed                                        │    │
│  └────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
                    ▼                 ▼                 ▼
            CONVERSATIONAL        SEARCH        UPDATE_PROFILE
                    │                 │                 │
                    ▼                 ▼                 ▼
┌──────────────────────┐  ┌──────────────────────────────────────────────┐
│ Conversational Agent │  │    2. PROFILE EXTRACTOR NODE                 │
│                      │  │  ┌────────────────────────────────────────┐  │
│ • Answer questions   │  │  │ Extract Keywords:                      │  │
│ • Provide guidance   │  │  │                                        │  │
│ • Chat naturally     │  │  │ Topic Pivot Mode:                      │  │
│                      │  │  │ └─> Fresh keywords only                │  │
│ └─> Return response  │  │  │                                        │  │
└──────────────────────┘  │  │ Affirmative Mode ("yes"):              │  │
                          │  │ └─> Use conversation context           │  │
                          │  │                                        │  │
                          │  │ Normal Mode:                           │  │
                          │  │ └─> Query keywords only                │  │
                          │  └────────────────────────────────────────┘  │
                          └──────────────────────────────────────────────┘
                                              │
                                              ▼
                          ┌──────────────────────────────────────────────┐
                          │    3. TOOL PLANNER NODE                      │
                          │  ┌────────────────────────────────────────┐  │
                          │  │ Select Tools:                          │  │
                          │  │ • trace_pathway (HS→College→Career)    │  │
                          │  │ • search_hs_programs                   │  │
                          │  │ • search_college_programs              │  │
                          │  │ • get_careers (from CIP codes)         │  │
                          │  │ • expand_cip (2-digit → full codes)    │  │
                          │  └────────────────────────────────────────┘  │
                          └──────────────────────────────────────────────┘
                                              │
                                              ▼
                          ┌──────────────────────────────────────────────┐
                          │    4. TOOL EXECUTOR NODE                     │
                          │  ┌────────────────────────────────────────┐  │
                          │  │ Search JSONL Databases:                │  │
                          │  │ • Program name matching                │  │
                          │  │ • CIP code lookups                     │  │
                          │  │ • Campus mappings                      │  │
                          │  │ • Career path connections              │  │
                          │  │                                        │  │
                          │  │ Returns:                               │  │
                          │  │ • High school programs                 │  │
                          │  │ • College programs                     │  │
                          │  │ • Career mappings (CIP→SOC)            │  │
                          │  └────────────────────────────────────────┘  │
                          └──────────────────────────────────────────────┘
                                              │
                                              ▼
                          ┌──────────────────────────────────────────────┐
                          │    5. VERIFIER NODE                          │
                          │  ┌────────────────────────────────────────┐  │
                          │  │ LLM Validation (0-10 scoring):         │  │
                          │  │                                        │  │
                          │  │ Normal Query:                          │  │
                          │  │ └─> Use profile for scoring            │  │
                          │  │                                        │  │
                          │  │ Affirmative Response:                  │  │
                          │  │ └─> Skip profile, use context only     │  │
                          │  │                                        │  │
                          │  │ Smart Thresholds:                      │  │
                          │  │ • Strong matches exist → threshold 7+  │  │
                          │  │ • Weak matches → threshold 5+          │  │
                          │  └────────────────────────────────────────┘  │
                          └──────────────────────────────────────────────┘
                                              │
                                              ▼
                          ┌──────────────────────────────────────────────┐
                          │    6. REFLECTOR NODE (Quality Check)         │
                          │  ┌────────────────────────────────────────┐  │
                          │  │ Evaluate Results (0-10 score):         │  │
                          │  │                                        │  │
                          │  │ Score 9-10: ✓ Excellent → Continue    │  │
                          │  │ Score 7-8:  ✓ Good → Continue          │  │
                          │  │ Score 4-6:  ⚠ Retry with adjustments   │  │
                          │  │ Score 0-3:  ✗ Retry with new strategy  │  │
                          │  └────────────────────────────────────────┘  │
                          └──────────────────────────────────────────────┘
                                              │
                            ┌─────────────────┼─────────────────┐
                            │                 │                 │
                      Quality < 7        Quality ≥ 7       Attempt 3
                            │                 │                 │
                            ▼                 │                 │
                    ┌───────────────┐         │                 │
                    │ RETRY LOGIC   │         │                 │
                    │               │         │                 │
                    │ Attempt 2:    │         │                 │
                    │ • Broaden     │         │                 │
                    │ • New tools   │         │                 │
                    │               │         │                 │
                    │ Attempt 3:    │         │                 │
                    │ • CIP expand  │         │                 │
                    │ • Accept best │         │                 │
                    └───────────────┘         │                 │
                            │                 │                 │
                            └─────────────────┼─────────────────┘
                                              ▼
                          ┌──────────────────────────────────────────────┐
                          │    7. AGGREGATOR NODE                        │
                          │  ┌────────────────────────────────────────┐  │
                          │  │ Process & Organize:                    │  │
                          │  │                                        │  │
                          │  │ • Group by CIP code                    │  │
                          │  │ • Find best program name               │  │
                          │  │ • Extract all specializations          │  │
                          │  │ • List all campuses                    │  │
                          │  │ • Map CIP → SOC codes                  │  │
                          │  │                                        │  │
                          │  │ Output:                                │  │
                          │  │ • Program families with variants       │  │
                          │  │ • SOC codes for market intelligence    │  │
                          │  └────────────────────────────────────────┘  │
                          └──────────────────────────────────────────────┘
                                              │
                                              ▼
                          ┌──────────────────────────────────────────────┐
                          │    8. FORMATTER NODE                         │
                          │  ┌────────────────────────────────────────┐  │
                          │  │ Generate Markdown Response:            │  │
                          │  │                                        │  │
                          │  │ • High School Programs section         │  │
                          │  │ • College Programs with specs          │  │
                          │  │ • Career Pathways                      │  │
                          │  │ • Next Steps & Recommendations         │  │
                          │  │                                        │  │
                          │  │ Include:                               │  │
                          │  │ • SOC codes for market intelligence    │  │
                          │  │ • Pathway metadata                     │  │
                          │  └────────────────────────────────────────┘  │
                          └──────────────────────────────────────────────┘
                                              │
                ┌─────────────────────────────┼─────────────────────────────┐
                │                             │                             │
                ▼                             ▼                             ▼
┌──────────────────────────┐   ┌──────────────────────────┐   ┌─────────────────────┐
│  RETURN TO USER          │   │  MARKET INTELLIGENCE     │   │  CACHE RESULT       │
│                          │   │                          │   │                     │
│  • Formatted response    │   │  Generate AI Report:     │   │  • Store in Redis   │
│  • Pathway data          │   │  • Fetch SOC data        │   │  • TTL: 1 hour      │
│  • SOC codes             │   │  • Top 5 skills          │   │  • Key: hash of     │
│  • Metadata              │   │  • Top 5 companies       │   │    query+profile    │
└──────────────────────────┘   │  • 4 action insights     │   └─────────────────────┘
                               │  • UHCC-specific         │
                               └──────────────────────────┘
```

### Detailed Execution Flow

1. **User sends message** → API receives request with conversation history and profile
2. **Cache check** → If query cached, return immediately (1 hour TTL)
3. **Classifier** → Determines intent and routing
4. **ProfileExtractor** → Extracts keywords with smart filtering
5. **ToolPlanner** → Selects appropriate search tools
6. **ToolExecutor** → Searches JSONL databases for programs and careers
7. **Verifier** → LLM validates and scores results (0-10 scale)
8. **Reflector** → Evaluates quality, triggers retry if needed
9. **Aggregator** → Groups and organizes results, extracts SOC codes
10. **Formatter** → Generates markdown response
11. **Response** → Returns to user with pathway data and SOC codes
12. **Market Intelligence** (async) → Fetches labor market data, generates AI report
13. **Cache** → Stores result for future identical queries

### Parallel Processing

The system uses parallel execution where possible:
- **Tool execution**: All selected tools run simultaneously
- **Verification**: Programs verified in batches of 5
- **Market intelligence**: All 4 SOC APIs called in parallel
- **Data fetching**: Multiple JSONL files read concurrently

---

## 🏗️ Core Architecture

### 1. LangGraph-Style Orchestrator

**File:** `src/app/lib/agents/langgraph-style-orchestrator.ts`

The main orchestration engine that coordinates all agents in a graph-based workflow.

#### Key Features:
- **State Management**: Maintains conversation context, user profile, and intermediate results
- **Node-based Processing**: Each agent is a node in the execution graph
- **Quality Assurance**: Built-in reflection and retry mechanisms
- **Smart Routing**: Determines next steps based on classification and quality scores

#### Execution Nodes:

1. **Classifier Node** (`llm-classifier.ts`)
   - Analyzes user intent
   - Determines query type: `search`, `conversational`, `update_profile`
   - Decides if tools are needed

2. **ProfileExtractor Node**
   - Extracts keywords from user query
   - Three modes:
     - **Topic Pivot**: Fresh start with new keywords
     - **Affirmative**: Uses conversation context (when user says "yes")
     - **Normal**: Query keywords only
   - Smart filtering to prevent profile contamination

3. **ToolPlanner Node**
   - Selects appropriate tools based on query type
   - Available tools:
     - `trace_pathway`: Comprehensive search (HS → College → Career)
     - `search_hs_programs`: High school programs only
     - `search_college_programs`: College programs only
     - `get_careers`: Career paths from CIP codes
     - `expand_cip`: Expand 2-digit CIP codes to full programs

4. **ToolExecutor Node** (`direct-search-tracer.ts`)
   - Executes selected tools
   - Searches JSONL databases
   - Collects high school programs, college programs, and career mappings

5. **Verifier Node** (`result-verifier.ts`)
   - Validates results against user query
   - Scores programs on 0-10 relevance scale
   - Smart threshold filtering:
     - High threshold (7+) when strong matches exist
     - Lower threshold (5+) when matches are weak
   - **Profile Usage**:
     - Normal queries: Uses profile for scoring
     - Affirmative responses: Skips profile to focus on conversation

6. **Reflector Node** (`reflection-agent.ts`)
   - Evaluates result quality (0-10 score)
   - Provides improvement suggestions
   - Triggers retries if quality < 7 (up to 3 attempts)

7. **Aggregator Node** (`pathway-aggregator.ts`)
   - Groups programs by CIP code
   - Finds best representative name for each program family
   - Extracts specializations and variants
   - Maps CIP codes to SOC codes for market intelligence

8. **Formatter Node** (`response-formatter.ts`)
   - Generates markdown responses
   - Creates structured output with:
     - High school programs
     - College programs (with specializations)
     - Career pathways
     - Next steps

---

### 2. Conversational Agent

**File:** `src/app/lib/agents/conversational-agent.ts`

Handles natural language interactions that don't require pathway searches.

#### Capabilities:
- Answers general questions about UHCC, Hawaii careers, programs
- Maintains conversation context
- Provides encouragement and guidance
- Redirects to pathway search when appropriate

---

### 3. Profile Management

#### Profile Generation Agent
**File:** `src/app/lib/agents/profile-generation-agent.ts`

- Analyzes conversation history
- Extracts student information:
  - Education level, grade, current status
  - Interests, career goals, motivations
  - Work preferences, learning style
  - Challenges, strengths, support needs
  - Cultural background, confidence level

#### Profile Update Agent
**File:** `src/app/lib/agents/profile-update-agent.ts`

- Incrementally updates profile as conversation progresses
- Identifies new information in user messages
- Merges updates intelligently (doesn't overwrite unless contradictory)

---

### 4. Market Intelligence System

**File:** `src/app/lib/agents/market-intelligence-agent.ts`

Generates AI-powered market analysis reports for career pathways.

#### Data Sources:
Integrates with Hawaii Career Explorer API:
- Job titles and required skills
- Companies hiring for specific roles
- Skill demand across companies
- Active job postings

#### Report Components:

1. **Key Skills Required**
   - Top 5 in-demand skills
   - AI infers relevant skills from SOC codes
   - Visual ranking bars (no percentages shown)

2. **Hiring Companies**
   - Top 5 companies in Hawaii
   - Filters out invalid/test data
   - Prioritizes Hawaii-based employers

3. **Recommended Actions**
   - Personalized to student's profile and conversation
   - UHCC-specific program recommendations
   - Portfolio development suggestions
   - Networking opportunities in Hawaii
   - Certification pathways

#### Creative AI Approach:
- **Temperature: 0.7** for balanced creativity
- LLM uses domain knowledge to infer skills
- Doesn't rely solely on potentially inaccurate API data
- Example: For electrical engineering, suggests "Circuit Design, AutoCAD, MATLAB" instead of generic skills

---

## 🗄️ Data Architecture

### JSONL Databases

**Location:** `src/app/lib/data/jsonl/`

The system uses JSON Lines files for fast, efficient searches:

- `campus_to_cip_mapping.jsonl`: Campus → CIP code mappings
- `cip_to_campus_mapping.jsonl`: CIP → Campus mappings
- `cip_to_program_mapping.jsonl`: CIP → Program details
- `cip_to_soc_mapping.jsonl`: CIP → SOC (career) mappings
- `cip2digit_to_cip_mapping.jsonl`: 2-digit CIP → Full CIP codes
- `program_to_cip_mapping.jsonl`: Program name → CIP codes
- `soc_to_cip_mapping.jsonl`: SOC → CIP mappings

### Search Tools

**File:** `src/app/lib/tools/jsonl-reader.ts` & `jsonl-tools.ts`

#### Features:
- **Phrase matching**: Detects exact phrases in program names
- **Keyword scoring**: Ranks programs by keyword relevance
- **Fuzzy matching**: Handles typos and variations
- **CIP code expansion**: Maps broad categories to specific programs

---

## 🎯 Smart Features

### 1. Context-Aware Keyword Extraction

**Problem Solved:** Prevent profile interests from contaminating specific queries

**Implementation:**
```typescript
// When user says "yes" after seeing nursing programs
// DON'T: Add profile interests (art, music, engineering)
// DO: Use conversation context (nursing)

if (isAffirmative) {
  keywords = extractFromLastAssistantMessage();
  // Only add relevant profile interests if context is thin
}
```

### 2. Profile Filtering in Verification

**Problem Solved:** Wrong programs shown when user confirms interest

**Implementation:**
```typescript
// When user says "yes", don't boost profile interests
const profileForVerification = isAffirmative ? undefined : state.userProfile;

// Profile only used for scoring in normal searches, not affirmative responses
```

### 3. Component Caching (UI)

**Problem Solved:** Re-fetching data when toggling between views

**Implementation:**
```tsx
// Keep components mounted, hide with CSS
<div style={{ display: showDetails ? 'block' : 'none' }}>
  <MarketIntelligenceReport /> {/* Always mounted */}
</div>
```

### 4. Data Validation

**Problem Solved:** API returns junk data (numbers, "null", test values)

**Implementation:**
```typescript
isValidSkill(skill: string): boolean {
  // Filter: pure numbers, no letters, "na", 1-2 chars, "test"
  return !junkPatterns.some(pattern => pattern.test(skill));
}
```

---

## 🔌 API Routes

### Pathway Search
**Endpoint:** `POST /api/pathway`

Searches for educational pathways based on user query.

**Request:**
```json
{
  "message": "show me nursing programs",
  "conversationHistory": [...],
  "profile": {...}
}
```

**Response:**
```json
{
  "response": "markdown formatted pathway results",
  "pathwayData": {
    "highSchoolPrograms": [...],
    "collegePrograms": [...],
    "careers": [...]
  },
  "socCodes": ["29-1141", "29-1151"],
  "metadata": {...}
}
```

### Market Intelligence
**Endpoint:** `POST /api/market-intelligence`

Generates AI-powered market analysis for career paths.

**Request:**
```json
{
  "socCodes": ["15-1252", "15-1256"],
  "conversationContext": [...],
  "userProfile": {...}
}
```

**Response:**
```json
{
  "success": true,
  "markdown": "AI-generated report with interactive components",
  "summary": {
    "totalCompanies": 125,
    "totalSkills": 450,
    "topCompanies": ["Company A", "Company B", ...],
    "topSkills": ["Python", "SQL", ...],
    "activePosts": 234
  }
}
```

### Profile Management
- `POST /api/generate-profile`: Generate initial profile from conversation
- `POST /api/update-profile`: Update existing profile with new information

### SOC Data Proxies (Server-side only)
- `GET /api/soc/jobtitles-skills?soc5=11-1011,13-1071`
- `GET /api/soc/jobtitles-companies?soc5=...`
- `GET /api/soc/companies-skills?soc5=...`
- `GET /api/soc/active-posts?soc5=...`

---

## 🎨 UI Components

### Interactive Chat Interface

**File:** `src/app/components/AIPathwaysChat/UnifiedSleekChat.tsx`

Features:
- Real-time streaming responses
- Message history
- Profile generation and display
- Language selection (English/Hawaiian Pidgin)

### Data Visualization Panel

**File:** `src/app/components/AIPathwaysChat/DataPanel.tsx`

Two views:
1. **Summary View**: Market Intelligence Report
2. **Detailed Data View**: 
   - Companies & Skills
   - Job Titles & Companies
   - Job Titles & Skills

**Visualizer Components:**
- `CompaniesSkillsVisualizer.tsx`: Skills required by company
- `JobTitlesCompaniesVisualizer.tsx`: Companies hiring by job title
- `JobTitlesSkillsVisualizer.tsx`: Skills required by job title

### Market Intelligence Report

**File:** `src/app/components/AIPathwaysChat/MarketIntelligenceReport.tsx`

Custom MDX components:
- **Skill Bar**: Visual ranking of skills (no percentages)
- **Company Card**: Minimal company information
- **Insight Box**: Color-coded actionable recommendations
  - Success (green): Getting started
  - Info (blue): Portfolio, networking
  - Warning (amber): Competitive edge

---

## 🧠 AI Models & Configuration

### Primary LLM: Groq (Llama 3.3 70B)

**Model:** `llama-3.3-70b-versatile`

#### Usage by Agent:

| Agent | Temperature | Max Tokens | Purpose |
|-------|-------------|------------|---------|
| Classifier | 0.1 | 150 | Precise intent detection |
| Conversational | 0.7 | 800 | Natural, friendly responses |
| Profile Generation | 0.3 | 2000 | Structured data extraction |
| Profile Update | 0.3 | 1500 | Incremental updates |
| Verifier | 0.2 | 1000 | Accurate relevance scoring |
| Reflector | 0.3 | 500 | Quality assessment |
| Market Intelligence | 0.7 | 2000 | Creative skill inference |
| Response Formatter | 0.5 | 3000 | Well-structured output |

---

## 🚦 Rate Limiting & Caching

### Rate Limiting
**Implementation:** Upstash Rate Limit

- **Limit:** 10 requests per 10 seconds per IP
- **Endpoint:** All API routes
- **Response:** 429 Too Many Requests with retry info

### Caching
**Implementation:** Upstash Redis

- **TTL:** 1 hour for pathway searches
- **Cache Key:** Hash of (query + profile + history)
- **Invalidation:** Manual via `/api/cache-invalidate`

**Cache Management Endpoints:**
- `GET /api/cache-stats`: View cache statistics
- `POST /api/cache-invalidate`: Clear specific or all cache
- `POST /api/cache-warmup`: Pre-populate cache with common queries

---

## 📊 Quality Assurance

### Reflection System

**Score Thresholds:**
- **9-10**: Excellent - Single attempt accepted
- **7-8**: Good - Single attempt accepted
- **4-6**: Needs improvement - Retry with adjustments
- **0-3**: Poor - Retry with different strategy

### Retry Strategy:

**Attempt 1:**
- Use initial keywords and tools
- Standard verification

**Attempt 2:**
- Broaden search if too few results
- Try different tool combinations

**Attempt 3:**
- Use CIP code expansion
- Broader keyword matching
- Accept best available results

---

## 🎯 Best Practices

### For Developers

1. **Always validate data from external APIs**
   ```typescript
   if (!isValidSkill(skill)) return;
   ```

2. **Use conversation context for affirmative responses**
   ```typescript
   if (isAffirmative) keywords = extractFromConversation();
   ```

3. **Keep components mounted for performance**
   ```tsx
   <div style={{ display: visible ? 'block' : 'none' }}>
   ```

4. **Call external APIs server-side directly**
   ```typescript
   // In agents (server-side): Direct API call
   // In components (client-side): Next.js proxy
   ```

### For Content

1. **UHCC-Specific Recommendations Only**
   - Reference specific UHCC campuses
   - Mention UHCC programs and certifications
   - Suggest Hawaii-based companies
   - No generic online platforms

2. **Actionable Insights**
   - Specific courses to take
   - Certifications to earn
   - Projects to build
   - People to connect with

---

## 🔧 Development Commands

```bash
# Development
npm run dev              # Start dev server with Turbopack

# Build
npm run build           # Build for production

# Production
npm start               # Start production server

# Code Quality
npm run lint            # Run ESLint
npm run format:fix      # Format code with Prettier
```

---

## 🐛 Debugging

### Enable Verbose Logging

The system uses console logging extensively. Look for:
- `[LangGraph-Style]`: Orchestrator flow
- `[ProfileExtractor]`: Keyword extraction
- `[Verifier]`: Program validation
- `[Aggregator]`: CIP code mapping
- `[MarketIntelligence]`: Report generation

### Common Issues

**Issue:** Wrong programs shown after saying "yes"
- **Cause:** Profile contamination
- **Check:** `[ProfileExtractor]` logs for keyword extraction
- **Fix:** Ensure affirmative detection working

**Issue:** Market intelligence report fails
- **Cause:** External API timeout or invalid data
- **Check:** Network tab for API calls
- **Fix:** Verify SOC codes and external API status

**Issue:** No cache hits
- **Cause:** Cache keys not matching
- **Check:** Redis connection and key format
- **Fix:** Verify UPSTASH environment variables

---

## 📈 Performance Optimization

### Current Optimizations

1. **Component Caching**: UI components stay mounted
2. **Redis Caching**: Pathway results cached for 1 hour
3. **Parallel API Calls**: Market intelligence fetches all data simultaneously
4. **JSONL Databases**: Fast file-based searches
5. **Smart Verification**: Early termination when quality is high

### Metrics

- **Average Response Time**: 2-4 seconds for pathway search
- **Cache Hit Rate**: ~60% for repeated queries
- **Quality Score**: Average 8/10 on first attempt

---

## 🚀 Deployment

### Environment Variables (Production)

Ensure all required variables are set:
```bash
GROQ_API_KEY=<your_production_key>
UPSTASH_REDIS_REST_URL=<your_redis_url>
UPSTASH_REDIS_REST_TOKEN=<your_redis_token>
USE_LANGGRAPH_STYLE=true
```

### Build & Deploy

```bash
# Build production bundle
npm run build

# Start production server
npm start
```

### Vercel Deployment

The project is optimized for Vercel deployment:
- API routes use `nodejs` runtime
- All routes are dynamic (`force-dynamic`)
- Environment variables via Vercel dashboard

---

## 📝 Contributing

### Code Style

- Use TypeScript strict mode
- Follow ESLint and Prettier rules
- Add JSDoc comments for functions
- Include console logs for debugging

### Testing New Features

1. Test with profile contamination scenarios
2. Verify affirmative response handling
3. Check data validation for external APIs
4. Test cache invalidation
5. Verify market intelligence generation

---

## 🙏 Acknowledgments

- **University of Hawaii Community Colleges** for educational data
- **Hawaii Career Explorer** for labor market data
- **Groq** for fast LLM inference
- **Upstash** for Redis caching and rate limiting

---

## 📞 Support

For questions or issues:
- Open an issue on GitHub
- Contact: ldroxas@hawaiii.edu

---

**Built with ❤️ for Hawaii's Students**
