'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import ToolSwitcher from './ToolSwitcher'
import UserMenu from './UserMenu'

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: '📊' },
    { label: 'Receipts', href: '/receipts', icon: '📄' },
    { label: 'Pay Stubs', href: '/paystubs', icon: '💰', disabled: true },
    { label: 'Invoices', href: '/invoices', icon: '📋', disabled: true },
  ]

  const isActive = (href: string) => pathname.startsWith(href)

  return (
    <>
      {/* Mobile hamburger menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-40 md:hidden p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white hover:bg-zinc-800 transition-colors"
        aria-label="Toggle menu"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-30 h-screen w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col transition-transform md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo / Branding */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">
              TS
            </div>
            <span className="font-semibold text-white hidden sm:inline">ToolSuite</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                isActive(item.href)
                  ? 'bg-blue-600 text-white font-medium'
                  : item.disabled
                    ? 'text-zinc-600 cursor-not-allowed opacity-50'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
              }`}
              aria-disabled={item.disabled}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.disabled && <span className="text-xs bg-zinc-800 px-2 py-1 rounded text-zinc-500">Soon</span>}
            </Link>
          ))}
        </nav>

        {/* Tool Switcher (divider) */}
        <div className="px-4 py-4 border-t border-zinc-800">
          <ToolSwitcher />
        </div>

        {/* User Menu */}
        <div className="px-4 py-4 border-t border-zinc-800">
          <UserMenu />
        </div>
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
