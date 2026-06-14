'use client'

import { useRef, useState } from 'react'
import { mutate } from 'swr'
import { UploadCloud, FileText, Check, Loader2, AlertCircle, RotateCcw } from 'lucide-react'
import DashboardCard from './DashboardCard'
import { apiPost } from '@/lib/api'
import { useSettings } from '@/lib/hooks'

type ImportMode = 'expenses' | 'income' | 'both'
const MODES: { key: ImportMode; label: string }[] = [
  { key: 'expenses', label: 'Alleen uitgaven' },
  { key: 'income', label: 'Alleen inkomsten' },
  { key: 'both', label: 'Beide' },
]

type UploadedFile = {
  id: number
  name: string
  size: number
  status: 'processing' | 'done' | 'error'
  detail?: string
}

function formatSize(bytes: number) {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`
  if (bytes >= 1000) return `${Math.round(bytes / 1000)} KB`
  return `${bytes} B`
}

export default function BudgetImport() {
  const { settings, setSetting } = useSettings()
  const mode: ImportMode = MODES.some((m) => m.key === settings.importMode)
    ? (settings.importMode as ImportMode)
    : 'expenses'
  const fileRef = useRef<HTMLInputElement>(null)
  const idRef = useRef(0)
  const [busy, setBusy] = useState(false)
  const [drag, setDrag] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [files, setFiles] = useState<UploadedFile[]>([])

  const resetAll = async () => {
    if (
      !window.confirm(
        'Weet je het zeker? Dit wist al je transacties, categorieën, inkomsten, vaste lasten, leningen en geleerde regels. Je account en gezin blijven bestaan.',
      )
    )
      return
    setResetting(true)
    setMsg(null)
    try {
      await apiPost('/api/budget/reset', {})
      await Promise.all([
        mutate('/api/budget/transactions'),
        mutate('/api/budget/categories'),
        mutate('/api/income'),
        mutate('/api/fixed-costs'),
        mutate('/api/loans'),
        mutate('/api/budget/uncategorized'),
      ])
      setFiles([])
      setMsg({ ok: true, text: 'Budget leeggemaakt. Je kunt nu een schone maand inladen.' })
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Leegmaken mislukt.' })
    } finally {
      setResetting(false)
    }
  }

  const onFile = async (file?: File) => {
    if (!file) return
    const id = ++idRef.current
    setFiles((f) => [{ id, name: file.name, size: file.size, status: 'processing' as const }, ...f].slice(0, 6))
    setBusy(true)
    setMsg(null)
    const patch = (data: Partial<UploadedFile>) => setFiles((fs) => fs.map((x) => (x.id === id ? { ...x, ...data } : x)))
    try {
      const dataUrl = await new Promise<string>((res, rej) => {
        const r = new FileReader()
        r.onload = () => res(r.result as string)
        r.onerror = () => rej(new Error('Bestand kon niet worden gelezen'))
        r.readAsDataURL(file)
      })
      const res = (await apiPost('/api/budget/import', { file: dataUrl, filename: file.name, importMode: mode })) as {
        source?: string
        expenses: number
        incomes: number
        categories: number
        skipped?: number
      }
      await Promise.all([
        mutate('/api/budget/transactions'),
        mutate('/api/budget/categories'),
        mutate('/api/budget/uncategorized'),
        mutate('/api/income'),
      ])
      const skip = res.skipped ?? 0
      let text: string
      if (res.expenses === 0 && res.incomes === 0 && skip > 0) {
        text = `Niets nieuws — alle ${skip} transacties stonden al in je budget.`
      } else if (res.source === 'bank') {
        const parts: string[] = []
        if (res.expenses) parts.push(`${res.expenses} afschrijvingen`)
        if (res.incomes) parts.push(`${res.incomes} bijschrijvingen`)
        text = `${parts.join(' en ') || 'Geen nieuwe transacties'}${skip ? `, ${skip} dubbel overgeslagen` : ''}.${
          res.expenses ? ' Deel de uitgaven nu in onder "Categoriseren".' : ''
        }`
      } else {
        const parts: string[] = []
        if (res.expenses) parts.push(`${res.expenses} uitgaven`)
        if (res.incomes) parts.push(`${res.incomes} inkomsten`)
        text = `${parts.join(' en ') || 'Geen nieuwe transacties'}${skip ? `, ${skip} al aanwezig` : ''} en ${res.categories} categorieën.`
      }
      patch({ status: 'done', detail: text })
      setMsg({ ok: true, text })
    } catch (e) {
      const text = e instanceof Error ? e.message : 'Import mislukt.'
      patch({ status: 'error', detail: text })
      setMsg({ ok: false, text })
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <DashboardCard title="Bestanden uploaden" icon={UploadCloud} iconClassName="text-brand" className="lg:col-span-2">
      <input ref={fileRef} type="file" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />

      {/* Wat importeren — keuze wordt onthouden (geldt voor bankafschrift én budget-Excel). */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-500">Wat importeren:</span>
        <div className="flex w-full gap-1 rounded-xl bg-slate-100 p-1 sm:w-auto dark:bg-white/5">
          {MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setSetting('importMode', m.key)}
              className={`flex-1 rounded-lg px-3 py-2 text-center text-xs font-semibold transition-colors sm:flex-none ${
                mode === m.key
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Drag & drop zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDrag(true)
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDrag(false)
            onFile(e.dataTransfer.files?.[0])
          }}
          className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
            drag ? 'border-brand bg-brand-light' : 'border-cardborder bg-slate-50'
          }`}
        >
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand/15 text-brand">
            <UploadCloud className={`h-6 w-6 ${busy ? 'animate-pulse' : ''}`} />
          </span>
          <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Sleep je bestand hierheen</p>
          <p className="text-xs text-slate-400">CSV · XLSX · MT940 · CAMT.053 · ABN TXT</p>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="pill mt-3 bg-brand px-4 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark disabled:opacity-50"
          >
            {busy ? 'Bezig met verwerken…' : 'Kies bestand'}
          </button>
        </div>

        {/* Geüploade bestanden (deze sessie) */}
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Geüploade bestanden</p>
          {files.length === 0 ? (
            <p className="text-sm text-slate-400">Nog niets geüpload deze sessie.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {files.map((f) => (
                <li key={f.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-slate-400 dark:bg-white/10">
                    <FileText className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100" title={f.name}>
                      {f.name}
                    </p>
                    <p className="truncate text-[11px] text-slate-400">
                      {formatSize(f.size)}
                      {f.detail ? ` · ${f.detail}` : ''}
                    </p>
                  </div>
                  <span className="shrink-0">
                    {f.status === 'processing' ? (
                      <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                    ) : f.status === 'done' ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-rose-500" />
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {msg && (
        <p className={`mt-3 text-sm font-medium ${msg.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
          {msg.text}
        </p>
      )}
      <p className="mt-2 text-[11px] text-slate-400">
        Dubbele transacties worden automatisch herkend en overgeslagen — een overlappend afschrift uploaden is
        dus geen probleem. Ondersteunt ook je budget-Excel (tabbladen Uitgaven/Inkomsten Logboek).
      </p>

      <div className="mt-4 border-t border-cardborder pt-3">
        <button
          type="button"
          onClick={resetAll}
          disabled={resetting}
          className="pill bg-rose-50 px-3.5 py-2 text-sm font-semibold text-rose-600 ring-1 ring-rose-200 hover:bg-rose-100 disabled:opacity-50 dark:text-rose-300 dark:ring-rose-800/50"
        >
          <RotateCcw className={`h-4 w-4 ${resetting ? 'animate-spin' : ''}`} />
          {resetting ? 'Leegmaken…' : 'Begin opnieuw — budget leegmaken'}
        </button>
        <p className="mt-1.5 text-[11px] text-slate-400">
          Wist transacties, categorieën, inkomsten, vaste lasten, leningen en geleerde regels. Je account en gezin
          blijven bestaan.
        </p>
      </div>
    </DashboardCard>
  )
}
