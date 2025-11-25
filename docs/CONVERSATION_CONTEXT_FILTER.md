# Conversation Context Filtering Implementation

## Problem Summary

When users discuss multiple topics across a conversation, old unrelated topics contaminate search results:

### Example Issue
1. User discusses **nursing** (messages 1-10)
2. User pivots to **marine biology** (messages 11-20)  
3. User searches for programs on **"Oahu"** (message 21)
4. ❌ System returns **Hawaiian Studies** because:
   - pgVector search uses ALL conversation history (1-21)
   - Old nursing context + new marine biology profile → confused search
   - Hawaiian Studies matches because it mentions "ocean" and "culture"

## Root Cause

**No conversation filtering** - all messages treated equally:
- Message 1 (nursing from 30 minutes ago) = Message 20 (marine biology current)
- Search gets polluted by multiple unrelated topics
- pgVector similarity scores get diluted
- CIP verifier sees cultural connection and approves wrong programs

## Solution: Topic-Aware Conversation Filtering

### Strategy

**Prioritize Recent Context, Filter Unrelated History**

1. **Always keep last 3 messages** (most recent context)
2. **Detect topics in recent messages** using pattern matching
3. **Filter older messages** - keep only those mentioning same topics
4. **Limit to 5 total messages** (3 recent + 2 relevant older)

### Topic Detection Patterns

```typescript
const topicPatterns = [
  /\b(nursing|nurse|RN|BSN|healthcare|medical|clinical)\b/gi,
  /\b(computer science|CS|programming|software|IT|tech|data science)\b/gi,
  /\b(business|management|marketing|finance|accounting)\b/gi,
  /\b(engineering|engineer)\b/gi,
  /\b(education|teaching|teacher)\b/gi,
  /\b(tourism|hospitality|hotel|culinary)\b/gi,
  /\b(marine biology|ocean|environmental|conservation)\b/gi,
  /\b(hawaiian studies|hawaiian culture|indigenous)\b/gi,
  /\b(liberal arts|humanities|social science)\b/gi,
];
```

### Implementation

**Created: `src/app/lib/helpers/conversation-filter.ts`**

```typescript
export function filterRelevantConversation(
  conversationHistory: Array<{ role: string; content: string }>,
  currentQuery: string,
  maxMessages: number = 5
): Array<{ role: string; content: string }>
```

**Modified Files:**

1. **`src/app/lib/agents/langgraph-style-orchestrator.ts`**
   - Import `filterRelevantConversation` utility
   - Filter before extracting affirmative context (line ~332)
   
2. **`src/app/lib/agents/orchestrator-agents.ts`**
   - Filter before building conversation context for search tracer (line ~655)

### How It Works

**Before (No Filtering):**
```
Messages 1-20: Nursing discussion
Messages 21-30: Marine biology discussion
Query: "oahu"

Conversation context passed to search:
- All 30 messages
- Topics: nursing + marine biology + cultural mentions
- pgVector confused by mixed signals
- Result: Hawaiian Studies (has ocean + culture)
```

**After (With Filtering):**
```
Messages 1-20: Nursing discussion [FILTERED OUT]
Messages 21-30: Marine biology discussion
Query: "oahu"

Conversation context passed to search:
- Last 5 messages (all marine biology)
- Topics: marine biology, conservation
- pgVector focuses on marine sciences
- Result: Marine Biology programs ✓
```

### Debug Logging

Added detailed logging to track filtering:

```
[ConversationFilter] 🔍 Filtered 30 → 5 messages
[ConversationFilter] 🧹 Removed 25 unrelated older messages
```

This shows:
- Total messages in history
- How many kept (recent + relevant)
- How many unrelated messages removed

## Expected Results

### Test Case 1: Topic Pivot (Nursing → Marine Biology)

**Conversation:**
1. User: "I'm interested in nursing"
2. Agent: "Here are nursing programs..."
3. User: "What about marine biology?"
4. Agent: "Here are marine biology programs..."
5. User: "oahu" (location clarification)

