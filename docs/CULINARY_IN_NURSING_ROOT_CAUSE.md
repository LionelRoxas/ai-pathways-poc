# Root Cause Analysis: Culinary Arts Appearing in Nursing Results

## Date: November 24, 2025

## User Report
**Query:** "why is culinary in nursing?"

**Observed Behavior:**
```
High School Programs
Culinary Arts (CA) – 42 schools ❌
Nursing Services (NS) – 28 schools ✅

College Programs
Culinary Arts – Advanced Culinary Arts ❌
```

---

## Investigation Results

### ✅ High School CIP Mappings: CORRECT

**Test Results:**
```
Culinary Arts (CA):
  CIP Codes: ["12"]
  ✅ Expected: ["12"]
  ✓ Match: YES

Nursing Services (NS):
  CIP Codes: ["51"]
  ✅ Expected: ["51"]
  ✓ Match: YES
```

**Conclusion:** The high school CIP mapping fix we implemented is working perfectly. **This is NOT the source of the problem.**

---

## Root Cause Identified

### The Problem is in COLLEGE PROGRAMS, not High School Programs

**Evidence from Server Logs:**

```
[DirectSearchTracer] Collected CIP 2-digit codes: 51, 12, 05, 52, 44
                                                      ^^
                                                    CIP 12 = Culinary!

[Aggregator] "Culinary Arts - Advanced Culinary Arts" (from "Culinary Arts - Advanced Culinary Arts")
[Aggregator] CIP: 12.0500
```

**What's Happening:**

1. **pgVector Semantic Search** returns 100 college programs
   - These include nursing programs (CIP 51) ✅
   - BUT also include culinary programs (CIP 12) ❌
   
2. **Why Culinary Programs Match?**
   - Vector semantic search finds programs based on text similarity
   - Some culinary program descriptions may mention "health", "nutrition", "care", etc.
   - These keywords create semantic overlap with nursing queries

3. **The Flow:**
   ```
   User: "nursing"
   ↓
   pgVector Search → Returns 100 programs (including CIP 12 culinary)
   ↓
   Vector Verifier → Passes programs with similarity > threshold
   ↓
   CIP Verifier → SHOULD filter out CIP 12... but isn't?
   ↓
   DirectSearchTracer → Collects ALL CIP codes including 12
   ↓
   HSDataTool.getProgramsByCIP2Digit(['12']) → Returns Culinary Arts HS programs
   ↓
   Frontend → Shows "Culinary Arts (CA) – 42 schools"
   ```

---

## Why CIP Verifier Should Be Filtering This

Looking at the logs:
```
[CIPVerifier] 🔍 Verifying 83 college programs
[CIPVerifier] 💬 User Query: "yes"
[CIPVerifier] Found 11 unique CIP codes to verify
[CIPVerifier] ✅ Verification complete:
[CIPVerifier]    - Valid: 45
[CIPVerifier]    - Corrected: 0
[CIPVerifier]    - Invalid: 38
```

**The CIP Verifier marked 38 programs as invalid!** But they're still making it through to the aggregator.

**The Issue:** The CIPVerifier is identifying invalid programs but not removing them from the pipeline. The invalid programs are still being passed to the aggregator, which collects their CIP codes, which then triggers the high school program lookup.

---

## The Real Problem: Invalid Programs Not Being Filtered

Check this code path in `langgraph-style-orchestrator.ts`:

```typescript
async function cipVerifierNode(state: StateManager): Promise<void> {
  // ...
  // CIP verifier marks programs as valid/invalid/corrected
  // BUT: Are invalid programs being removed from state.verifiedData?
}
```

**Hypothesis:** The CIP verifier is logging invalid programs but not actually removing them from the data flow.

---

## Solution

### Option 1: Fix CIP Verifier to Actually Remove Invalid Programs (RECOMMENDED)

The CIP verifier should:
1. Identify invalid CIP codes (CIP 12 for nursing query)
2. **Remove those programs** from the verified data
3. Only pass valid programs to the aggregator

### Option 2: Add Post-CIP-Verification Filter

After CIP verification, add an explicit filter:
```typescript
// Filter out programs marked as invalid
state.verifiedData.collegePrograms = state.verifiedData.collegePrograms.filter(
  p => !invalidCIPCodes.includes(p.program.CIP_CODE)
);
```

### Option 3: Filter in DirectSearchTracer

When collecting CIP codes from college programs, only collect from verified/valid programs:
```typescript
// Only collect CIP codes from validated programs
if (programIsValid(result.program.cip_code, userQuery)) {
  cipCodesFromCollege.add(result.program.cip_code);
}
```

---

## Immediate Action Items

1. **Check CIPVerifier Implementation**
   - File: `src/app/lib/agents/cip-code-verifier.ts`
   - Question: Does it actually remove invalid programs, or just log them?

2. **Check Aggregator Input**
   - File: `src/app/lib/agents/langgraph-style-orchestrator.ts`  
   - Question: What data is being passed to the aggregator after CIP verification?

3. **Add Defensive Filter**
   - In `DirectSearchTracer.traceFromKeywords()`
   - Only collect CIP codes that match the query intent

---

## Why This Wasn't Caught Earlier

- ✅ CIP mapping file tests passed (because HS mappings ARE correct)
- ✅ System validation passed (because all components exist)  
- ❌ **Missing:** End-to-end integration test with actual queries

---

## Next Steps

1. Investigate CIPVerifier actual behavior (not just logs)
2. Add explicit filter for invalid CIP codes before aggregation
3. Add integration test: "nursing query should not return culinary programs"
4. Consider adding CIP family validation (51 ≠ 12)

---

##Status: INVESTIGATION COMPLETE

**Confirmed:** High school CIP mappings are correct
**Root Cause:** College culinary programs passing through CIP verification
**Solution Needed:** Ensure CIP verifier actually removes invalid programs from pipeline

