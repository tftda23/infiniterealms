import { query } from '../db';
import type { CampaignContent, ContentType, ContentCategory } from '@/types';

// Helper to convert database row to CampaignContent
function rowToContent(row: Record<string, unknown>): CampaignContent {
  return {
    id: row.id as string,
    campaignId: row.campaign_id as string,
    name: row.name as string,
    type: row.type as ContentType,
    content: row.content as string,
    summary: row.summary as string | undefined,
    source: row.source as string | undefined,
    category: row.category as ContentCategory,
    isHidden: row.is_hidden as boolean,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

// Get all content for a campaign
export async function getCampaignContent(campaignId: string): Promise<CampaignContent[]> {
  try {
    const result = await query(
      `SELECT * FROM campaign_content
       WHERE campaign_id = $1
       ORDER BY category, created_at DESC`,
      [campaignId]
    );
    return result.rows.map(rowToContent);
  } catch (error: any) {
    // Table might not exist yet
    if (error?.code === '42P01') {
      console.log('campaign_content table does not exist yet');
      return [];
    }
    throw error;
  }
}

// Get visible content for AI (not hidden)
export async function getVisibleContent(campaignId: string): Promise<CampaignContent[]> {
  try {
    const result = await query(
      `SELECT * FROM campaign_content
       WHERE campaign_id = $1 AND is_hidden = false
       ORDER BY category, created_at DESC`,
      [campaignId]
    );
    return result.rows.map(rowToContent);
  } catch (error: any) {
    // Table might not exist yet
    if (error?.code === '42P01') {
      console.log('campaign_content table does not exist yet');
      return [];
    }
    throw error;
  }
}

// Get content by ID
export async function getContentById(id: string): Promise<CampaignContent | null> {
  const result = await query(
    'SELECT * FROM campaign_content WHERE id = $1',
    [id]
  );
  if (result.rows.length === 0) return null;
  return rowToContent(result.rows[0]);
}

// Create new content
export async function createContent(data: {
  campaignId: string;
  name: string;
  type: ContentType;
  content: string;
  summary?: string;
  source?: string;
  category: ContentCategory;
  isHidden?: boolean;
}): Promise<CampaignContent> {
  const result = await query(
    `INSERT INTO campaign_content
     (campaign_id, name, type, content, summary, source, category, is_hidden)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      data.campaignId,
      data.name,
      data.type,
      data.content,
      data.summary || null,
      data.source || null,
      data.category,
      data.isHidden ?? false,
    ]
  );
  return rowToContent(result.rows[0]);
}

// Update content
export async function updateContent(
  id: string,
  data: Partial<{
    name: string;
    type: ContentType;
    content: string;
    summary: string;
    source: string;
    category: ContentCategory;
    isHidden: boolean;
  }>
): Promise<CampaignContent | null> {
  const updates: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (data.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(data.name);
  }
  if (data.type !== undefined) {
    updates.push(`type = $${paramIndex++}`);
    values.push(data.type);
  }
  if (data.content !== undefined) {
    updates.push(`content = $${paramIndex++}`);
    values.push(data.content);
  }
  if (data.summary !== undefined) {
    updates.push(`summary = $${paramIndex++}`);
    values.push(data.summary);
  }
  if (data.source !== undefined) {
    updates.push(`source = $${paramIndex++}`);
    values.push(data.source);
  }
  if (data.category !== undefined) {
    updates.push(`category = $${paramIndex++}`);
    values.push(data.category);
  }
  if (data.isHidden !== undefined) {
    updates.push(`is_hidden = $${paramIndex++}`);
    values.push(data.isHidden);
  }

  if (updates.length === 0) {
    return getContentById(id);
  }

  updates.push(`updated_at = NOW()`);
  values.push(id);

  const result = await query(
    `UPDATE campaign_content
     SET ${updates.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING *`,
    values
  );

  if (result.rows.length === 0) return null;
  return rowToContent(result.rows[0]);
}

// Toggle visibility
export async function toggleContentVisibility(id: string): Promise<CampaignContent | null> {
  const result = await query(
    `UPDATE campaign_content
     SET is_hidden = NOT is_hidden, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id]
  );
  if (result.rows.length === 0) return null;
  return rowToContent(result.rows[0]);
}

// Delete content
export async function deleteContent(id: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM campaign_content WHERE id = $1',
    [id]
  );
  return (result.rowCount ?? 0) > 0;
}

// Build content summary for AI system prompt
export async function buildContentSummaryForAI(campaignId: string): Promise<string> {
  // getVisibleContent handles missing table gracefully
  const contents = await getVisibleContent(campaignId);

  if (contents.length === 0) {
    return '';
  }

  // Group by category
  const byCategory = contents.reduce((acc, content) => {
    if (!acc[content.category]) {
      acc[content.category] = [];
    }
    acc[content.category].push(content);
    return acc;
  }, {} as Record<string, CampaignContent[]>);

  const categoryLabels: Record<ContentCategory, string> = {
    lore: 'Lore & History',
    rules: 'House Rules',
    locations: 'Locations',
    npcs: 'NPCs & Factions',
    items: 'Items & Equipment',
    monsters: 'Monsters & Encounters',
    other: 'Other Information',
  };

  let summary = '\n## Campaign Reference Material\n';

  for (const [category, items] of Object.entries(byCategory)) {
    summary += `\n### ${categoryLabels[category as ContentCategory]}\n`;

    for (const item of items) {
      // Use summary if available, otherwise truncate content
      const contentPreview = item.summary ||
        (item.content.length > 500 ? item.content.slice(0, 500) + '...' : item.content);

      summary += `\n**${item.name}**${item.source ? ` (Source: ${item.source})` : ''}\n`;
      summary += contentPreview + '\n';
    }
  }

  return summary;
}
