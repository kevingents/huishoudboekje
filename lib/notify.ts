import { prisma } from './db'
import { mergePrefs } from './notifications'
import { sendEmail, emailLayout } from './email'

/**
 * Maakt een melding aan volgens de ingestelde voorkeuren: in-app (Notification-
 * record) en/of per e-mail (Resend). Het type bepaalt welke kanalen aanstaan.
 */
export async function notify(opts: { type: string; title: string; body?: string }) {
  const setting = await prisma.setting.findUnique({ where: { key: 'notifications' } })
  let stored: unknown = []
  try {
    stored = setting ? JSON.parse(setting.value) : []
  } catch {
    stored = []
  }
  const prefs = mergePrefs(stored)
  const pref = prefs.find((p) => p.key === opts.type)

  // In-app
  if (!pref || pref.inApp) {
    await prisma.notification.create({
      data: { type: opts.type, title: opts.title, body: opts.body ?? null },
    })
  }

  // E-mail naar alle accounts (één huishouden).
  if (pref?.email) {
    const users = await prisma.user.findMany({ select: { email: true } })
    const html = emailLayout(opts.title, `<p>${opts.body ?? ''}</p>`)
    await Promise.all(users.map((u) => sendEmail({ to: u.email, subject: opts.title, html })))
  }
}
