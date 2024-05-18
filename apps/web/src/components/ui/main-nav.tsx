'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface NavLink {
  href: string
  match: string
  title: string
}

export interface MainNavProps extends React.HTMLAttributes<HTMLDivElement> {
  navLinks: NavLink[]
}

export function MainNav({ className, navLinks, ...props }: MainNavProps) {
  const pathname = usePathname()

  return (
    <nav
      className={cn(
        'inline-flex items-center justify-center rounded-md p-1',
        'bg-gray-100 dark:bg-gray-800',
        className,
      )}
      {...props}
    >
      {navLinks.map((link) => {
        const isActive = pathname.includes(link.match) || (pathname === '/' && link.match === 'tx')

        return (
          <Link
            href={link.href}
            key={link.href}
            className={cn(
              'inline-flex min-w-[100px] items-center justify-center rounded-[0.185rem] px-3 py-1.5  text-sm font-medium text-gray-700 transition-all',
              'disabled:pointer-events-none disabled:opacity-50',
              'focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2 dark:text-gray-200 dark:focus:ring-brand-400 dark:focus:ring-offset-brand-900',
              isActive ? 'bg-white text-gray-900 dark:bg-gray-900' : '',
            )}
          >
            {link.title}
          </Link>
        )
      })}
    </nav>
  )
}
