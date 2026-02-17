import { Plus, X } from 'lucide-react'

export interface Earning {
  description: string
  type: 'hourly' | 'salary' | 'bonus' | 'commission' | 'other'
  hours?: number
  rate?: number
  amount: number
}

interface EarningsSectionProps {
  earnings: Earning[]
  onChange: (earnings: Earning[]) => void
}

export default function EarningsSection({ earnings, onChange }: EarningsSectionProps) {
  const addEarning = () => {
    onChange([
      ...earnings,
      {
        description: '',
        type: 'hourly',
        hours: undefined,
        rate: undefined,
        amount: 0,
      },
    ])
  }

  const removeEarning = (index: number) => {
    onChange(earnings.filter((_, i) => i !== index))
  }

  const updateEarning = (index: number, field: keyof Earning, value: any) => {
    const updated = [...earnings]
    updated[index] = { ...updated[index], [field]: value }

    // Auto-calculate amount if hours and rate are provided
    if (field === 'hours' || field === 'rate') {
      const earning = updated[index]
      if (earning.hours && earning.rate) {
        earning.amount = earning.hours * earning.rate
      }
    }

    onChange(updated)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white">Earnings</h3>
        <button
          type="button"
          onClick={addEarning}
          className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          <Plus size={16} />
          Add Earning
        </button>
      </div>

      <div className="space-y-3">
        {earnings.map((earning, index) => (
          <div
            key={index}
            className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 space-y-3"
          >
            <div className="flex items-start gap-3">
              {/* Description */}
              <div className="flex-1">
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={earning.description}
                  onChange={(e) => updateEarning(index, 'description', e.target.value)}
                  placeholder="e.g., Regular Pay, Overtime, Bonus"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white text-sm focus:border-blue-600 focus:outline-none"
                />
              </div>

              {/* Type */}
              <div className="w-32">
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Type
                </label>
                <select
                  value={earning.type}
                  onChange={(e) => updateEarning(index, 'type', e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white text-sm focus:border-blue-600 focus:outline-none"
                >
                  <option value="hourly">Hourly</option>
                  <option value="salary">Salary</option>
                  <option value="bonus">Bonus</option>
                  <option value="commission">Commission</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Remove button */}
              <button
                type="button"
                onClick={() => removeEarning(index)}
                className="mt-6 p-2 text-zinc-500 hover:text-red-400 transition-colors"
                title="Remove"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {/* Hours (only for hourly) */}
              {earning.type === 'hourly' && (
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Hours
                  </label>
                  <input
                    type="number"
                    value={earning.hours || ''}
                    onChange={(e) => updateEarning(index, 'hours', e.target.value ? parseFloat(e.target.value) : undefined)}
                    step="0.01"
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>
              )}

              {/* Rate (only for hourly) */}
              {earning.type === 'hourly' && (
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Rate ($)
                  </label>
                  <input
                    type="number"
                    value={earning.rate || ''}
                    onChange={(e) => updateEarning(index, 'rate', e.target.value ? parseFloat(e.target.value) : undefined)}
                    step="0.01"
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>
              )}

              {/* Amount */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Amount ($)
                </label>
                <input
                  type="number"
                  value={earning.amount || ''}
                  onChange={(e) => updateEarning(index, 'amount', e.target.value ? parseFloat(e.target.value) : 0)}
                  step="0.01"
                  placeholder="0.00"
                  disabled={earning.type === 'hourly' && earning.hours && earning.rate}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white text-sm focus:border-blue-600 focus:outline-none disabled:opacity-50"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {earnings.length === 0 && (
        <div className="text-center py-8 bg-zinc-900 border border-zinc-800 rounded-lg">
          <p className="text-zinc-500 text-sm mb-3">No earnings added yet</p>
          <button
            type="button"
            onClick={addEarning}
            className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
          >
            + Add your first earning
          </button>
        </div>
      )}
    </div>
  )
}
