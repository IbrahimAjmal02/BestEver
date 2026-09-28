// Every frontend HTTP call goes through here — one place to point at the
// Express server, and one place to change if the request/error shape changes.
const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })

  if (!res.ok) {
    // Every server error route responds with { error: string } (see e.g.
    // requireVerifiedEmail.ts) — surface that message when present, since
    // it's usually more useful to a user than a bare status code.
    const body = await res.json().catch(() => null)
    throw new Error(body?.error ?? `${init?.method ?? 'GET'} ${path} failed: ${res.status}`)
  }

  return res.json() as Promise<T>
}
