# Data Source Flow - Current Implementation

## Overview

Your application now uses **two data sources** depending on the query type and feature flags:

## 📊 Data Sources

### 1. **PostgreSQL Database (pgVector)** 
- Location: Neon PostgreSQL cloud
- Size: 5,094 programs with embeddings
- Usage: Semantic search for complex queries
- Speed: 0.5-3 seconds
- Cost: ~$0.0001 per query

### 2. **JSON File (Legacy)**
- Location: `src/app/lib/data/jsonl/programs_2yr_4yr_noncredit_11_16_2025_cipfilled.json`
- Size: 883 KB (5,094 programs)
- Usage: Simple keyword search & LLM fallback
- Speed: 5-10 seconds (disk load) + search time
- Cost: Free (no API calls for keyword search)

---

## 🔀 Query Flow (Current State)

```
User Query
    |
    v
DirectSearchTracer.traceFromKeywords()
    |
    v
Should use semantic search? ──────────────────┐
    |                                          |
    YES (complex/ambiguous)                    NO (simple/specific)
    |                                          |
    v                                          v
USE_PGVECTOR_SEARCH=true? ────┐         EnhancedProgramTool
    |                         |              |
    YES (current)             NO             v
    |                         |         Load JSON file
    v                         v              |
🚀 PgVectorSearch      🐌 SemanticProgramSearch    v
    |                         |         Fast keyword search
    |                         |              |
    v                         v              v
PostgreSQL DB           Load JSON file    Return results
(0.5-3s)               + LLM ranking      (instant)
                        (60s)
```

---

## 📋 Detailed Breakdown

### Scenario 1: Complex Query + pgVector Enabled ✅ (CURRENT)

**Example:** User asks "I'm interested in computer science"

```typescript
Query: "computer science"
├─ shouldUseSemanticSearch() → TRUE (complex/exploratory)
├─ USE_PGVECTOR_SEARCH=true → Use pgVector
└─ Result: 
   ├─ Source: PostgreSQL database
   ├─ Time: 2.9s
   ├─ Cost: $0.0001
   └─ Quality: 60.8% similarity match
```

**Data Flow:**
1. No JSON file loading ✅
2. Query OpenAI API for embedding (0.5-1.5s)
3. PostgreSQL vector similarity search (0.3-0.5s)
4. Return results from database

**JSON/JSONL used?** ❌ NO

---

### Scenario 2: Simple Query + pgVector Enabled ✅

**Example:** User searches "nursing"

```typescript
Query: "nursing"
├─ shouldUseSemanticSearch() → FALSE (simple specific)
├─ Use EnhancedProgramTool
└─ Result:
   ├─ Source: JSON file (loaded into memory)
   ├─ Time: ~1-2s (first load 5-10s)
   ├─ Cost: $0
   └─ Quality: Exact keyword match
```

**Data Flow:**
1. Load JSON file from disk (if not cached) 📁
2. In-memory keyword search
3. Filter by island if specified
4. Return matches

**JSON/JSONL used?** ✅ YES (for fast keyword search)

---

### Scenario 3: Complex Query + pgVector Disabled ⚠️ (FALLBACK)

**Example:** User asks "show me business programs on Maui"

```typescript
Query: "business programs"
├─ shouldUseSemanticSearch() → TRUE
├─ USE_PGVECTOR_SEARCH=false → Use old semantic search
└─ Result:
   ├─ Source: JSON file + LLM ranking
   ├─ Time: ~60s
   ├─ Cost: $0.001-0.002
   └─ Quality: LLM-ranked results
```

**Data Flow:**
1. Load JSON file from disk 📁 (5-10s)
2. Extract intent via LLM (2-5s)
3. Filter relevant programs (1-2s)
4. Rank 200+ programs in batches via LLM (30-50s)
5. Return top results

**JSON/JSONL used?** ✅ YES (loads entire file every time)

---

## 🎯 Current Configuration

