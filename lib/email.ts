/* E-mail versturen via Resend. Zonder RESEND_API_KEY wordt niets verstuurd
   (alleen gelogd), zodat de app zonder key blijft werken. */

const FROM = process.env.RESEND_FROM || 'Fam <onboarding@resend.dev>'

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

export interface EmailCta {
  label: string
  url: string
}

/**
 * Gestileerde, e-mailclient-veilige mail-wrapper (tabel-gebaseerd, inline-styles
 * zodat Gmail/Outlook het correct tonen). Met een gekleurde header-band, het
 * logo + woordmerk, de inhoud en een optionele call-to-action-knop.
 */
export function emailLayout(heading: string, bodyHtml: string, cta?: EmailCta): string {
  const button = cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0 6px">
         <tr><td style="background:#35B558;border-radius:9999px;box-shadow:0 2px 6px rgba(53,181,88,0.35)">
           <a href="${cta.url}" style="display:inline-block;padding:13px 28px;color:#ffffff;font-weight:700;font-size:14px;text-decoration:none">${cta.label}</a>
         </td></tr>
       </table>`
    : ''

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F8FA;padding:28px 0;font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif">
    <tr><td align="center">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#ffffff;border:1px solid #E8EDF2;border-radius:18px;overflow:hidden">
        <tr><td style="background:#35B558;padding:26px 28px;text-align:center">
          <table role="presentation" cellpadding="0" cellspacing="0" align="center"><tr>
            <td style="background:rgba(255,255,255,0.18);border-radius:11px;width:42px;height:42px;text-align:center;vertical-align:middle;color:#ffffff;font-weight:800;font-size:21px">F</td>
            <td style="padding-left:12px;color:#ffffff;font-weight:800;font-size:18px;letter-spacing:-0.01em">Fam</td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:28px 28px 8px">
          <h1 style="font-size:20px;color:#1f2937;margin:0 0 12px;font-weight:800">${heading}</h1>
          <div style="font-size:15px;color:#475569;line-height:1.65">${bodyHtml}</div>
          ${button}
        </td></tr>
        <tr><td style="padding:18px 28px 26px">
          <hr style="border:none;border-top:1px solid #EEF2F6;margin:0 0 14px">
          <p style="font-size:12px;color:#94a3b8;margin:0;line-height:1.5">Fam — jullie gezinsapp voor agenda, boodschappen, budget en meer.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>`
}
