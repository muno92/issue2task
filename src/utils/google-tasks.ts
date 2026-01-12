export type TaskList = {
  id: string
  title: string
  updated: string
}

/**
 * Get all task lists for the user
 */
export async function getTaskLists(accessToken: string): Promise<TaskList[]> {
  const response = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to fetch task lists: ${errorText}`)
  }

  const data = await response.json() as { items?: TaskList[] }
  return data.items || []
}