**Before Filtering:**
- Context: "nursing" + "marine biology" → confused
- Result: Hawaiian Studies (has ocean/culture mentions) ❌

**After Filtering:**
- Context: Messages 3-5 only (marine biology)
- Result: Marine Biology programs on Oahu ✓

### Test Case 2: Multiple Topic Shifts

**Conversation:**
1-10: Tourism discussion
11-20: Computer Science discussion  
21-30: Nursing discussion
31: "oahu"

**Before:**
- Context: All 31 messages
- Topics: tourism + CS + nursing
- Result: Liberal Arts (too broad) ❌

**After:**
- Context: Messages 29-31 only (nursing)
- Result: Nursing programs on Oahu ✓

### Test Case 3: Short Conversation (≤3 messages)

**Conversation:**
1. User: "computer science"
2. Agent: "Here are CS programs..."
3. User: "yes"

**Filtering:** NO-OP (keeps all 3 messages)
- Too few messages to filter
- All context relevant

## Performance Impact

- **No API calls added** - filtering is local pattern matching
- **Negligible overhead** - simple array operations
- **Faster searches** - less context = faster pgVector embedding
- **Better results** - focused context = more accurate matches

## Edge Cases Handled

1. **Empty conversation** → Returns empty array
2. **Very short conversation (≤3 messages)** → Returns all messages
3. **No topic patterns match** → Returns last 3 messages only
4. **Multiple topics in recent messages** → Keeps all related older messages

## Configuration

Default settings (can be adjusted if needed):

```typescript
const recentCount = 3;  // Always keep last 3 messages
const maxMessages = 5;   // Total messages to keep
```

To make filtering more/less aggressive:
- **More aggressive**: Lower `maxMessages` to 3 (recent only)
- **Less aggressive**: Raise `maxMessages` to 7-10

## Rollback Plan

If issues arise, remove filter calls:

```typescript
// In langgraph-style-orchestrator.ts (line ~332)
const recentMessages = state.conversationHistory.slice(-3); // Remove filter

// In orchestrator-agents.ts (line ~655)
const recentMessages = conversationHistory.slice(-3); // Remove filter
```

## Monitoring

Watch for these patterns in logs:

**Good filtering (working correctly):**
```
[ConversationFilter] 🔍 Filtered 20 → 5 messages
[ConversationFilter] 🧹 Removed 15 unrelated older messages
[DirectSearchTracer] Found 10 marine biology programs
```

**No filtering needed (short conversation):**
```
[ConversationFilter] 🔍 Filtered 3 → 3 messages
[DirectSearchTracer] Found 10 nursing programs
```

**Problem indicator (if filtering not working):**
```
[DirectSearchTracer] Found 100 programs (too many)
[CIPVerifier] Found 5 unrelated CIP codes
[VectorVerifier] Threshold too low, getting irrelevant programs
```

## Status

- ✅ **Implemented**: Conversation filter utility created
- ✅ **Integrated**: Applied to both orchestrators
- ✅ **Deployed**: Server restarted with changes
- ⏳ **Testing needed**: Try queries with topic pivots
- 📊 **Monitor**: Check logs for filtering behavior

## Testing Strategy

1. **Start new conversation**: Discuss nursing
2. **Wait/Continue**: Have 10+ nursing messages
3. **Pivot topic**: Ask about "marine biology"
4. **Continue**: Discuss marine biology (5+ messages)
5. **Location query**: Ask "oahu" (should filter out nursing)
6. **Verify**: Should see marine biology programs, not Hawaiian Studies
7. **Check logs**: Should see "[ConversationFilter] 🧹 Removed X unrelated older messages"

---

**Version:** 1.0  
**Date:** 2024-11-24  
**Feature:** Conversation Context Filtering  
**Impact:** Prevents topic pollution in search results
