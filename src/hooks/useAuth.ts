import { createContext, useContext, useState, useEffect, useCallback, createElement, type ReactNode } from 'react'
import { supabase, isSupabaseConfigured, forceSignOut, SupabaseAuthError } from '../lib/supabase'
import { isPlatformAdmin as checkPlatformAdmin } from '../lib/platformAdmin'
import type { User } from '@supabase/supabase-js'

// When unset/false-ish: accept any OAuth user with an email (avoids forgetting env at build).
// Set VITE_RESTRICT_LOGIN_TO_LEGL_DOMAIN=true (or 1 / yes) to limit sign-in to @legl.com (internal deployments).
function parseRestrictLeglEmails(): boolean {
  const raw = import.meta.env.VITE_RESTRICT_LOGIN_TO_LEGL_DOMAIN
  if (raw === undefined || raw === null) return false
  const v = String(raw).trim().toLowerCase()
  if (v === '' || v === 'false' || v === '0' || v === 'no' || v === 'off') return false
  return v === 'true' || v === '1' || v === 'yes' || v === 'on'
}

const restrictLoginToLeglDomain = parseRestrictLeglEmails()

const isEmailAllowed = (email: string | null | undefined): boolean => {
  if (!email?.trim()) return false
  if (!restrictLoginToLeglDomain) return true
  return email.toLowerCase().endsWith('@legl.com')
}

const getAuthRedirectUrl = () => `${window.location.origin}/`

const domainRestrictionMessage = restrictLoginToLeglDomain
  ? 'Access restricted to @legl.com email addresses only.'
  : null

function formatAuthErrorMessage(message: string, fallback: string): string {
  const lower = message.toLowerCase()

  if (lower.includes('rate limit') || lower.includes('over_email_send_rate_limit')) {
    return 'Too many emails sent recently. Please wait a few minutes before trying again.'
  }

  if (lower.includes('invalid login credentials')) {
    return 'Invalid email or password.'
  }

  if (lower.includes('email not confirmed')) {
    return 'Please verify your email address before signing in. Check your inbox for the confirmation link.'
  }

  return message || fallback
}

const PASSWORD_RECOVERY_KEY = 'kyp_password_recovery'

function setPasswordRecoveryFlag(active: boolean) {
  if (active) {
    sessionStorage.setItem(PASSWORD_RECOVERY_KEY, '1')
  } else {
    sessionStorage.removeItem(PASSWORD_RECOVERY_KEY)
  }
}

function hasPasswordRecoveryFlag(): boolean {
  return sessionStorage.getItem(PASSWORD_RECOVERY_KEY) === '1'
}

function isPasswordRecoveryUrl(): boolean {
  const hash = window.location.hash
  const params = new URLSearchParams(window.location.search)
  return hash.includes('type=recovery') || params.get('type') === 'recovery'
}

function redirectToResetPasswordIfNeeded() {
  if (!isPasswordRecoveryUrl()) return false
  if (window.location.pathname.startsWith('/reset-password')) return false
  window.location.replace(`${window.location.origin}/reset-password${window.location.hash}${window.location.search}`)
  return true
}

interface AuthContextValue {
  user: User | null
  loading: boolean
  needsPasswordReset: boolean
  signIn: (email: string, password: string) => Promise<{ error: { message: string; code?: string } | null }>
  signUp: (
    email: string,
    password: string
  ) => Promise<{ error: { message: string } | null; needsEmailVerification?: boolean }>
  signOut: () => Promise<{ error: null }>
  signInWithGoogle: () => Promise<{ error: { message: string } | null }>
  resendVerificationEmail: (email: string) => Promise<{ error: { message: string } | null }>
  sendPasswordResetEmail: (email: string) => Promise<{ error: { message: string } | null }>
  updateUserPassword: (newPassword: string) => Promise<{ error: { message: string } | null }>
  clearPasswordRecovery: () => void
  restrictLoginToLeglDomain: boolean
  isPlatformAdmin: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [needsPasswordReset, setNeedsPasswordReset] = useState(
    () => isPasswordRecoveryUrl() || hasPasswordRecoveryFlag()
  )

  const clearPasswordRecovery = useCallback(() => {
    setNeedsPasswordReset(false)
    setPasswordRecoveryFlag(false)
  }, [])

  const markPasswordRecovery = useCallback(() => {
    setNeedsPasswordReset(true)
    setPasswordRecoveryFlag(true)
  }, [])

