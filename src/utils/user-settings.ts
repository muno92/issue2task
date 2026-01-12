/**
 * User settings database access functions
 */

export interface UserSettings {
  user_id: string
  selected_task_list_id: string
  selected_task_list_name: string | null
}

/**
 * Get user settings by user ID
 */
export async function getUserSettings(
  db: D1Database,
  userId: string
): Promise<UserSettings | null> {
  try {
    const result = await db
      .prepare('SELECT user_id, selected_task_list_id, selected_task_list_name FROM user_settings WHERE user_id = ?')
      .bind(userId)
      .first<UserSettings>()

    return result
  } catch (error) {
    console.error('Error getting user settings:', error)
    return null
  }
}

/**
 * Get the first user settings (for single-user application)
 */
export async function getFirstUserSettings(
  db: D1Database
): Promise<UserSettings | null> {
  try {
    const result = await db
      .prepare('SELECT user_id, selected_task_list_id, selected_task_list_name FROM user_settings LIMIT 1')
      .first<UserSettings>()

    return result
  } catch (error) {
    console.error('Error getting first user settings:', error)
    return null
  }
}