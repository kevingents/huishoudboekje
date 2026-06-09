'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Wallet, Settings, ChevronRight, ArrowDownCircle } from 'lucide-react'
import DashboardCard from './DashboardCard'
import Modal from './Modal'
import { useBudget, useFixedCosts, useSubscriptions, useIncome, useSettings } from '@/lib/hooks'
import { monthlyEquivalent } from '@/lib/budget'
import { computeDailyBudget } from '@/lib/dailyBudget'

const inputClass =
  'w-full rounded-xl border border-cardborder bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-brand/40 focus:ring-2 focus:ring-brand/20'

const round = (n: number) => Math.round(n)

interface DayBudgetConfig {
  salaryDay?: number
  monthlyAmount?: number | null
}

export default function DayBudgetCard() {
  const { categories, transactions } = useBudget()
  const { costs } = useFixedCosts()
  const { subscriptions } = useSubscriptions()
  const { incomes } = useIncome()
  const { settings, setSetting } = useSettings()

  // Datum pas na mount bepalen (geen hydratie-mismatch).
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => setNow(new Date()), [])

  const cfg = (settings.dailyBudget ?? {}) as DayBudgetConfig
  const salaryDay = cfg.salaryDay && cfg.salaryDay >= 1 && cfg.salaryDay <= 31 ? cfg.salaryDay : 25

  const fixedTotal = costs.reduce((s, c) => s + c.amount, 0)
  const subsMonthly = subscriptions
    .filter((s) => s.status === 'active')
    .reduce((s, x) => s + monthlyEquivalent(x.amount, x.interval), 0)
  const incomeMonthly = incomes.reduce((s, i) => s + monthlyEquivalent(i.amount, i.interval), 0)
  const totalLimit = categories.reduce((s, c) => s + c.limit, 0)

  const manual = typeof cfg.monthlyAmount === 'number' && cfg.monthlyAmount > 0
  const auto = Math.max(0, incomeMonthly - fixedTotal - subsMonthly)
  const spendablePerMonth = manual ? (cfg.monthlyAmount as number) : auto > 0 ? auto : totalLimit

  // Instellen-modal
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ salaryDay: '25', mode: 'auto' as 'auto' | 'manual', amount: '' })
  const openSettings = () => {
    setForm({
      salaryDay: String(salaryDay),
      mode: manual ? 'manual' : 'auto',
      amount: manual ? String(cfg.monthlyAmount) : '',
    })
    setOpen(true)
  }
  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    const day = Math.min(31, Math.max(1, Number(form.salaryDay) || 25))
    const amount = form.mode === 'manual' ? Number(form.amount.replace(',', '.')) || 0 : null
    await setSetting('dailyBudget', { salaryDay: day, monthlyAmount: amount })
    setOpen(false)
  }

  const settingsButton = (
    <button
      type="button"
      onClick={openSettings}
      aria-label="Dagbudget instellen"
      className="grid h-8 w-8 place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
    >
      <Settings className="h-4 w-4" />
    </button>
  )

  const result =
    now && spendablePerMonth > 0
      ? computeDailyBudget({ now, salaryDay, spendablePerPeriod: spendablePerMonth, transactions })
      : null

  return (
    <DashboardCard
      title="Vandaag te besteden"
      icon={Wallet}
      iconClassName="text-brand"
      bg="bg-gradient-to-br from-brand-light to-white"
      bordered={false}
      headerRight={settingsButton}
    >
      {!now ? (
        <p className="text-sm text-slate-400">Laden…</p>
      ) : spendablePerMonth <= 0 ? (
        <div className="flex flex-col items-start gap-2">
          <p className="text-sm text-slate-600">
            Stel je besteedbare bedrag en salarisdag in, dan verdeel ik het per dag — wat je niet
            opmaakt, schuift door naar morgen.
          </p>
          <button
            type="button"
            onClick={openSettings}
            className="pill bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-brand/20 hover:bg-brand-dark"
          >
            <Settings className="h-4 w-4" />
            Instellen
          </button>
        </div>
      ) : result ? (
        <>
          <div className="flex items-end gap-2">
            <span
              className={`text-4xl font-extrabold ${result.availableToday < 0 ? 'text-rose-500' : 'text-brand'}`}
            >
              {result.availableToday < 0 ? '−' : ''}€{round(Math.abs(result.availableToday))}
            </span>
          </div>

          {result.availableToday < 0 ? (
            <p className="mt-1 text-sm font-medium text-rose-500">
              Je zit €{round(-result.availableToday)} boven budget — de komende dagen wat minder.
            </p>
          ) : result.rolledOver >= 1 ? (
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
              <ArrowDownCircle className="h-4 w-4" />
              waarvan €{round(result.rolledOver)} doorgeschoven van eerdere dagen
            </p>
          ) : (
            <p className="mt-1 text-sm text-slate-500">om netjes op budget te blijven</p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            <span>≈ €{round(result.dailyRate)} per dag</span>
            <span>
              {result.daysLeft === 0
                ? 'laatste dag voor je salaris'
                : `nog ${result.daysLeft} ${result.daysLeft === 1 ? 'dag' : 'dagen'} tot je salaris`}
            </span>
            <span>
              deze periode: €{round(result.spentInPeriod)} van €{round(spendablePerMonth)}
            </span>
          </div>

          <div className="mt-4 flex">
            <Link
              href="/budget"
              className="pill w-full border border-cardborder bg-white/70 px-4 py-2.5 text-slate-700 hover:bg-white sm:ml-auto sm:w-auto"
            >
              Naar budget
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </>
      ) : null}

      <Modal open={open} onClose={() => setOpen(false)} title="Dagbudget instellen">
        <form onSubmit={save} className="flex flex-col gap-3">
          <label className="text-xs font-semibold text-slate-500">
            Op welke dag krijg je salaris?
            <input
              inputMode="numeric"
              value={form.salaryDay}
              onChange={(e) => setForm({ ...form, salaryDay: e.target.value })}
              placeholder="25"
              className={`mt-1 ${inputClass}`}
            />
            <span className="mt-1 block text-[11px] text-slate-400">Dag van de maand (1–31).</span>
          </label>

          <div>
            <p className="text-xs font-semibold text-slate-500">Te besteden per maand</p>
            <div className="mt-1 flex gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, mode: 'auto' })}
                className={`pill flex-1 justify-center px-3 py-2 text-xs font-semibold ring-1 ring-cardborder ${
                  form.mode === 'auto' ? 'bg-brand text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                Automatisch
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, mode: 'manual' })}
                className={`pill flex-1 justify-center px-3 py-2 text-xs font-semibold ring-1 ring-cardborder ${
                  form.mode === 'manual' ? 'bg-brand text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                Zelf instellen
              </button>
            </div>
            {form.mode === 'auto' ? (
              <p className="mt-1.5 text-[11px] text-slate-400">
                = inkomsten − vaste lasten − abonnementen (€{round(auto)} p/m). Vul je inkomsten en
                vaste lasten in bij Budget.
              </p>
            ) : (
              <label className="mt-2 block text-xs font-semibold text-slate-500">
                Bedrag (€)
                <input
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="1000"
                  className={`mt-1 ${inputClass}`}
                />
              </label>
            )}
          </div>

          <button
            type="submit"
            className="pill mt-1 bg-brand px-4 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark"
          >
            Opslaan
          </button>
        </form>
      </Modal>
    </DashboardCard>
  )
}
