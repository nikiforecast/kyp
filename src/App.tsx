import React, { useEffect, useState } from 'react'
import { useParams, useLocation, useSearchParams, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { LoginForm } from './components/LoginForm'
import { Dashboard } from './components/Dashboard'
import { LoadingState } from './components/DesignSystem/components/LoadingSpinner'

function App() {
  const { user, loading, needsPasswordReset, restrictLoginToLeglDomain } = useAuth()
  const params = useParams()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [authError, setAuthError] = useState<string | null>(null)
  const [emailVerified, setEmailVerified] = useState(false)

  useEffect(() => {
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    if (error) {
      setAuthError(errorDescription || 'Access denied')
      const newParams = new URLSearchParams(searchParams)
      newParams.delete('error')
      newParams.delete('error_description')
      setSearchParams(newParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  // Show a brief confirmation when the user returns from email verification
  useEffect(() => {
    const hash = window.location.hash
    if (hash.includes('type=signup') || hash.includes('type=email_change')) {
      setEmailVerified(true)
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
  }, [])

  if (authError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-600 mb-4">{authError}</p>
            {restrictLoginToLeglDomain && (
              <p className="text-sm text-gray-500 mb-6">
                This application is restricted to @legl.com email addresses only.
              </p>
            )}
            <button
              onClick={() => {
                setAuthError(null)
                window.location.href = '/'
              }}
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Return to Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingState message="Loading Journey Studio..." />
      </div>
    )
  }

  if (user && needsPasswordReset) {
    return <Navigate to="/reset-password" replace />
  }

  if (!user) {
    return (
      <>
        {emailVerified && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-full mx-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg text-center">
              <p className="text-green-800 text-sm font-medium">Email verified successfully! You can now sign in.</p>
            </div>
          </div>
        )}
        <LoginForm />
      </>
    )
  }

  return <Dashboard routeParams={params} pathname={location.pathname} />
}

export default App