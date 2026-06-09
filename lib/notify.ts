import { prisma } from './db'
import { mergePrefs } from './notifications'
import { sendEmail, emailLayout } from './email'

/**
 * Maakt een melding voor één huishouden volgens de ingestelde voorkeuren:
 * in-app (Notification-record) en/of per e-mail (Resend) naar de gezinsleden.
 */
export async function notify(opts: {
  householdId: number
  type: string
  title: string
  body?: string
  targetMember?: string | null
}) {
  const setting = await prisma.setting.findFirst({
    where: { householdId: opts.householdId, key: 'notifications' },
  })
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
      data: {
        householdId: opts.householdId,
        type: opts.type,
        title: opts.title,
        body: opts.body ?? null,
        targetMember: opts.targetMember ?? null,
      },
    })
  }

  // E-mail naar de accounts van dít huishouden.
  if (pref?.email) {
    const users = await prisma.user.findMany({
      where: { householdId: opts.householdId },
      select: { email: true },
    })
    const html = emailLayout(opts.title, `<p>${opts.body ?? ''}</p>`)
    await Promise.all(users.map((u) => sendEmail({ to: u.email, subject: opts.title, html })))
  }

  // Echte pushmeldingen (best effort): gericht aan de juiste gebruikers.
  try {
    const { sendPushToUsers } = await import('./push')
    let userIds: number[]
    if (opts.targetMember) {
      const member = await prisma.familyMember.findFirst({
        where: { householdId: opts.householdId, name: opts.targetMember },
        select: { id: true },
      })
      const users = await prisma.user.findMany({
        where: {
          householdId: opts.householdId,
          OR: [{ role: { not: 'child' } }, ...(member ? [{ memberId: member.id }] : [])],
        },
        select: { id: true },
      })
      userIds = users.map((u) => u.id)
    } else {
      const users = await prisma.user.findMany({ where: { householdId: opts.householdId }, select: { id: true } })
      userIds = users.map((u) => u.id)
    }
    await sendPushToUsers(userIds, { title: opts.title, body: opts.body })
  } catch {
    /* push is best-effort */
  }
}