  useEffect(() => {
    if (redirectToResetPasswordIfNeeded()) {
      return
    }

    const client = supabase
    if (!isSupabaseConfigured || !client) {
      console.warn('Supabase is not configured. Authentication requires Supabase.')
      setLoading(false)
      return
    }

    let subscription: { unsubscribe: () => void } | undefined

    const initAuth = async () => {
      try {
        if (isPasswordRecoveryUrl()) {
          markPasswordRecovery()
        }

        const { data: { session } } = await client.auth.getSession()

        if (session?.user) {
          if (!isEmailAllowed(session.user.email)) {
            console.warn('User email domain not allowed, signing out')
            await client.auth.signOut()
            setUser(null)
            setLoading(false)
            return
          }

          setUser(session.user)
        }

        const { data: { subscription: authSubscription } } = client.auth.onAuthStateChange(
          async (event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
              markPasswordRecovery()
              redirectToResetPasswordIfNeeded()
            }

            if (session?.user) {
              if (!isEmailAllowed(session.user.email)) {
                await client.auth.signOut()
                setUser(null)
                setLoading(false)
                return
              }

              setUser(session.user)
            } else {
              setUser(null)
              clearPasswordRecovery()
            }

            setLoading(false)
          }
        )

        subscription = authSubscription
      } catch (error) {
        if (error instanceof SupabaseAuthError) {
          console.warn('Authentication session expired, user will be signed out')
        } else {
          console.error('Supabase auth error:', error)
        }
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    return () => subscription?.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    if (!isEmailAllowed(email)) {
      return { error: { message: domainRestrictionMessage ?? 'This email address is not allowed.' } }
    }

    if (!isSupabaseConfigured || !supabase) {
      return { error: { message: 'Supabase is not configured' } }
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        if (error.message.toLowerCase().includes('email not confirmed')) {
          return {
            error: {
              message: formatAuthErrorMessage(error.message, 'Email not confirmed.'),
              code: 'email_not_confirmed',
            },
          }
        }
        return { error: { message: formatAuthErrorMessage(error.message, 'Failed to sign in. Please try again.') } }
      }

      if (data.user && !isEmailAllowed(data.user.email)) {
        await supabase.auth.signOut()
        return { error: { message: domainRestrictionMessage ?? 'This email address is not allowed.' } }
      }

      return { error: null }
    } catch {
      return { error: { message: 'Failed to sign in. Please try again.' } }
    }
  }

  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: { message: 'Supabase is not configured' } }
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getAuthRedirectUrl(),
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (error) {
        return { error: { message: formatAuthErrorMessage(error.message, 'Failed to sign in with Google. Please try again.') } }
      }

      return { error: null }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to sign in with Google. Please try again.'
      return { error: { message } }
    }
  }

  const signUp = async (email: string, password: string) => {
    if (!isEmailAllowed(email)) {
      return { error: { message: domainRestrictionMessage ?? 'This email address is not allowed.' } }
    }

    if (!isSupabaseConfigured || !supabase) {
      return { error: { message: 'Supabase is not configured' } }
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: getAuthRedirectUrl(),
        },
      })

      if (error) {
        if (error.message.includes('User already registered') || error.message.includes('user_already_exists')) {
          return {
            error: {
              message:
                'An account with this email already exists. Try signing in instead, or use "Forgot password" if you need to reset your password.',
            },
          }
        }
        return { error: { message: formatAuthErrorMessage(error.message, 'Failed to create account. Please try again.') } }
      }

      if (data.user && data.user.identities?.length === 0) {
        return {
          error: {
            message:
              'An account with this email already exists. Try signing in instead, or use "Forgot password" if you need to reset your password.',
          },
        }
      }

      return { error: null, needsEmailVerification: !data.session }
    } catch {
      return { error: { message: 'Failed to create account. Please try again.' } }
    }
  }

  const resendVerificationEmail = async (email: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: { message: 'Supabase is not configured' } }
    }

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: getAuthRedirectUrl(),
        },
      })

      if (error) {
        return { error: { message: formatAuthErrorMessage(error.message, 'Failed to resend verification email. Please try again.') } }
      }

      return { error: null }
    } catch {
      return { error: { message: 'Failed to resend verification email. Please try again.' } }
    }
  }

  const signOut = async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut()
      } catch (error) {
        console.error('Supabase signOut error:', error)
      }
      await forceSignOut()
      setUser(null)
      clearPasswordRecovery()
      setLoading(false)
      return { error: null }
    }

    setUser(null)
    clearPasswordRecovery()
    setLoading(false)
    return { error: null }
  }

  const sendPasswordResetEmail = async (email: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: { message: 'Supabase is not configured' } }
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        return { error: { message: formatAuthErrorMessage(error.message, 'Failed to send password reset email. Please try again.') } }
      }

      return { error: null }
    } catch {
      return { error: { message: 'Failed to send password reset email. Please try again.' } }
    }
  }

  const updateUserPassword = async (newPassword: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: { message: 'Supabase is not configured' } }
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })

      if (error) {
        return { error: { message: formatAuthErrorMessage(error.message, 'Failed to update password. Please try again.') } }
      }

      setNeedsPasswordReset(false)
      setPasswordRecoveryFlag(false)
      return { error: null }
    } catch {
      return { error: { message: 'Failed to update password. Please try again.' } }
    }
  }

  const value: AuthContextValue = {
    user,
    loading,
    needsPasswordReset,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    resendVerificationEmail,
    sendPasswordResetEmail,
    updateUserPassword,
    clearPasswordRecovery,
    restrictLoginToLeglDomain,
    isPlatformAdmin: checkPlatformAdmin(user),
  }

  return createElement(AuthContext.Provider, { value }, children)
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
