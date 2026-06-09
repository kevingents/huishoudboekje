import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  icon: LucideIcon
  /** Colour classes for the icon badge, e.g. "bg-violet-100 text-violet-500". */
  iconClassName?: string
  /** Optional actions rendered on the right (buttons, etc.). */
  actions?: ReactNode
}

/**
 * Shared page header used by the sub-pages: an icon badge, a title with an
 * optional subtitle, and an optional slot for actions on the right.
 */
export default function PageHeader({
  title,
  subtitle,
  icon: Icon,
  iconClassName = 'bg-brand-light text-brand',
  actions,
}: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className={`grid h-12 w-12 place-items-center rounded-2xl ${iconClassName}`}>
          <Icon className="h-7 w-7" strokeWidth={2.2} />
        </span>
        <div>
          <h1 className="text-xl font-extrabold text-slate-800 sm:text-2xl">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>

      {actions && <div className="flex items-center gap-3 sm:gap-4">{actions}</div>}
    </header>
  )
}
