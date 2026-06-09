'use client'

import { useState } from 'react'
import { Users, Cake, UserPlus, Pencil, Trash2 } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import DashboardCard from '@/components/DashboardCard'
import Modal from '@/components/Modal'
import { useFamily } from '@/lib/hooks'
import type { FamilyMember } from '@/lib/types'

const inputClass =
  'w-full rounded-xl border border-cardborder bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-brand/40 focus:ring-2 focus:ring-brand/20'

const empty = { name: '', role: '', birthday: '' }

export default function GezinPage() {
  const { members, isLoading, addMember, updateMember, removeMember } = useFamily()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<FamilyMember | null>(null)
  const [form, setForm] = useState(empty)

  const startAdd = () => {
    setEditing(null)
    setForm(empty)
    setOpen(true)
  }

  const startEdit = (member: FamilyMember) => {
    setEditing(member)
    setForm({ name: member.name, role: member.role ?? '', birthday: member.birthday ?? '' })
    setOpen(true)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    if (editing) await updateMember(editing.id, form)
    else await addMember(form)
    setOpen(false)
  }

  return (
    <>
      <PageHeader
        title="Gezin"
        subtitle="Het Jansen Gezin"
        icon={Users}
        iconClassName="bg-emerald-100 text-emerald-500"
        actions={
          <button
            type="button"
            onClick={startAdd}
            className="pill bg-brand px-4 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark"
          >
            <UserPlus className="h-4 w-4" />
            Lid toevoegen
          </button>
        }
      />

      {isLoading && members.length === 0 ? (
        <p className="text-sm text-slate-400">Laden…</p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {members.map((member) => (
            <DashboardCard key={member.id}>
              <div className="flex items-center gap-4">
                <span
                  className={`grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-xl font-bold text-white shadow-sm ${member.color}`}
                >
                  {member.initials}
                </span>
                <div className="min-w-0">
                  <p className="text-lg font-bold text-slate-800">{member.name}</p>
                  {member.role && <p className="text-sm text-slate-500">{member.role}</p>}
                  {member.birthday && (
                    <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-500">
                      <Cake className="h-3.5 w-3.5" /> {member.birthday}
                    </p>
                  )}
                </div>
                <div className="ml-auto flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => startEdit(member)}
                    aria-label={`${member.name} bewerken`}
                    className="grid h-9 w-9 place-items-center rounded-full border border-cardborder bg-white text-slate-500 transition-colors hover:bg-slate-50"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeMember(member.id)}
                    aria-label={`${member.name} verwijderen`}
                    className="grid h-9 w-9 place-items-center rounded-full border border-cardborder bg-white text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </DashboardCard>
          ))}
        </div>
      )}

      {/* Upcoming birthdays */}
      {members.some((m) => m.birthday) && (
        <DashboardCard title="Aankomende verjaardagen" icon={Cake} iconClassName="text-rose-500" className="mt-5">
          <ul className="flex flex-col">
            {members
              .filter((member) => member.birthday)
              .map((member, index, arr) => (
                <li key={member.id}>
                  <div className="flex items-center gap-3 py-3">
                    <span
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br text-sm font-bold text-white ${member.color}`}
                    >
                      {member.initials}
                    </span>
                    <span className="flex-1 text-sm font-semibold text-slate-800">{member.name}</span>
                    <span className="text-sm text-slate-500">{member.birthday}</span>
                  </div>
                  {index < arr.length - 1 && <hr className="border-cardborder" />}
                </li>
              ))}
          </ul>
        </DashboardCard>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Lid bewerken' : 'Lid toevoegen'}>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <label className="text-xs font-semibold text-slate-500">
            Naam
            <input
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Bijv. Lisa"
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <label className="text-xs font-semibold text-slate-500">
            Rol
            <input
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              placeholder="Bijv. Dochter"
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <label className="text-xs font-semibold text-slate-500">
            Verjaardag
            <input
              value={form.birthday}
              onChange={(e) => setForm({ ...form, birthday: e.target.value })}
              placeholder="Bijv. 12 april"
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <button
            type="submit"
            className="pill mt-2 bg-brand px-4 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark"
          >
            {editing ? 'Wijzigingen opslaan' : 'Lid opslaan'}
          </button>
        </form>
      </Modal>
    </>
  )
}
