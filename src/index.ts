import {Hono} from 'hono'
import {verifyGitHubSignature} from './middleware/verify-github-signature'
import auth from './routes/auth'
import tasklists from './routes/tasklists'
import settings from './routes/settings'
import oauthCallback from './routes/oauth-callback'
import {getInstallationAccessToken} from './utils/github-app-auth'
import {getProjectItem} from './utils/github-api'
import {getValidAccessToken} from './utils/google-auth'
import {getFirstUserSettings} from './utils/user-settings'
import {getIssueTaskMapping, saveIssueTaskMapping} from './utils/issue-task-mapping'
import {createTask, updateTask, completeTask} from './utils/google-tasks-api'

type Bindings = {
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  GOOGLE_API_KEY: string
  GITHUB_APP_ID: string
  GITHUB_PRIVATE_KEY: string
  issue2task: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>GitHub Issues to Google Tasks</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .container {
            background: white;
            padding: 3rem;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            max-width: 500px;
            width: 100%;
            text-align: center;
          }
          h1 {
            color: #333;
            margin-bottom: 1rem;
          }
          p {
            color: #666;
            line-height: 1.6;
            margin-bottom: 2rem;
          }
          .btn {
            display: inline-block;
            background: #4285f4;
            color: white;
            padding: 12px 32px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 500;
            transition: background 0.3s;
          }
          .btn:hover {
            background: #357ae8;
          }
          .logo {
            font-size: 3rem;
            margin-bottom: 1rem;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">📋 → ✅</div>
          <h1>GitHub Issues to Google Tasks</h1>
          <p>Automatically sync your GitHub issues with Google Tasks</p>
          <a href="/settings" class="btn">Go to Settings</a>
        </div>
      </body>
    </html>
  `)
})

app.route('/settings', settings)
app.route('/settings/auth', auth)
app.route('/settings/tasklists', tasklists)
app.route('/google-callback', oauthCallback)

app.post('/webhook', verifyGitHubSignature, async (c) => {
  const eventName = c.req.header('X-GitHub-Event')
  if (eventName !== 'projects_v2_item') {
    return c.text('Invalid event type', 400)
  }

  const payload = await c.req.json();
  if (payload.action !== 'edited') {
    // Only "edited" actions are processed. For other action types, we return 200 as expected by GitHub to avoid delivery errors.
    return c.text('Event action is not "edited"', 200)
  }

  const installationToken = await getInstallationAccessToken(
    c.env.GITHUB_APP_ID,
    c.env.GITHUB_PRIVATE_KEY,
    payload.installation.id
  )

  if (!installationToken) {
    console.error('Failed to get installation access token')
    return c.text('Authentication failed', 500)
  }

  // Fetch issue information from GitHub
  const org = payload.organization.login
  const projectNumber = payload.changes.field_value.project_number
  const itemId = payload.projects_v2_item.id

  const issue = await getProjectItem(org, projectNumber, itemId, installationToken)

  if (!issue) {
    console.error('Failed to fetch issue from GitHub')
    return c.text('Failed to fetch issue', 500)
  }

  console.log('Issue fetched successfully:', issue)

  // Get user settings (single-user application)
  const userSettings = await getFirstUserSettings(c.env.issue2task)

  if (!userSettings) {
    console.error('User settings not found')
    return c.text('User not configured', 500)
  }

  // Get valid access token for the user
  const accessToken = await getValidAccessToken(userSettings.user_id, c.env)

  if (!accessToken) {
    console.error('Failed to get valid access token for user:', userSettings.user_id)
    return c.text('Failed to authenticate with Google', 500)
  }

  const fieldValue = payload.changes.field_value

  // Handle Target date changes
  if (fieldValue.field_type === 'date' && fieldValue.field_name === 'Target date') {
    const dueDate = fieldValue.to

    if (!dueDate) {
      console.log('Target date was removed, skipping')
      return c.text('Target date removed', 200)
    }

    // Check if issue is already mapped to a task
    const mapping = await getIssueTaskMapping(c.env.issue2task, issue.url)

    if (mapping) {
      // Update existing task
      const success = await updateTask(
        accessToken,
        userSettings.selected_task_list_id,
        mapping.task_id,
        issue.title,
        issue.url,
        dueDate
      )

      if (!success) {
        console.error('Failed to update Google Task')
        return c.text('Failed to update task', 500)
      }

      console.log('Task updated successfully:', mapping.task_id)
      return c.text('Task updated successfully')
    } else {
      // Create new task
      const taskId = await createTask(
        accessToken,
        userSettings.selected_task_list_id,
        issue.title,
        issue.url,
        dueDate
      )

      if (!taskId) {
        console.error('Failed to create Google Task')
        return c.text('Failed to create task', 500)
      }

      // Save mapping
      const saved = await saveIssueTaskMapping(c.env.issue2task, issue.url, taskId)

      if (!saved) {
        console.error('Failed to save issue-task mapping')
        return c.text('Failed to save mapping', 500)
      }

      console.log('Task created successfully:', taskId)
      return c.text('Task created successfully')
    }
  }

  // Handle Status changes
  if (fieldValue.field_type === 'single_select' && fieldValue.field_name === 'Status') {
    const newStatus = fieldValue.to

    if (!newStatus || newStatus.name !== 'Done') {
      console.log('Status is not Done, skipping')
      return c.text('Status is not Done', 200)
    }

    // Check if issue is mapped to a task
    const mapping = await getIssueTaskMapping(c.env.issue2task, issue.url)

    if (!mapping) {
      console.log('Issue is not mapped to a task, skipping')
      return c.text('Issue not mapped', 200)
    }

    // Complete the task
    const success = await completeTask(
      accessToken,
      userSettings.selected_task_list_id,
      mapping.task_id
    )

    if (!success) {
      console.error('Failed to complete Google Task')
      return c.text('Failed to complete task', 500)
    }

    console.log('Task completed successfully:', mapping.task_id)
    return c.text('Task completed successfully')
  }

  console.log('Field type or name does not match expected values, skipping')
  return c.text('Event processed', 200)
})

export default app
