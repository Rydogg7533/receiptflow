'use client'

import { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  children?: ReactNode
  action?: ReactNode
}

export default function PageHeader({
  title,
  description,
  children,
  action,
}: PageHeaderProps) {
  return (
    <div className="border-b border-zinc-800 pb-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-white mb-2">{title}</h1>
          {description && (
            <p className="text-zinc-400">{description}</p>
          )}
          {children && (
            <div className="mt-2">
              {children}
            </div>
          )}
        </div>
        {action && (
          <div className="flex-shrink-0">
            {action}
          </div>
        )}
      </div>
    </div>
  )
}
