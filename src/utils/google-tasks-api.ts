/**
 * Google Tasks API utility functions
 */

export interface GoogleTask {
  id: string
  title: string
  notes?: string
  due?: string
  status: 'needsAction' | 'completed'
}

/**
 * Create a new task in Google Tasks
 */
export async function createTask(
  accessToken: string,
  taskListId: string,
  title: string,
  notes: string,
  dueDate: string
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          notes,
          due: dueDate,
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Failed to create Google Task:', response.status, errorText)
      return null
    }

    const task = await response.json() as GoogleTask
    return task.id
  } catch (error) {
    console.error('Error creating Google Task:', error)
    return null
  }
}

/**
 * Update an existing task in Google Tasks
 */
export async function updateTask(
  accessToken: string,
  taskListId: string,
  taskId: string,
  title: string,
  notes: string,
  dueDate: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          notes,
          due: dueDate,
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Failed to update Google Task:', response.status, errorText)
      return false
    }

    return true
  } catch (error) {
    console.error('Error updating Google Task:', error)
    return false
  }
}

/**
 * Complete a task in Google Tasks
 */
export async function completeTask(
  accessToken: string,
  taskListId: string,
  taskId: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'completed',
          completed: new Date().toISOString(),
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Failed to complete Google Task:', response.status, errorText)
      return false
    }

    return true
  } catch (error) {
    console.error('Error completing Google Task:', error)
    return false
  }
}
