export interface GoogleTokenResponse {
  access_token: string
  expires_in: number
  refresh_token?: string
  scope: string
  token_type: string
}

export interface StoredToken {
  user_id: string
  access_token: string
  refresh_token: string
  expires_at: number
  created_at: number
  updated_at: number
}