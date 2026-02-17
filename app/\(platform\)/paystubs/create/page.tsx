'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/components/SupabaseProvider'
import PageHeader from '@/components/platform/PageHeader'
import EarningsSection, { Earning } from '@/components/paystubs/EarningsSection'
import DeductionsSection, { Deduction } from '@/components/paystubs/DeductionsSection'
import TotalsDisplay from '@/components/paystubs/TotalsDisplay'
import { Save, FileDown } from 'lucide-react'

export default function CreatePayStubPage() {
  const router = useRouter()
  const { user } = useSupabase()
  const [isSaving, setIsSaving] = useState(false)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)

  // Company info
  const [companyName, setCompanyName] = useState('')
  const [companyAddress, setCompanyAddress] = useState('')
  const [companyPhone, setCompanyPhone] = useState('')
  const [companyEIN, setCompanyEIN] = useState('')

  // Employee info
  const [employeeName, setEmployeeName] = useState('')
  const [employeeAddress, setEmployeeAddress] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [ssnLast4, setSsnLast4] = useState('')
  const [payMethod, setPayMethod] = useState('direct_deposit')

  // Pay period
  const [payPeriodStart, setPayPeriodStart] = useState('')
  const [payPeriodEnd, setPayPeriodEnd] = useState('')
  const [payDate, setPayDate] = useState('')
  const [payFrequency, setPayFrequency] = useState('biweekly')

  // Earnings & Deductions
  const [earnings, setEarnings] = useState<Earning[]>([
    {
      description: 'Regular Pay',
      type: 'hourly',
      hours: undefined,
      rate: undefined,
      amount: 0,
    },
  ])
  const [deductions, setDeductions] = useState<Deduction[]>([])

  // Auto-fill company info from profile
  useEffect(() => {
    if (user) {
      fetchProfile()
    }
  }, [user])

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/profile')
      if (response.ok) {
        const data = await response.json()
        const profile = data.profile
        if (profile.business_name) setCompanyName(profile.business_name)
        if (profile.business_address) setCompanyAddress(profile.business_address)
        if (profile.business_phone) setCompanyPhone(profile.business_phone)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
  }

  // Calculate totals
  const grossPay = earnings.reduce((sum, e) => sum + (e.amount || 0), 0)
  const totalDeductions = deductions.reduce((sum, d) => sum + (d.amount || 0), 0)
  const netPay = grossPay - totalDeductions

  const handleSave = async () => {
    // Validation
    if (!companyName || !employeeName || !payPeriodStart || !payPeriodEnd || !payDate) {
      alert('Please fill in all required fields')
      return
    }

    if (earnings.length === 0) {
      alert('Please add at least one earning')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/paystubs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: companyName,
          company_address: companyAddress,
          company_phone: companyPhone,
          company_ein: companyEIN,
          employee_name: employeeName,
          employee_address: employeeAddress,
          employee_id_number: employeeId,
          ssn_last_four: ssnLast4,
          pay_method: payMethod,
          pay_period_start: payPeriodStart,
          pay_period_end: payPeriodEnd,
          pay_date: payDate,
          pay_frequency: payFrequency,
          earnings,
          deductions,
          status: 'draft',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create pay stub')
      }

      const data = await response.json()
      
      if (data.isFree) {
        alert('Free tier: 1 watermarked pay stub created')
      }

      // Redirect to view page
      router.push(`/paystubs/${data.paystub.id}`)
    } catch (error: any) {
      alert(error.message || 'Error creating pay stub')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Create Pay Stub"
        description="Fill out the form to generate a professional pay stub"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT COLUMN - Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Company Info */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4">
            <h3 className="font-semibold text-white text-lg">Company Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white focus:border-blue-600 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Company Phone
                </label>
                <input
                  type="tel"
                  value={companyPhone}
                  onChange={(e) => setCompanyPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white focus:border-blue-600 focus:outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Company Address
                </label>
                <input
                  type="text"
                  value={companyAddress}
                  onChange={(e) => setCompanyAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white focus:border-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Employer ID Number (EIN)
                </label>
                <input
                  type="text"
                  value={companyEIN}
                  onChange={(e) => setCompanyEIN(e.target.value)}
                  placeholder="XX-XXXXXXX"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Employee Info */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4">
            <h3 className="font-semibold text-white text-lg">Employee Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Employee Name *
                </label>
                <input
                  type="text"
                  value={employeeName}
                  onChange={(e) => setEmployeeName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white focus:border-blue-600 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Employee ID
                </label>
                <input
                  type="text"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white focus:border-blue-600 focus:outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Employee Address
                </label>
                <input
                  type="text"
                  value={employeeAddress}
                  onChange={(e) => setEmployeeAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white focus:border-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  SSN (last 4 digits)
                </label>
                <input
                  type="text"
                  value={ssnLast4}
                  onChange={(e) => setSsnLast4(e.target.value.slice(0, 4))}
                  maxLength={4}
                  placeholder="1234"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white focus:border-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Pay Method *
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white focus:border-blue-600 focus:outline-none"
                >
                  <option value="direct_deposit">Direct Deposit</option>
                  <option value="check">Check</option>
                  <option value="cash">Cash</option>
                </select>
              </div>
            </div>
          </div>

          {/* Pay Period */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4">
            <h3 className="font-semibold text-white text-lg">Pay Period</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Period Start *
                </label>
                <input
                  type="date"
                  value={payPeriodStart}
                  onChange={(e) => setPayPeriodStart(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white focus:border-blue-600 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Period End *
                </label>
                <input
                  type="date"
                  value={payPeriodEnd}
                  onChange={(e) => setPayPeriodEnd(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white focus:border-blue-600 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Pay Date *
                </label>
                <input
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white focus:border-blue-600 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Pay Frequency *
                </label>
                <select
                  value={payFrequency}
                  onChange={(e) => setPayFrequency(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white focus:border-blue-600 focus:outline-none"
                >
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-Weekly</option>
                  <option value="semimonthly">Semi-Monthly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>
          </div>

          {/* Earnings */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <EarningsSection earnings={earnings} onChange={setEarnings} />
          </div>

          {/* Deductions */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <DeductionsSection deductions={deductions} onChange={setDeductions} />
          </div>
        </div>

        {/* RIGHT COLUMN - Summary & Actions */}
        <div className="lg:col-span-1 space-y-6">
          <div className="sticky top-8">
            <TotalsDisplay
              grossPay={grossPay}
              totalDeductions={totalDeductions}
              netPay={netPay}
            />

            <div className="mt-4 flex flex-col gap-3">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                <Save size={18} />
                {isSaving ? 'Saving...' : 'Save Pay Stub'}
              </button>

              <button
                onClick={() => router.back()}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>

            <p className="text-xs text-zinc-500 mt-4">
              * Required fields. Save to generate PDF.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
