import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface DashboardCardProps {
  /** Optional header title. */
  title?: string
  /** Optional header icon (lucide-react). */
  icon?: LucideIcon
  /** Colour class for the header icon. */
  iconClassName?: string
  /** Background utility class (e.g. "bg-white", "bg-weather"). */
  bg?: string
  /** Whether to render the default card border. */
  bordered?: boolean
  /** Extra classes for the card wrapper. */
  className?: string
  /** Optional node rendered on the right side of the header. */
  headerRight?: ReactNode
  children?: ReactNode
}

/**
 * Generic white (or pastel) dashboard card with the shared rounded corners,
 * subtle border and soft hover shadow used throughout the app.
 */
export default function DashboardCard({
  title,
  icon: Icon,
  iconClassName = 'text-brand',
  bg = 'bg-white',
  bordered = true,
  className = '',
  headerRight,
  children,
}: DashboardCardProps) {
  return (
    <section
      className={[
        'h-full rounded-card p-5 shadow-card transition-all duration-200 hover:shadow-soft sm:p-6',
        bg,
        bordered ? 'border border-cardborder' : 'border border-transparent',
        className,
      ].join(' ')}
    >
      {(title || Icon || headerRight) && (
        <header className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {Icon && <Icon className={`h-5 w-5 ${iconClassName}`} strokeWidth={2.2} />}
            {title && <h2 className="text-[15px] font-bold text-slate-800 dark:text-slate-100 sm:text-base">{title}</h2>}
          </div>
          {headerRight}
        </header>
      )}
      {children}
    </section>
  )
}
