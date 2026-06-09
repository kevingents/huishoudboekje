/* E-mail versturen via Resend. Zonder RESEND_API_KEY wordt niets verstuurd
   (alleen gelogd), zodat de app zonder key blijft werken. */

const FROM = process.env.RESEND_FROM || 'Huishoudboekje <onboarding@resend.dev>'

export async function sendEmail(opts: {
  to: string
  subject: string
  html: string
}): Promise<{ sent: boolean; reason?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.log(`[email] geen RESEND_API_KEY — niet verstuurd: "${opts.subject}" → ${opts.to}`)
    return { sent: false, reason: 'no_api_key' }
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: opts.to, subject: opts.subject, html: opts.html }),
    })
    if (!res.ok) {
      const text = await res.text()
      console.error('[email] Resend-fout:', res.status, text)
      return { sent: false, reason: `resend_${res.status}` }
    }
    return { sent: true }
  } catch (e) {
    console.error('[email] verzendfout:', e)
    return { sent: false, reason: 'exception' }
  }
}

/** Eenvoudige, gestileerde mail-wrapper in de huisstijl. */
export function emailLayout(heading: string, bodyHtml: string): string {
  return `<div style="font-family:Inter,Arial,sans-serif;background:#F6F8FA;padding:24px">
    <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #E8EDF2;border-radius:16px;padding:24px">
      <div style="display:inline-grid;place-items:center;width:40px;height:40px;border-radius:12px;background:#35B558;color:#fff;font-weight:800;font-size:18px">h</div>
      <h1 style="font-size:18px;color:#1f2937;margin:16px 0 8px">${heading}</h1>
      <div style="font-size:14px;color:#475569;line-height:1.6">${bodyHtml}</div>
      <p style="font-size:12px;color:#94a3b8;margin-top:24px">Huishoudboekje · gezinsdashboard</p>
    </div>
  </div>`
}
