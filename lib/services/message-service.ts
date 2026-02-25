import { query } from '../db';
import type { ChatMessage, SessionLog, RuleViolation, DiceRoll } from '@/types';

// ============================================
// Message Operations
// ============================================

// NOTE TO USER: You will need to add a `tool_call_id` column to your `messages` table.
// Example SQL: ALTER TABLE messages ADD COLUMN tool_call_id VARCHAR(255);

export async function createMessage(data: {
  campaignId: string;
  role: ChatMessage['role'];
  content: string;
  toolCalls?: ChatMessage['toolCalls'];
  tool_call_id?: string; // Add this
  toolResults?: ChatMessage['toolResults'];
  diceRolls?: DiceRoll[];
  sceneChange?: boolean;
}): Promise<ChatMessage> {
  const result = await query(
    `INSERT INTO messages (
      campaign_id, role, content, tool_calls, tool_results, dice_rolls, scene_change, tool_call_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *`,
    [
      data.campaignId,
      data.role,
      data.content,
      data.toolCalls ? JSON.stringify(data.toolCalls) : null,
      data.toolResults ? JSON.stringify(data.toolResults) : null,
      data.diceRolls ? JSON.stringify(data.diceRolls) : null,
      data.sceneChange || false,
      data.tool_call_id || null, // Add this
    ]
  );
  return mapMessageRow(result.rows[0]);
}

export async function getMessages(
  campaignId: string,
  limit: number = 100,
  offset: number = 0
): Promise<ChatMessage[]> {
  const result = await query(
    `SELECT * FROM messages
     WHERE campaign_id = $1
     ORDER BY timestamp DESC
     LIMIT $2 OFFSET $3`,
    [campaignId, limit, offset]
  );
  // Return in chronological order
  return result.rows.map(mapMessageRow).reverse();
}

export async function getRecentMessages(
  campaignId: string,
  limit: number = 20
): Promise<ChatMessage[]> {
  return getMessages(campaignId, limit, 0);
}

export async function getMessageCount(campaignId: string): Promise<number> {
  const result = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM messages WHERE campaign_id = $1`,
    [campaignId]
  );
  return parseInt(result.rows[0].count);
}

export async function deleteMessagesAfter(
  campaignId: string,
  timestamp: Date
): Promise<number> {
  const result = await query(
    `DELETE FROM messages WHERE campaign_id = $1 AND timestamp > $2`,
    [campaignId, timestamp]
  );
  return result.rowCount ?? 0;
}

export async function clearMessages(campaignId: string): Promise<void> {
  await query(`DELETE FROM messages WHERE campaign_id = $1`, [campaignId]);
}

// ============================================
// Session Log Operations
// ============================================

export async function createSessionLog(campaignId: string): Promise<SessionLog> {
  // Get the next session number
  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM session_logs WHERE campaign_id = $1`,
    [campaignId]
  );
  const sessionNumber = parseInt(countResult.rows[0].count) + 1;

  const result = await query(
    `INSERT INTO session_logs (campaign_id, session_number)
     VALUES ($1, $2)
     RETURNING *`,
    [campaignId, sessionNumber]
  );

  return mapSessionLogRow(result.rows[0]);
}

export async function getCurrentSession(campaignId: string): Promise<SessionLog | null> {
  const result = await query(
    `SELECT * FROM session_logs
     WHERE campaign_id = $1 AND ended_at IS NULL
     ORDER BY started_at DESC
     LIMIT 1`,
    [campaignId]
  );
  return result.rows[0] ? mapSessionLogRow(result.rows[0]) : null;
}

export async function endSession(
  sessionId: string,
  summary?: string,
  highlights?: string[]
): Promise<SessionLog | null> {
  const result = await query(
    `UPDATE session_logs
     SET ended_at = NOW(), summary = $2, highlights = $3
     WHERE id = $1
     RETURNING *`,
    [sessionId, summary || null, highlights || []]
  );
  return result.rows[0] ? mapSessionLogRow(result.rows[0]) : null;
}

