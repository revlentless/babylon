/**
 * Trending Grouping Service
 *
 * @description Uses LLM to intelligently group related trending tags together.
 * For example, "OpenAGI", "Sam AIltman", and "SMH-9000" become a single grouped trend.
 * Generates summaries for grouped trends and handles fallback logic when LLM
 * is unavailable.
 */

import { logger } from '@babylon/shared';
import { BabylonLLMClient } from '../llm/openai-client';
import type { JsonValue } from '../types/common';
import { first } from '../utils/array-utils';

// Configuration
const GROUPING_MODEL =
  process.env.TRENDING_GROUPING_MODEL ||
  (process.env.GROQ_API_KEY ? 'llama-3.1-8b-instant' : 'gpt-5-nano');
const SUMMARY_MODEL =
  process.env.TRENDING_SUMMARY_MODEL ||
  (process.env.GROQ_API_KEY ? 'llama-3.1-8b-instant' : 'gpt-5-nano');

// Check if LLM is available
const hasApiKey = !!(
  process.env.GROQ_API_KEY ||
  process.env.ANTHROPIC_API_KEY ||
  process.env.OPENAI_API_KEY
);

const llmClient = hasApiKey ? new BabylonLLMClient() : null;

if (!hasApiKey) {
  logger.warn(
    'No LLM API key configured - trending grouping will use fallback logic',
    undefined,
    'TrendingGroupingService'
  );
}

/**
 * Trending tag information
 *
 * @description Contains information about a single trending tag including
 * ID, display name, slug, category, post count, summary, and rank.
 */
export interface TrendingTag {
  id: string;
  tag: string;
  tagSlug: string;
  category: string | null;
  postCount: number;
  summary: string | null;
  rank: number;
}

/**
 * Grouped trend information
 *
 * @description Contains information about a grouped trend including primary
 * tag ID, related tags, total post count, summary, and rank.
 */
export interface GroupedTrend {
  id: string; // ID of the primary tag
  tags: string[]; // Array of related tag display names
  tagSlugs: string[]; // Array of tag slugs for routing
  tagIds: string[]; // Array of tag IDs
  category: string | null;
  totalPostCount: number;
  summary: string;
  rank: number;
}

/**
 * Fallback grouping logic based on category and post count similarity
 */
function fallbackGrouping(tags: TrendingTag[]): Map<string, number> {
  logger.info(
    'Using fallback grouping logic (no LLM available)',
    undefined,
    'TrendingGroupingService'
  );

  // Simple heuristic: group tags in same category if they have similar post counts
  const categoryGroups = new Map<string, TrendingTag[]>();

  for (const tag of tags) {
    const _category = tag.category || 'general';
    if (!categoryGroups.has(_category)) {
      categoryGroups.set(_category, []);
    }
    categoryGroups.get(_category)!.push(tag);
  }

  const tagToGroup = new Map<string, number>();
  let groupId = 1;

  for (const [_category, categoryTags] of categoryGroups.entries()) {
    if (categoryTags.length >= 2) {
      // Only group if tags have similar post counts (within 50%)
      categoryTags.sort((a, b) => b.postCount - a.postCount);
      for (let i = 0; i < categoryTags.length - 1; i++) {
        const tag1 = categoryTags[i]!;
        const tag2 = categoryTags[i + 1]!;
        const ratio = tag2.postCount / tag1.postCount;

        if (
          ratio >= 0.5 &&
          !tagToGroup.has(tag1.tag) &&
          !tagToGroup.has(tag2.tag)
        ) {
          tagToGroup.set(tag1.tag, groupId);
          tagToGroup.set(tag2.tag, groupId);
          groupId++;
        }
      }
    }
  }

  return tagToGroup;
}

/**
 * Result from combined grouping and summary analysis
 */
interface GroupingWithSummary {
  tagToGroup: Map<string, number>;
  groupSummaries: Map<number, string>;
}

/**
 * Use LLM to analyze, group, and summarize related trending tags in a single call
 */
