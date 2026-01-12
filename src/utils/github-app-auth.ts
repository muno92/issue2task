/**
 * GitHub App authentication utilities
 */
import { createAppAuth } from '@octokit/auth-app'

/**
 * Get Installation Access Token for GitHub App
 */
export async function getInstallationAccessToken(
  appId: string,
  privateKey: string,
  installationId: number
): Promise<string | null> {
  try {
    const auth = createAppAuth({
      appId,
      privateKey,
    })

    const installationAuthentication = await auth({
      type: 'installation',
      installationId,
    })

    return installationAuthentication.token
  } catch (error) {
    console.error('Error generating installation access token:', error)
    return null
  }
}
