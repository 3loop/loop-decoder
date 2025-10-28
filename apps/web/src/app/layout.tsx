import { Separator } from '@/components/ui/separator'
import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { MainNav } from '@/components/ui/main-nav'
import { Analytics } from '@vercel/analytics/react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { NpmAlert } from '@/components/NpmAlert'

const navLinks = [
  {
    href: '/calldata',
    match: '/calldata',
    title: 'Calldata',
  },
  {
    href: '/decode',
    match: 'decode',
    title: 'Transaction Decoder',
  },
  {
    href: '/interpret',
    match: 'interpret',
    title: 'Transaction Interpreter',
  },
]

const SOCIAL_LINKS = [
  {
    href: 'https://twitter.com/3loop_io',
    title: 'Twitter',
  },
  {
    href: 'https://github.com/3loop/loop-decoder',
    title: 'Github',
  },
  {
    href: 'https://loop-decoder.3loop.io/',
    title: 'Docs',
  },
]

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Loop Decoder',
  description: 'Demo of Loop Decoder',
}

const NavigationBar = () => {
  return (
    <>
      <div className="w-full mx-auto px-3 lg:px-4 max-w-screen-xl flex justify-between py-4 flex-row items-center space-y-0 md:h-16">
        <h2 className="text-lg font-semibold">Loop Decoder</h2>

        <MainNav className="mx-6 hidden lg:block" navLinks={navLinks} />

        <div className="hidden lg:flex flex-row space-x-4">
          {SOCIAL_LINKS.map((link) => (
            <a
              target="_blank"
              key={link.title}
              href={link.href}
              className="text-sm font-medium text-gray-700 transition-colors hover:text-gray-900 dark:text-gray-200 dark:hover:text-gray-100"
            >
              {link.title}
            </a>
          ))}
        </div>

        <div className="block lg:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Menu</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                {navLinks.map((link) => (
                  <DropdownMenuItem asChild key={link.href}>
                    <Link href={link.href}>{link.title}</Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                {SOCIAL_LINKS.map((link) => (
                  <DropdownMenuItem asChild key={link.title}>
                    <a target="_blank" href={link.href}>
                      {link.title}
                    </a>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <Separator />
    </>
  )
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex h-screen flex-col">
          <NavigationBar />
          <div className="w-full mx-auto px-3 lg:px-4 max-w-screen-xl h-full py-4">
            <NpmAlert />
            {children}
          </div>
        </div>
        <Analytics />
      </body>
    </html>
  )
}
