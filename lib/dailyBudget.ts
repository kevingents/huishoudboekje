/* Dagbudget: verdeel het besteedbare bedrag over de dagen van de salarisperiode.
   Wat je op een dag niet opmaakt, schuift door (rollover): het beschikbare bedrag
   van vandaag = (dagbudget × verstreken dagen) − wat je deze periode al uitgaf. */

const MS_PER_DAY = 86_400_000

function clampDay(year: number, monthIndex: number, day: number): number {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  return Math.min(Math.max(1, day), daysInMonth)
}

function atMidnight(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export interface DailyBudget {
  availableToday: number // wat je vandaag nog kunt uitgeven (incl. doorgeschoven)
  dailyRate: number // het 'kale' dagbudget zonder rollover
  rolledOver: number // hoeveel daarvan is doorgeschoven van eerdere dagen
  spentInPeriod: number
  totalDays: number
  daysLeft: number // dagen ná vandaag tot het volgende salaris
  periodStart: Date
  periodEnd: Date
  spendablePerPeriod: number
}

export function computeDailyBudget(opts: {
  now: Date
  salaryDay: number
  spendablePerPeriod: number
  transactions: { amount: number; createdAt?: string }[]
}): DailyBudget {
  const { now, salaryDay, spendablePerPeriod, transactions } = opts
  const todayMid = atMidnight(now)

  // periodStart = de meest recente salarisdag op of vóór vandaag.
  let y = now.getFullYear()
  let mo = now.getMonth()
  let periodStart = atMidnight(new Date(y, mo, clampDay(y, mo, salaryDay)))
  if (periodStart.getTime() > todayMid.getTime()) {
    mo -= 1
    if (mo < 0) {
      mo = 11
      y -= 1
    }
    periodStart = atMidnight(new Date(y, mo, clampDay(y, mo, salaryDay)))
  }

  // periodEnd = de eerstvolgende salarisdag daarna.
  let ey = periodStart.getFullYear()
  let em = periodStart.getMonth() + 1
  if (em > 11) {
    em = 0
    ey += 1
  }
  const periodEnd = atMidnight(new Date(ey, em, clampDay(ey, em, salaryDay)))

  const totalDays = Math.max(1, Math.round((periodEnd.getTime() - periodStart.getTime()) / MS_PER_DAY))
  const dayIndex = Math.min(totalDays, Math.floor((todayMid.getTime() - periodStart.getTime()) / MS_PER_DAY) + 1)
  const daysLeft = Math.max(0, totalDays - dayIndex)

  const dailyRate = spendablePerPeriod / totalDays

  const spentInPeriod = transactions
    .filter((t) => {
      if (!t.createdAt) return true // optimistische/nieuwe transactie = nu = telt mee
      return new Date(t.createdAt).getTime() >= periodStart.getTime()
    })
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)

  const unlockedThroughToday = dailyRate * dayIndex
  const availableToday = unlockedThroughToday - spentInPeriod
  const rolledOver = availableToday - dailyRate // surplus dat is doorgeschoven van eerdere dagen

  return {
    availableToday,
    dailyRate,
    rolledOver,
    spentInPeriod,
    totalDays,
    daysLeft,
    periodStart,
    periodEnd,
    spendablePerPeriod,
  }
}
