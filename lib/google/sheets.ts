import { refreshAccessToken } from '@/lib/google/oauth'

export type GoogleConnection = {
  user_id: string
  access_token: string
  refresh_token: string | null
  expires_at: string | null
}

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return true
  return Date.now() > new Date(expiresAt).getTime() - 60_000 // refresh 1m early
}

export async function getValidAccessToken(conn: GoogleConnection, update: (patch: Partial<GoogleConnection>) => Promise<void>) {
  if (!conn.refresh_token) {
    // No refresh token means we can't refresh; assume access_token is OK for now.
    return conn.access_token
  }

  if (!isExpired(conn.expires_at)) return conn.access_token

  const refreshed = await refreshAccessToken(conn.refresh_token)
  const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
  await update({ access_token: refreshed.access_token, expires_at: expiresAt })
  return refreshed.access_token
}

async function gfetch(accessToken: string, url: string, init?: RequestInit) {
  const resp = await fetch(url, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      Authorization: `Bearer ${accessToken}`,
    },
  })
  const text = await resp.text()
  let json: any
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = text
  }
  if (!resp.ok) {
    throw new Error(`Google API error ${resp.status}: ${typeof json === 'string' ? json : JSON.stringify(json)}`)
  }
  return json
}

export async function createSpreadsheet(accessToken: string, title: string) {
  return gfetch(accessToken, 'https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      properties: { title },
      sheets: [{ properties: { title: 'Documents' } }, { properties: { title: 'Line Items' } }],
    }),
  }) as Promise<{ spreadsheetId: string; spreadsheetUrl: string }>
}

export async function batchUpdateValues(accessToken: string, spreadsheetId: string, data: { range: string; values: any[][] }[]) {
  return gfetch(
    accessToken,
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        valueInputOption: 'RAW',
        data,
      }),
    }
  )
}