```bash
# .env file
USE_PGVECTOR_SEARCH=true  # ✅ pgVector ENABLED
DATABASE_URL=postgres://... # ✅ Connected to Neon
OPENAI_API_KEY=sk-...      # ✅ For embeddings
```

### What Happens Now:

| Query Type | Data Source | JSON Used? | Speed |
|------------|-------------|------------|-------|
| Complex (semantic) | PostgreSQL pgVector | ❌ NO | 0.5-3s |
| Simple (keyword) | JSON file | ✅ YES | 1-2s |
| High school programs | JSONL files | ✅ YES | <1s |
| CIP mappings | JSON files | ✅ YES | <1s |
| Careers | JSON files | ✅ YES | <1s |

---

## 💡 Optimization Opportunities

### Option 1: Keep Hybrid (Current) ✅
**Pros:**
- Fast semantic search via pgVector
- Fast keyword search via JSON
- Best of both worlds

**Cons:**
- Still loads JSON for keyword searches
- Maintains two data sources

### Option 2: Full pgVector Migration
**Migrate enhanced-program-tool to use pgVector:**

```typescript
// Instead of loading JSON
const programs = this.loadPrograms(); // ❌ Old way

// Use pgVector with exact match
const programs = await pgVectorSearch.keywordSearch(keywords); // ✅ New way
```

**Pros:**
- Single source of truth (database)
- No disk I/O for keyword searches
- Consistent performance

**Cons:**
- Keyword search becomes network call
- Slightly more complex for simple queries

### Option 3: Add Redis Caching
**Cache keyword search results:**

```typescript
// Check Redis cache first
const cached = await redis.get(`keyword:${keywords.join('-')}`);
if (cached) return JSON.parse(cached);

// Otherwise load from JSON or pgVector
```

**Pros:**
- Ultra-fast repeat queries
- Reduces disk I/O
- Can cache pgVector results too

**Cons:**
- Adds complexity
- Cache invalidation needed

---

## 📊 Performance Comparison

### Current Hybrid Approach

| Operation | Data Source | First Call | Cached/Repeat |
|-----------|-------------|------------|---------------|
| Semantic search (complex) | pgVector | 2-3s | 0.5-1s* |
| Keyword search (simple) | JSON | 5-10s | 1-2s** |
| High school lookup | JSONL | 1-2s | <0.5s** |
| CIP mapping | JSON | <1s | <0.1s** |

\* With embedding cache  
\** With in-memory cache

### If Fully Migrated to pgVector

| Operation | Data Source | Time |
|-----------|-------------|------|
| Semantic search | pgVector | 2-3s |
| Keyword search | pgVector | 0.3-0.5s*** |
| High school lookup | JSONL | 1-2s |
| CIP mapping | JSON | <1s |

\*** Network latency to database

---

## 🚀 Recommendation

**Keep the current hybrid approach** for now:

1. ✅ **Semantic queries** → pgVector (fast & accurate)
2. ✅ **Keyword queries** → JSON file (instant after first load)
3. ✅ **Other data** → JSON/JSONL files (working well)

**Why:**
- Best performance for both query types
- Minimal code changes
- Can optimize later if needed

**Future optimization:**
- Add Redis caching for both pgVector and JSON results
- Monitor which queries use which path
- Migrate keyword search to pgVector if JSON loading becomes bottleneck

---

## 📝 Summary

**Do we still use JSON/JSONL files?**

**YES, but strategically:**

1. **College Programs (Semantic Search)**: 
   - ✅ pgVector database (when `USE_PGVECTOR_SEARCH=true`)
   - ❌ No JSON loading for complex queries

2. **College Programs (Keyword Search)**:
   - ✅ JSON file (for simple/specific queries)
   - Loaded once and cached in memory

3. **High School Programs**:
   - ✅ JSONL files (not migrated yet)

4. **CIP Mappings & Careers**:
   - ✅ JSON files (not migrated yet)

**Bottom line:** For semantic search (the 60-second bottleneck), you're now using PostgreSQL and **not loading JSON files**. For other operations, JSON/JSONL files are still used but perform well. 🎯
