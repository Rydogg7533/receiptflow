import { ReactNode } from 'react'
import Sidebar from '@/components/platform/Sidebar'

interface PlatformLayoutProps {
  children: ReactNode
}

export default function PlatformLayout({ children }: PlatformLayoutProps) {
  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <main className="md:ml-64 min-h-screen flex flex-col">
        {/* Top padding on mobile to account for hamburger button */}
        <div className="pt-16 md:pt-0 px-4 md:px-8 py-6 flex-1">
          {children}
        </div>
      </main>
    </div>
  )
}
