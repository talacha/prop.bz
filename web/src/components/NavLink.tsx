'use client'

import Link from 'next/link'
import {usePathname} from 'next/navigation'
import type {ReactNode} from 'react'

export function NavLink({href, type, children}: {href: string; type: string; children: ReactNode}) {
  const path = usePathname()
  const current = path === href || path.startsWith(href + '/')
  return <Link href={href} data-type={type} aria-current={current ? 'page' : undefined}>{children}</Link>
}
