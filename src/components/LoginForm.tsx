import React, { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { isSupabaseConfigured } from '../lib/supabase'

type AuthView = 'sign-in' | 'sign-up' | 'forgot-password' | 'verify-email'

export function LoginForm() {
  const [loginIdentifier, setLoginIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [view, setView] = useState<AuthView>('sign-in')
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('')

  const { signIn, signUp, signInWithGoogle, sendPasswordResetEmail, resendVerificationEmail, restrictLoginToLeglDomain } =
    useAuth()

  const resetMessages = () => {
    setError(null)
    setSuccess(null)
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    resetMessages()

    try {
      const { error: signInError } = await signIn(loginIdentifier, password)

      if (signInError) {
        setError(signInError.message)
        if ('code' in signInError && signInError.code === 'email_not_confirmed') {
          setPendingVerificationEmail(loginIdentifier.includes('@') ? loginIdentifier : '')
        }
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
    }

    setLoading(false)
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    resetMessages()

    if (!loginIdentifier.includes('@')) {
      setError('Please enter your email address to create an account')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      setLoading(false)
      return
    }

    try {
      const result = await signUp(loginIdentifier, password)

      if (result.error) {
        setError(result.error.message)
      } else if (result.needsEmailVerification) {
        setPendingVerificationEmail(loginIdentifier)
        setView('verify-email')
      } else {
        setSuccess('Account created successfully! You can now sign in.')
        setTimeout(() => {
          setView('sign-in')
          setPassword('')
          setConfirmPassword('')
          setSuccess(null)
        }, 2000)
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
    }

    setLoading(false)
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    resetMessages()

    if (!loginIdentifier.includes('@')) {
      setError('Please enter your email address to reset your password')
      setLoading(false)
      return
    }

    try {
      const { error: resetError } = await sendPasswordResetEmail(loginIdentifier)

      if (resetError) {
        setError(resetError.message)
      } else {
        setSuccess('Password reset email sent! Check your inbox and follow the link to set a new password.')
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
    }

    setLoading(false)
  }

  const handleResendVerification = async () => {
    if (!pendingVerificationEmail) return

    setLoading(true)
    resetMessages()

    try {
      const { error: resendError } = await resendVerificationEmail(pendingVerificationEmail)

      if (resendError) {
        setError(resendError.message)
      } else {
        setSuccess('Verification email sent! Please check your inbox.')
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
    }

    setLoading(false)
  }

  const switchView = (nextView: AuthView) => {
    setView(nextView)
    resetMessages()
    setPassword('')
    setConfirmPassword('')
  }

  const renderHeader = (title: string, subtitle?: string) => (
    <div className="text-center mb-8">
      <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-white font-bold text-2xl">JS</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
      {subtitle && <p className="text-gray-600">{subtitle}</p>}
      {!isSupabaseConfigured && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">Running in local mode</p>
        </div>
      )}
    </div>
  )

  const renderDomainRestriction = () =>
    restrictLoginToLeglDomain ? (
      <p className="text-sm text-gray-500 text-center mb-4">Access is limited to @legl.com email addresses.</p>
    ) : null

  const renderError = () =>
    error ? (
      <div
        className={`rounded-lg p-4 border ${
          error.includes('Too many emails') ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'
        }`}
      >
        <p className={`text-sm ${error.includes('Too many emails') ? 'text-amber-800' : 'text-red-700'}`}>{error}</p>
        {pendingVerificationEmail && error.includes('verify') && (
          <button
            type="button"
            onClick={handleResendVerification}
            disabled={loading}
            className="mt-2 text-sm text-red-800 underline hover:no-underline disabled:opacity-50"
          >
            Resend verification email
          </button>
        )}
      </div>
    ) : null

  const renderSuccess = () =>
    success ? (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-green-700 text-sm">{success}</p>
      </div>
    ) : null

  const renderSubmitButton = (label: string) => (
    <button
      type="submit"
      disabled={loading}
      className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
    >
      {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : label}
    </button>
  )

  const renderGoogleButton = () =>
    isSupabaseConfigured ? (
      <div className="mb-6">
        <button
          type="button"
          onClick={async () => {
            setLoading(true)
            resetMessages()
            const { error: googleError } = await signInWithGoogle()
            if (googleError) {
              setError(googleError.message)
              setLoading(false)
            }
          }}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Sign in with Google
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or continue with email or username</span>
          </div>
        </div>
      </div>
    ) : null

  const renderPasswordField = (id: string, label: string, value: string, onChange: (v: string) => void, required = true) => (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
          required={required}
          disabled={loading}
          minLength={6}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>
    </div>
  )

  if (view === 'verify-email') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {renderHeader('Check your email', 'We sent a verification link to complete your account setup.')}
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                <p className="text-sm text-blue-800">
                  Verification email sent to <strong>{pendingVerificationEmail}</strong>
                </p>
              </div>
              <p className="text-sm text-gray-600 text-center">
                Click the link in the email to verify your account, then return here to sign in.
              </p>
              {renderError()}
              {renderSuccess()}
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'Sending...' : 'Resend verification email'}
              </button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => switchView('sign-in')}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Back to sign in
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (view === 'forgot-password') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {renderHeader('Reset password', "Enter your email and we'll send you a link to reset your password.")}
            <form onSubmit={handlePasswordReset} className="space-y-6">
              <div>
                <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email address
                </label>
                <input
                  id="reset-email"
                  type="email"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="you@example.com"
                  required
                  disabled={loading}
                />
              </div>
              {renderError()}
              {renderSuccess()}
              {renderSubmitButton('Send reset link')}
            </form>
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => switchView('sign-in')}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Back to sign in
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const isSignUp = view === 'sign-up'

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {renderHeader(isSignUp ? 'Create account' : 'Welcome to Journey Studio', isSignUp ? 'Sign up with your email address' : undefined)}
          {renderDomainRestriction()}
          {renderGoogleButton()}

          <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-6">
            <div>
              <label htmlFor="login-identifier" className="block text-sm font-medium text-gray-700 mb-2">
                {isSignUp ? 'Email address' : 'Email or username'}
              </label>
              <input
                id="login-identifier"
                type={isSignUp ? 'email' : 'text'}
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={isSignUp ? 'you@example.com' : 'you@example.com or username'}
                required
                disabled={loading}
                autoComplete={isSignUp ? 'email' : 'username'}
              />
            </div>

            {renderPasswordField('password', 'Password', password, setPassword)}

            {isSignUp && renderPasswordField('confirm-password', 'Confirm password', confirmPassword, setConfirmPassword)}

            {renderError()}
            {renderSuccess()}
            {renderSubmitButton(isSignUp ? 'Create account' : 'Sign in')}
          </form>

          <div className="mt-6 text-center space-y-2">
            <button
              type="button"
              onClick={() => switchView(isSignUp ? 'sign-in' : 'sign-up')}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>

            {!isSignUp && (
              <div>
                <button
                  type="button"
                  onClick={() => switchView('forgot-password')}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Forgot password?
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
