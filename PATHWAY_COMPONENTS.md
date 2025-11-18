# Pathway Planning Components - Documentation

## Overview
Clean, enterprise-style educational pathway visualization using enhanced Markdown with smart styling based on emojis and content patterns.

## Architecture

### 1. **PathwayPlanningAgent** (`src/app/lib/agents/pathway-planning-agent.ts`)
- **Model**: OpenAI GPT-OSS 120B (complex reasoning)
- **Temperature**: 0.7 (creative, personalized)
- **Purpose**: Generate personalized educational pathways in Markdown format

### 2. **PathwayPlan Component** (`src/app/components/AIPathwaysChat/PathwayPlan.tsx`)
- React component that displays the pathway
- Summary cards showing: Current Stage, Timeframe, Path, Milestones
- ReactMarkdown rendering with custom components
- Loading and error states

### 3. **PathwayMDXComponents** (`src/app/components/AIPathwaysChat/PathwayMDXComponents.tsx`)
- Enhanced Markdown styling with smart pattern detection
- No JSX components needed - pure Markdown!
- Visual clarity through emojis and structured formatting

## Markdown Format & Styling

### Emoji-Based Smart Styling

The components automatically detect emojis and apply special styling:

#### 🎯 **Goals** (Blue highlight)
```markdown
**🎯 Goal:** Your objective here
```
→ Renders in blue box with border accent

#### ⏱️ **Duration** (Gray badge)
```markdown
**⏱️ Duration:** 6-12 months
```
→ Renders as subtle gray badge

#### ✓ **Action Items** (Checkmark cards)
```markdown
- ✓ Complete this specific task
- ✓ Another actionable item
```
→ Renders as card with checkmark icon

#### 💡 **Pro Tips** (Amber insight box)
```markdown
**💡 Pro Tip:** Helpful advice here
```
→ Renders in amber/yellow box with lightbulb icon

#### 🎓 **Key Milestones** (Green achievement box)
```markdown
**🎓 Key Milestone:** Major achievement description
```
→ Renders in green box for celebrations

### Standard Formatting

#### Phase Headers (with timeline dot)
```markdown
### Phase 1: Short-Term (6-12 months)
```
→ Auto-detects "Phase" and adds timeline dot indicator

#### Program Names (highlighted)
```markdown
**[Program Name]** at **[School Name]**
```
→ Bold text with gray background highlight

#### Horizontal Rules (styled separators)
```markdown
---
```
→ Renders with arrow icon and gradient lines

## Example Pathway Structure

```markdown
## Your Educational Pathway

Brief introduction about the student's journey (2-3 sentences).

## Current Position

Assessment of where they are now.

## Your Educational Pathway

### Phase 1: Short-Term (Next 6-12 months)
**🎯 Goal:** Explore programs and prepare applications
**⏱️ Duration:** 6-12 months

**Action Steps:**
- ✓ Research community colleges in your area
- ✓ Schedule campus tours at 3 schools
- ✓ Meet with guidance counselor

**Programs to Consider:**
- **Health Sciences Program** at **Kapiolani Community College** - 2-year Associate degree, downtown Honolulu

**💡 Pro Tip:** Start with general education courses while exploring your interests.

---

### Phase 2: Medium-Term (1-2 years)
**🎯 Goal:** Complete foundational courses
**⏱️ Duration:** 1-2 years

[Similar structure...]

---

### Phase 3: Long-Term (2-4 years)
**🎯 Goal:** Career preparation
**⏱️ Duration:** 2-4 years

[Similar structure...]

**🎓 Key Milestone:** Earn your degree and enter the workforce!

---

## Career Outlook in Hawaii

**Healthcare Professional**
- 💰 **Average Salary:** $45,000 - $65,000
- 📈 **Job Growth:** Strong demand
- 📍 **Where:** Hospitals across all islands

Description of career opportunities in Hawaii.

## 🚀 Ready to Start?

Here are your immediate next steps:

1. **This Week:** Specific action
2. **This Month:** Another action
3. **This Quarter:** Longer-term action

**Remember:** Encouraging message!
```

## Visual Design

### Color Palette
- **Blue** (`blue-50`, `blue-500`) - Goals and objectives
- **Gray** (`gray-50`, `gray-200`) - Duration badges, neutral elements
- **Green** (`green-50`, `green-500`) - Milestones and achievements
- **Amber** (`amber-50`, `amber-500`) - Tips and insights
- **Purple** (`purple-50`, `purple-400`) - Important notes (blockquotes)
- **Black** - Headers, emphasis, primary text

### Typography
- **Headers**: Bold, black text with bottom borders
- **Body**: `text-sm` (14px) with relaxed leading
- **Emphasis**: Bold + background highlight for programs
- **Action Items**: Medium weight in cards

### Layout
- **Phase indicators**: Timeline dots on the left
- **Cards**: Rounded corners, subtle borders, hover effects
- **Spacing**: Generous whitespace between sections
- **Grid**: 2-column summary cards at top

## API Integration

### Endpoint
```typescript
POST /api/pathway-plan
```

### Request Body
```typescript
{
  userProfile: {
    educationLevel: string | null;
    interests: string[];
    careerGoals: string[];
    location: string | null;
  },
  conversationContext: string,
  programsFound: any[],
  socCodes: string[]
}
```

### Response
```typescript
{
  markdown: string,
  summary: {
    currentStage: string,
    recommendedPath: string,
    timeframe: string,
    keyMilestones: number
  }
}
```

## Navigation Integration

Pathway is now a **top-level navigation option** in DataPanel:

```
┌─────────────────────────────────────┐
│  Summary | Detailed Data | Pathway  │
├─────────────────────────────────────┤
│  [Active View Content]              │
└─────────────────────────────────────┘
```

## Benefits

✅ **No JSX Components** - Pure Markdown, no parsing issues
✅ **Smart Styling** - Emoji-based pattern detection
✅ **Clean Design** - Enterprise-style, professional look
✅ **Responsive** - Works in 384px sidebar
✅ **Accessible** - Clear hierarchy and semantic HTML
✅ **Maintainable** - Simple Markdown format, easy to extend

## Future Enhancements

- [ ] Add print-friendly CSS
- [ ] Export pathway as PDF
- [ ] Save/load custom pathways
- [ ] Share pathway via link
- [ ] Progress tracking (mark steps complete)
- [ ] Notifications for milestone deadlines
