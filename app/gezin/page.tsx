'use client'

import { useRef, useState } from 'react'
import { Users, Cake, UserPlus, Pencil, Trash2, Mail, Copy, Check, Shield, Sparkles, Camera } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import DashboardCard from '@/components/DashboardCard'
import Modal from '@/components/Modal'
import Crest from '@/components/Crest'
import { useFamily, useHousehold, useSettings } from '@/lib/hooks'
import { apiPost, apiPatch } from '@/lib/api'
import type { FamilyMember } from '@/lib/types'

const inputClass =
  'w-full rounded-xl border border-cardborder bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-brand/40 focus:ring-2 focus:ring-brand/20'

const empty = { name: '', role: '', birthday: '', email: '' }

/** Nette uitleg waarom de e-mail niet verstuurd kon worden. */
function emailFailNote(reason?: string): string {
  switch (reason) {
    case 'no_api_key':
      return 'E-mail is nog niet ingesteld — deel de onderstaande link zelf met dit gezinslid.'
    case 'resend_403':
      return 'De test-afzender mag alleen naar je eigen adres mailen. Deel de link zelf, of verifieer een eigen domein in Resend om gezinsleden direct te mailen.'
    default:
      return 'E-mail kon niet worden verstuurd — deel de onderstaande link zelf.'
  }
}

