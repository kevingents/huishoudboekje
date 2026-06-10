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
      const res = (await apiPost('/api/budget/import', { file: dataUrl, filename: file.name })) as {
        source?: string
        expenses: number
        incomes: number
        categories: number
        skipped?: number
      }
      await Promise.all([
        mutate('/api/budget/transactions'),
        mutate('/api/budget/categories'),
        mutate('/api/income'),
      ])
      const skip = res.skipped ?? 0
      let text: string
      if (res.expenses === 0 && res.incomes === 0 && skip > 0) {
        text = `Niets nieuws — alle ${skip} transacties stonden al in je budget.`
      } else if (res.source === 'bank') {
        text = `Bankafschrift geïmporteerd: ${res.expenses} afschrijvingen${
          res.incomes ? `, ${res.incomes} inkomstenposten` : ''
        }${skip ? `, ${skip} dubbel overgeslagen` : ''}. Gebruik “Budget opschonen” om Overig en je bijschrijvingen in te delen.`
      } else {
        text = `Geïmporteerd: ${res.expenses} nieuwe uitgaven${skip ? `, ${skip} al aanwezig` : ''}, ${res.incomes} inkomstenposten en ${res.categories} categorieën.`
      }
      setMsg({ ok: true, text })
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Import mislukt.' })
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <DashboardCard
      title="Importeer Excel of bankafschrift"
      icon={FileSpreadsheet}
      iconClassName="text-emerald-500"
      className="lg:col-span-2"
    >
      <p className="text-sm text-slate-500">
        Upload je <span className="font-semibold">budget-Excel</span> (tabbladen Uitgaven/Inkomsten Logboek)
        óf een <span className="font-semibold">bankafschrift van elke bank</span> — CSV, CAMT.053 (XML),
        MT940 (.mt940/.940/.sta/.swi) of ABN AMRO TXT/TAB. Fam zet je uitgaven en categorieën
        automatisch in je budget.
      </p>
      <input
        ref={fileRef}
        type="file"
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
        {busy ? 'Bezig met importeren…' : 'Excel of afschrift uploaden'}
      </button>
      {msg && (
        <p className={`mt-2 text-sm font-medium ${msg.ok ? 'text-emerald-600' : 'text-rose-600'}`}>{msg.text}</p>
      )}
      <p className="mt-2 text-[11px] text-slate-400">
        Dubbele transacties worden automatisch herkend en overgeslagen — een overlappend afschrift
        uploaden (bijv. de 10e en later de 10e–11e) is dus geen probleem.
      </p>
    </DashboardCard>
  )
}
