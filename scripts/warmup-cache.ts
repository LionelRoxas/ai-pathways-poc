// scripts/warmup-cache.ts
// Run this script to warm up the cache with popular queries

async function warmupCache() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  
  console.log("🔥 Starting cache warmup...\n");

  try {
    // Warmup popular queries and programs
    const response = await fetch(`${baseUrl}/api/cache-warmup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "all", // Options: "popular", "programs", "all"
      }),
    });

    const result = await response.json();

    if (result.success) {
      console.log(`✅ Cache warmup completed!`);
      console.log(`📊 Warmed ${result.warmedCount} cache entries\n`);
      
      console.log("Results:");
      result.results.forEach((item: { query?: string; type?: string; status: string }) => {
        const status = item.status === "cached" ? "✅" : 
                      item.status === "already_cached" ? "📦" : "❌";
        console.log(`  ${status} ${item.query || item.type}: ${item.status}`);
      });
    } else {
      console.error("❌ Cache warmup failed:", result.message);
    }
  } catch (error) {
    console.error("❌ Error during cache warmup:", error);
  }
}

// Run the warmup
warmupCache();
