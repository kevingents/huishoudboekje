import { CreditCard, Clock } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import DashboardCard from '@/components/DashboardCard'

export default function AbonnementenPage() {
  return (
    <>
      <PageHeader
        title="Abonnementen"
        subtitle="Terugkerende betalingen via Mollie"
        icon={CreditCard}
        iconClassName="bg-sky-100 text-sky-500"
      />

      <DashboardCard>
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-500">
            <Clock className="h-6 w-6" strokeWidth={2.2} />
          </span>
          <div>
            <p className="text-base font-bold text-slate-800">Bijna klaar</p>
            <p className="mt-1 text-sm text-slate-500">
              Het abonnementenbeheer wordt gekoppeld aan Mollie. Zodra je in
              Instellingen een Mollie API-key invult, kun je hier terugkerende
              betalingen aanmaken en beheren.
            </p>
          </div>
        </div>
      </DashboardCard>
    </>
  )
}
