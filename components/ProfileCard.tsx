'use client'

import { useRef, useState } from 'react'
import { UserCircle, Camera, Pencil, KeyRound, Phone, MapPin, Cake, ShieldAlert } from 'lucide-react'
import DashboardCard from './DashboardCard'
import Modal from './Modal'
import { useProfile } from '@/lib/hooks'

const inputClass =
  'w-full rounded-xl border border-cardborder bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-brand/40 focus:ring-2 focus:ring-brand/20'

function initialsOf(name?: string) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '·'
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Verklein een foto naar een vierkante-ish JPEG data-URL voor de avatar. */
function downscale(file: File, max = 400): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('Canvas niet beschikbaar'))
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.8))
      }
      img.onerror = () => reject(new Error('Afbeelding kon niet worden geladen'))
      img.src = reader.result as string
    }
    reader.onerror = () => reject(new Error('Bestand kon niet worden gelezen'))
    reader.readAsDataURL(file)
  })
}

export default function ProfileCard() {
  const { profile, updateProfile, changePassword } = useProfile()
  const fileRef = useRef<HTMLInputElement>(null)

  const [editOpen, setEditOpen] = useState(false)
  const [pwOpen, setPwOpen] = useState(false)
  const [form, setForm] = useState({
    name: '',
    nickname: '',
    email: '',
    phone: '',
    address: '',
    birthday: '',
    emergencyContact: '',
  })
  const [pw, setPw] = useState({ current: '', next: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const openEdit = () => {
    setForm({
      name: profile?.name ?? '',
      nickname: profile?.nickname ?? '',
      email: profile?.email ?? '',
      phone: profile?.phone ?? '',
      address: profile?.address ?? '',
      birthday: profile?.birthday ?? '',
      emergencyContact: profile?.emergencyContact ?? '',
    })
    setError(null)
    setEditOpen(true)
  }

  const onPickAvatar = async (file: File | undefined) => {
    if (!file) return
    try {
      const dataUrl = await downscale(file)
      await updateProfile({ avatarUrl: dataUrl })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Foto verwerken mislukt.')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await updateProfile({
        name: form.name,
        nickname: form.nickname,
        email: form.email,
        phone: form.phone,
        address: form.address,
        birthday: form.birthday,
        emergencyContact: form.emergencyContact,
      })
      setEditOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Opslaan mislukt.')
    } finally {
      setBusy(false)
    }
  }

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setPwMsg(null)
    try {
      await changePassword(pw.current, pw.next)
      setPw({ current: '', next: '' })
      setPwMsg({ ok: true, text: 'Wachtwoord gewijzigd.' })
      setTimeout(() => setPwOpen(false), 900)
    } catch (err) {
      setPwMsg({ ok: false, text: err instanceof Error ? err.message : 'Wijzigen mislukt.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <DashboardCard title="Mijn profiel" icon={UserCircle} iconClassName="text-slate-600">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onPickAvatar(e.target.files?.[0])}
      />

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl"
          aria-label="Profielfoto wijzigen"
        >
          {profile?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatarUrl} alt="Profielfoto" className="h-full w-full object-cover" />
          ) : (
            <span className="grid h-full w-full place-items-center bg-gradient-to-br from-brand to-emerald-600 text-lg font-bold text-white">
              {initialsOf(profile?.name)}
            </span>
          )}
          <span className="absolute inset-x-0 bottom-0 grid place-items-center bg-slate-900/40 py-0.5 text-white">
            <Camera className="h-3.5 w-3.5" />
          </span>
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold text-slate-800">
            {profile?.name ?? '…'}
            {profile?.nickname && <span className="font-normal text-slate-400"> · {profile.nickname}</span>}
          </p>
          <p className="truncate text-sm text-slate-500">{profile?.email ?? ''}</p>
        </div>

        <button
          type="button"
          onClick={openEdit}
          className="pill shrink-0 border border-cardborder bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          <Pencil className="h-3.5 w-3.5" />
          Bewerken
        </button>
      </div>

      {(profile?.phone || profile?.address || profile?.birthday || profile?.emergencyContact) && (
        <div className="mt-3 flex flex-col gap-1.5 border-t border-cardborder pt-3 text-sm text-slate-600">
          {profile?.phone && (
            <p className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-slate-400" />
              {profile.phone}
            </p>
          )}
          {profile?.address && (
            <p className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              {profile.address}
            </p>
          )}
          {profile?.birthday && (
            <p className="flex items-center gap-2">
              <Cake className="h-3.5 w-3.5 text-slate-400" />
              {profile.birthday}
            </p>
          )}
          {profile?.emergencyContact && (
            <p className="flex items-center gap-2">
              <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
              Noodcontact: {profile.emergencyContact}
            </p>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          setPwMsg(null)
          setPw({ current: '', next: '' })
          setPwOpen(true)
        }}
        className="pill mt-3 w-full justify-center border border-cardborder bg-white px-4 py-2.5 text-slate-700 hover:bg-slate-50 sm:w-auto sm:justify-start"
      >
        <KeyRound className="h-4 w-4" />
        Wachtwoord wijzigen
      </button>

      {/* Profiel bewerken */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Profiel bewerken">
        <form onSubmit={saveProfile} className="flex flex-col gap-3">
          <div className="flex gap-3">
            <label className="flex-1 text-xs font-semibold text-slate-500">
              Naam
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={`mt-1 ${inputClass}`}
              />
            </label>
            <label className="flex-1 text-xs font-semibold text-slate-500">
              Roepnaam
              <input
                value={form.nickname}
                onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                placeholder="Bijv. San"
                className={`mt-1 ${inputClass}`}
              />
            </label>
          </div>
          <label className="text-xs font-semibold text-slate-500">
            E-mailadres
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <div className="flex gap-3">
            <label className="flex-1 text-xs font-semibold text-slate-500">
              Telefoon
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="06 12345678"
                className={`mt-1 ${inputClass}`}
              />
            </label>
            <label className="flex-1 text-xs font-semibold text-slate-500">
              Geboortedatum
              <input
                value={form.birthday}
                onChange={(e) => setForm({ ...form, birthday: e.target.value })}
                placeholder="bv. 12-04-1988"
                className={`mt-1 ${inputClass}`}
              />
            </label>
          </div>
          <label className="text-xs font-semibold text-slate-500">
            Adres
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Straat 1, 1234 AB Plaats"
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <label className="text-xs font-semibold text-slate-500">
            Noodcontact <span className="font-normal text-slate-400">— optioneel</span>
            <input
              value={form.emergencyContact}
              onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })}
              placeholder="Naam + telefoonnummer"
              className={`mt-1 ${inputClass}`}
            />
          </label>
          {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="pill mt-1 bg-brand px-4 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark disabled:opacity-50"
          >
            {busy ? 'Bezig…' : 'Opslaan'}
          </button>
        </form>
      </Modal>

      {/* Wachtwoord wijzigen */}
      <Modal open={pwOpen} onClose={() => setPwOpen(false)} title="Wachtwoord wijzigen">
        <form onSubmit={savePassword} className="flex flex-col gap-3">
          <label className="text-xs font-semibold text-slate-500">
            Huidig wachtwoord
            <input
              type="password"
              value={pw.current}
              onChange={(e) => setPw({ ...pw, current: e.target.value })}
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <label className="text-xs font-semibold text-slate-500">
            Nieuw wachtwoord
            <input
              type="password"
              value={pw.next}
              onChange={(e) => setPw({ ...pw, next: e.target.value })}
              placeholder="Minstens 6 tekens"
              className={`mt-1 ${inputClass}`}
            />
          </label>
          {pwMsg && (
            <p className={`text-sm font-medium ${pwMsg.ok ? 'text-emerald-600' : 'text-rose-600'}`}>
              {pwMsg.text}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="pill mt-1 bg-brand px-4 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark disabled:opacity-50"
          >
            {busy ? 'Bezig…' : 'Wachtwoord wijzigen'}
          </button>
        </form>
      </Modal>
    </DashboardCard>
  )
}
