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
  /** Gebruiker die de actie zelf uitvoerde — krijgt geen push van z'n eigen actie. */
  excludeUserId?: number | null
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
  // Eén knop voor "wil ik dit type melding": stuurt zowel de in-app- als de
  // pushmelding aan/uit. Onbekende types (bijv. 'system') staan standaard aan.
  const wantInApp = !pref || pref.inApp

  // In-app
  if (wantInApp) {
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

  // Echte pushmeldingen (best effort). Met targetMember gaat de push alléén naar
  // de accounts van die persoon (via memberId-koppeling of naam-match); is er
  // niemand gekoppeld, dan als vangnet naar de volwassenen. Zonder targetMember
  // krijgt het hele gezin de push. De uitvoerder zelf wordt overgeslagen.
  try {
    if (!wantInApp) return // type uitgezet → ook geen push
    const { sendPushToUsers } = await import('./push')
    let userIds: number[]
    const users = await prisma.user.findMany({
      where: { householdId: opts.householdId },
      select: { id: true, name: true, role: true, memberId: true },
    })
    if (opts.targetMember) {
      const target = opts.targetMember.trim().toLowerCase()
      const targetFirst = target.split(/\s+/)[0]
      const member = await prisma.familyMember.findFirst({
        where: { householdId: opts.householdId, name: { equals: opts.targetMember, mode: 'insensitive' } },
        select: { id: true },
      })
      const linked = users.filter((u) => {
        if (member && u.memberId === member.id) return true
        const uname = u.name.trim().toLowerCase()
        return uname === target || uname.split(/\s+/)[0] === targetFirst
      })
      userIds = (linked.length > 0 ? linked : users.filter((u) => u.role !== 'child')).map((u) => u.id)
    } else {
      userIds = users.map((u) => u.id)
    }
    if (opts.excludeUserId) userIds = userIds.filter((id) => id !== opts.excludeUserId)
    await sendPushToUsers(userIds, { title: opts.title, body: opts.body })
  } catch {
    /* push is best-effort */
  }
}
