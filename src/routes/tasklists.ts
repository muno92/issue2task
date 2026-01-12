import { Hono } from 'hono'
import { getValidAccessToken } from '../utils/google-auth'
import { getTaskLists } from '../utils/google-tasks'

type Bindings = {
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  issue2task: D1Database
}

const tasklists = new Hono<{ Bindings: Bindings }>()

// Task list selection UI
tasklists.get('/select', async (c) => {
  const userId = c.req.query('user_id')

  if (!userId) {
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Error</title>
        </head>
        <body>
          <h1>Error</h1>
          <p>user_id is required</p>
        </body>
      </html>
    `)
  }

  try {
    const accessToken = await getValidAccessToken(userId, c.env)
    if (!accessToken) {
      throw new Error('Failed to get valid access token')
    }

    // Get user's selected task list from database
    const userSettings = await c.env.issue2task
      .prepare('SELECT selected_task_list_id FROM user_settings WHERE user_id = ?')
      .bind(userId)
      .first<{ selected_task_list_id: string | null }>()

    const selectedTaskListId = userSettings?.selected_task_list_id || null

    const taskLists = await getTaskLists(accessToken)

    return c.html(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Select Task List</title>
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
            }
            h1 {
              color: #333;
              margin-bottom: 1rem;
              text-align: center;
            }
            p {
              color: #666;
              margin-bottom: 2rem;
              text-align: center;
            }
            .task-list {
              margin-bottom: 1rem;
            }
            .task-list-item {
              padding: 1rem;
              border: 2px solid #e0e0e0;
              border-radius: 8px;
              margin-bottom: 0.5rem;
              cursor: pointer;
              transition: all 0.2s;
            }
            .task-list-item:hover {
              border-color: #4285f4;
              background: #f8f9fa;
            }
            .task-list-item.selected {
              border-color: #4285f4;
              background: #e8f0fe;
            }
            .btn {
              display: block;
              width: 100%;
              background: #4285f4;
              color: white;
              padding: 12px;
              border: none;
              border-radius: 6px;
              font-size: 16px;
              font-weight: 500;
              cursor: pointer;
              transition: background 0.3s;
            }
            .btn:hover {
              background: #357ae8;
            }
            .btn:disabled {
              background: #ccc;
              cursor: not-allowed;
            }
            .message {
              margin-top: 1rem;
              padding: 1rem;
              border-radius: 4px;
              display: none;
            }
            .message.success {
              background: #d4edda;
              color: #155724;
            }
            .message.error {
              background: #f8d7da;
              color: #721c24;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Select Task List</h1>
            <p>Choose which Google Tasks list to use for GitHub issues</p>
            <div class="task-list">
              ${taskLists.map(list => `
                <div class="task-list-item ${list.id === selectedTaskListId ? 'selected' : ''}" data-id="${list.id}" data-name="${list.title}">
                  <strong>${list.title}</strong>
                </div>
              `).join('')}
            </div>
            <button class="btn" id="saveBtn" disabled>Save Selection</button>
            <div class="message" id="message"></div>
          </div>
          <script>
            const userId = '${userId}';
            let selectedTaskListId = ${selectedTaskListId ? `'${selectedTaskListId}'` : 'null'};
            let selectedTaskListName = null;

            // Initialize selected task list name if already selected
            const selectedItem = document.querySelector('.task-list-item.selected');
            if (selectedItem) {
              selectedTaskListName = selectedItem.dataset.name;
              document.getElementById('saveBtn').disabled = false;
            }

            document.querySelectorAll('.task-list-item').forEach(item => {
              item.addEventListener('click', () => {
                document.querySelectorAll('.task-list-item').forEach(i => i.classList.remove('selected'));
                item.classList.add('selected');
                selectedTaskListId = item.dataset.id;
                selectedTaskListName = item.dataset.name;
                document.getElementById('saveBtn').disabled = false;
              });
            });

            document.getElementById('saveBtn').addEventListener('click', async () => {
              if (!selectedTaskListId) return;

              try {
                const response = await fetch('/settings/tasklists/select', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    user_id: userId,
                    task_list_id: selectedTaskListId,
                    task_list_name: selectedTaskListName,
                  }),
                });

                const data = await response.json();
                const messageEl = document.getElementById('message');

                if (response.ok) {
                  messageEl.textContent = 'Task list selection saved successfully!';
                  messageEl.className = 'message success';
                  messageEl.style.display = 'block';
                } else {
                  messageEl.textContent = 'Error: ' + (data.error || 'Unknown error');
                  messageEl.className = 'message error';
                  messageEl.style.display = 'block';
                }
              } catch (error) {
                const messageEl = document.getElementById('message');
                messageEl.textContent = 'Error: ' + error.message;
                messageEl.className = 'message error';
                messageEl.style.display = 'block';
              }
            });
          </script>
        </body>
      </html>
    `)
  } catch (error) {
    console.error('Error in task list selection page:', error)
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Error</title>
        </head>
        <body>
          <h1>Error</h1>
          <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
        </body>
      </html>
    `, 500)
  }
})

// Get all task lists for the authenticated user (API endpoint)
tasklists.get('/', async (c) => {
  // For now, we'll get the user_id from query params
  // In production, you'd want to use proper session management
  const userId = c.req.query('user_id')

  if (!userId) {
    return c.json({ error: 'user_id is required' }, 400)
  }

  try {
    // Get valid access token (will refresh if needed)
    const accessToken = await getValidAccessToken(userId, c.env)

    if (!accessToken) {
      return c.json({ error: 'Failed to get valid access token' }, 401)
    }

    // Fetch task lists from Google Tasks API
    const taskLists = await getTaskLists(accessToken)

    return c.json({ taskLists })
  } catch (error) {
    console.error('Error fetching task lists:', error)
    return c.json(
      { error: 'Failed to fetch task lists', details: error instanceof Error ? error.message : 'Unknown error' },
      500
    )
  }
})

// Save selected task list for the user
tasklists.post('/select', async (c) => {
  const { user_id, task_list_id, task_list_name } = await c.req.json()

  if (!user_id || !task_list_id) {
    return c.json({ error: 'user_id and task_list_id are required' }, 400)
  }

  try {
    const now = Date.now()

    await c.env.issue2task
      .prepare(`
        INSERT OR REPLACE INTO user_settings (
          user_id,
          selected_task_list_id,
          selected_task_list_name,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?)
      `)
      .bind(user_id, task_list_id, task_list_name || '', now, now)
      .run()

    return c.json({ success: true, message: 'Task list selection saved' })
  } catch (error) {
    console.error('Error saving task list selection:', error)
    return c.json(
      { error: 'Failed to save task list selection', details: error instanceof Error ? error.message : 'Unknown error' },
      500
    )
  }
})

export default tasklists
