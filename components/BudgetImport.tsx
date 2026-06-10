'use client'

import { useRef, useState } from 'react'
import { mutate } from 'swr'
import { FileSpreadsheet, Upload } from 'lucide-react'
import DashboardCard from './DashboardCard'
import { apiPost } from '@/lib/api'

export default function BudgetImport() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const onFile = async (file?: File) => {
    if (!file) return
    setBusy(true)
    setMsg(null)
    try {
      const dataUrl = await new Promise<string>((res, rej) => {
        const r = new FileReader()
        r.onload = () => res(r.result as string)
        r.onerror = () => rej(new Error('Bestand kon niet worden gelezen'))
        r.readAsDataURL(file)
      })
      const res = (await apiPost('/api/budget/import', { file: dataUrl })) as {
        expenses: number
        incomes: number
        categories: number
      }
      await Promise.all([
        mutate('/api/budget/transactions'),
        mutate('/api/budget/categories'),
        mutate('/api/income'),
      ])
      setMsg({
        ok: true,
        text: `Geïmporteerd: ${res.expenses} uitgaven, ${res.incomes} inkomstenposten en ${res.categories} categorieën.`,
      })
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Import mislukt.' })
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <DashboardCard
      title="Importeer uit Excel"
      icon={FileSpreadsheet}
      iconClassName="text-emerald-500"
      className="lg:col-span-2"
    >
      <p className="text-sm text-slate-500">
        Heb je een budget-Excel met de tabbladen <span className="font-semibold">Uitgaven Logboek</span> en{' '}
        <span className="font-semibold">Inkomsten Logboek</span>? Upload 'm en Fam zet je uitgaven,
        categorieën en inkomsten in je eigen budget.
      </p>
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="pill mt-3 bg-brand px-4 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark disabled:opacity-50 sm:w-auto"
      >
        <Upload className={`h-4 w-4 ${busy ? 'animate-pulse' : ''}`} />
        {busy ? 'Bezig met importeren…' : 'Excel uploaden'}
      </button>
      {msg && (
        <p className={`mt-2 text-sm font-medium ${msg.ok ? 'text-emerald-600' : 'text-rose-600'}`}>{msg.text}</p>
      )}
      <p className="mt-2 text-[11px] text-slate-400">
        Tip: importeer één keer — meerdere keren geeft dubbele transacties.
      </p>
    </DashboardCard>
  )
}
