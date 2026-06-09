/* Dunne fetch-helpers voor de client. Gooien bij een niet-OK status zodat SWR
   de fout netjes oppakt. */

async function handle(res: Response) {
  if (!res.ok) {
    let message = `Request mislukt (${res.status})`
    try {
      const data = await res.json()
      if (data?.error) message = data.error
    } catch {
      /* geen JSON-body */
    }
    throw new Error(message)
  }
  if (res.status === 204) return null
  return res.json()
}

export const fetcher = (url: string) => fetch(url).then(handle)

export const apiPost = (url: string, body: unknown) =>
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(handle)

export const apiPatch = (url: string, body: unknown) =>
  fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(handle)

export const apiPut = (url: string, body: unknown) =>
  fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(handle)

export const apiDelete = (url: string) => fetch(url, { method: 'DELETE' }).then(handle)
