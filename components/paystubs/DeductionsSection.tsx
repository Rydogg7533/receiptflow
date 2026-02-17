import { Plus, X } from 'lucide-react'

export interface Deduction {
  description: string
  type: 'tax' | 'retirement' | 'insurance' | 'other'
  amount: number
}

interface DeductionsSectionProps {
  deductions: Deduction[]
  onChange: (deductions: Deduction[]) => void
}

export default function DeductionsSection({ deductions, onChange }: DeductionsSectionProps) {
  const addDeduction = () => {
    onChange([
      ...deductions,
      {
        description: '',
        type: 'tax',
        amount: 0,
      },
    ])
  }

  const removeDeduction = (index: number) => {
    onChange(deductions.filter((_, i) => i !== index))
  }

  const updateDeduction = (index: number, field: keyof Deduction, value: any) => {
    const updated = [...deductions]
    updated[index] = { ...updated[index], [field]: value }
    onChange(updated)
  }

  const addStandardDeductions = () => {
    onChange([
      ...deductions,
      {
        description: 'Federal Income Tax',
        type: 'tax',
        amount: 0,
      },
      {
        description: 'State Income Tax',
        type: 'tax',
        amount: 0,
      },
      {
        description: 'Social Security (6.2%)',
        type: 'tax',
        amount: 0,
      },
      {
        description: 'Medicare (1.45%)',
        type: 'tax',
        amount: 0,
      },
    ])
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white">Deductions</h3>
        <div className="flex items-center gap-2">
          {deductions.length === 0 && (
            <button
              type="button"
              onClick={addStandardDeductions}
              className="text-xs text-zinc-400 hover:text-zinc-300 transition-colors"
            >
              Add Standard
            </button>
          )}
          <button
            type="button"
            onClick={addDeduction}
            className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            <Plus size={16} />
            Add Deduction
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {deductions.map((deduction, index) => (
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
                  value={deduction.description}
                  onChange={(e) => updateDeduction(index, 'description', e.target.value)}
                  placeholder="e.g., Federal Tax, 401k, Health Insurance"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white text-sm focus:border-blue-600 focus:outline-none"
                />
              </div>

              {/* Type */}
              <div className="w-32">
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Type
                </label>
                <select
                  value={deduction.type}
                  onChange={(e) => updateDeduction(index, 'type', e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white text-sm focus:border-blue-600 focus:outline-none"
                >
                  <option value="tax">Tax</option>
                  <option value="retirement">Retirement</option>
                  <option value="insurance">Insurance</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Amount */}
              <div className="w-32">
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Amount ($)
                </label>
                <input
                  type="number"
                  value={deduction.amount || ''}
                  onChange={(e) => updateDeduction(index, 'amount', e.target.value ? parseFloat(e.target.value) : 0)}
                  step="0.01"
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white text-sm focus:border-blue-600 focus:outline-none"
                />
              </div>

              {/* Remove button */}
              <button
                type="button"
                onClick={() => removeDeduction(index)}
                className="mt-6 p-2 text-zinc-500 hover:text-red-400 transition-colors"
                title="Remove"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {deductions.length === 0 && (
        <div className="text-center py-8 bg-zinc-900 border border-zinc-800 rounded-lg">
          <p className="text-zinc-500 text-sm mb-3">No deductions added yet</p>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={addStandardDeductions}
              className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
            >
              + Add standard deductions
            </button>
            <span className="text-zinc-700">or</span>
            <button
              type="button"
              onClick={addDeduction}
              className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
            >
              + Add custom deduction
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
