'use client'

import { useEffect, useState } from 'react'
import { ListTodo, Plus, Check, X, Trophy, Trash2, Clock, Star } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import DashboardCard from '@/components/DashboardCard'
import Modal from '@/components/Modal'
import { useTasks, useRedemptions, useFamily, pointsByMember, type Task } from '@/lib/hooks'

const inputClass =
  'w-full rounded-xl border border-cardborder bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-brand/40 focus:ring-2 focus:ring-brand/20'

export default function TakenPage() {
  const { tasks, isLoading, addTask, setStatus, removeTask } = useTasks()
  const { redemptions } = useRedemptions()
  const { members } = useFamily()

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title: '', assignedTo: '', points: '10', dueDate: '', description: '' })

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('nieuw')) setOpen(true)
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    await addTask({
      title: form.title.trim(),
      assignedTo: form.assignedTo || null,
      points: Number(form.points) || 0,
      dueDate: form.dueDate || null,
      description: form.description.trim() || null,
    })
    setForm({ title: '', assignedTo: '', points: '10', dueDate: '', description: '' })
    setOpen(false)
  }

  const balances = pointsByMember(tasks, redemptions)
  const open0 = tasks.filter((t) => t.status === 'open')
  const todo = tasks.filter((t) => t.status === 'todo')
  const done = tasks.filter((t) => t.status === 'klaar').slice(0, 8)

  const memberColor = (name: string | null) => members.find((m) => m.name === name)?.color ?? 'from-slate-300 to-slate-400'

  function Row({ task, children }: { task: Task; children?: React.ReactNode }) {
    return (
      <li className="flex items-center gap-3 py-3">
        {task.assignedTo ? (
          <span
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br text-xs font-bold text-white ${memberColor(task.assignedTo)}`}
            title={task.assignedTo}
          >
            {task.assignedTo.slice(0, 1).toUpperCase()}
          </span>
        ) : (
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-400">
            <ListTodo className="h-4 w-4" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className={`truncate text-sm font-semibold ${task.status === 'klaar' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
            {task.title}
          </p>
          <p className="flex items-center gap-2 text-xs text-slate-500">
            {task.assignedTo ?? 'Hele gezin'}
            {task.points > 0 && (
              <span className="inline-flex items-center gap-0.5 font-semibold text-amber-500">
                <Star className="h-3 w-3" />
                {task.points}
              </span>
            )}
            {task.dueDate && (
              <span className="inline-flex items-center gap-0.5">
                <Clock className="h-3 w-3" />
                {task.dueDate}
              </span>
            )}
          </p>
        </div>
        {children}
        <button
          type="button"
          onClick={() => removeTask(task.id)}
          aria-label="Verwijderen"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </li>
    )
  }

  return (
    <>
      <PageHeader
        title="Taken"
        subtitle="Het gezinsspel — verdien punten met klusjes"
        icon={ListTodo}
        iconClassName="bg-violet-100 text-violet-500"
        actions={
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="pill bg-brand px-4 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark"
          >
            <Plus className="h-4 w-4" />
            Taak toevoegen
          </button>
        }
      />

      {/* Scorebord */}
      {members.length > 0 && (
        <DashboardCard title="Scorebord" icon={Trophy} iconClassName="text-amber-500" className="mb-5">
          <div className="flex flex-wrap gap-3">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2">
                <span className={`grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br text-xs font-bold text-white ${m.color}`}>
                  {m.initials}
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-800">{m.name}</p>
                  <p className="flex items-center gap-0.5 text-xs font-semibold text-amber-500">
                    <Star className="h-3 w-3" /> {balances[m.name] ?? 0} punten
                  </p>
                </div>
              </div>
            ))}
          </div>
        </DashboardCard>
      )}

      {isLoading && tasks.length === 0 ? (
        <p className="text-sm text-slate-400">Laden…</p>
      ) : tasks.length === 0 ? (
        <DashboardCard>
          <p className="text-sm text-slate-600">
            Nog geen taken. Voeg een klusje toe en wijs het toe aan een gezinslid — diegene krijgt een
            melding en kan het accepteren of weigeren.
          </p>
        </DashboardCard>
      ) : (
        <div className="flex flex-col gap-5">
          {open0.length > 0 && (
            <DashboardCard title="Wacht op acceptatie">
              <ul className="flex flex-col">
                {open0.map((task) => (
                  <Row key={task.id} task={task}>
                    <button
                      type="button"
                      onClick={() => setStatus(task.id, 'todo')}
                      aria-label="Accepteren"
                      className="pill shrink-0 bg-brand-light px-2.5 py-1.5 text-xs font-semibold text-brand hover:bg-emerald-100"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Accepteren</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus(task.id, 'geweigerd')}
                      aria-label="Weigeren"
                      className="pill shrink-0 border border-cardborder bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-rose-50 hover:text-rose-500"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Weigeren</span>
                    </button>
                  </Row>
                ))}
              </ul>
            </DashboardCard>
          )}

          {todo.length > 0 && (
            <DashboardCard title="Te doen">
              <ul className="flex flex-col">
                {todo.map((task) => (
                  <Row key={task.id} task={task}>
                    <button
                      type="button"
                      onClick={() => setStatus(task.id, 'klaar')}
                      className="pill shrink-0 bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Klaar
                    </button>
                  </Row>
                ))}
              </ul>
            </DashboardCard>
          )}

          {done.length > 0 && (
            <DashboardCard title="Afgerond">
              <ul className="flex flex-col">
                {done.map((task) => (
                  <Row key={task.id} task={task} />
                ))}
              </ul>
            </DashboardCard>
          )}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Taak toevoegen">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <label className="text-xs font-semibold text-slate-500">
            Taak
            <input
              autoFocus
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Bijv. Tafel afruimen"
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <div className="flex gap-3">
            <label className="flex-1 text-xs font-semibold text-slate-500">
              Voor wie
              <select
                value={form.assignedTo}
                onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
                className={`mt-1 ${inputClass}`}
              >
                <option value="">Hele gezin</option>
                {members.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="w-24 text-xs font-semibold text-slate-500">
              Punten
              <input
                inputMode="numeric"
                value={form.points}
                onChange={(e) => setForm({ ...form, points: e.target.value })}
                className={`mt-1 ${inputClass}`}
              />
            </label>
          </div>
          <label className="text-xs font-semibold text-slate-500">
            Deadline (optioneel)
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <button
            type="submit"
            className="pill mt-1 bg-brand px-4 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark"
          >
            Taak toewijzen
          </button>
        </form>
      </Modal>
    </>
  )
}
