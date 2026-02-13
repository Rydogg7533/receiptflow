export function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env var: ${name}`)
  return v
}

export function getBaseUrlFromRequest(req: Request): string {
  // Prefer explicit app URL, otherwise derive from request
  const explicit = process.env.NEXT_PUBLIC_APP_URL
  if (explicit) return explicit.replace(/\/$/, '')

  const u = new URL(req.url)
  return `${u.protocol}//${u.host}`
}

export function getRedirectUri(req: Request): string {
  const explicit = process.env.GOOGLE_OAUTH_REDIRECT_URI
  if (explicit) return explicit
  return `${getBaseUrlFromRequest(req)}/api/auth/google/callback`
}

export function buildGoogleAuthUrl(req: Request, state: string): string {
  const clientId = requireEnv('GOOGLE_CLIENT_ID')
  const redirectUri = getRedirectUri(req)

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent')
  url.searchParams.set('include_granted_scopes', 'true')

  // Scopes
  url.searchParams.set(
    'scope',
    [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file',
      'openid',
      'email',
      'profile',
    ].join(' ')
  )

  url.searchParams.set('state', state)
  return url.toString()
}

export async function exchangeCodeForTokens(req: Request, code: string) {
  const clientId = requireEnv('GOOGLE_CLIENT_ID')
  const clientSecret = requireEnv('GOOGLE_CLIENT_SECRET')
  const redirectUri = getRedirectUri(req)

  const body = new URLSearchParams()
  body.set('code', code)
  body.set('client_id', clientId)
  body.set('client_secret', clientSecret)
  body.set('redirect_uri', redirectUri)
  body.set('grant_type', 'authorization_code')

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  const json = await resp.json()
  if (!resp.ok) {
    throw new Error(`Google token exchange failed: ${resp.status} ${JSON.stringify(json)}`)
  }

  return json as {
    access_token: string
    expires_in: number
    refresh_token?: string
    scope?: string
    token_type: string
    id_token?: string
  }
}

export async function refreshAccessToken(refreshToken: string) {
  const clientId = requireEnv('GOOGLE_CLIENT_ID')
  const clientSecret = requireEnv('GOOGLE_CLIENT_SECRET')

  const body = new URLSearchParams()
  body.set('client_id', clientId)
  body.set('client_secret', clientSecret)
  body.set('refresh_token', refreshToken)
  body.set('grant_type', 'refresh_token')

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  const json = await resp.json()
  if (!resp.ok) {
    throw new Error(`Google token refresh failed: ${resp.status} ${JSON.stringify(json)}`)
  }

  return json as {
    access_token: string
    expires_in: number
    scope?: string
    token_type: string
    id_token?: string
  }
}
