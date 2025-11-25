# pgVector Migration Plan

## 🎯 Goal
Migrate semantic search from slow JSONL + LLM ranking (~60s) to fast pgVector database (~2-5s)

**Expected Speed Improvement:** 12-30x faster

---

## 📊 Current Architecture (Slow - 60s)

```
User Query
    ↓
Load ALL 883KB JSONL from disk (5-10s)
    ↓
LLM Intent Extraction via Groq (2-5s)
    ↓
Filter programs by keywords
    ↓
Batch LLM Ranking (20 programs per batch) (30-50s)
    ↓
Sort and return results
```

**Problems:**
- ❌ Loads entire dataset from disk every query
- ❌ Multiple expensive LLM calls for ranking
- ❌ Processes 200+ programs through LLM
- ❌ No caching between queries
- ❌ Rate limited by Groq API

---

## 🚀 New Architecture (Fast - 2-5s)

```
User Query
    ↓
Generate embedding (optional, can cache) (<1s)
    ↓
Vector similarity search in PostgreSQL (<500ms)
    ↓
Optional: Quick LLM rerank for top 10 results (<2s)
    ↓
Return results
```

**Benefits:**
- ✅ Pre-computed embeddings (one-time cost)
- ✅ Native PostgreSQL indexing (milliseconds)
- ✅ Semantic understanding without LLM calls
- ✅ Scalable to millions of programs
- ✅ Hybrid search (vector + keywords + filters)
- ✅ No rate limits

---

## 📋 Migration Phases

### Phase 1: Database Setup ⚡ (Day 1)
- [ ] Choose PostgreSQL provider (Supabase/Neon/Railway/local)
- [ ] Install pgVector extension
- [ ] Create programs table schema
- [ ] Set up vector indexes
- [ ] Add connection pooling

**Files to create:**
- `prisma/schema.prisma` (if using Prisma)
- `db/migrations/001_create_programs_table.sql`
- `db/migrations/002_enable_pgvector.sql`
- `.env` updates for `DATABASE_URL`

---

### Phase 2: Data Migration 📦 (Day 1-2)

**Step 1: Generate Embeddings**
- Load 883KB JSON file (one-time)
- Generate embeddings for ~1,000-2,000 programs
- Use Groq or OpenAI embeddings API
- Batch process to save API costs

**Step 2: Populate Database**
- Insert programs with embeddings into PostgreSQL
- Create indexes for:
  - Vector similarity (HNSW or IVFFlat)
  - Institution code (for island filtering)
  - Degree level
  - CIP codes
  - Full-text search on program names

**Files to create:**
- `scripts/generate-embeddings.ts` - Generate embeddings for all programs
- `scripts/populate-pgvector.ts` - Insert data into PostgreSQL
- `scripts/verify-migration.ts` - Verify data integrity

**Estimated cost:**
- Groq embeddings: FREE (using llama-3-70b for embeddings)
- OpenAI embeddings: ~$0.10 for 2,000 programs (text-embedding-3-small)

---

### Phase 3: New Search Implementation 🔍 (Day 2-3)

**Create new pgVector search service:**
- Replace current `semantic-program-search.ts`
- Keep same interface for backward compatibility
- Add hybrid search (vector + keyword + filters)

**Files to create/modify:**
- `src/app/lib/tools/pgvector-search.ts` - New vector search implementation
- `src/app/lib/db/pgvector-client.ts` - PostgreSQL connection wrapper
- `src/app/lib/tools/embedding-service.ts` - Embedding generation service

**Search Strategy:**
```typescript
async semanticSearch(query: string, island?: string) {
  // 1. Generate query embedding (cache this!)
  const embedding = await this.getQueryEmbedding(query);
  
  // 2. Vector similarity search with filters
  const results = await db.execute(`
    SELECT 
      id,
      program_desc,
      cip_code,
      degree_level,
      iro_institution,
      1 - (embedding <=> $1) as similarity
    FROM programs
    WHERE 
      ($2 IS NULL OR iro_institution = ANY($2))
    ORDER BY embedding <=> $1
    LIMIT 50
  `, [embedding, islandInstitutions]);
  
  // 3. Optional: Quick LLM rerank top 10
  // Only if needed for complex queries
  
  return results;
}
```

---

### Phase 4: Parallel Testing 🧪 (Day 3-4)

**A/B comparison:**
- Run both old and new implementations
- Compare results quality
- Compare speed
- Log differences

**Files to create:**
- `src/app/lib/tools/search-comparison.ts` - Compare old vs new
- `tests/semantic-search-comparison.test.ts` - Automated tests

**Metrics to track:**
- Response time (old vs new)
- Result relevance (user feedback)
- Cache hit rate
- API cost savings

---

### Phase 5: Gradual Rollout 🚢 (Day 4-5)

**Feature flag approach:**
```typescript
// .env
USE_PGVECTOR_SEARCH=true  // Enable new search

// Code
const searchService = process.env.USE_PGVECTOR_SEARCH === 'true'
  ? getPgVectorSearch()
  : getSemanticProgramSearch(); // Fallback
```

**Rollout plan:**
1. 10% of traffic → Monitor for issues
2. 50% of traffic → Validate quality
3. 100% of traffic → Full migration
4. Remove old implementation after 2 weeks

---

## 🗄️ Database Schema

