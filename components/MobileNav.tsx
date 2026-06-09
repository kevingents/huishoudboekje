'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Plus, Menu, type LucideIcon } from 'lucide-react'
import { mobileNav, type NavItem } from '@/lib/mockData'
import MobileMenu from './MobileMenu'

export default function MobileNav() {
  const pathname = usePathname()
  const [overzicht, agenda, , budget] = mobileNav
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-cardborder bg-white/90 backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-md items-end px-5 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
          <MobileNavButton item={overzicht} active={isActive(pathname, overzicht.href)} />
          <MobileNavButton item={agenda} active={isActive(pathname, agenda.href)} />

          {/* Central action button — snel een boodschap toevoegen */}
          <div className="flex flex-1 justify-center">
            <Link
              href="/boodschappen"
              aria-label="Nieuw item toevoegen"
              className="pill -mt-7 h-14 w-14 bg-brand text-white shadow-lg shadow-brand/30 transition-transform hover:scale-105"
            >
              <Plus className="h-7 w-7" strokeWidth={2.5} />
            </Link>
          </div>

          <MobileNavButton item={budget} active={isActive(pathname, budget.href)} />
          <MenuButton icon={Menu} label="Meer" active={menuOpen} onClick={() => setMenuOpen(true)} />
        </div>
      </nav>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  )
}

function MenuButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: LucideIcon
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 flex-col items-center gap-1 py-1 transition-colors ${
        active ? 'text-brand' : 'text-slate-400 hover:text-slate-600'
      }`}
    >
      <Icon className="h-5 w-5" strokeWidth={2.2} />
      <span className="text-[11px] font-medium">{label}</span>
    </button>
  )
}

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href)
}

function MobileNavButton({ item, active }: { item: NavItem; active: boolean }) {
  const { label, icon: Icon, href } = item
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`flex flex-1 flex-col items-center gap-1 py-1 transition-colors ${
        active ? 'text-brand' : 'text-slate-400 hover:text-slate-600'
      }`}
    >
      <Icon className="h-5 w-5" strokeWidth={2.2} />
      <span className="text-[11px] font-medium">{label}</span>
    </Link>
  )
}
