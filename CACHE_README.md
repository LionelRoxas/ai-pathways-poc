# Cache System Documentation

## Overview

The application uses **Upstash Redis** for intelligent caching of pathway queries and JSONL data to improve performance and reduce redundant processing.

## Features

✅ **Smart Query Caching** - Caches pathway search results based on query + profile  
✅ **Cache Warmup** - Pre-loads popular queries on startup  
✅ **Tag-based Invalidation** - Clear related caches when data updates  
✅ **Hit Tracking** - Monitors cache effectiveness  
✅ **Profile-aware** - Separate caches for different user profiles  

## How It Works

### 1. Pathway API Caching (`/api/pathway`)

When a user searches for pathways:
1. **Cache Key Generation**: Creates unique key from query + profile
2. **Cache Check**: Looks for existing result
3. **Cache Hit**: Returns cached data instantly (< 50ms)
4. **Cache Miss**: Processes query, caches result for 1 hour

**Cache Key Format:**
```
cache:v1:profile:{hash}:/api/pathway:{"message":"engineering","profileInterests":"technology"}
```

### 2. Cache Warmup (`/api/cache-warmup`)

Pre-loads popular queries to ensure fast first responses:

**Popular Queries:**
- computer science
- nursing
- business
- engineering
- healthcare
- technology
- culinary
- automotive
- construction

**Usage:**
```bash
# Warmup popular queries only
POST /api/cache-warmup
{ "type": "popular" }

# Warmup all programs
POST /api/cache-warmup
{ "type": "programs" }

# Warmup everything
POST /api/cache-warmup
{ "type": "all" }
```

### 3. Cache Statistics (`/api/cache-stats`)

Monitor cache performance:
- Total cache entries
- Popular endpoints
- Popular queries
- Cache hit rates

## Environment Variables

Required in `.env.local`:

```bash
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# Optional: Disable caching for testing
DISABLE_CACHE=true
```

## Cache Service API

### Get Cache Key
```typescript
import { CacheService } from "@/app/lib/cache/cache-service";

const cache = CacheService.getInstance();

const cacheKey = cache.generateCacheKey(
  "/api/pathway",
  { message: "engineering" },
  userProfile?.profileSummary
);
```

### Get from Cache
```typescript
const cached = await cache.get(cacheKey);
if (cached) {
  return cached; // Cache hit!
}
```

### Set Cache
```typescript
await cache.set(
  cacheKey,
  result,
  {
    ttl: 3600, // 1 hour
    tags: ["pathway", "search"],
  },
  {
    // Metadata
    query: "engineering",
    resultCount: 25,
  }
);
```

### Invalidate by Tags
```typescript
// Clear all pathway-related caches
await cache.invalidateByTags(["pathway"]);

// Clear search-specific caches
await cache.invalidateByTags(["search"]);
```

## Cache Strategy

### TTL (Time To Live)

| Data Type | TTL | Reason |
|-----------|-----|--------|
| Pathway Results | 1 hour | User queries change frequently |
| Program Data | 2 hours | Static data, updated monthly |
| Popular Queries | 2 hours | Warmup cache, refresh periodically |

### When to Invalidate

❌ **Don't invalidate** on every user query  
✅ **Do invalidate** when:
- JSONL data files are updated
- New programs are added
- Program details change

## Performance Metrics

**Without Cache:**
- Average query time: 2-5 seconds
- Database reads: 10-20 JSONL files
- LLM calls: 3-5 per query

**With Cache:**
- Average query time: < 100ms
- Database reads: 0
- LLM calls: 0

**Expected Cache Hit Rate:** 60-80% for typical users

## Testing Cache

### Manual Test
```bash
# 1. Clear cache
curl -X POST http://localhost:3000/api/cache-invalidate \
  -H "Content-Type: application/json" \
  -d '{"tags": ["pathway"]}'

# 2. Run query (cache miss - slow)
curl -X POST http://localhost:3000/api/pathway \
  -H "Content-Type: application/json" \
  -d '{"message": "computer science programs"}'

# 3. Run same query again (cache hit - fast)
curl -X POST http://localhost:3000/api/pathway \
  -H "Content-Type: application/json" \
  -d '{"message": "computer science programs"}'

# 4. Check stats
curl http://localhost:3000/api/cache-stats
```

### Automated Warmup
```bash
# Run warmup script
npx ts-node scripts/warmup-cache.ts

# Or call API directly
curl -X POST http://localhost:3000/api/cache-warmup \
  -H "Content-Type: application/json" \
  -d '{"type": "all"}'
```

## Monitoring

### Check Cache Health
```bash
GET /api/cache-stats
```

Response:
```json
{
  "totalCacheEntries": 150,
  "popularEndpoints": [
    ["/api/pathway", 45],
    ["/api/search", 23]
  ],
  "popularQueries": [
    ["computer science", 12],
    ["nursing", 8]
  ],
  "cacheVersion": "v1"
}
```

### Cache Logs

Look for these console logs:
```
[Pathway API] ✅ Cache hit for query: "engineering"
[Pathway API] 🔄 Cache miss, processing query...
[Pathway API] 💾 Cached result for future queries
```

## Best Practices

1. **Warmup on Deploy** - Run cache warmup after deploying new code
2. **Monitor Hit Rate** - Check cache stats regularly
3. **Version Control** - Increment cache version when data schema changes
4. **Profile Awareness** - Cache separately for different user profiles
5. **Tag Organization** - Use consistent tags for easy invalidation

## Troubleshooting

### Cache Not Working
1. Check Redis credentials in `.env.local`
2. Verify `DISABLE_CACHE` is not set to `true`
3. Check console for cache-related errors

### Low Hit Rate
1. Run cache warmup: `POST /api/cache-warmup`
2. Check if TTL is too short
3. Verify cache keys are consistent

### Stale Data
1. Invalidate caches: `POST /api/cache-invalidate`
2. Lower TTL for frequently changing data
3. Increment cache version

## Future Enhancements

- [ ] Semantic cache for similar queries
- [ ] Automatic cache warmup on schedule
- [ ] Cache hit rate analytics
- [ ] Redis cluster for higher availability
- [ ] Cache preloading based on user behavior
