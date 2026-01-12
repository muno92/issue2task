/**
 * Issue-Task mapping database access functions
 */

export interface IssueTaskMapping {
  url: string
  task_id: string
  created_at: number
}

/**
 * Get issue-task mapping by issue URL
 */
export async function getIssueTaskMapping(
  db: D1Database,
  issueUrl: string
): Promise<IssueTaskMapping | null> {
  try {
    const result = await db
      .prepare('SELECT url, task_id, created_at FROM issue_task_mapping WHERE url = ?')
      .bind(issueUrl)
      .first<IssueTaskMapping>()

    return result
  } catch (error) {
    console.error('Error getting issue-task mapping:', error)
    return null
  }
}

/**
 * Save issue-task mapping
 */
export async function saveIssueTaskMapping(
  db: D1Database,
  issueUrl: string,
  taskId: string
): Promise<boolean> {
  try {
    const now = Date.now()
    await db
      .prepare('INSERT INTO issue_task_mapping (url, task_id, created_at) VALUES (?, ?, ?)')
      .bind(issueUrl, taskId, now)
      .run()

    return true
  } catch (error) {
    console.error('Error saving issue-task mapping:', error)
    return false
  }
}