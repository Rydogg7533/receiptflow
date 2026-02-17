interface TotalsDisplayProps {
  grossPay: number
  totalDeductions: number
  netPay: number
  ytdGross?: number
  ytdDeductions?: number
  ytdNet?: number
}

export default function TotalsDisplay({
  grossPay,
  totalDeductions,
  netPay,
  ytdGross,
  ytdDeductions,
  ytdNet,
}: TotalsDisplayProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6 space-y-4">
      <h3 className="font-semibold text-white text-lg">Summary</h3>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-400">Gross Pay</span>
          <span className="font-semibold text-white">{formatCurrency(grossPay)}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-400">Total Deductions</span>
          <span className="font-semibold text-red-400">-{formatCurrency(totalDeductions)}</span>
        </div>

        <div className="border-t border-zinc-700 pt-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white">Net Pay</span>
            <span className="text-2xl font-bold text-green-400">{formatCurrency(netPay)}</span>
          </div>
        </div>
      </div>

      {ytdGross !== undefined && (
        <div className="border-t border-zinc-700 pt-4 mt-4">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
            Year-to-Date
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">Gross</span>
              <span className="text-zinc-300">{formatCurrency(ytdGross)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">Deductions</span>
              <span className="text-zinc-300">-{formatCurrency(ytdDeductions || 0)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">Net</span>
              <span className="text-zinc-300">{formatCurrency(ytdNet || 0)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