```sql
-- Enable pgVector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Programs table
CREATE TABLE programs (
  id SERIAL PRIMARY KEY,
  
  -- Core program info
  iro_institution VARCHAR(50) NOT NULL,
  program VARCHAR(255) NOT NULL,
  program_desc TEXT NOT NULL,
  degree_level VARCHAR(50),
  cip_code VARCHAR(20),
  
  -- Vector embedding (1536 dimensions for OpenAI, 768 for Groq)
  embedding vector(1536),
  
  -- Metadata for filtering
  campus VARCHAR(100),
  island VARCHAR(50),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Indexes
  CONSTRAINT unique_program UNIQUE (iro_institution, program, cip_code)
);

-- Vector similarity index (HNSW is faster for queries)
CREATE INDEX programs_embedding_idx ON programs 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Alternative: IVFFlat (faster inserts, good for large datasets)
-- CREATE INDEX programs_embedding_idx ON programs 
-- USING ivfflat (embedding vector_cosine_ops)
-- WITH (lists = 100);

-- Keyword search indexes
CREATE INDEX programs_institution_idx ON programs (iro_institution);
CREATE INDEX programs_degree_idx ON programs (degree_level);
CREATE INDEX programs_cip_idx ON programs (cip_code);
CREATE INDEX programs_island_idx ON programs (island);

-- Full-text search index
CREATE INDEX programs_fulltext_idx ON programs 
USING gin(to_tsvector('english', program_desc || ' ' || program));
```

---

## 📦 Required Dependencies

```json
{
  "dependencies": {
    "pg": "^8.11.0",                    // PostgreSQL client
    "@neondatabase/serverless": "^0.9.0", // If using Neon
    "openai": "^4.20.0",                // For embeddings (optional)
    "zod": "^3.22.0"                    // Already installed
  },
  "devDependencies": {
    "@types/pg": "^8.10.0"
  }
}
```

---

## 🔧 Configuration

### .env additions:
```bash
# PostgreSQL Connection
DATABASE_URL="postgresql://user:password@host:5432/dbname"
PGVECTOR_POOL_SIZE=10

# Embeddings (choose one)
OPENAI_API_KEY=""           # For OpenAI embeddings
# OR use Groq (already have GROQ_API_KEY)

# Feature flags
USE_PGVECTOR_SEARCH=false   # Enable when ready
CACHE_EMBEDDINGS=true       # Cache query embeddings
```

---

## 💰 Cost Comparison

### Current (JSONL + LLM):
- LLM Intent Extraction: 1 call per query (~$0.0001)
- LLM Ranking: 10-20 calls per query (~$0.001-0.002)
- **Cost per 1,000 queries: ~$1.50-2.50**
- **Time: 60s per query**

### New (pgVector):
- Embedding generation: 1 call per query (~$0.00001)
- Vector search: FREE (database query)
- Optional LLM rerank: 1 call only if needed (~$0.0001)
- **Cost per 1,000 queries: ~$0.02-0.15 (95% savings!)**
- **Time: 2-5s per query (12-30x faster)**

---

## 🎯 Success Metrics

**Performance:**
- ✅ Query response time: < 5 seconds (from 60s)
- ✅ 95th percentile: < 10 seconds
- ✅ Cache hit rate: > 70%

**Quality:**
- ✅ Result relevance: Same or better than current
- ✅ False positive rate: < 5%
- ✅ User satisfaction: Measure via feedback

**Cost:**
- ✅ API costs reduced by 90%+
- ✅ Infrastructure costs < $20/month

---

## 🚨 Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Different results than LLM | High | Parallel testing phase, gradual rollout |
| Embedding quality issues | Medium | Test multiple embedding models |
| Database costs | Low | Start with Neon free tier, monitor usage |
| Migration downtime | Medium | Keep old system as fallback |
| Vector index performance | Medium | Benchmark HNSW vs IVFFlat indexes |

---

## 📅 Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| 1. Database Setup | 4-8 hours | ⏳ Not Started |
| 2. Data Migration | 8-12 hours | ⏳ Not Started |
| 3. New Implementation | 12-16 hours | ⏳ Not Started |
| 4. Testing | 8-12 hours | ⏳ Not Started |
| 5. Rollout | 4-8 hours | ⏳ Not Started |
| **Total** | **3-5 days** | |

---

## 🎓 Database Provider Recommendations

### Option 1: Neon (Recommended) ✅
- **Pros:** Free tier, serverless, auto-scaling, pgVector support
- **Cons:** None for this use case
- **Cost:** $0 for < 500k rows, then $19/month
- **Setup:** 5 minutes

### Option 2: Supabase
- **Pros:** Free tier, built-in auth, realtime, dashboard
- **Cons:** Slightly slower for pure vector search
- **Cost:** $0 for small projects
- **Setup:** 10 minutes

### Option 3: Railway
- **Pros:** Easy deploy, good DX, auto-backups
- **Cons:** No free tier ($5/month minimum)
- **Cost:** ~$5-10/month
- **Setup:** 5 minutes

### Option 4: Local PostgreSQL
- **Pros:** Free, full control, fastest for development
- **Cons:** Need to manage hosting for production
- **Cost:** $0 (dev), varies (prod)
- **Setup:** 30 minutes

**Recommendation:** Start with **Neon** for quick setup and free tier.

---

## 🚀 Next Steps

1. **Choose database provider** → I recommend Neon
2. **Create database and enable pgVector**
3. **Run migration scripts** (I'll create these)
4. **Test and compare results**
5. **Gradual rollout with feature flag**

Ready to proceed? Let me know which database provider you prefer!
