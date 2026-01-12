/**
 * GitHub REST API utility functions for fetching issue information
 */

export interface GitHubIssue {
  title: string
  url: string
}

/**
 * Fetch project item information using organization, project number, and item id
 * Uses GitHub Projects V2 REST API
 *
 * @see https://docs.github.com/en/rest/projects/items?apiVersion=2022-11-28
 */
export async function getProjectItem(
  org: string,
  projectNumber: number,
  itemId: number,
  githubToken: string
): Promise<GitHubIssue | null> {
  try {
    const response = await fetch(
      `https://api.github.com/orgs/${org}/projectsV2/${projectNumber}/items/${itemId}`,
      {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'gh-issue-to-calendar-task',
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('GitHub API request failed:', response.status, errorText)
      return null
    }

    const data = await response.json() as {
      content?: {
        title?: string
        html_url?: string
      },
      content_type?: string
    }

    if (!data.content || data.content_type !== 'Issue') {
      console.error('Project item is not an Issue or content is missing')
      return null
    }

    if (!data.content.title || !data.content.html_url) {
      console.error('Issue title or URL is missing from project item')
      return null
    }

    return {
      title: data.content.title,
      url: data.content.html_url,
    }
  } catch (error) {
    console.error('Error fetching project item from GitHub:', error)
    return null
  }
}
