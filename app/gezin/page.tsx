import { Users, Cake, UserPlus, Mail } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import DashboardCard from '@/components/DashboardCard'
import { family } from '@/lib/mockData'

export default function GezinPage() {
  return (
    <>
      <PageHeader
        title="Gezin"
        subtitle={family.familyName}
        icon={Users}
        iconClassName="bg-emerald-100 text-emerald-500"
        actions={
          <button
            type="button"
            className="pill bg-brand px-4 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark"
          >
            <UserPlus className="h-4 w-4" />
            Lid toevoegen
          </button>
        }
      />

      {/* Members */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-2">
        {family.members.map((member) => (
          <DashboardCard key={member.name}>
            <div className="flex items-center gap-4">
              <span
                className={`grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-xl font-bold text-white shadow-sm ${member.color}`}
              >
                {member.initials}
              </span>
              <div className="min-w-0">
                <p className="text-lg font-bold text-slate-800">{member.name}</p>
                <p className="text-sm text-slate-500">{member.role}</p>
                {member.birthday && (
                  <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-500">
                    <Cake className="h-3.5 w-3.5" /> {member.birthday}
                  </p>
                )}
              </div>
              <button
                type="button"
                aria-label={`Stuur ${member.name} een bericht`}
                className="ml-auto grid h-10 w-10 shrink-0 place-items-center rounded-full border border-cardborder bg-white text-slate-500 transition-colors hover:bg-slate-50"
              >
                <Mail className="h-[18px] w-[18px]" strokeWidth={2.1} />
              </button>
            </div>
          </DashboardCard>
        ))}
      </div>

      {/* Upcoming birthdays */}
      <DashboardCard title="Aankomende verjaardagen" icon={Cake} iconClassName="text-rose-500" className="mt-5">
        <ul className="flex flex-col">
          {family.members
            .filter((member) => member.birthday)
            .map((member, index, arr) => (
              <li key={member.name}>
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
    </>
  )
}