export async function getSessionLogs(campaignId: string): Promise<SessionLog[]> {
  const result = await query(
    `SELECT * FROM session_logs
     WHERE campaign_id = $1
     ORDER BY session_number DESC`,
    [campaignId]
  );
  return result.rows.map(mapSessionLogRow);
}

export async function updateSessionMessageCount(sessionId: string): Promise<void> {
  await query(
    `UPDATE session_logs
     SET message_count = (
       SELECT COUNT(*) FROM messages m
       JOIN session_logs s ON m.campaign_id = s.campaign_id
       WHERE s.id = $1
       AND m.timestamp >= s.started_at
       AND (s.ended_at IS NULL OR m.timestamp <= s.ended_at)
     )
     WHERE id = $1`,
    [sessionId]
  );
}

// ============================================
// Rule Violation Operations
// ============================================

export async function createRuleViolation(data: {
  campaignId: string;
  messageId?: string;
  type: RuleViolation['type'];
  description: string;
  severity: RuleViolation['severity'];
}): Promise<RuleViolation> {
  const result = await query(
    `INSERT INTO rule_violations (campaign_id, message_id, type, description, severity)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [data.campaignId, data.messageId || null, data.type, data.description, data.severity]
  );
  return mapRuleViolationRow(result.rows[0]);
}

export async function getRuleViolations(
  campaignId: string,
  unresolvedOnly: boolean = false
): Promise<RuleViolation[]> {
  const whereClause = unresolvedOnly
    ? 'WHERE campaign_id = $1 AND resolved = false'
    : 'WHERE campaign_id = $1';

  const result = await query(
    `SELECT * FROM rule_violations ${whereClause} ORDER BY timestamp DESC`,
    [campaignId]
  );
  return result.rows.map(mapRuleViolationRow);
}

export async function resolveRuleViolation(id: string): Promise<RuleViolation | null> {
  const result = await query(
    `UPDATE rule_violations SET resolved = true WHERE id = $1 RETURNING *`,
    [id]
  );
  return result.rows[0] ? mapRuleViolationRow(result.rows[0]) : null;
}

// ============================================
// Row Mappers
// ============================================

function mapMessageRow(row: Record<string, unknown>): ChatMessage {
  // Safely parse tool_calls and tool_results if they are stored as JSON strings
  const toolCalls = (typeof row.tool_calls === 'string' && row.tool_calls)
    ? JSON.parse(row.tool_calls)
    : row.tool_calls;
  
  const toolResults = (typeof row.tool_results === 'string' && row.tool_results)
    ? JSON.parse(row.tool_results)
    : row.tool_results;

  return {
    id: row.id as string,
    campaignId: row.campaign_id as string,
    role: row.role as ChatMessage['role'],
    content: row.content as string,
    toolCalls: toolCalls as ChatMessage['toolCalls'],
    tool_call_id: row.tool_call_id as string | undefined, // Add this
    toolResults: toolResults as ChatMessage['toolResults'],
    diceRolls: row.dice_rolls as DiceRoll[],
    sceneChange: row.scene_change as boolean,
    timestamp: new Date(row.timestamp as string),
  };
}

function mapSessionLogRow(row: Record<string, unknown>): SessionLog {
  return {
    id: row.id as string,
    campaignId: row.campaign_id as string,
    sessionNumber: row.session_number as number,
    startedAt: new Date(row.started_at as string),
    endedAt: row.ended_at ? new Date(row.ended_at as string) : undefined,
    summary: row.summary as string | undefined,
    highlights: (row.highlights as string[]) || [],
    messageCount: row.message_count as number,
  };
}

function mapRuleViolationRow(row: Record<string, unknown>): RuleViolation {
  return {
    id: row.id as string,
    campaignId: row.campaign_id as string,
    messageId: row.message_id as string | undefined,
    type: row.type as RuleViolation['type'],
    description: row.description as string,
    severity: row.severity as RuleViolation['severity'],
    resolved: row.resolved as boolean,
    timestamp: new Date(row.timestamp as string),
  };
}
