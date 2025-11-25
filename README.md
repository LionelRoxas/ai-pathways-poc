# AI Pathways POC - University of Hawaii Career Pathways System

An intelligent educational pathway advisor system that helps students explore career paths through Hawaii's Community College (UHCC) programs. The system uses AI agents to provide personalized recommendations, market intelligence, and career guidance based on student profiles and conversational context.

---

## ✨ Recent Updates (November 2025)

### 🆕 NEW: Vector Search with pgvector

**Problem Solved:** Traditional keyword matching misses semantically similar programs (e.g., "marine biology" not matching "oceanography").

**Solution:** Semantic search using OpenAI embeddings and PostgreSQL pgvector:

1. **Vector Embeddings** 🧮
   - All 11,000+ programs converted to 1536-dimension embeddings
   - Uses OpenAI's `text-embedding-3-small` model
   - Stored in PostgreSQL with pgvector extension
   - Cached in Upstash Redis for performance

2. **Vector Result Verifier** ✨
   - LLM-powered validation of vector search results
   - Scores each match for contextual relevance (0-10)
   - Filters out semantically similar but irrelevant programs
   - Ensures high-quality recommendations reach students

**Impact:**
- ✅ "Marine biology" now finds oceanography and marine science programs
- ✅ "Renewable energy" matches sustainability and environmental tech programs
- ✅ Semantic understanding beyond exact keyword matches
- ✅ Smart fallback: Uses vector search when keyword search returns < 3 results
- ✅ Combined approach: Merges keyword + vector results for comprehensive coverage

### 🌐 NEW: Web Research Intelligence

**Problem Solved:** Students need current industry trends, company insights, and emerging field information beyond the database.

**Solution:** Integrated Exa web search with AI-powered summarization:

1. **Exa Neural Search** 🔍
   - Real-time web search optimized for educational/career content
   - Context-aware query enhancement from conversation history
   - Returns top 8-10 relevant sources with full content
   - Auto-generates keyword highlights

2. **AI Summary Generation** 📝
   - Groq-powered summarization of web results
   - Markdown formatted in styled emerald-themed artifacts
   - Key findings, trends, and actionable insights
   - Clickable link to detailed source viewer in Web tab

3. **Smart Access Control** 🔐
   - Available after 3+ user messages (prevents API spam)
   - Optional toggle in chat input
   - Visual countdown badges ("2 more messages", "1 more message")
   - Tooltip explains availability requirement

**Impact:**
- ✅ Students get current industry trends and company information
- ✅ Beautiful web research summaries in artifact containers
- ✅ Detailed source viewer with expandable content panels
- ✅ Prevents accidental expensive API calls
- ✅ Seamless integration with pathway recommendations

### 🔒 Data Quality Verification Agents

**Problem Solved:** Students searching for "photography" were shown software engineering career data, and "nursing" searches returned incorrect market intelligence.

**Solution:** Two intelligent verification agents:

1. **CIP Code Verifier Agent** 🔐
   - Validates program classification codes (CIP codes) against conversation context
   - Detects misalignments (e.g., nursing query → computer science CIP code)
   - Automatically corrects CIP codes using national NCES standards
   - Prevents wrong programs from reaching students

2. **SOC Code Verifier Agent** 💼
   - Filters career codes (SOC codes) based on user's actual field of interest
   - Removes irrelevant careers (e.g., software jobs from photography searches)
   - Ensures Market Intelligence shows accurate career data
   - Uses conversation context to understand user intent

**Impact:**
- ✅ Photography searches now show photographer/multimedia artist careers (not software)
- ✅ Nursing searches show healthcare careers (not arts/tech)
- ✅ Computer science searches show tech careers (not healthcare)
- ✅ Fixed CIP-to-SOC database mappings for permanent improvements
- ✅ Runtime verification catches any future misalignments automatically

