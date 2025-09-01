# Kamaʻāina Pathways - AI Education & Career Advisor

An intelligent multilingual conversational AI platform that helps Hawaii students discover personalized education and career pathways through natural conversation in their preferred language, connecting high school programs to University of Hawaii opportunities.

## 🏗️ Architecture Overview

```
├── Frontend (Next.js + React)
│   ├── Landing Page
│   ├── Language Selection
│   ├── Chat Interface (Multilingual)
│   ├── Profile Sidebar
│   └── Data Panel
│
├── Middleware Layer
│   ├── Rate Limiting (Upstash)
│   ├── Request Tracking
│   └── Cache Management
│
├── Backend (API Routes)
│   ├── Conversation Agents
│   │   ├── Profiling Chat Agent (Multilingual)
│   │   └── AI Pathways Agent (Multilingual)
│   │
│   ├── Analysis Agents
│   │   ├── Profile Generator (Multilingual)
│   │   ├── Profile Updater (Multilingual)
│   │   └── Suggestion Generator (Multilingual)
│   │
│   ├── Cache Services
│   │   ├── Response Cache
│   │   ├── Query Cache
│   │   └── Semantic Cache (RAG)
│   │
│   └── Data Services
│       ├── MCP Server (Database queries)
│       └── Direct Search
│
└── Database & Cache
    ├── PostgreSQL (Programs & Pathways)
    └── Redis (Cache & Rate Limiting)
```

## 🌏 Multi-Language Support

### Supported Languages:

- **English** - Standard professional communication
- **ʻŌlelo Hawaiʻi (Hawaiian)** - With proper diacritical marks
- **Hawaiian Pidgin** - Authentic local style
- **Tagalog** - With respectful honorifics

### Language Implementation:

```typescript
// Language flows through the entire system
User → Language Selection → Chat Interface → API Routes → AI Responses

// Profile Storage Strategy
Input: Any supported language
Storage: English (for system compatibility)
Output: User's chosen language
```

## 🚀 Caching Architecture

### Multi-Level Caching Strategy:

```
Request → Middleware (Rate Check) → Cache Check → API/Database
           ↓                         ↓
      Track Pattern            HIT: Return Cached
                              MISS: Execute & Cache
```

### Cache Layers:

1. **Response Cache**: Complete API responses

   - TTL: 1 hour for data, 5 min for empty
   - Key: `response:${endpoint}:${queryHash}:${language}`

2. **Query Cache**: Individual MCP queries

   - TTL: 1 hour
   - Key: `query:${tool}:${paramHash}`

3. **Semantic Cache**: Similar query matching

   - Uses embeddings for similarity
   - Reduces redundant processing

4. **Request Tracking**: Pattern analysis
   - Popular queries tracked
   - User patterns monitored
   - Traffic analysis for optimization

## ⚡ Rate Limiting & Middleware

### Rate Limit Configuration:

- **General**: 50 requests per 60-second window
- **API Routes**: 50 API calls per 60-second window
- **Implementation**: Upstash Redis with fixed window

### Middleware Features:

```typescript
// Request flow through middleware
Request → IP Extraction → Rate Check → Request Tracking → Route Handler
                              ↓
                         429 if exceeded
```

### Cache Management Endpoints:

- `/api/cache-stats` - Monitor cache performance
- `/api/cache-warmup` - Preload popular queries
- `/api/cache-invalidate` - Clear cache by tags

## 📁 Project Structure

```
src/
├── app/
│   ├── middleware.ts               # Rate limiting & request tracking
│   ├── api/
│   │   ├── profiling-chat/        # Initial conversation (multilingual)
│   │   ├── ai-pathways/           # Post-profile chat (multilingual + cache)
│   │   ├── generate-profile/      # Profile creation (multilingual)
│   │   ├── update-profile/        # Profile enhancement (multilingual)
│   │   ├── personalized-suggestions/ # Dynamic questions (multilingual)
│   │   ├── direct-search/         # Database search (cached)
│   │   ├── cache-stats/           # Cache monitoring
│   │   ├── cache-warmup/          # Cache preloading
│   │   └── cache-invalidate/      # Cache clearing
│   │
│   ├── lib/
│   │   ├── mcp/
│   │   │   └── pathways-mcp-server.ts  # Database query orchestrator
│   │   ├── cache/
│   │   │   ├── cache-service.ts        # Cache management
│   │   │   └── semantic-cache.ts       # RAG-like caching
│   │   └── ai/
│   │       └── prompts.ts              # Multilingual prompts
│   │
│   ├── utils/
│   │   └── groqClient.ts          # AI client with language support
│   │
│   ├── components/
│   │   ├── LanguageSelector.tsx   # Language selection interface
│   │   └── AIPathwaysChat/
│   │       └── _components/
│   │           ├── UnifiedSleekChat.tsx    # Main chat (multilingual)
│   │           ├── ChatMessages.tsx        # Message display
│   │           ├── ChatInput.tsx           # Input handling
│   │           ├── LeftSidebar.tsx         # Profile display
│   │           ├── DataPanel.tsx           # Results display
│   │           └── types.ts                # TypeScript definitions
│   │
│   └── page.tsx                    # Landing page
│
├── prisma/
│   └── schema.prisma               # Database schema
│
└── public/
    └── images/
        └── uhcc-logo-3.png         # UHCC branding
```

## 🤖 Enhanced Agent Architecture

### Language-Aware Agents:

All agents now support multilingual conversations while maintaining English profiles for system compatibility:

1. **Profiling Chat Agent** (`/api/profiling-chat`)

   - Conducts discovery in user's language
   - Language-specific suggested questions
   - Culturally appropriate responses

