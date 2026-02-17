'use client'

export default function ToolSwitcher() {
  const tools = [
    { name: 'Receipts', icon: '📄', active: true },
    { name: 'Pay Stubs', icon: '💰', active: false },
    { name: 'Invoices', icon: '📋', active: false },
    { name: 'Expenses', icon: '💳', active: false },
  ]

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-2">Tools</p>
      <div className="grid grid-cols-2 gap-2">
        {tools.map((tool) => (
          <button
            key={tool.name}
            className={`p-3 rounded-lg text-center text-sm transition-colors ${
              tool.active
                ? 'bg-blue-600 text-white font-medium'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 cursor-not-allowed opacity-60'
            }`}
            disabled={!tool.active}
            title={!tool.active ? 'Coming soon' : ''}
          >
            <div className="text-lg mb-1">{tool.icon}</div>
            <div className="text-xs">{tool.name}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
