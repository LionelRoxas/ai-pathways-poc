# Migration from MCP to Orchestrator-Agent Architecture

## Overview

The Hawaii Education Pathways chatbot has been migrated from a database-driven MCP (Model Context Protocol) architecture to a JSONL-based orchestrator-agent pattern using CIP (Classification of Instructional Programs) codes as the universal data connector.

## What Changed

### Before (MCP Architecture)
- **Endpoint**: `/api/ai-pathways`
- **Data Source**: PostgreSQL database via Prisma
- **Routing**: MCP server with tool-based routing
- **Dependencies**: Database, Prisma, complex MCP protocol

### After (Orchestrator Architecture)
- **Endpoint**: `/api/orchestrator`
- **Data Source**: JSONL files in `data/` directory
- **Routing**: CIP-code based orchestrator with specialized agents
- **Dependencies**: JSONL files only (no database required)

## API Changes

### New Endpoint: `/api/orchestrator`

**Request:**
```json
{
  "message": "Tell me about engineering programs",
  "userProfile": "High school junior interested in STEM",
  "extractedProfile": { ... },
  "language": "en"
}
```

**Response:**
```json
{
  "success": true,
  "message": "AI-generated response...",
  "data": {
    "relatedHighSchool": [...],  // High school programs
    "collegeOptions": [...],      // UH programs
    "careerPaths": [...]          // Career pathways
  },
  "metadata": {
    "intent": "search",
    "focusArea": "highschool",
    "agentsInvoked": ["highschool", "college", "workforce"],
    "totalResults": 45,
    "cipCodesUsed": ["14.0101", "14.0801"],
    "cip2DigitUsed": ["14"]
  },
  "suggestedQuestions": [...]
}
```

### Deprecated Endpoints

#### `/api/ai-pathways` (DEPRECATED)
- ❌ Uses MCP server and database
- ❌ Slower database queries
- ❌ Complex Prisma dependencies
- ✅ Kept for backwards compatibility

#### `/api/profiling-chat` (ACTIVE)
- ✅ Still used for initial profile building
- ℹ️ Not affected by this migration

## Data Structure Changes

### High School Programs

**Old (DOEProgramData):**
```typescript
{
  id: string;
  programOfStudy: string;
  careerCluster?: string;
  courseSequence: {
    grade9, grade10, grade11, grade12, electives
  };
}
```

**New (HighSchoolProgram):**
```typescript
{
  programOfStudy: string;
  cip2Digit: string[];                    // NEW: CIP categories
  courseSequence: {
    grade9, grade10, grade11, grade12     // No more electives field
  };
  recommendedCourses?: string[];          // NEW
  level1Courses?: string[];               // NEW: POS level courses
  level2Courses?: string[];
  level3Courses?: string[];
  level4Courses?: string[];
  schoolsOffering?: string[];
  relevanceScore?: number;
  matchReason?: string;                   // NEW: Explanation
}
```

### College Programs

**Old (UHProgramData):**
```typescript
{
  id: string;
  campus: string;
  program: string;
  degree: string;
  programName: string;
  cipCategory?: string;
}
```

**New (CollegeProgram):**
```typescript
{
  cipCode: string;                        // Full CIP code
  programName: string;
  campus: string;
  degree?: string;
  cip2Digit?: string;                     // Category
  relevanceScore?: number;
  matchReason?: string;                   // NEW
}
```

### Career Pathways

**Old (LightcastCareerData):**
```typescript
{
  cipCode: string;
  subjectArea: string;
  medianSalary: number;
  uniqueCompanies: number;
  uniquePostings: number;
}
```

**New (CareerPathway):**
```typescript
{
  cipCode: string;
  socCode: string;                        // NEW: SOC code
  cip2Digit?: string;
  title?: string;
  medianSalary?: number;
  jobOpenings?: number;
  companies?: number;
  relevanceScore?: number;
  matchReason?: string;                   // NEW
  relatedPrograms?: {                     // NEW: Connections
    highschool: string[];
    college: string[];
  };
}
```

## Frontend Changes

### UnifiedSleekChat.tsx

**Before:**
```typescript
let apiEndpoint = "/api/ai-pathways";
```

**After:**
```typescript
let apiEndpoint = "/api/orchestrator";
```

### DataPanel.tsx

The DataPanel now supports **both legacy and orchestrator formats** automatically:

- Checks for `relatedHighSchool` (orchestrator) first
- Falls back to `doePrograms` (legacy) if orchestrator data not present
- Same logic for `collegeOptions` vs `uhPrograms`
- Same logic for `careerPaths` vs `careerData`

## File Structure

### New Files Added
```
src/app/
├── lib/
│   ├── orchestrator/
│   │   ├── index.ts              # Main orchestrator
│   │   ├── cip-mapper.ts         # CIP code mapping
│   │   └── query-analyzer.ts     # Query analysis
│   ├── agents/
│   │   ├── base-agent.ts         # Base class
│   │   ├── highschool-agent.ts   # HS programs
│   │   ├── college-agent.ts      # UH programs
│   │   └── workforce-agent.ts    # Career paths
│   └── data/
│       ├── jsonl-reader.ts       # JSONL file reader
│       └── cip-index.ts          # CIP indexing
└── api/
    └── orchestrator/
        └── route.ts              # New endpoint
```

### Deprecated Files (Kept for Compatibility)
```
src/app/
├── lib/mcp/
│   └── pathways-mcp-server.ts    # ⚠️ DEPRECATED
└── api/
    └── ai-pathways/
        └── route.ts              # ⚠️ DEPRECATED
```

## Benefits of New Architecture

1. **🚀 Performance**: In-memory JSONL data vs database queries
2. **🔌 No Database**: Works without PostgreSQL/Prisma
3. **🎯 CIP-Based**: Universal key connecting all education levels
4. **🧩 Modular**: Easy to add new agents
5. **📊 Better UX**: Relevance scores and match reasons
6. **💾 Smaller**: No heavy Prisma dependencies

## Migration Checklist

- [x] Create orchestrator architecture
- [x] Implement JSONL reader
- [x] Build CIP index system
- [x] Create specialized agents
- [x] Update API endpoint
- [x] Update frontend to use `/api/orchestrator`
- [x] Update DataPanel for orchestrator data
- [x] Add deprecation notices to MCP files
- [x] Maintain backwards compatibility
- [ ] Remove MCP files (optional, future)

## Testing

To test the new orchestrator:

1. Start the development server
2. Use the chat interface with a completed profile
3. Ask: "Tell me about engineering programs"
4. Verify the response uses `/api/orchestrator`
5. Check DataPanel shows orchestrator data (cards with CIP codes)

## Rollback Plan

If issues arise, the old system is still available:

1. Change `/api/orchestrator` back to `/api/ai-pathways` in `UnifiedSleekChat.tsx`
2. The DataPanel will automatically use legacy data format
3. MCP server and database queries will resume

## Future Enhancements

- [ ] Remove MCP server entirely
- [ ] Add real-time Lightcast API integration to workforce agent
- [ ] Implement profile-building agent
- [ ] Add more sophisticated relevance scoring
- [ ] Create CIP pathway visualization in DataPanel
- [ ] Add analytics for agent performance

## Questions?

See the implementation in:
- `src/app/lib/orchestrator/index.ts` - Main orchestrator
- `src/app/api/orchestrator/route.ts` - API endpoint
- `src/app/lib/agents/` - Agent implementations