2. **AI Pathways Agent** (`/api/ai-pathways`)

   - Cached responses for performance
   - Language-aware recommendations
   - Semantic query understanding

3. **Profile Generator** (`/api/generate-profile`)

   - Understands input in any language
   - Generates English profiles for compatibility
   - Tracks source language in metadata

4. **Profile Updater** (`/api/update-profile`)

   - Processes updates in user's language
   - Maintains English profile consistency
   - Preserves cultural context

5. **Suggestion Generator** (`/api/personalized-suggestions`)
   - Creates questions in user's language
   - Profile-aware fallbacks
   - Culturally relevant prompts

## 💾 Database Schema

### Core Tables (Unchanged)

```prisma
model UHProgram {
  id              String
  campus          String
  program         String
  degree          String
  programName     String
  searchKeywords  String[]
  careerOutcomes  String[]
  cipCategory     String?
  estimatedDuration String?

  doePathways     DOEProgramPathway[]
}

model DOEProgram {
  id              String
  programOfStudy  String
  careerCluster   String
  searchKeywords  String[]
  grade9Courses   String[]
  grade10Courses  String[]
  grade11Courses  String[]
  grade12Courses  String[]

  uhPathways      DOEProgramPathway[]
}

model DOEProgramPathway {
  doeProgramId    String
  uhProgramId     String
  campus          String

  doeProgram      DOEProgram
  uhProgram       UHProgram
}
```

## 🔍 Enhanced MCP Server Functions

### Caching Integration:

- Query results cached for 1 hour
- Popular queries preloaded
- Semantic matching for similar queries

### Available Tools (with caching):

1. **getUHPrograms** - Cached UH program fetching
2. **getDOEPrograms** - Cached HS pathway fetching
3. **getEducationPathways** - Cached complete paths
4. **searchPrograms** - Cached text search
5. **getDatabaseStats** - Real-time statistics

## 🎨 UI Components

### New Components:

1. **Language Selector**
   - Clean selection interface
   - Native language names
   - Sample greetings
   - Cultural descriptions

### Enhanced Components:

2. **Main Chat Interface**

   - Language indicator in header
   - Multilingual UI text
   - Language-aware placeholders
   - Cultural appropriate messaging

3. **Left Sidebar (Profile)**

   - Language-aware progress text
   - Culturally relevant categories
   - Localized highlights

4. **Right Data Panel**
   - Results in English (technical data)
   - Explanations in user's language
   - Language-aware search

## 📊 Performance Optimizations

### Cache Performance:

- **Response Time**: ~50ms for cached vs ~2-3s for fresh
- **Hit Rate Target**: >60% after warmup
- **Storage**: Redis with automatic expiration

### Rate Limiting:

- **Protection**: Prevents API abuse
- **User Experience**: Clear retry messaging
- **Headers**: Standard rate limit headers

### Request Tracking:

- **Pattern Analysis**: Identifies popular queries
- **User Behavior**: Tracks interaction patterns
- **Optimization**: Informs cache warmup

## 🚀 Deployment Configuration

### Vercel Settings:

```
Node.js Version: 20.x
Root Directory: (leave empty)
Build Command: npm run build
Output Directory: .next
```

### Environment Variables:

```env
# Database
DATABASE_URL=postgresql://...

# AI Services
GROQ_API_KEY=gsk_...

# Caching & Rate Limiting
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Optional
ENABLE_CACHE=true
CACHE_TTL=3600
```

### Required Dependencies:

```json
{
  "dependencies": {
    "@prisma/client": "^5.x",
    "@upstash/redis": "^1.x",
    "@upstash/ratelimit": "^1.x",
    "next": "^14.x",
    "react": "^18.x",
    "lucide-react": "^0.x",
    "groq-sdk": "^0.x"
  }
}
```

## 🔄 Enhanced User Journey Flow

1. **Landing Page** → Clean, minimalist design with UHCC branding
2. **Language Selection** → Choose preferred language
3. **Initial Chat** → 7-message discovery in chosen language
4. **Profile Building** → Automatic, language-aware
5. **Personalized Mode** → Cached, multilingual recommendations
6. **Data Exploration** → Interactive, performant results
7. **Continuous Enhancement** → Profile updates with caching

## 🛠️ Key Features

### Core Features:

- **Multilingual Support**: 4 languages for Hawaii's diversity
- **Intelligent Caching**: Sub-second responses for common queries
- **Rate Protection**: Fair usage with clear limits
- **Conversational AI**: Natural language in any supported language
- **Smart Profiling**: Language-aware profile building
- **Hawaii-Focused**: Complete Hawaii education ecosystem
- **Progressive Enhancement**: Continuous improvement
- **No Authentication**: Immediate access

### Technical Features:

- **Semantic Cache**: RAG-like query matching
- **Request Tracking**: Usage pattern analysis
- **Cache Warmup**: Preload popular content
- **Language Routing**: Consistent language experience
- **Profile Consistency**: English storage, any language input
- **Performance Monitoring**: Real-time cache stats

## 📈 System Metrics

### Cache Metrics:

- Hit rate, miss rate, total requests
- Popular queries and patterns
- Storage usage and TTL distribution

### Rate Limit Metrics:

- Request distribution by IP
- Peak usage times
- Rate limit violations

### Language Usage:

- Distribution of language selections
- Conversation length by language
- Profile completion by language

## 🔐 Security & Privacy

- **No PII Storage**: Conversations not permanently stored
- **Rate Limiting**: Prevents abuse
- **Cache Isolation**: User-specific cache keys
- **Language Privacy**: Language choice not tracked long-term

## 📝 License

Built for Hawaii's students by the University of Hawaii Community Colleges system.

---

_Kamaʻāina Pathways - Empowering Hawaii's future through intelligent career guidance in any language_
