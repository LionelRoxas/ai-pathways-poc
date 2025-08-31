# Kamaʻāina Pathways - AI Education & Career Advisor

An intelligent conversational AI platform that helps Hawaii students discover personalized education and career pathways through natural conversation, connecting high school programs to University of Hawaii opportunities.

## 🏗️ Architecture Overview

```
├── Frontend (Next.js + React)
│   ├── Landing Page
│   ├── Chat Interface
│   ├── Profile Sidebar
│   └── Data Panel
│
├── Backend (API Routes)
│   ├── Conversation Agents
│   │   ├── Profiling Chat Agent
│   │   └── AI Pathways Agent
│   │
│   ├── Analysis Agents
│   │   ├── Profile Generator
│   │   ├── Profile Updater
│   │   └── Suggestion Generator
│   │
│   └── Data Services
│       ├── MCP Server (Database queries)
│       └── Direct Search
│
└── Database (Prisma + PostgreSQL)
    ├── UH Programs
    ├── DOE Programs
    └── Pathways
```

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── profiling-chat/        # Initial conversation handler
│   │   ├── ai-pathways/           # Post-profile conversation handler
│   │   ├── generate-profile/      # Profile creation from conversation
│   │   ├── update-profile/        # Profile enhancement over time
│   │   ├── personalized-suggestions/ # Dynamic question generation
│   │   └── direct-search/         # Database search endpoint
│   │
│   ├── lib/
│   │   ├── mcp/
│   │   │   └── pathways-mcp-server.ts  # Database query orchestrator
│   │   ├── analyzer/
│   │   │   ├── profile-analyzer.ts     # Conversation analysis
│   │   │   └── query-translator.ts     # Intent to query mapping
│   │   └── ai/
│   │       └── prompts.ts              # System prompts
│   │
│   ├── components/
│   │   └── AIPathwaysChat/
│   │       └── _components/
│   │           ├── UnifiedSleekChat.tsx    # Main chat controller
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
└── public/                         # Static assets
```

## 🤖 Agent Architecture

### 1. **Profiling Chat Agent** (`/api/profiling-chat`)

- **Purpose**: Conducts initial discovery conversation
- **Behavior**: Asks open-ended questions to understand the student
- **Triggers Profile Build**: After 7 user messages
- **Response Format**:
  ```typescript
  {
    message: string,
    readyForProfile?: boolean,
    suggestedQuestions?: string[]
  }
  ```

### 2. **AI Pathways Agent** (`/api/ai-pathways`)

- **Purpose**: Provides personalized recommendations post-profile
- **Features**:
  - Searches programs based on profile
  - Executes MCP database queries
  - Returns structured data with results
- **Response Format**:
  ```typescript
  {
    message: string,
    data?: {
      uhPrograms?: UHProgram[],
      doePrograms?: DOEProgram[],
      pathways?: Pathway[],
      stats?: DatabaseStats
    },
    metadata?: QueryMetadata
  }
  ```

### 3. **Profile Generator** (`/api/generate-profile`)

- **Purpose**: Creates comprehensive profile from conversation
- **Input**: Conversation transcript + metrics
- **Output**:
  - Profile summary (narrative)
  - Extracted structured data
  - Confidence scores
- **Profile Structure**:
  ```typescript
  {
    educationLevel: string,
    interests: string[],
    careerGoals: string[],
    location: string,
    timeline: string,
    strengths: string[],
    challenges: string[],
    workPreferences: object
  }
  ```

### 4. **Profile Updater** (`/api/update-profile`)

- **Purpose**: Enhances profile as conversation continues
- **Triggers**: At message counts [15, 25, 35, 50]
- **Behavior**: Non-blocking background update
- **Features**: Preserves existing data while adding new insights

### 5. **Suggestion Generator** (`/api/personalized-suggestions`)

- **Purpose**: Creates contextual follow-up questions
- **Input**: Current profile + extracted data
- **Output**: 4 personalized question suggestions
- **Updates**: After profile creation/updates

## 💾 Database Schema

### Core Tables

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

## 🔍 MCP Server Functions

The Model Context Protocol (MCP) server provides intelligent database queries:

### Available Tools:

1. **getUHPrograms** - Fetch and rank UH programs
2. **getDOEPrograms** - Fetch and rank high school pathways
3. **getEducationPathways** - Get complete HS→College paths
4. **searchPrograms** - Text search across all programs
5. **getDatabaseStats** - Get system statistics

### Relevance Scoring Algorithm:

- **Keyword matching**: 40 points max
- **Career goal alignment**: 30 points max
- **Degree appropriateness**: 20 points max
- **Location proximity**: 15 points max
- **Pathway availability**: 30 points max

## 🎨 UI Components

### 1. **Main Chat Interface**

- Hide-on-scroll navbar
- Real-time loading states
- Progress indicators for profile building
- Suggested question buttons

### 2. **Left Sidebar (Profile)**

- Profile completeness tracker
- Category breakdowns (Basics, Goals, Preferences)
- Highlights and next steps
- Visual progress indicators

### 3. **Right Data Panel**

- Tabbed interface (Overview, HS, UH, Pathways, Search)
- Collapsible course sequences
- Relevance score badges
- Direct search functionality

### 4. **Input Component**

- Auto-expanding textarea
- Character counter
- Context-aware placeholders
- Loading state indicators

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
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
```

### Required Dependencies:

```json
{
  "dependencies": {
    "@prisma/client": "^5.x",
    "next": "^14.x",
    "react": "^18.x",
    "lucide-react": "^0.x",
    "openai": "^4.x"
  }
}
```

## 🔄 User Journey Flow

1. **Landing Page** → Simple, Google-inspired design
2. **Initial Chat** → 7-message discovery phase
3. **Profile Building** → Automatic after 7 messages
4. **Personalized Mode** → Intelligent recommendations
5. **Data Exploration** → Interactive results panel
6. **Profile Updates** → Continuous enhancement

## 📊 Profile Building Phases

### Discovery Phase (Messages 1-7):

- Open-ended questions
- Natural conversation flow
- Progress indicator showing X/7

### Profile Generation (After Message 7):

- Automatic profile creation
- Confidence scoring
- Personalized suggestions

### Enhancement Phase (Messages 8+):

- Profile updates at intervals [15, 25, 35, 50]
- Non-blocking background processing
- Continuous refinement

## 🛠️ Key Features

- **Conversational AI**: Natural language understanding
- **Smart Profiling**: Builds understanding through conversation
- **Hawaii-Focused**: All data specific to Hawaii education system
- **Real-time Search**: Direct database queries during chat
- **Progressive Enhancement**: Profile improves over time
- **Responsive Design**: Works on all devices
- **No Authentication**: Immediate access, no signup

## 📝 License

Built for Hawaii's students by the University of Hawaii Community Colleges system.

---

_Kamaʻāina Pathways - Empowering Hawaii's future through intelligent career guidance_
