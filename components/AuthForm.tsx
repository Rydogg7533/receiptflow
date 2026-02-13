'use client'

import { useState } from 'react'
import { useSupabase } from './SupabaseProvider'
import { Mail, Loader2, KeyRound } from 'lucide-react'

export function AuthForm() {
  const [mode, setMode] = useState<'password' | 'magic'>('password')
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null)

  const { signInWithMagicLink, signInWithPassword, signUpWithPassword } = useSupabase()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (mode === 'magic') {
        if (cooldownUntil && Date.now() < cooldownUntil) {
          throw new Error('Please wait a moment before requesting another magic link.')
        }
        await signInWithMagicLink(email)
        setMessage('Check your email for the magic link!')
        setCooldownUntil(Date.now() + 60_000)
      } else {
        if (isSignUp) {
          await signUpWithPassword(email, password)
          setMessage('Account created. You may need to confirm your email once, then you can sign in normally.')
        } else {
          await signInWithPassword(email, password)
          setMessage('Signed in!')
        }
      }
    } catch (error: any) {
      const msg = error?.message || 'Something went wrong. Please try again.'
      if (msg.includes('429') || msg.toLowerCase().includes('too many requests')) {
        setMessage('Too many requests. Please wait a few minutes and try again.')
      } else {
        setMessage(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode('password')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium border ${
              mode === 'password' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'
            }`}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => setMode('magic')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium border ${
              mode === 'magic' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'
            }`}
          >
            Magic Link
          </button>
        </div>

        {mode === 'password' && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsSignUp(false)}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium border ${
                !isSignUp ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setIsSignUp(true)}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium border ${
                isSignUp ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              Sign up
            </button>
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="you@example.com"
              required
            />
          </div>
        </div>

        {mode === 'password' && (
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="••••••••"
                required
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin h-4 w-4 mr-2" />
              {mode === 'magic' ? 'Sending...' : isSignUp ? 'Creating...' : 'Signing in...'}
            </>
          ) : mode === 'magic' ? (
            'Send Magic Link'
          ) : isSignUp ? (
            'Create account'
          ) : (
            'Sign in'
          )}
        </button>
      </form>

      {message && (
        <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-md text-sm">
          {message}
        </div>
      )}
    </div>
  )
}
