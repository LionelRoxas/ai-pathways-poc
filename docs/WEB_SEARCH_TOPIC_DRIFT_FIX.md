# Web Search Topic Drift Fix

## Problem

When using web search after discussing multiple topics in the conversation, the search results would reflect **old conversation topics** instead of the current question.

### Example:
- **Previous conversation**: Discussing nursing programs
- **Current question**: "lets try engineering"
- **Expected results**: Engineering-related web pages
- **Actual results**: Nursing-related web pages ❌

### Root Cause:
1. **Too much context**: Sending last 10 messages included old nursing discussion
2. **Weak prompt**: System prompt didn't prioritize current question over historical context
3. **High temperature**: 0.3 allowed model to "drift" toward older topics

## Solution Applied

### 1. Reduced Context Window
**Before:**
```typescript
conversationContext: newMessages.slice(-10).map(msg => ({
  role: msg.role,
  content: msg.content.slice(0, 500),
}))
```

**After:**
```typescript
// Only pass the last 3 message exchanges (6 messages max)
const recentContext = newMessages.slice(-6).map(msg => ({
  role: msg.role,
  content: msg.content.slice(0, 500),
}));
```

### 2. Strengthened System Prompt
**Before:**
```
"You are a search query optimizer. Given a user's question and conversation context, 
create a focused web search query that captures the key intent. Return ONLY the search 
query, nothing else. Keep it concise (under 15 words)."
```

**After:**
```
"You are a search query optimizer. Focus ONLY on the user's current question. Use the 
conversation context only to add specificity (like location 'Hawaii' or institution 'UH'), 
but never change the core topic. If the user asks about engineering, search for engineering 
- not previous topics. Return ONLY the optimized search query, nothing else. Keep it 
concise (under 15 words)."
```

### 3. Lowered Temperature
**Before:** `temperature: 0.3`  
**After:** `temperature: 0.2`

This makes the model more focused and deterministic, reducing topic drift.

### 4. Updated User Prompt
**Before:**
```
Context:\n${contextSummary}\n\nCurrent question: ${query}\n\nOptimized search query:
```

**After:**
```
Recent conversation:\n${contextSummary}\n\nCurrent question to search for: ${query}\n\nOptimized search query (focusing on current question):
```

## Files Changed

1. **`src/app/components/AIPathwaysChat/UnifiedSleekChat.tsx`**
   - Reduced context from 10 → 6 messages
   - Added comment explaining why

2. **`src/app/api/exa-search/route.ts`**
   - Updated system prompt with explicit instructions
   - Lowered temperature 0.3 → 0.2
   - Updated user prompt phrasing

3. **`EXA_WEB_SEARCH_IMPLEMENTATION.md`**
   - Documented the fix and reasoning
   - Added "Topic Preservation" feature

## Testing

### Test Case 1: Topic Switch
1. Start conversation about nursing
2. Ask several questions about nursing programs
3. Switch topic: "lets try engineering"
4. Enable web search
5. **Expected**: Results about engineering, not nursing
6. **Result**: ✅ Enhanced query focuses on engineering

### Test Case 2: Location Context
1. Ask: "what are the requirements?"
2. Context includes: "University of Hawaii"
3. **Expected**: Query enhanced to "University of Hawaii requirements"
4. **Result**: ✅ Context adds location without changing topic

### Test Case 3: No Context Pollution
1. Have long conversation about nursing (10+ messages)
2. Ask: "show me computer science programs"
3. **Expected**: Only recent 6 messages used, old nursing context ignored
4. **Result**: ✅ Reduced context window prevents old topics

## Verification

Check the console logs when web search runs:

```
[WebSearch] 📝 Using 6 recent messages for context
[EXA] Enhancing query with 6 messages of context
[EXA] Enhanced query: "engineering programs University of Hawaii"
```

**Before fix:** Would show enhanced query like "UH Manoa nursing program requirements" even when asking about engineering

**After fix:** Shows enhanced query matching the current question's topic

## Impact

- **User Experience**: Web search now accurately reflects user's current interest
- **Search Quality**: Results are relevant to the question asked, not previous topics
- **Context Utility**: Context still useful for adding location/institution specificity
- **Performance**: Slightly faster (fewer tokens in context)

## Future Improvements

- [ ] Add topic detection to automatically adjust context window size
- [ ] Show enhanced query in UI (currently console only)
- [ ] Add confidence score for query enhancement
- [ ] Allow manual query editing before search