**Technical Details:**
- Vector search uses PostgreSQL pgvector with OpenAI embeddings
- Vector verifier uses `openai/gpt-oss-120b` for fast validation
- Web search uses Exa API + Groq for summarization
- CIP/SOC verifiers use `openai/gpt-oss-120b` (500 tps, 74% cheaper)
- All integrated into orchestrator workflow with comprehensive logging

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Groq API Key ([Get one here](https://console.groq.com))
- Upstash Redis instance ([Create one here](https://upstash.com))
- OpenAI API Key ([Get one here](https://platform.openai.com)) - for vector embeddings
- Exa API Key ([Get one here](https://exa.ai)) - for web search
- PostgreSQL database with pgvector extension

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

   # Required: OpenAI API for vector embeddings
   OPENAI_API_KEY="your_openai_api_key_here"

   # Required: Exa API for web search
   EXA_API_KEY="your_exa_api_key_here"

   # Required: PostgreSQL with pgvector
   POSTGRES_URL="your_postgres_connection_string"

   # Optional: Use LangGraph-Style Orchestrator (default: false)
   USE_LANGGRAPH_STYLE=true
   ```

4. **Set up the database**
   ```bash
   # Run migrations to create pgvector tables
   npx tsx scripts/run-migrations.ts
   
   # Generate and populate vector embeddings
   npx tsx scripts/populate-pgvector.ts
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

---

## 📚 Architecture Overview

### System Design Philosophy

The AI Pathways system is built on a **LangGraph-style multi-agent orchestration architecture** that combines:
- **LLM-powered intelligence** for understanding student needs and extracting context
- **Data-driven recommendations** from Hawaii's comprehensive educational databases
- **Iterative quality improvement** through reflection and verification with retry logic
- **Context-aware personalization** using conversation history and user profiles
- **Enhanced filtering** by island/campus location and degree level (2-Year, 4-Year, Non-Credit)
- **Declarative node-based workflow** with conditional routing and state management

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
                          │  │ Hybrid Search Strategy:                │  │
                          │  │                                        │  │
                          │  │ 1. Keyword Search (JSONL):             │  │
                          │  │    • Program name matching             │  │
                          │  │    • CIP code lookups                  │  │
                          │  │    • Campus mappings                   │  │
                          │  │                                        │  │
                          │  │ 2. Vector Search (pgvector):           │  │
                          │  │    • Semantic similarity search        │  │
                          │  │    • OpenAI embeddings (1536-dim)      │  │
                          │  │    • Fallback if keyword < 3 results   │  │
                          │  │                                        │  │
                          │  │ Returns:                               │  │
                          │  │ • High school programs                 │  │
                          │  │ • College programs (keyword + vector)  │  │
                          │  │ • Career mappings (CIP→SOC)            │  │
                          │  └────────────────────────────────────────┘  │
                          └──────────────────────────────────────────────┘
                                              │
                                              ▼
                          ┌──────────────────────────────────────────────┐
                          │    4b. VECTOR RESULT VERIFIER (if used)      │
                          │  ┌────────────────────────────────────────┐  │
                          │  │ LLM Validation of Vector Matches:      │  │
                          │  │                                        │  │
                          │  │ • Score each vector result (0-10)      │  │
                          │  │ • Check contextual relevance           │  │
                          │  │ • Filter semantically similar but      │  │
                          │  │   irrelevant programs                  │  │
                          │  │ • Keep threshold 6+ matches            │  │
                          │  │                                        │  │
                          │  │ Example: "marine biology" query        │  │
                          │  │ ✓ Keep: Oceanography (score 9)         │  │
                          │  │ ✗ Filter: Marine Engineering (score 4) │  │
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
                          │    6. CIP CODE VERIFIER NODE                 │
                          │  ┌────────────────────────────────────────┐  │
                          │  │ Validate Program Classification:       │  │
                          │  │                                        │  │
                          │  │ • Check CIP code format (XX.XXXX)      │  │
                          │  │ • Detect context mismatches            │  │
                          │  │   (e.g., nursing query → comp sci CIP) │  │
                          │  │ • Correct misaligned CIP codes         │  │
                          │  │ • Enrich with CIP family info          │  │
                          │  │                                        │  │
                          │  │ Uses conversational context to ensure  │  │
                          │  │ program codes match user intent        │  │
                          │  └────────────────────────────────────────┘  │
                          └──────────────────────────────────────────────┘
                                              │
                                              ▼
                          ┌──────────────────────────────────────────────┐
                          │    7. REFLECTOR NODE (Quality Check)         │
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
                          │    8. AGGREGATOR NODE                        │
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
                          │    9. SOC CODE VERIFIER NODE                 │
                          │  ┌────────────────────────────────────────┐  │
                          │  │ Filter Career Codes by Context:        │  │
                          │  │                                        │  │
                          │  │ • Analyze user intent from query       │  │
                          │  │ • Check if SOC codes match topic       │  │
                          │  │   (e.g., photography → 27-XXXX arts,   │  │
                          │  │    NOT 15-XXXX software)               │  │
                          │  │ • Remove irrelevant career codes       │  │
                          │  │ • Keep only contextually relevant SOCs │  │
                          │  │                                        │  │
                          │  │ Ensures Market Intelligence shows      │  │
                          │  │ accurate career data for user's field  │  │
                          │  └────────────────────────────────────────┘  │
                          └──────────────────────────────────────────────┘
                                              │
                                              ▼
                          ┌──────────────────────────────────────────────┐
                          │    10. FORMATTER NODE                        │
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
│  WEB RESEARCH (Optional) │   │  MARKET INTELLIGENCE     │   │  CACHE RESULT       │
│                          │   │                          │   │                     │
│  Parallel with Pathway:  │   │  Generate AI Report:     │   │  • Store in Redis   │
│  • Exa neural search     │   │  • Fetch SOC data        │   │  • TTL: 1 hour      │
│  • Context-aware query   │   │  • Top 5 skills          │   │  • Key: hash of     │
│  • 8-10 web sources      │   │  • Top 5 companies       │   │    query+profile    │
│  • Groq summarization    │   │  • 4 action insights     │   └─────────────────────┘
│  • Markdown artifact     │   │  • UHCC-specific         │
│  • Clickable Web tab link│   └──────────────────────────┘
└──────────────────────────┘
                │
                ▼
┌──────────────────────────┐
│  RETURN TO USER          │
│                          │
│  • Formatted response    │
│  • Pathway data          │
│  • SOC codes             │
│  • Web summary (if on)   │
│  • Web results array     │
│  • Metadata              │
└──────────────────────────┘
```

### Detailed Execution Flow

**Main Path (Search Query):**
1. **User sends message** → API receives request with conversation history and profile
2. **Cache check** → If query + profile hash cached, return immediately (1 hour TTL)
3. **START → Classifier** → Analyzes intent, extracts filters (island, degree, institution), determines routing
4. **Classifier → ProfileExtractor** → Extracts keywords with context awareness (topic pivot/affirmative/normal)
5. **ProfileExtractor → ToolPlanner** → Uses JSON-forced LLM + Zod validation to select tools
6. **ToolPlanner → ToolExecutor** → Executes tools in parallel with filters (island, conversation context)
7. **ToolExecutor → Verifier** → LLM scores each program 0-10, applies preference filters (degree, institution)
8. **Verifier → CIPVerifier** → Validates and corrects program classification codes using conversation context
9. **CIPVerifier → Reflector** → Evaluates overall quality (0-10 score)
10. **Reflector → Decision:**
   - Quality ≥ 5 OR attempt 2 → **Aggregator** (continue to output)
   - Quality < 5 AND attempt 1 → **StrategyEnhancer** (retry with new strategy → loops to ProfileExtractor)
11. **Aggregator** → Groups by CIP, preserves degree levels, extracts SOC codes
12. **Aggregator → SOCVerifier** → Filters career codes to match conversation context
13. **SOCVerifier → Formatter** → Generates markdown with LLM, respects preferences
14. **Formatter → END** → Returns response to API
15. **Web Research** (parallel, if enabled) → Exa neural search + Groq summarization, appends to message content
16. **Response** → Returns to user with pathway data, verified SOC codes, and web summary (if enabled)
17. **Market Intelligence** (async) → Fetches Hawaii Career Explorer data with verified SOC codes, generates AI report
18. **Cache** → Stores result for future queries (key: hash of query + profile + history)

**Alternative Path (Conversational Query):**
- **START → Classifier** → needsTools = false
- **Classifier → Conversational** → LLM generates friendly response
- **Conversational → END** → Returns conversational response

### Architecture Patterns

**State Management:**
- **StateManager class** acts as single source of truth
- Immutable conversational context (userQuery, profile, history, Tools)
- Mutable processing state (keywords, toolCalls, verifiedData, etc.)
- Metadata tracking (toolsUsed, errors, attemptNumber, reflectionScore)

**Declarative Routing:**
```typescript
const ROUTING_TABLE = {
  START: "classifier",
  classifier: (state) => state.needsTools ? "profileExtractor" : "conversational",
  verifier: "cipVerifier",    // NEW: Verify CIP codes after result verification
  cipVerifier: "reflector",   // NEW: Go to reflector after CIP verification
  reflector: (state) => (state.reflectionScore >= 5 || state.attemptNumber >= 2) 
    ? "aggregator" 
    : "strategyEnhancer",
  strategyEnhancer: "profileExtractor", // Loop back with new strategy
  aggregator: "socVerifier",  // NEW: Verify SOC codes after aggregation
  socVerifier: "formatter",   // NEW: Format after SOC verification
  // ...
}
```

**Node Execution:**
- Each node is a pure async function: `(state: StateManager) => Promise<void>`
- Nodes mutate state in place (LangGraph pattern)
- Simple graph executor walks routing table
- No complex conditional logic in nodes

**Parallel Processing:**
- **Tool execution**: All selected tools run simultaneously (Promise.all)
- **Verification**: Programs verified in batches of 5 for speed
- **Market intelligence**: All 4 SOC APIs called in parallel
- **Data fetching**: EnhancedProgramTool reads comprehensive JSON dataset

**Error Handling:**
- Try/catch in graph executor catches node failures
- StateManager.addError() logs errors to state.errors[]
- Fallback tool plans on planning failures
- Graceful degradation (continue with partial results)

---

## 🏗️ Core Architecture

### 1. LangGraph-Style Orchestrator

**File:** `src/app/lib/agents/langgraph-style-orchestrator.ts`

The main orchestration engine that coordinates all agents in a graph-based workflow.

#### Key Features:
- **StateManager Class**: Single source of truth maintaining conversation context, user profile, intermediate results, and filtering preferences
- **Declarative Node Graph**: Each agent is a pure function node in the execution graph
- **Conditional Routing Table**: Routes to next node based on state (no complex if/else logic)
- **Quality Assurance**: Built-in reflection and retry mechanisms (up to 2 attempts, quality threshold ≥5)
- **Smart Routing**: Determines next steps based on classification and quality scores
- **JSON-Forced Tool Planning**: Uses Groq's JSON mode with Zod validation (no regex parsing)
- **Enhanced Program Tool**: Comprehensive dataset with degree levels and island filtering

#### Complete Agent Workflow:

```
USER QUERY
    ↓
1. Classifier → Analyzes intent & extracts filters
    ↓
2. ProfileExtractor → Intelligent keyword extraction (30+ Hawaii abbreviations)
    ↓
3. ToolPlanner → Selects appropriate search tools
    ↓
4. ToolExecutor → Searches comprehensive program database
    ↓
5. Verifier → Scores programs 0-10, applies filters
    ↓
6. CIPVerifier (NEW!) → Validates/corrects program codes
    ↓
7. Reflector → Quality check (retry if score < 5)
    ↓
8. Aggregator → Groups by CIP code, extracts SOC codes
    ↓
9. SOCVerifier (NEW!) → Filters career codes by context
    ↓
10. Formatter → Generates markdown response
    ↓
RETURN TO USER + Market Intelligence (async)
```

**NEW Agents:**
- **CIPVerifier**: Prevents program classification errors (e.g., nursing programs with computer science codes)
- **SOCVerifier**: Filters career codes to match user's field (e.g., removes software jobs from photography searches)

### Execution Nodes:

1. **Classifier Node** (`llm-classifier.ts`)
   - Analyzes user intent with LLM
   - Determines query type: `search`, `conversational`, `update_profile`
   - Decides if tools are needed
   - **NEW:** Extracts search scope (island/school/general)
   - **NEW:** Detects degree preference (2-Year, 4-Year, Non-Credit)
   - **NEW:** Identifies institution filter (specific school/college)

2. **ProfileExtractor Node**
   - **✨ NEW:** Uses intelligent query analysis from `groqClient.analyzeAndImproveQuery()`
   - **Advanced Features:**
     - Abbreviation expansion (e.g., "comp sci" → "computer science", "computing", "IT")
     - Hawaii-specific knowledge (healthcare, technology, trades, hospitality)
     - Intent detection (search vs. profile-based vs. mixed)
     - Multi-language support (English, Hawaiian, Pidgin, Tagalog)
   - Three extraction modes:
     - **Topic Pivot**: Detects "what about", "instead" → Fresh keywords only
     - **Affirmative**: Detects "yes", "sure" → Uses LLM to extract conversation context
     - **Normal**: Query keywords with intelligent expansion
   - **Island filter detection** (e.g., "Oahu programs", "Big Island")
   - **Enhanced term expansion** with 30+ Hawaii-specific abbreviations
   - Prevents profile contamination on specific searches

3. **ToolPlanner Node**
   - Selects appropriate tools using JSON-forced LLM response
   - **Primary tool:** `trace_pathway(keywords)` - Comprehensive search with degree levels
   - **Available tools:**
     - `trace_pathway`: Uses EnhancedProgramTool with degree level data
     - `search_hs_programs`: High school programs only
     - `get_careers`: Career paths from CIP codes (always included)
   - **REMOVED:** Old tools that lacked degree level data (search_college_programs, expand_cip)
   - Zod schema validation for type safety
   - Fallback: Always ensures `get_careers` is called for complete pathways

4. **ToolExecutor Node** (`orchestrator-agents.ts`)
   - Executes selected tools in parallel for speed
   - **NEW:** Hybrid search approach - keyword + vector search
   - **NEW:** Passes island filter to Enhanced Program Tool
   - **NEW:** Passes conversation context for semantic search
   - Uses comprehensive program dataset: `programs_2yr_4yr_noncredit_11_16_2025_cipfilled.json`
   - **NEW:** Triggers vector search fallback when keyword results < 3
   - **NEW:** Merges and deduplicates keyword + vector results
   - Collects high school programs, college programs (with degree levels), and career mappings
   - Logs sample results for debugging

4b. **VectorResultVerifier Node** (`vector-result-verifier.ts`)
   - **NEW:** Validates vector search results for contextual relevance
   - LLM scoring of each vector match (0-10 scale)
   - Filters semantically similar but irrelevant programs
   - Example: "marine biology" query keeps Oceanography (9/10), filters Marine Engineering (4/10)
   - Threshold 6+ for vector matches
   - Only runs when vector search is used

5. **Verifier Node** (`result-verifier.ts`)
   - Validates results against user query using LLM scoring
   - Scores programs on 0-10 relevance scale in batches of 5
   - **NEW:** Applies degree preference filter (2-Year, 4-Year, Non-Credit)
   - **NEW:** Applies institution filter (specific school/college)
   - Smart threshold filtering:
     - High threshold (7+) when strong matches exist
     - Lower threshold (5+) when matches are weak
   - Profile-aware scoring (skips profile on affirmative responses)

6. **CIPVerifier Node** (`cip-code-verifier.ts`)
   - **NEW:** Validates and corrects CIP (Classification of Instructional Programs) codes
   - Checks CIP code format (XX.XXXX)
   - **Context-Aware Validation:**
     - Detects when CIP codes don't match conversation context
     - Example: User asks "nursing" but CIP is 11.XXXX (Computer Science) → Corrects to 51.XXXX (Health)
   - Uses national NCES standards
   - Enriches programs with CIP family and category information
   - Logs all corrections with reasoning

7. **Reflector Node** (`reflection-agent.ts`)
   - Evaluates overall result quality (0-10 score)
   - Provides improvement suggestions
   - **UPDATED:** Triggers retry if quality < 5 (reduced from 7)
   - **UPDATED:** Max 2 attempts (reduced from 3 for speed)

8. **StrategyEnhancer Node** (Retry Logic)
   - Only called when quality < 5
   - Generates new search strategy using ReflectionAgent
   - Determines: broaden scope, use CIP search, try different tools
   - Loops back to ProfileExtractor with enhanced strategy
   - Increments attempt counter

8. **StrategyEnhancer Node** (Retry Logic)
   - Only called when quality < 5
   - Generates new search strategy using ReflectionAgent
   - Determines: broaden scope, use CIP search, try different tools
   - Loops back to ProfileExtractor with enhanced strategy
   - Increments attempt counter

9. **Aggregator Node** (`pathway-aggregator.ts`)
   - Groups programs by CIP code families
   - **NEW:** Preserves degree level information (2-Year, 4-Year, Non-Credit)
   - Finds best representative name for each program family
   - Extracts all specializations and variants
   - Collects unique schools and campuses
   - Maps verified CIP codes → SOC codes for market intelligence
   - Logs all matched career mappings for debugging

10. **SOCVerifier Node** (`soc-code-verifier.ts`)
    - **NEW:** Validates and filters SOC (Standard Occupational Classification) codes
    - **Context-Aware Filtering:**
      - Analyzes conversation to understand user's field of interest
      - Detects misaligned career codes
      - Example: User asks "photography" but SOC includes 15-1255 (Software Engineers) → Filters out
    - **Smart Relevance Checking:**
      - Photography/arts queries → Keep 27-XXXX (Arts/Media), remove 15-XXXX (Computer/IT)
      - Nursing queries → Keep 29-XXXX (Healthcare), remove 27-XXXX (Arts/Media)
      - Computer science queries → Keep 15-XXXX (IT), remove healthcare/arts codes
    - Ensures Market Intelligence API receives only relevant career codes
    - Logs all filtered codes with reasoning

11. **Formatter Node** (`response-formatter.ts`)
   - Generates markdown responses using LLM
   - **NEW:** Receives degree preference and institution filter
   - **NEW:** Filters and formats based on student preferences
   - Creates structured output with:
     - High school programs with schools
     - College programs (grouped by degree level with specializations)
     - Career pathways with SOC codes
     - Personalized next steps

10. **Conversational Node** (`conversational-agent.ts`)
    - Only called when needsTools = false
    - Handles general questions, guidance, encouragement
    - Maintains conversation context
    - Sets quality score to 10 (no verification needed)
    - Returns empty aggregated data structure

---

### 2. Enhanced Program Tool

**File:** `src/app/lib/tools/enhanced-program-tool.ts`

**NEW:** Comprehensive program search tool using unified dataset.

#### Data Source:
- `programs_2yr_4yr_noncredit_11_16_2025_cipfilled.json`
- Contains all UHCC programs with degree levels

#### Program Structure:
```typescript
interface EnhancedProgram {
  iro_institution: string;  // Institution code (HAW, HON, KAP, etc.)
  program: string;          // Program code (AA-HWST-HULA)
  program_desc: string;     // Full program description
  degree_level: string;     // "2-Year", "4-Year", "Non-Credit"
  cip_code: string;        // CIP code (05.0202)
}
```

#### Capabilities:
- **Island Filtering**: Uses island-mapping-tools to filter by Oahu, Maui, Big Island, Kauai
- **Keyword Search**: Phrase matching, keyword scoring, fuzzy matching
- **CIP Code Lookup**: Direct lookup by CIP codes
- **Institution Search**: Get all programs from specific school/college
- **Broad Query Detection**: Returns all island programs when query is location-only
- **Match Scoring**: Calculates relevance scores based on keyword matches

### 3. Island Mapping Tools

**File:** `src/app/lib/tools/island-mapping-tools.ts`

**NEW:** Maps institutions to islands/campuses for geographic filtering.

#### Mappings:
- **Oahu**: Honolulu CC, Kapiolani CC, Leeward CC, Windward CC, UH West Oahu
- **Big Island**: Hawaii CC, UH Hilo
- **Maui**: Maui College
- **Kauai**: Kauai CC

#### Features:
- Bidirectional mapping (island ↔ institution codes)
- Full campus name resolution
- Case-insensitive island detection in queries
- Institution code validation

### 4. Conversational Agent

**File:** `src/app/lib/agents/conversational-agent.ts`

Handles natural language interactions that don't require pathway searches.

#### Capabilities:
- Answers general questions about UHCC, Hawaii careers, programs
- Maintains conversation context
- Provides encouragement and guidance
- Redirects to pathway search when appropriate
- Temperature 0.7 for natural, friendly tone

---

### 5. CIP Code Verifier Agent

**File:** `src/app/lib/agents/cip-code-verifier.ts`

**NEW:** Validates and corrects program classification codes (CIP codes) using conversational context.

#### Problem Solved:
User searches for "nursing programs" but database returns programs with incorrect CIP codes that don't match healthcare field, causing wrong career data to be shown.

#### Capabilities:
- **Format Validation**: Checks CIP code format (XX.XXXX - 2-digit family + 4-digit specific)
- **Context Awareness**: Analyzes user query and conversation history
- **Mismatch Detection**: 
  - User asks "nursing" but CIP is 11.XXXX (Computer Science) → WRONG
  - User asks "photography" but CIP is 51.XXXX (Healthcare) → WRONG
- **Automatic Correction**: Finds correct CIP codes that match user's actual intent
- **National Standards**: Uses NCES (National Center for Education Statistics) taxonomy
- **Enrichment**: Adds CIP family and category information

#### Common CIP Families:
- **01.XXXX**: Agriculture
- **11.XXXX**: Computer and Information Sciences
- **13.XXXX**: Education
- **15.XXXX**: Engineering Technologies
- **51.XXXX**: Health Professions (Nursing, Medical Assistant, Healthcare)
- **52.XXXX**: Business, Management, Marketing

#### Integration:
- Runs AFTER result verification, BEFORE reflection
- Updates program CIP codes in-place
- Logs all corrections with detailed reasoning
- Uses `openai/gpt-oss-120b` model for fast, accurate validation

---

### 6. SOC Code Verifier Agent

**File:** `src/app/lib/agents/soc-code-verifier.ts`

**NEW:** Filters career codes (SOC codes) to match conversational context.

#### Problem Solved:
User searches for "photography programs" but Market Intelligence shows software engineering jobs because CIP-to-SOC mapping includes irrelevant career codes.

#### Capabilities:
- **Context-Aware Filtering**: Analyzes user's field of interest from query + conversation
- **Relevance Detection**:
  - Photography query + SOC 15-1255 (Software Engineers) → IRRELEVANT, filtered out
  - Nursing query + SOC 27-1014 (Multimedia Artists) → IRRELEVANT, filtered out
  - Photography query + SOC 27-4021 (Photographers) → RELEVANT, kept
- **SOC Family Matching**:
  - Photography/arts → Keep 27-XXXX (Arts, Design, Entertainment, Sports, Media)
  - Healthcare/nursing → Keep 29-XXXX (Healthcare Practitioners), 31-XXXX (Healthcare Support)
  - Computer science → Keep 15-XXXX (Computer and Mathematical Occupations)
  - Engineering → Keep 17-XXXX (Architecture and Engineering)

#### Common SOC Families:
- **15-XXXX**: Computer and Mathematical Occupations
- **17-XXXX**: Architecture and Engineering Occupations
- **27-XXXX**: Arts, Design, Entertainment, Sports, and Media Occupations
- **29-XXXX**: Healthcare Practitioners and Technical Occupations
- **31-XXXX**: Healthcare Support Occupations

#### Integration:
- Runs AFTER aggregation, BEFORE formatting
- Filters SOC codes before Market Intelligence API call
- Ensures career data matches user's actual field of study
- Logs all filtered codes with reasoning
- Uses `openai/gpt-oss-120b` model for fast, accurate filtering

#### Double Protection:
The system now has **two layers of protection**:
1. **Fixed CIP-to-SOC mapping file**: Corrected database entries (e.g., removed software SOC codes from photography CIP codes)
2. **Runtime SOC verification**: Catches any remaining misalignments automatically

---

### 7. Profile Management

#### Profile Generation Agent
**File:** `src/app/lib/agents/profile-generation-agent.ts`

- Analyzes conversation history with LLM (temperature 0.3 for structured extraction)
- Extracts student information:
  - Education level, grade, current status
  - Interests, career goals, motivations
  - Work preferences, learning style
  - Challenges, strengths, support needs
  - Cultural background, confidence level
- Returns structured JSON profile
- Called via `/api/generate-profile`

#### Profile Update Agent
**File:** `src/app/lib/agents/profile-update-agent.ts`

- Incrementally updates profile as conversation progresses
- Identifies new information in user messages
- Merges updates intelligently (doesn't overwrite unless contradictory)
- Temperature 0.3 for consistency
- Called via `/api/update-profile`

---

### 6. Market Intelligence System

**File:** `src/app/lib/agents/market-intelligence-agent.ts`

Generates AI-powered market analysis reports for career pathways.

#### Data Sources:
Integrates with Hawaii Career Explorer API (via server-side proxies):
- `/api/soc/jobtitles-skills` - Job titles and required skills
- `/api/soc/jobtitles-companies` - Companies hiring by job title
- `/api/soc/companies-skills` - Skill demand across companies
- `/api/soc/active-posts` - Active job postings count

#### Report Components:

1. **Key Skills Required**
   - Top 5 in-demand skills (AI-inferred + API data)
   - Visual ranking bars (no percentages shown)
   - Filters out junk data (numbers, "na", test values)
   - Uses LLM domain knowledge to suggest relevant skills

2. **Hiring Companies**
   - Top 5 companies in Hawaii
   - Filters out invalid/test data
   - Prioritizes Hawaii-based employers
   - Removes generic entries

3. **Recommended Actions (4 insights)**
   - Personalized to student's profile and conversation
   - UHCC-specific program recommendations
   - Portfolio development suggestions
   - Networking opportunities in Hawaii
   - Certification pathways
   - Color-coded by type (success/info/warning)

4. **Summary Statistics**
   - Total companies, skills, active posts
   - Top companies and skills lists

#### Creative AI Approach:
- **Temperature: 0.7** for balanced creativity
- LLM uses domain knowledge to infer skills when API data is weak
- Validates data with `isValidSkill()` and `isValidCompany()` helpers
- Example: For electrical engineering, suggests "Circuit Design, AutoCAD, MATLAB" instead of generic skills like "communication"
- Falls back gracefully when API calls fail

#### Custom MDX Components:
- `<SkillBar skill="Python" />` - Visual skill ranking
- `<CompanyCard company="Hawaiian Airlines" />` - Company information
- `<InsightBox type="success">` - Color-coded action items

---

## 🗄️ Data Architecture

### Primary Dataset

**NEW: Comprehensive Program Database**
- **File:** `programs_2yr_4yr_noncredit_11_16_2025_cipfilled.json`
- **Location:** `src/app/lib/data/jsonl/`
- **Format:** Single JSON file with array of programs
- **Size:** ~11,000+ programs across all UHCC institutions

**Structure:**
```json
{
  "iro_institution": "HON",
  "program": "AA-HWST-HULA",
  "program_desc": "Associate in Arts in Hawaiian Studies - Hula",
  "degree_level": "2-Year",
  "cip_code": "05.0202"
}
```

**Key Features:**
- Unified dataset replaces multiple JSONL mappings
- Includes degree level information (2-Year, 4-Year, Non-Credit)
- Covers all UHCC campuses and institutions
- CIP codes already filled in for all programs
- Fast in-memory search (loaded once, cached)

### Vector Search Database

**NEW: PostgreSQL with pgvector**
- **Table:** `programs` with vector embeddings
- **Extension:** pgvector for similarity search
- **Embedding Model:** OpenAI `text-embedding-3-small` (1536 dimensions)
- **Size:** 11,000+ program embeddings
- **Index:** HNSW index for fast approximate nearest neighbor search

**Structure:**
```sql
CREATE TABLE programs (
  id SERIAL PRIMARY KEY,
  iro_institution TEXT,
  program TEXT,
  program_desc TEXT,
  degree_level TEXT,
  cip_code TEXT,
  embedding vector(1536)
);

CREATE INDEX ON programs USING hnsw (embedding vector_cosine_ops);
```

**Key Features:**
- Semantic search beyond keyword matching
- Finds "marine biology" → "oceanography" connections
- Cached query embeddings in Redis (1 hour TTL)
- Fallback when keyword search returns < 3 results
- Combined with keyword results for comprehensive coverage

### Legacy JSONL Databases (Still Used)

**Location:** `src/app/lib/data/jsonl/`

**Career Mappings:**
- `cip_to_soc_mapping.jsonl`: CIP → SOC (career) mappings
- `soc_to_cip_mapping.jsonl`: SOC → CIP mappings

**High School Data:**
- High school program data (separate from college programs)

**Note:** Old college program JSONL files are deprecated in favor of the comprehensive dataset.

### Search Tools

**Primary:** `enhanced-program-tool.ts`
- Uses comprehensive JSON dataset
- In-memory search with caching
- Island filtering via institution codes
- Keyword matching with scoring
- CIP code direct lookup

**Legacy:** `jsonl-reader.ts` & `jsonl-tools.ts`
- Still used for career mappings
- JSONL file parsing utilities
- Line-by-line reading for memory efficiency

#### Search Features:

**Keyword Search:**
- **Phrase matching**: Detects exact phrases in program descriptions
- **Keyword scoring**: Ranks programs by relevance (0-100 scale)
- **Fuzzy matching**: Handles typos and variations
- **CIP code lookup**: Direct program lookup by CIP codes
- **Island filtering**: Geographic filtering by Hawaii islands
- **Broad query detection**: Returns all programs when query is location-only

**Vector Search (NEW):**
- **Semantic similarity**: Cosine similarity search using embeddings
- **Smart fallback**: Triggers when keyword search returns < 3 results
- **Query embedding cache**: Redis cache for 1 hour (avoid re-embedding same queries)
- **Context-aware**: Uses conversation context to enhance query
- **Result verification**: LLM validates vector matches for relevance
- **Hybrid approach**: Merges and deduplicates keyword + vector results

---

## 🎯 Smart Features

### 1. Context-Aware Keyword Extraction with LLM Intelligence

**Problem Solved:** Prevent profile interests from contaminating specific queries, properly handle conversation flow

**Implementation:**
```typescript
// Topic Pivot Detection (e.g., "what about", "instead", "actually")
if (isTopicPivot) {
  keywords = extractKeywords(currentQuery); // Fresh start
}

// Affirmative Response (e.g., "yes", "sure", "okay")
else if (isAffirmative) {
  // Use LLM to intelligently extract conversation context
  const contextKeywords = await extractConversationalContext(conversationHistory);
  keywords = contextKeywords; // Focus on recent discussion topic
  // Only add profile interests if context is extremely thin
}

// Normal Query
else {
  keywords = extractKeywords(currentQuery);
  // Add profile interests only if query is vague (< 3 keywords)
}
```

### 2. Island/Geographic Filtering

**Problem Solved:** Students want programs on specific islands

**Implementation:**
```typescript
// Classifier detects island mentions
state.searchScope = { type: 'island', location: 'Oahu' };

// ProfileExtractor sets island filter
state.islandFilter = 'Oahu'; // or 'Maui', 'Big Island', 'Kauai'

// EnhancedProgramTool filters by institution codes
const institutionCodes = islandTool.getInstitutionCodesByIsland('Oahu');
// Returns: ['HON', 'KAP', 'LEE', 'WIN', 'WHO'] for Oahu
```

### 3. Degree Level Filtering

**Problem Solved:** Students have specific degree goals (certificate vs. associate vs. bachelor)

**Implementation:**
```typescript
// Classifier detects degree mentions
state.degreePreference = '2-Year'; // or '4-Year', 'Non-Credit'

// Verifier filters programs by degree_level
if (degreePreference && program.degree_level !== degreePreference) {
  continue; // Skip programs that don't match
}

// Formatter organizes by degree level in output
```

### 4. Institution-Specific Filtering

**Problem Solved:** Students want programs at specific schools

**Implementation:**
```typescript
// Classifier detects school/college mentions
state.institutionFilter = { type: 'college', name: 'Kapiolani CC' };

// Verifier applies filter during validation
if (institutionFilter && !programMatchesInstitution(program, filter)) {
  continue; // Skip programs from other institutions
}
```

### 5. Profile Filtering in Verification

**Problem Solved:** Wrong programs shown when user confirms interest

**Implementation:**
```typescript
// When user says "yes", don't boost profile interests
const profileForVerification = isAffirmative ? undefined : state.userProfile;

// Profile only used for scoring in normal searches, not affirmative responses
```

### 6. JSON-Forced Tool Planning

**Problem Solved:** Regex parsing failures in tool call extraction

**Implementation:**
```typescript
// Use Groq's JSON mode for guaranteed valid JSON
const response = await groq.chat.completions.create({
  // ...
  response_format: { type: "json_object" }, // Forces valid JSON
});

// Parse and validate with Zod
const toolCallsRaw = JSON.parse(content).tools || [];
state.toolCalls = toolCallsRaw.map(tc => ToolCallSchema.parse(tc));
```

### 7. Component Caching (UI)

**Problem Solved:** Re-fetching data when toggling between views

**Implementation:**
```tsx
// Keep components mounted, hide with CSS
<div style={{ display: showDetails ? 'block' : 'none' }}>
  <MarketIntelligenceReport /> {/* Always mounted */}
</div>
```

### 8. Data Validation

**Problem Solved:** API returns junk data (numbers, "null", test values)

**Implementation:**
```typescript
isValidSkill(skill: string): boolean {
  const junkPatterns = [
    /^\d+$/,           // Pure numbers
    /^[^a-zA-Z]+$/,    // No letters
    /^(na|n\/a|null)$/i, // Null values
    /^.{1,2}$/,        // 1-2 char strings
    /test/i,           // Test data
  ];
  return !junkPatterns.some(pattern => pattern.test(skill.trim()));
}

isValidCompany(company: string): boolean {
  // Similar validation for company names
}
```

### 9. Enhanced Program Tool Caching

**Problem Solved:** Re-reading large JSON file on every search

**Implementation:**
```typescript
class EnhancedProgramTool {
  private programCache: EnhancedProgram[] | null = null;
  
  async getAllPrograms() {
    if (this.programCache) {
      return this.programCache; // Return cached
    }
    // Load from file once, cache in memory
    this.programCache = await this.loadPrograms();
    return this.programCache;
  }
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
  "response": "markdown formatted pathway results (may include web summary)",
  "pathwayData": {
    "highSchoolPrograms": [...],
    "collegePrograms": [...],
    "careers": [...]
  },
  "socCodes": ["29-1141", "29-1151"],
  "webSearchResults": [...],  // If web search enabled
  "metadata": {...}
}
```

### Web Research
**Endpoint:** `POST /api/exa-search`

Performs neural web search with AI summarization.

**Request:**
```json
{
  "query": "software engineering careers in Hawaii",
  "conversationContext": [...]
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "title": "Article Title",
      "url": "https://...",
      "text": "Full content...",
      "summary": "AI summary...",
      "highlights": ["key phrase 1", "key phrase 2"]
    }
  ],
  "summary": "AI-generated markdown summary of all results",
  "originalQuery": "software engineering",
  "query": "software engineering careers opportunities Hawaii 2025"
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

### Primary LLM Provider: Groq

**Fast Inference Models** for different use cases:

#### Model Selection Strategy:

| Agent | Model | Temperature | Max Tokens | Reasoning |
|-------|-------|-------------|------------|-----------|
| Classifier | `llama-3.3-70b-versatile` | 0.1 | 500 | Precise intent + filter extraction |
| ProfileExtractor (LLM context) | `llama-3.3-70b-versatile` | 0.2 | 300 | Accurate context extraction |
| ToolPlanner | `openai/gpt-oss-120b` | 0.1 | 800 | JSON-forced planning, 500 tps, 74% cheaper |
| Conversational | `llama-3.3-70b-versatile` | 0.7 | 800 | Natural, friendly responses |
| Profile Generation | `llama-3.3-70b-versatile` | 0.3 | 2000 | Structured data extraction |
| Profile Update | `llama-3.3-70b-versatile` | 0.3 | 1500 | Incremental updates |
| Verifier | `llama-3.3-70b-versatile` | 0.2 | 1000 | Accurate relevance scoring |
| CIPVerifier | `openai/gpt-oss-120b` | 0.1 | 1000 | Fast CIP validation with context |
| Reflector | `llama-3.3-70b-versatile` | 0.3 | 500 | Quality assessment |
| SOCVerifier | `openai/gpt-oss-120b` | 0.1 | 1000 | Fast SOC filtering with context |
| Market Intelligence | `llama-3.3-70b-versatile` | 0.7 | 2000 | Creative skill inference |
| Response Formatter | `llama-3.3-70b-versatile` | 0.5 | 3000 | Well-structured output |

**Model Selection Rationale:**
- **llama-3.3-70b-versatile**: Primary model for most tasks, excellent balance of speed/quality
- **openai/gpt-oss-120b**: Used only for tool planning due to higher throughput (500 tps) and lower cost (74% cheaper)

**JSON Mode:**
- ToolPlanner uses `response_format: { type: "json_object" }` for guaranteed valid JSON
- Eliminates regex parsing failures
- Combined with Zod validation for type safety

---

## 🚦 Rate Limiting & Caching

### Rate Limiting
**Implementation:** Upstash Rate Limit

- **Limit:** 10 requests per 10 seconds per IP
- **Endpoint:** All API routes
- **Response:** 429 Too Many Requests with `Retry-After` header
- **Status Endpoint:** `GET /api/rate-limit-status` - Check current limits

### Caching
**Implementation:** Upstash Redis

- **TTL:** 1 hour (3600 seconds) for pathway searches
- **Cache Key:** MD5 hash of `JSON.stringify(query + profile + history)`
- **Cache Hit:** Returns immediately, skips all agent processing
- **Cache Miss:** Executes full orchestrator workflow, then caches result

**What's Cached:**
```typescript
{
  response: string,        // Markdown formatted response
  data: PathwayData,       // High school/college programs, careers
  profile: UserProfile,    // Updated profile
  toolsUsed: string[],     // Tools executed
  reflectionScore: number, // Quality score
  attempts: number,        // Retry attempts made
  socCodes: string[],      // For market intelligence
  metadata: {...}          // Query execution details
}
```

**Cache Management Endpoints:**
- `GET /api/cache-stats`: View cache hit/miss statistics
- `POST /api/cache-invalidate`: Clear specific keys or all cache
- `POST /api/cache-warmup`: Pre-populate cache with common queries

**In-Memory Caching:**
- **EnhancedProgramTool**: Caches full program dataset in memory after first load
- **IslandMappingTool**: Caches island mappings in memory (lightweight)

---

## 📊 Quality Assurance

### Reflection System

**Updated Score Thresholds (Optimized for Speed):**
- **5-10**: Acceptable - Continue to output
- **0-4**: Needs improvement - Retry with enhanced strategy
- **Max Attempts:** 2 (reduced from 3 for faster responses)

### Retry Strategy:

**Attempt 1:**
- Use initial keywords from ProfileExtractor
- Primary tool: `trace_pathway` with comprehensive dataset
- Always include `get_careers` for complete pathways
- Standard verification with profile scoring

**Attempt 2 (if quality < 5):**
- **StrategyEnhancer** generates new approach:
  - Broaden scope: Include more general keywords
  - CIP search: Try 2-digit CIP code expansion
  - Different tool mix: May add more specific tools
- Loop back to **ProfileExtractor** with enhanced strategy
- Re-execute with new keywords and approach

**Quality Evaluation Criteria:**
- **Relevance**: Programs match user's expressed interests
- **Completeness**: Pathway shows HS → College → Career connections
- **Diversity**: Multiple program options provided
- **Specificity**: Programs align with stated goals and preferences
- **Context**: Results make sense given conversation history

**Early Termination:**
- If quality ≥ 5 after Attempt 1: Skip retry, proceed to Aggregator
- If Attempt 2: Always proceed to output (accept best available)
- No third attempt for performance reasons

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

1. **In-Memory Program Dataset**: ~11K programs cached after first load (EnhancedProgramTool)
2. **Redis Caching**: Pathway results cached for 1 hour (Upstash)
3. **Parallel Tool Execution**: All tools run simultaneously with Promise.all
4. **Parallel API Calls**: Market intelligence fetches 4 SOC APIs in parallel
5. **Smart Verification**: Early termination when quality ≥ 5
6. **Reduced Retries**: Max 2 attempts (reduced from 3)
7. **Component Caching (UI)**: Components stay mounted, toggle with CSS
8. **JSON-Forced Responses**: Eliminates regex parsing overhead
9. **Batch Verification**: Programs verified in batches of 5
10. **Island Filter Early**: Filters at tool level, not verification level
11. **CIP Code Validation (NEW)**: Fast CIP verification with `openai/gpt-oss-120b` (500 tps)
12. **SOC Code Filtering (NEW)**: Context-aware career code filtering prevents irrelevant data
13. **Fixed Database Mappings**: Corrected CIP-to-SOC mappings reduce runtime corrections

### Metrics

- **Average Response Time**: 2-4 seconds for pathway search (first attempt)
- **Cache Hit Rate**: ~60% for repeated queries
- **Quality Score**: Average 7-8/10 on first attempt
- **Single Attempt Success**: ~80% of queries succeed without retry
- **Dataset Load Time**: <500ms for 11K programs (one-time)
- **Parallel Speedup**: 3-4x faster than sequential tool execution

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