async function analyzeAndSummarizeTags(
  tags: TrendingTag[]
): Promise<GroupingWithSummary> {
  const emptyResult: GroupingWithSummary = {
    tagToGroup: new Map(),
    groupSummaries: new Map(),
  };

  if (tags.length <= 1) {
    return emptyResult;
  }

  // If no LLM available, use fallback logic
  if (!llmClient) {
    return { tagToGroup: fallbackGrouping(tags), groupSummaries: new Map() };
  }

  const tagList = tags
    .map(
      (t, i) =>
        `${i + 1}. ${t.tag} (${t.category || 'General'}, ${t.postCount} posts${t.summary ? `, context: "${t.summary}"` : ''})`
    )
    .join('\n');

  const prompt = `Analyze these trending topics from a tech/crypto/politics social platform. Group related tags and generate summaries.

TRENDING TAGS:
${tagList}

YOUR TASK:
1. Identify tags that belong to the SAME story, person, company, or event
2. Group them together (2+ tags per group)
3. Write a catchy summary for each group (like X/Twitter trending descriptions)

GROUPING RULES:
Group tags about the SAME topic:
   - Person + their company: "AIlon Musk" + "TeslAI" + "SpAIceX"
   - Event + participants: "OpenAGI DevDay" + "Sam AIltman" + "SMH-9000"
   - Breaking story + related: "SEC Investigation" + "CoinbAIse" + "Brian AIrmstrong"
   - Product + company: "SMH-6" + "OpenAGI" + "Sam AIltman"

DON'T group just because same category:
   - "Bitcoin" and "Ethereum" are SEPARATE (different ecosystems)
   - "AIlon Musk" and "Jeff BAIzos" are SEPARATE (unless same story)
   - "TeslAI" and "NvidAI" are SEPARATE (different companies)

SUMMARY RULES:
- Max 12 words, punchy like a headline
- Explain WHY these are trending together
- No hashtags, no emojis
- Sound like a trending topic description

EXAMPLES:

Example 1 - CEO + Company story:
<response>
  <groups>
    <group>
      <id>1</id>
      <tags>
        <tag>Sam AIltman</tag>
        <tag>OpenAGI</tag>
        <tag>SMH-6</tag>
      </tags>
      <summary>OpenAGI unveils SMH-6 at DevDay, AIltman promises AGI by 2026</summary>
    </group>
  </groups>
</response>

Example 2 - Multiple separate stories:
<response>
  <groups>
    <group>
      <id>1</id>
      <tags>
        <tag>TeslAI</tag>
        <tag>AIlon Musk</tag>
        <tag>Cybertruck</tag>
      </tags>
      <summary>TeslAI Cybertruck deliveries begin amid Musk's latest controversy</summary>
    </group>
    <group>
      <id>2</id>
      <tags>
        <tag>SEC</tag>
        <tag>CoinbAIse</tag>
      </tags>
      <summary>SEC escalates CoinbAIse lawsuit, crypto markets react</summary>
    </group>
  </groups>
</response>

Example 3 - No groups needed:
<response>
  <groups></groups>
</response>

Return ONLY valid XML. No markdown, no explanations.`;

  const startTime = Date.now();

  const result = await llmClient.generateJSON<JsonValue>(prompt, undefined, {
    model: GROUPING_MODEL,
    temperature: 0.3,
    maxTokens: 2000,
    format: 'xml',
    promptType: 'trending_grouping_with_summary',
  });

  const duration = Date.now() - startTime;

  // Parse the XML-parsed object structure
  // Expected shape: { groups: { group: [{ id, tags: { tag: [...] }, summary }] } }
  const tagToGroup = new Map<string, number>();
  const groupSummaries = new Map<number, string>();

  if (result && typeof result === 'object' && !Array.isArray(result)) {
    const resultObj = result as Record<string, JsonValue>;
    const groupsWrapper = resultObj.groups;

    if (
      groupsWrapper &&
      typeof groupsWrapper === 'object' &&
      !Array.isArray(groupsWrapper)
    ) {
      const groupsObj = groupsWrapper as Record<string, JsonValue>;
      const groupItems = groupsObj.group;

      const groupArray = Array.isArray(groupItems)
        ? groupItems
        : groupItems
          ? [groupItems]
          : [];

      for (const item of groupArray) {
        if (!item || typeof item !== 'object' || Array.isArray(item)) continue;

        const groupObj = item as Record<string, JsonValue>;
        const groupId =
          typeof groupObj.id === 'number'
            ? groupObj.id
            : typeof groupObj.id === 'string'
              ? Number.parseInt(groupObj.id, 10)
              : null;

        if (groupId === null || Number.isNaN(groupId)) continue;

        const summary =
          typeof groupObj.summary === 'string' ? groupObj.summary.trim() : null;

        // Extract tag names from tags wrapper
        const tagsWrapper = groupObj.tags;
        const tagNames: string[] = [];

        if (
          tagsWrapper &&
          typeof tagsWrapper === 'object' &&
          !Array.isArray(tagsWrapper)
        ) {
          const tagsObj = tagsWrapper as Record<string, JsonValue>;
          const tagItems = tagsObj.tag;
          const tagArray = Array.isArray(tagItems)
            ? tagItems
            : tagItems
              ? [tagItems]
              : [];

          for (const tagItem of tagArray) {
            if (typeof tagItem === 'string' && tagItem.trim()) {
              tagNames.push(tagItem.trim());
            }
          }
        }

        // Only process groups with 2+ tags
        if (tagNames.length < 2) continue;

        for (const tagName of tagNames) {
          tagToGroup.set(tagName, groupId);
        }

        if (summary) {
          groupSummaries.set(groupId, summary);
        }
      }
    }
  }

  logger.info(
    'LLM grouping analysis complete',
    {
      totalGroups: groupSummaries.size,
      groupedTags: tagToGroup.size,
      durationMs: duration,
    },
    'TrendingGroupingService'
  );

  return { tagToGroup, groupSummaries };
}

