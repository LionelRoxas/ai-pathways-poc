/**
 * CONVERSATION CONTEXT FILTERING UTILITY
 * 
 * Filters conversation history to keep only recent, relevant messages.
 * This prevents old unrelated topics from polluting search results.
 * 
 * Strategy:
 * 1. Always keep last 3 messages (most recent context)
 * 2. Filter out older messages that mention unrelated topics
 * 3. Detect topic shifts by looking for new field mentions
 * 
 * Example:
 * - User discusses nursing (messages 1-10)
 * - User pivots to computer science (messages 11-15)
 * - Filter keeps messages 11-15 only, drops 1-10
 */

export function filterRelevantConversation(
  conversationHistory: Array<{ role: string; content: string }>,
  currentQuery: string,
  maxMessages: number = 5
): Array<{ role: string; content: string }> {
  if (!conversationHistory || conversationHistory.length === 0) {
    return [];
  }

  // Always keep the most recent messages
  const recentCount = Math.min(3, conversationHistory.length);
  const recentMessages = conversationHistory.slice(-recentCount);
  
  // If we have 3 or fewer messages total, return all
  if (conversationHistory.length <= 3) {
    return conversationHistory;
  }

  // Extract key topics from recent messages (last 3)
  const recentTopics = new Set<string>();
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

  recentMessages.forEach(msg => {
    topicPatterns.forEach((pattern, idx) => {
      if (pattern.test(msg.content)) {
        recentTopics.add(idx.toString());
      }
    });
  });

  // If no specific topics detected in recent messages, return just recent
  if (recentTopics.size === 0) {
    return recentMessages;
  }

  // Filter older messages: keep only those mentioning the same topics
  const olderMessages = conversationHistory.slice(0, -recentCount);
  const relevantOlder = olderMessages.filter(msg => {
    // Check if this message mentions any of the recent topics
    return Array.from(recentTopics).some(topicIdx => {
      const pattern = topicPatterns[parseInt(topicIdx)];
      return pattern.test(msg.content);
    });
  });

  // Take only the most recent relevant older messages
  const maxOlderMessages = maxMessages - recentCount;
  const filteredOlder = relevantOlder.slice(-maxOlderMessages);

  console.log(`[ConversationFilter] 🔍 Filtered ${conversationHistory.length} → ${filteredOlder.length + recentCount} messages`);
  if (filteredOlder.length < olderMessages.length) {
    console.log(`[ConversationFilter] 🧹 Removed ${olderMessages.length - filteredOlder.length} unrelated older messages`);
  }

  return [...filteredOlder, ...recentMessages];
}
