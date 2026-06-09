'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { sidebarNav, type NavItem } from '@/lib/mockData'
import { useAuth } from '@/lib/hooks'

export default function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  return (
    <aside className="hidden w-[112px] shrink-0 flex-col border-r border-cardborder bg-white py-5 lg:flex">
      {/* Brand mark */}
      <Link href="/" className="mb-6 flex justify-center" aria-label="Naar het overzicht">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-brand to-emerald-600 text-lg font-extrabold text-white shadow-sm shadow-brand/30">
          h
        </div>
      </Link>

      {/* Menu */}
      <nav className="scrollbar-thin flex flex-1 flex-col items-center gap-1 overflow-y-auto px-2">
        {sidebarNav.map((item) => (
          <SidebarItem key={item.label} item={item} active={isActive(pathname, item.href)} />
        ))}
      </nav>

      {/* User + logout */}
      <div className="mx-2 mt-4 flex flex-col items-center gap-2">
        <span
          className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-brand to-emerald-600 text-sm font-bold text-white shadow-sm"
          title={user?.name ?? ''}
        >
          {(user?.name ?? '·').slice(0, 1).toUpperCase()}
        </span>
        <span className="line-clamp-2 text-center text-[11px] font-semibold leading-tight text-slate-700">
          {user?.name ?? '…'}
        </span>
        <button
          type="button"
          onClick={logout}
          aria-label="Uitloggen"
          className="flex flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-rose-500"
        >
          <LogOut className="h-5 w-5" strokeWidth={2.1} />
          <span className="text-[10px] font-medium">Uitloggen</span>
        </button>
      </div>
    </aside>
  )
}

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href)
}

function SidebarItem({ item, active }: { item: NavItem; active: boolean }) {
  const { label, icon: Icon, href } = item
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`group flex w-full flex-col items-center gap-1.5 rounded-2xl py-2.5 transition-colors ${
        active ? '' : 'hover:bg-slate-50'
      }`}
    >
      <span
        className={`grid h-10 w-10 place-items-center rounded-xl transition-colors ${
          active ? 'bg-brand-light text-brand' : 'text-slate-400 group-hover:text-slate-600'
        }`}
      >
        <Icon className="h-[22px] w-[22px]" strokeWidth={2.1} />
      </span>
      <span
        className={`text-center text-[11px] leading-tight ${
          active ? 'font-bold text-brand' : 'font-medium text-slate-500 group-hover:text-slate-700'
        }`}
      >
        {label}
      </span>
    </Link>
  )
}
