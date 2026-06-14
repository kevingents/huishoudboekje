'use client'

import { useEffect, useState } from 'react'
import { ListTodo, Plus, Check, X, Trophy, Trash2, Clock, Star, Repeat, Users, ThumbsUp, RotateCcw, Hourglass } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import DashboardCard from '@/components/DashboardCard'
import Modal from '@/components/Modal'
import { useTasks, useRedemptions, useFamily, useAuth, pointsByMember, type Task } from '@/lib/hooks'
import { taskAssignees, displayNames } from '@/lib/assignees'

const inputClass =
  'w-full rounded-xl border border-cardborder bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-brand/40 focus:ring-2 focus:ring-brand/20'

const chip = (on: boolean) =>
  `rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
    on
      ? 'bg-brand text-white'
      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15'
  }`

export default function TakenPage() {
  const { tasks, isLoading, addTask, setStatus, removeTask } = useTasks()
  const { redemptions } = useRedemptions()
  const { members } = useFamily()
  const { user } = useAuth()

  // Wie ben ik (gezinslid-naam) en ben ik een ouder (geen kind)? Bepaalt welke
  // knoppen je ziet — de server dwingt dezelfde regels af.
  const myName = members.find((m) => m.id === user?.memberId)?.name ?? null
  const isParent = !!user && user.isChild !== true

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<{
    title: string
    assignees: string[]
    points: string
    dueDate: string
    description: string
    recurrence: string
  }>({ title: '', assignees: [], points: '0', dueDate: '', description: '', recurrence: 'geen' })

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('nieuw')) setOpen(true)
  }, [])

  const toggleAssignee = (name: string) =>
    setForm((f) => ({
      ...f,
      assignees: f.assignees.includes(name) ? f.assignees.filter((n) => n !== name) : [...f.assignees, name],
    }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    await addTask({
      title: form.title.trim(),
      assignees: form.assignees,
      points: Number(form.points) || 0,
      dueDate: form.dueDate || null,
      description: form.description.trim() || null,
      recurrence: form.recurrence,
    })
    setForm({ title: '', assignees: [], points: '0', dueDate: '', description: '', recurrence: 'geen' })
    setOpen(false)
  }

  const balances = pointsByMember(tasks, redemptions)
  const open0 = tasks.filter((t) => t.status === 'open')
  const todo = tasks.filter((t) => t.status === 'todo')
  const submitted = tasks.filter((t) => t.status === 'ingeleverd')
  const done = tasks.filter((t) => t.status === 'klaar').slice(0, 8)

  const memberColor = (name: string) => members.find((m) => m.name === name)?.color ?? 'from-slate-300 to-slate-400'
  const isMine = (t: Task) => {
    const a = taskAssignees(t)
    return a.length === 0 || (!!myName && a.includes(myName))
  }

  function Row({ task, children }: { task: Task; children?: React.ReactNode }) {
    const a = taskAssignees(task)
    const label = displayNames(a)
    return (
      <li className="flex items-center gap-3 py-3">
        {a.length === 1 ? (
          <span
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br text-xs font-bold text-white ${memberColor(a[0])}`}
            title={label}
          >
            {a[0].slice(0, 1).toUpperCase()}
          </span>
        ) : a.length > 1 ? (
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-violet-100 text-violet-500 dark:bg-violet-500/15 dark:text-violet-300"
            title={label}
          >
            <Users className="h-4 w-4" />
          </span>
        ) : (
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-400">
            <ListTodo className="h-4 w-4" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className={`truncate text-sm font-semibold ${task.status === 'klaar' ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-slate-100'}`}>
            {task.title}
          </p>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
            {label}
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
            {task.recurrence && task.recurrence !== 'geen' && (
              <span className="inline-flex items-center gap-0.5 text-sky-500">
                <Repeat className="h-3 w-3" />
                {task.recurrence}
              </span>
            )}
            {task.status === 'klaar' && task.approvedBy && (
              <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
                <ThumbsUp className="h-3 w-3" />
                {task.approvedBy}
              </span>
            )}
          </p>
        </div>
        {children}
        {isParent && (
          <button
            type="button"
            onClick={() => removeTask(task.id)}
            aria-label="Verwijderen"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
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
            className="pill bg-brand px-4 py-3 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark sm:py-2.5"
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
              <div key={m.id} className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 dark:bg-white/5">
                <span className={`grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br text-xs font-bold text-white ${m.color}`}>
                  {m.initials}
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{m.name}</p>
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
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Nog geen taken. Voeg een klusje toe en wijs het toe aan jezelf of een paar gezinsleden — diegene krijgt
            een melding en kan het accepteren of weigeren. Bij punten keurt een ouder de afronding goed.
          </p>
        </DashboardCard>
      ) : (
        <div className="flex flex-col gap-5">
          {open0.length > 0 && (
            <DashboardCard title="Wacht op acceptatie">
              <ul className="flex flex-col">
                {open0.map((task) => (
                  <Row key={task.id} task={task}>
                    {(isParent || isMine(task)) && (
                      <>
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
                      </>
                    )}
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
                    {isParent ? (
                      <button
                        type="button"
                        onClick={() => setStatus(task.id, 'klaar')}
                        className="pill shrink-0 bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Afronden
                      </button>
                    ) : isMine(task) ? (
                      <button
                        type="button"
                        onClick={() => setStatus(task.id, 'ingeleverd')}
                        className="pill shrink-0 bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Klaar melden
                      </button>
                    ) : null}
                  </Row>
                ))}
              </ul>
            </DashboardCard>
          )}

          {submitted.length > 0 && (
            <DashboardCard title="Klaar gemeld — wacht op goedkeuring">
              <ul className="flex flex-col">
                {submitted.map((task) => (
                  <Row key={task.id} task={task}>
                    {isParent ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setStatus(task.id, 'klaar')}
                          aria-label="Goedkeuren"
                          className="pill shrink-0 bg-brand px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark"
                        >
                          <ThumbsUp className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Goedkeuren</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatus(task.id, 'todo')}
                          aria-label="Afkeuren"
                          className="pill shrink-0 border border-cardborder bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-rose-50 hover:text-rose-500"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Afkeuren</span>
                        </button>
                      </>
                    ) : (
                      <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-amber-500">
                        <Hourglass className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Wacht op ouder</span>
                      </span>
                    )}
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

          <div>
            <p className="text-xs font-semibold text-slate-500">Voor wie</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {myName && (
                <button type="button" onClick={() => toggleAssignee(myName)} className={chip(form.assignees.includes(myName))}>
                  Mijzelf
                </button>
              )}
              {members
                .filter((m) => m.name !== myName)
                .map((m) => (
                  <button key={m.id} type="button" onClick={() => toggleAssignee(m.name)} className={chip(form.assignees.includes(m.name))}>
                    {m.name}
                  </button>
                ))}
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              {form.assignees.length === 0 ? 'Niemand gekozen = het hele gezin.' : `Voor ${displayNames(form.assignees)}.`}
            </p>
          </div>

          <label className="w-28 text-xs font-semibold text-slate-500">
            Punten
            <input
              inputMode="numeric"
              value={form.points}
              onChange={(e) => setForm({ ...form, points: e.target.value })}
              placeholder="0"
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <p className="-mt-1 text-[11px] text-slate-400">
            Punten zijn voor het gezinsspel. Laat op <span className="font-semibold">0</span> (of leeg) voor een
            gewone taak zonder beloning. Een ouder keurt de afronding goed.
          </p>

          <div className="flex gap-3">
            <label className="min-w-0 flex-1 text-xs font-semibold text-slate-500">
              Deadline (optioneel)
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className={`mt-1 ${inputClass}`}
              />
            </label>
            <label className="min-w-0 flex-1 text-xs font-semibold text-slate-500">
              Herhaling
              <select
                value={form.recurrence}
                onChange={(e) => setForm({ ...form, recurrence: e.target.value })}
                className={`mt-1 ${inputClass}`}
              >
                <option value="geen">Eenmalig</option>
                <option value="dagelijks">Dagelijks</option>
                <option value="wekelijks">Wekelijks</option>
                <option value="maandelijks">Maandelijks</option>
              </select>
            </label>
          </div>
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