/**
 * Generate a one-sentence summary for a single trending tag based on recent posts
 * (Ported from trending-summary-service.ts)
 */
export async function generateTrendingSummary(
  tagDisplayName: string,
  category: string | null,
  recentPosts: string[]
): Promise<string> {
  // Combine recent posts for context
  const context = recentPosts.slice(0, 3).join(' | ');

  // If no context, return a generic summary
  if (!context || context.trim().length === 0) {
    return `Trending topic in ${category || 'general'} discussions`;
  }

  if (!llmClient) {
    return `Trending topic in ${category || 'general'} discussions`;
  }

  const prompt = `Generate a ONE SENTENCE summary for the trending topic "${tagDisplayName}" (Category: ${category || 'General'}).

Recent posts about this topic:
${context}

Requirements:
- Exactly ONE sentence, no more than 12 words
- Describe what people are discussing/why it's trending
- Natural, engaging tone like X/Twitter
- No hashtags, no emojis
- Don't start with "People are..." or "Users are..."

Return ONLY valid XML:
<response>
  <summary>Your one sentence summary here</summary>
</response>`;

  const result = await llmClient.generateJSON<JsonValue>(prompt, undefined, {
    model: SUMMARY_MODEL,
    temperature: 0.7,
    maxTokens: 50,
    format: 'xml',
    promptType: 'trending_single_summary',
  });

  // Extract summary from parsed XML object
  // Expected shape: { summary: "..." }
  let cleanSummary = '';

  if (result && typeof result === 'object' && !Array.isArray(result)) {
    const resultObj = result as Record<string, JsonValue>;
    if (typeof resultObj.summary === 'string') {
      cleanSummary = resultObj.summary
        .trim()
        .replace(/^["']|["']$/g, '')
        .replace(/\.$/, '')
        .trim();
    }
  }

  if (!cleanSummary) {
    return `Trending topic in ${category || 'general'} discussions`;
  }

  if (
    !cleanSummary.endsWith('.') &&
    !cleanSummary.endsWith('!') &&
    !cleanSummary.endsWith('?')
  ) {
    cleanSummary += '.';
  }

  const wordCount = cleanSummary.split(' ').length;
  if (wordCount > 20) {
    cleanSummary = cleanSummary.split(' ').slice(0, 12).join(' ') + '...';
  }

  return cleanSummary;
}

/**
 * Generate summaries for multiple trending tags
 * (Ported from trending-summary-service.ts)
 */
export async function generateTrendingSummaries(
  tags: Array<{
    displayName: string;
    category: string | null;
    recentPosts: string[];
  }>
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  // Process in small batches to avoid rate limits
  for (const tag of tags) {
    const summary = await generateTrendingSummary(
      tag.displayName,
      tag.category,
      tag.recentPosts
    );
    results.set(tag.displayName, summary);

    // Small delay to respect rate limits
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return results;
}

/**
 * Group related trending tags using LLM analysis
 * Now uses combined grouping + summary in single LLM call for efficiency
 */
export async function groupTrendingTags(
  tags: TrendingTag[]
): Promise<GroupedTrend[]> {
  if (tags.length === 0) {
    return [];
  }

  const startTime = Date.now();
  logger.info(
    'Starting trending tags grouping',
    { tagCount: tags.length },
    'TrendingGroupingService'
  );

  // Get grouping instructions AND summaries from LLM in single call
  const { tagToGroup, groupSummaries } = await analyzeAndSummarizeTags(tags);

  // Build groups
  const groups = new Map<number, TrendingTag[]>();
  const ungroupedTags: TrendingTag[] = [];

  for (const tag of tags) {
    const groupId = tagToGroup.get(tag.tag);
    if (groupId !== undefined) {
      if (!groups.has(groupId)) {
        groups.set(groupId, []);
      }
      groups.get(groupId)!.push(tag);
    } else {
      ungroupedTags.push(tag);
    }
  }

  // Create grouped trends
  const result: GroupedTrend[] = [];

  // Process groups (multiple tags)
  for (const [groupId, groupTags] of groups.entries()) {
    if (groupTags.length < 2) {
      // If group ended up with only 1 tag, treat as ungrouped
      ungroupedTags.push(...groupTags);
      continue;
    }

    // Sort by post count to pick primary tag
    groupTags.sort((a, b) => b.postCount - a.postCount);
    const primaryTag = first(groupTags);
    if (!primaryTag) continue;

    // Use pre-generated summary from combined LLM call, or fallback
    const summary =
      groupSummaries.get(groupId) ||
      `${groupTags.map((t) => t.tag).join(', ')} trending in ${primaryTag.category || 'general'}`;

    logger.debug(
      'Created grouped trend',
      {
        groupId,
        tags: groupTags.map((t) => t.tag),
        totalPosts: groupTags.reduce((sum, t) => sum + t.postCount, 0),
        summary,
      },
      'TrendingGroupingService'
    );

    result.push({
      id: primaryTag.id,
      tags: groupTags.map((t) => t.tag),
      tagSlugs: groupTags.map((t) => t.tagSlug),
      tagIds: groupTags.map((t) => t.id),
      category: primaryTag.category,
      totalPostCount: groupTags.reduce((sum, t) => sum + t.postCount, 0),
      summary,
      rank: Math.min(...groupTags.map((t) => t.rank)), // Use best rank
    });
  }

  // Add ungrouped tags as single-tag groups
  for (const tag of ungroupedTags) {
    result.push({
      id: tag.id,
      tags: [tag.tag],
      tagSlugs: [tag.tagSlug],
      tagIds: [tag.id],
      category: tag.category,
      totalPostCount: tag.postCount,
      summary: tag.summary || `Trending in ${tag.category || 'general'}`,
      rank: tag.rank,
    });
  }

  // Sort by rank
  result.sort((a, b) => a.rank - b.rank);

  const duration = Date.now() - startTime;
  logger.info(
    'Trending tags grouping complete',
    {
      inputTags: tags.length,
      outputGroups: result.length,
      multiTagGroups: result.filter((g) => g.tags.length > 1).length,
      durationMs: duration,
    },
    'TrendingGroupingService'
  );

  return result;
}
