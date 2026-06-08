import { Plus } from 'lucide-react'
import { mobileNav, type NavItem } from '@/lib/mockData'

export default function MobileNav() {
  const [overzicht, berichten, taken, notities] = mobileNav

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-cardborder bg-white/90 backdrop-blur-md lg:hidden">
      <div className="mx-auto flex max-w-md items-end px-5 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        <MobileNavButton item={overzicht} />
        <MobileNavButton item={berichten} />

        {/* Central action button */}
        <div className="flex flex-1 justify-center">
          <button
            type="button"
            aria-label="Nieuw item toevoegen"
            className="pill -mt-7 h-14 w-14 bg-brand text-white shadow-lg shadow-brand/30 transition-transform hover:scale-105"
          >
            <Plus className="h-7 w-7" strokeWidth={2.5} />
          </button>
        </div>

        <MobileNavButton item={taken} />
        <MobileNavButton item={notities} />
      </div>
    </nav>
  )
}

function MobileNavButton({ item }: { item: NavItem }) {
  const { label, icon: Icon, active } = item
  return (
    <button
      type="button"
      className={`flex flex-1 flex-col items-center gap-1 py-1 transition-colors ${
        active ? 'text-brand' : 'text-slate-400 hover:text-slate-600'
      }`}
    >
      <Icon className="h-5 w-5" strokeWidth={2.2} />
      <span className="text-[11px] font-medium">{label}</span>
    </button>
  )
}