export default function GezinPage() {
  const { members, isLoading, addMember, updateMember, removeMember } = useFamily()
  const { household, mutate: mutateHousehold } = useHousehold()
  const { settings, setSetting, mutate: mutateSettings } = useSettings()
  const crest = typeof settings.familyCrest === 'string' ? settings.familyCrest : null
  const familyPhoto = typeof settings.familyPhoto === 'string' ? settings.familyPhoto : null

  // Gezinsfoto + gezinsnaam
  const photoRef = useRef<HTMLInputElement>(null)
  const [nameOpen, setNameOpen] = useState(false)
  const [nameDraft, setNameDraft] = useState('')

  const onPickPhoto = async (file: File | undefined) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const max = 600
        const scale = Math.min(1, max / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        setSetting('familyPhoto', canvas.toDataURL('image/jpeg', 0.7))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  }

  const openName = () => {
    setNameDraft(household?.name ?? '')
    setNameOpen(true)
  }
  const saveName = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nameDraft.trim()) return
    await apiPatch('/api/household', { name: nameDraft.trim() })
    await mutateHousehold()
    setNameOpen(false)
  }

  // Familiewapen genereren
  const [crestOpen, setCrestOpen] = useState(false)
  const [crestDesc, setCrestDesc] = useState('')
  const [crestBusy, setCrestBusy] = useState(false)
  const [crestError, setCrestError] = useState<string | null>(null)

  const openCrest = () => {
    setCrestDesc(typeof settings.familyCrestDescription === 'string' ? settings.familyCrestDescription : '')
    setCrestError(null)
    setCrestOpen(true)
  }

  const generateCrest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!crestDesc.trim()) return
    setCrestBusy(true)
    setCrestError(null)
    try {
      await apiPost('/api/household/crest', { description: crestDesc })
      // De route slaat het server-side op; haal de settings opnieuw op.
      await mutateSettings()
      setCrestOpen(false)
    } catch (err) {
      setCrestError(err instanceof Error ? err.message : 'Genereren mislukt.')
    } finally {
      setCrestBusy(false)
    }
  }

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<FamilyMember | null>(null)
  const [form, setForm] = useState(empty)

  const startAdd = () => {
    setEditing(null)
    setForm(empty)
    setInviteFor(null)
    setInviteResult(null)
    setInviteError(null)
    setOpen(true)
  }

  const startEdit = (member: FamilyMember) => {
    setEditing(member)
    setForm({ name: member.name, role: member.role ?? '', birthday: member.birthday ?? '', email: '' })
    setOpen(true)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    const member = { name: form.name, role: form.role, birthday: form.birthday }
    if (editing) {
      await updateMember(editing.id, member)
      setOpen(false)
      return
    }
    await addMember(member)
    setOpen(false)

    // Optioneel meteen een uitnodiging sturen als er een e-mailadres is ingevuld.
    const email = form.email.trim()
    if (!email) return
    const placeholder = { id: -1, name: form.name } as FamilyMember
    setInviteEmail(email)
    setInviteError(null)
    setInviteResult(null)
    try {
      const res = (await apiPost('/api/family/invite', { email, name: form.name })) as {
        link: string
        emailed: boolean
      }
      setInviteResult(res)
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Uitnodigen mislukt.')
    } finally {
      setInviteFor(placeholder)
    }
  }

  // Uitnodigen
  const [inviteFor, setInviteFor] = useState<FamilyMember | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteBusy, setInviteBusy] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteResult, setInviteResult] = useState<{ link: string; emailed: boolean; reason?: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const startInvite = (member: FamilyMember) => {
    setInviteFor(member)
    setInviteEmail('')
    setInviteError(null)
    setInviteResult(null)
    setCopied(false)
  }

  const sendInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteFor || !inviteEmail.trim()) return
    setInviteBusy(true)
    setInviteError(null)
    try {
      const res = (await apiPost('/api/family/invite', {
        email: inviteEmail,
        name: inviteFor.name,
      })) as { link: string; emailed: boolean; reason?: string }
      setInviteResult(res)
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Uitnodigen mislukt.')
    } finally {
      setInviteBusy(false)
    }
  }

  const copyLink = async () => {
    if (!inviteResult) return
    try {
      await navigator.clipboard.writeText(inviteResult.link)
      setCopied(true)
    } catch {
      /* clipboard niet beschikbaar */
    }
  }

  return (
    <>
      <PageHeader
        title="Gezin"
        subtitle={household?.name ?? 'Jullie gezin'}
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

      {/* Ons gezin: foto + naam */}
      <DashboardCard className="mb-5">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => photoRef.current?.click()}
            className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-slate-100"
            aria-label="Gezinsfoto wijzigen"
          >
            {familyPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={familyPhoto} alt="Gezinsfoto" className="h-full w-full object-cover" />
            ) : (
              <span className="grid h-full w-full place-items-center text-slate-400">
                <Users className="h-7 w-7" />
              </span>
            )}
            <span className="absolute inset-x-0 bottom-0 grid place-items-center bg-slate-900/40 py-0.5 text-white">
              <Camera className="h-3.5 w-3.5" />
            </span>
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Gezinsnaam</p>
            <p className="truncate text-lg font-extrabold text-slate-800">{household?.name ?? 'Ons gezin'}</p>
          </div>
          <button
            type="button"
            onClick={openName}
            className="pill shrink-0 border border-cardborder bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            <Pencil className="h-3.5 w-3.5" />
            Naam
          </button>
        </div>
        <input
          ref={photoRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onPickPhoto(e.target.files?.[0])}
        />
      </DashboardCard>

      {/* Familiewapen */}
      <DashboardCard
        bg="bg-gradient-to-br from-brand-light to-white"
        bordered={false}
        className="mb-5 ring-1 ring-brand/15"
      >
        <div className="flex items-center gap-4">
          {crest ? (
            <Crest svg={crest} className="h-20 w-16 shrink-0 object-contain drop-shadow-sm" />
          ) : (
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white text-brand shadow-sm">
              <Shield className="h-8 w-8" strokeWidth={2} />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold text-slate-800">Familiewapen</p>
            <p className="text-sm text-slate-500">
              {crest
                ? 'Jullie eigen wapen — verschijnt door de hele app.'
                : 'Maak een uniek wapen op basis van hoe jullie gezin is.'}
            </p>
          </div>
          <button
            type="button"
            onClick={openCrest}
            className="pill shrink-0 bg-brand px-4 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark"
          >
            <Sparkles className="h-4 w-4" />
            {crest ? 'Opnieuw' : 'Genereren'}
          </button>
        </div>
      </DashboardCard>

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
                    onClick={() => startInvite(member)}
                    aria-label={`${member.name} uitnodigen`}
                    title="Uitnodigen via e-mail"
                    className="grid h-9 w-9 place-items-center rounded-full border border-cardborder bg-white text-slate-500 transition-colors hover:bg-brand-light hover:text-brand"
                  >
                    <Mail className="h-4 w-4" />
                  </button>
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
          {!editing && (
            <label className="text-xs font-semibold text-slate-500">
              E-mailadres <span className="font-normal text-slate-400">— optioneel</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="naam@voorbeeld.nl"
                className={`mt-1 ${inputClass}`}
              />
              <span className="mt-1 flex items-center gap-1.5 text-[11px] font-normal text-slate-400">
                <Mail className="h-3 w-3" />
                Vul in om dit lid meteen een uitnodiging te sturen om zelf in te loggen.
              </span>
            </label>
          )}
          <button
            type="submit"
            className="pill mt-2 bg-brand px-4 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark"
          >
            {editing ? 'Wijzigingen opslaan' : form.email.trim() ? 'Opslaan & uitnodigen' : 'Lid opslaan'}
          </button>
        </form>
      </Modal>

      <Modal open={!!inviteFor} onClose={() => setInviteFor(null)} title={inviteFor ? `${inviteFor.name} uitnodigen` : ''}>
        {inviteResult ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-slate-600">
              {inviteResult.emailed
                ? `Uitnodiging verstuurd naar ${inviteEmail}.`
                : emailFailNote(inviteResult.reason)}
            </p>
            <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-2">
              <span className="min-w-0 flex-1 truncate text-xs text-slate-600">{inviteResult.link}</span>
              <button
                type="button"
                onClick={copyLink}
                className="pill shrink-0 bg-white px-3 py-1.5 text-xs text-slate-700 ring-1 ring-cardborder hover:bg-slate-100"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-brand" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Gekopieerd' : 'Kopieer'}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setInviteFor(null)}
              className="pill mt-1 bg-brand px-4 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark"
            >
              Klaar
            </button>
          </div>
        ) : (
          <form onSubmit={sendInvite} className="flex flex-col gap-3">
            <p className="text-sm text-slate-500">
              Stuur {inviteFor?.name} een uitnodiging om een eigen account aan te maken in dit gezin.
            </p>
            <label className="text-xs font-semibold text-slate-500">
              E-mailadres
              <input
                autoFocus
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="naam@voorbeeld.nl"
                className={`mt-1 ${inputClass}`}
              />
            </label>
            {inviteError && <p className="text-sm font-medium text-rose-600">{inviteError}</p>}
            <button
              type="submit"
              disabled={inviteBusy}
              className="pill mt-1 bg-brand px-4 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark disabled:opacity-50"
            >
              <Mail className="h-4 w-4" />
              {inviteBusy ? 'Bezig…' : 'Uitnodiging versturen'}
            </button>
          </form>
        )}
      </Modal>

      <Modal open={crestOpen} onClose={() => setCrestOpen(false)} title="Familiewapen genereren">
        <form onSubmit={generateCrest} className="flex flex-col gap-3">
          <p className="text-sm text-slate-500">
            Beschrijf in een paar woorden hoe jullie gezin is. De AI maakt er een uniek wapen van dat
            door de hele app verschijnt.
          </p>
          <textarea
            autoFocus
            rows={3}
            value={crestDesc}
            onChange={(e) => setCrestDesc(e.target.value)}
            placeholder="Bijv. avontuurlijk, dol op de zee, twee katten, houden van muziek"
            className={inputClass}
          />
          {crestError && <p className="text-sm font-medium text-rose-600">{crestError}</p>}
          <button
            type="submit"
            disabled={crestBusy}
            className="pill mt-1 bg-brand px-4 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            {crestBusy ? 'Bezig met tekenen…' : 'Genereer wapen'}
          </button>
        </form>
      </Modal>

      <Modal open={nameOpen} onClose={() => setNameOpen(false)} title="Gezinsnaam wijzigen">
        <form onSubmit={saveName} className="flex flex-col gap-3">
          <input
            autoFocus
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            placeholder="Bijv. Het Willigenburg Gezin"
            className={inputClass}
          />
          <button
            type="submit"
            className="pill bg-brand px-4 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark"
          >
            Opslaan
          </button>
        </form>
      </Modal>
    </>
  )
}
