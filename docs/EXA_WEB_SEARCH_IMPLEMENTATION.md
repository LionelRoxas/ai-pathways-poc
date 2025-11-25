# Exa Web Search Integration

## Overview
Integrated Exa web search functionality with toggle button in the chat interface. Users can enable/disable web search to get relevant web results alongside AI responses.

## Implementation Details

### 1. **UI Components**

#### ChatInput Component (`src/app/components/AIPathwaysChat/ChatInput.tsx`)
- Added `Globe` icon import from lucide-react
- Added `webSearchEnabled` and `setWebSearchEnabled` props
- Added toggle button with Globe icon next to send button
- Toggle appears in both initial state (centered) and normal chat views
- Button styling: Blue when enabled, gray when disabled

#### UnifiedSleekChat Component (`src/app/components/AIPathwaysChat/UnifiedSleekChat.tsx`)
- Added state: `webSearchEnabled` (boolean) and `webSearchResults` (array)
- Passed toggle props to ChatInput component
- **Context-Aware Integration**: Passes last 10 messages to web search API for query enhancement
- Web search executes when toggle is enabled after sending a message
- **Concise Chat Display**: Shows only titles and links in chat (full summaries in DataPanel)
- Auto-opens DataPanel when web search results are available
- Logs query enhancement for debugging

#### DataPanel Component (`src/app/components/AIPathwaysChat/DataPanel.tsx`)
- Added `webSearchResults` prop
- Added **top-level "Web Search" navigation button** (4th main tab, only shown when results exist)
- Web Search is now at the same level as Pathway, Summary, and Careers
- Displays search results with:
  - Clickable titles (open in new tab)
  - Snippet/description
  - Source domain and published date
  - Hover effects for better UX
  - Clean card-based layout

### 2. **Backend API**

#### Exa Search Route (`src/app/api/exa-search/route.ts`)
- POST endpoint that accepts `query`, `numResults` (default: 5), `conversationContext`, and `generateSummary`
- **Two-Stage Process**:
  1. **Query Enhancement**: Uses Groq LLM to enhance search queries based on conversation context
  2. **Content Summarization**: Uses Groq LLM to synthesize Exa results into 1-2 paragraph summaries
- Uses Exa's modern `search()` API with `type: "auto"` (intelligent search method selection)
- Retrieves content from Exa (500 chars max per source, with 2-3 sentence summaries)
- **AI Summary Generation**: Compiles all source content and generates coherent 1-2 paragraph answer
- Returns formatted results with:
  - title
  - url
  - snippet (limited to 300 chars)
  - summary (from Exa)
  - publishedDate
  - author
  - score (relevance score)
  - **summary** (AI-generated synthesis of all sources, 1-2 paragraphs)
  - originalQuery and enhancedQuery (shows query optimization)
- Error handling with proper status codes

### 3. **Data Flow**

```
User types message → Clicks send (with web search enabled)
    ↓
UnifiedSleekChat.handleSend()
    ↓
Pathway/Chat API responds
    ↓
Parallel: Exa search with generateSummary=true
    ↓
Exa API: Query enhancement → Search → Content retrieval → AI summarization
    ↓
    ├─→ Main API call (/api/pathway or /api/profiling-chat)
    └─→ Web Search API call (/api/exa-search)
    ↓
Results + AI Summary returned
    ↓
    ├─→ AI Summary: Appended to assistant message (1-2 paragraphs)
    └─→ Source Details: Passed to DataPanel (Web Search tab)
    ↓
DataPanel opens automatically with full source details
```

### 4. **Features**

✅ **Toggle On/Off**: Globe icon button to enable/disable search
✅ **Context-Aware Search**: Uses **recent** conversation (last 6 messages) to add specificity without changing topic
✅ **Topic Preservation**: System prompt prioritizes current question over old conversation topics
✅ **AI-Generated Summaries**: LLM synthesizes web content into 1-2 paragraph summaries answering user's question
✅ **Dual Display**: 
   - Chat: AI-generated summary (1-2 paragraphs)
   - DataPanel: Full source details with metadata and links
✅ **Top-Level Navigation**: Web Search tab appears at same level as Pathway/Summary/Careers
✅ **Auto-open Panel**: DataPanel automatically opens when web search results are available
✅ **Conditional Display**: Web Search tab only appears when results exist
✅ **Query Enhancement Logging**: Shows how queries are optimized based on context
✅ **Responsive**: Works in both centered (initial) and normal chat layouts
✅ **Error Handling**: Graceful fallback if search fails
✅ **Visual Feedback**: Button color changes based on enabled state

### 5. **Dependencies**

- `exa-js` package version 2.0.9+ (latest, already installed)
- Requires `EXA_API_KEY` environment variable
- Uses modern Exa API (not deprecated `searchAndContents` method)

### 6. **Usage**

1. User clicks the Globe icon button to enable web search
2. Types a question and sends
3. AI response appears with web search results appended
4. DataPanel opens showing formatted search results
5. User can click any result to open in new tab
6. Toggle off to disable web search for subsequent queries

### 7. **Example Output**

**In Chat (AI-Generated Summary):**
```markdown
[AI Response content]

### 🌐 Web Research Summary

The University of Hawaii at Manoa College of Engineering offers six undergraduate programs including Civil, Computer, Electrical, and Mechanical Engineering. Admission requires strong performance in math and science courses, with specific prerequisites including Calculus I (MATH 241) in the first semester. The program requires at least 126 credit hours and is designed to be completed in eight semesters, with ABET accreditation for quality assurance.

*View detailed sources in the Web tab →*
```

**In DataPanel (Full Detail):**
- Card-based layout with hover effects
- Each card shows: 
  - Clickable Title (opens in new tab)
  - 2-3 sentence summary
  - Source domain
  - Published date
- Scrollable if many results

**Query Enhancement Example:**
```
User: "What are the requirements?"
Context: Discussion about nursing programs at UH Manoa
Enhanced Query: "University of Hawaii Manoa nursing program admission requirements"
```

## Testing

To test the feature:
1. Start the dev server: `npm run dev`
2. Open the chat interface
3. Click the Globe icon (should turn blue)
4. Send a message
5. Verify:
   - Web search results appear at end of AI response
   - DataPanel opens to "Web Search" tab
   - Results are properly formatted
   - Links open in new tabs

## Environment Setup

Ensure `.env.local` contains:
```
EXA_API_KEY=your_exa_api_key_here
```

## Key Fix: Topic Drift Prevention

**Problem:** Web search was using old conversation topics when enhancing queries
- Example: After discussing nursing, asking "lets try engineering" would search for nursing-related engineering content

**Solution Applied:**
1. **Reduced context window**: Last 6 messages (3 exchanges) instead of 10
2. **Updated system prompt**: Explicitly instructs to focus on current question only
3. **Lower temperature**: 0.2 instead of 0.3 for more focused query generation
4. **Clear instructions**: "If user asks about engineering, search for engineering - not previous topics"

**Result:** Context now only adds specificity (location, institution) without changing the core topic

## Future Enhancements

- [ ] Add filter options (date range, domain)
- [ ] Show loading state for web search
- [ ] Cache search results
- [ ] Add "Search again" button
- [ ] Show search query used in UI (currently console only)
- [ ] Add result count indicator
