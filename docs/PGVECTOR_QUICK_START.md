# pgVector Migration - Quick Start Guide

## 🎯 Quick Overview
Migrate your 60-second semantic search to a 2-5 second pgVector-powered search.

---

## 📋 Prerequisites

- [x] Node.js and npm installed
- [ ] PostgreSQL database with pgVector support
- [ ] OpenAI API key (or use Groq for embeddings)

---

## 🚀 Step-by-Step Setup

### Step 1: Choose a Database Provider (5 minutes)

#### Option A: Neon (Recommended - FREE tier) ✅

1. Go to [Neon Console](https://console.neon.tech)
2. Sign up / Log in
3. Click "Create Project"
4. Name it "ai-pathways"
5. Select region closest to you
6. Copy the connection string
7. Add to `.env`:
   ```bash
   DATABASE_URL="postgresql://user:password@ep-xxx.neon.tech/ai-pathways?sslmode=require"
   ```

#### Option B: Supabase (FREE tier)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create new project
3. Go to Settings → Database
4. Copy connection string (URI mode)
5. Add to `.env`

#### Option C: Local PostgreSQL

```bash
# macOS with Homebrew
brew install postgresql pgvector
brew services start postgresql
createdb ai_pathways

# Add to .env
DATABASE_URL="postgresql://localhost:5432/ai_pathways"
```

---

### Step 2: Install Dependencies (2 minutes)

```bash
# Install required packages
npm install pg @types/pg openai

# Optional: Install database migration tools
npm install -D tsx dotenv-cli
```

---

### Step 3: Run Migrations (2 minutes)

```bash
# Run all migrations with Node.js (no psql required!)
npx tsx scripts/run-migrations.ts

# This will:
# - Enable pgVector extension
# - Create programs table with vector columns
# - Create 11 indexes for fast search
# - Verify the setup
```

---

### Step 4: Generate Embeddings (15-30 minutes, one-time)

```bash
# Add OpenAI key to .env
echo 'OPENAI_API_KEY="sk-..."' >> .env

# Generate embeddings for all programs
npx tsx scripts/generate-embeddings.ts

# This will:
# - Load 883KB of program data
# - Generate embeddings for ~1,000-2,000 programs
# - Save to db/programs_with_embeddings.json
# - Cost: ~$0.05-0.10
# - Time: 15-30 minutes (with rate limiting)
```

**Progress will be saved automatically**, so you can stop and resume anytime.

---

### Step 5: Populate Database (5 minutes)

```bash
# Insert programs with embeddings into PostgreSQL
npx tsx scripts/populate-pgvector.ts

# This will:
# - Read programs_with_embeddings.json
# - Insert into database in batches
# - Map institutions to islands/campuses
# - Create indexes for fast search
```

---

### Step 6: Verify Migration (2 minutes)

```bash
# Test vector search
npx tsx scripts/verify-migration.ts

# This will:
# - Run sample queries
# - Compare old vs new search
# - Show performance metrics
# - Verify result quality
```

---

### Step 7: Enable in Production (5 minutes)

```bash
# Update .env
echo 'USE_PGVECTOR_SEARCH=true' >> .env

# Restart your app
npm run dev
```

---

## 🎉 Done!

Your search should now be **12-30x faster** (from 60s to 2-5s)!

---

## 🔧 Troubleshooting

### "Cannot find module 'pg'"
```bash
npm install pg @types/pg
```

### "pgvector extension not found"
```bash
# Neon/Supabase: Already installed
# Local PostgreSQL:
brew install pgvector
psql $DATABASE_URL -c "CREATE EXTENSION vector;"
```

### "OPENAI_API_KEY not found"
```bash
# Add to .env file
OPENAI_API_KEY="sk-..."
```

### "Database connection failed"
```bash
# Test connection
psql $DATABASE_URL -c "SELECT version();"

# Check .env format
DATABASE_URL="postgresql://user:password@host:5432/dbname"
```

### "Embeddings taking too long"
The script saves progress automatically. You can:
- Stop and resume anytime (Ctrl+C)
- Reduce batch size in script (line 19)
- Use a faster embedding model

---

## 💰 Cost Breakdown

### One-Time Costs:
- **Embedding Generation**: $0.005 (5,094 programs × ~50 tokens × $0.02/1M)
- **Time**: ~2 minutes for embeddings + ~40 seconds for database insert

### Ongoing Costs:
- **Database**: $0/month (Neon/Supabase free tier) or $5-19/month for paid tier
- **Query Embeddings**: $0.0001 per query (vs $0.001-0.002 with LLM ranking)
- **Savings**: ~95% reduction in API costs

---

## 📊 Expected Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Response Time | 60s | 2-5s | 12-30x faster |
| API Cost | $0.001-0.002/query | $0.0001/query | 90% cheaper |
| Result Quality | Good | Same or better | ✅ |
| Scalability | Limited | Millions of programs | ✅ |

---

## 🆘 Need Help?

Check the full migration plan: `PGVECTOR_MIGRATION_PLAN.md`

Common issues:
1. **Database connection**: Verify `DATABASE_URL` is correct
2. **pgVector not found**: Use Neon/Supabase (pre-installed) or install locally
3. **OpenAI API errors**: Check API key, rate limits, billing
4. **Out of memory**: Reduce batch sizes in scripts

---

## 🎓 Next Steps

Once migration is complete:

1. **Monitor Performance**: Add logging to track search times
2. **Optimize Indexes**: Tune HNSW parameters if needed (m, ef_construction)
3. **Add Caching**: Cache query embeddings for common searches
4. **Hybrid Search**: Combine vector + keyword search for best results
5. **Remove Old Code**: Delete old semantic search after 2 weeks

Enjoy your blazing fast search! 🚀
