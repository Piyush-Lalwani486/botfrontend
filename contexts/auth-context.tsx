"use client"
import React, { createContext, useContext, useState, useEffect, useCallback } from "react"

export const API = "http://127.0.0.1:5000"

interface User {
  id: string; name: string; email: string
  role_name: string; role_label: string; role_color: string
  permissions: string[]; is_super_admin?: boolean
}
interface AuthCtx {
  user: User | null; token: string; loading: boolean
  login: (email: string, password: string) => Promise<{ ok?: boolean; error?: string }>
  logout: () => void; can: (perm: string) => boolean
  authFetch: (url: string, opts?: RequestInit) => Promise<Response>
  isAdmin: boolean; isSuperAdmin: boolean
}

const AuthContext = createContext<AuthCtx | null>(null)

function _clearStorage() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("ff_token")
    localStorage.removeItem("ff_student")
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null)
  const [token,   setToken]   = useState<string>("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("ff_token") : ""
    if (!saved) { setLoading(false); return }
    setToken(saved)
    fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${saved}` } })
      .then(r => r.json())
      .then(d => {
        if (d.user) {
          setUser({
            id: d.user.user_id || d.user.id || "",
            name: d.user.name, email: d.user.email,
            role_name: d.user.role_name, role_label: d.user.role_label,
            role_color: d.user.role_color, permissions: d.user.permissions || [],
            is_super_admin: d.user.is_super_admin,
          })
        } else { _clearStorage(); setToken("") }
      })
      .catch(() => { _clearStorage(); setToken("") })
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    try {
      const r = await fetch(`${API}/api/auth/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const d = await r.json()
      if (d.error) return { error: d.error }
      const newUser: User = {
        id: d.user_id || d.id || "", name: d.name || "", email: d.email || "",
        role_name: d.role_name || "", role_label: d.role_label || "",
        role_color: d.role_color || "#475569", permissions: d.permissions || [],
        is_super_admin: d.is_super_admin || false,
      }
      if (typeof window !== "undefined") {
        localStorage.setItem("ff_token", d.token)
        localStorage.removeItem("ff_student")
      }
      setToken(d.token); setUser(newUser)
      return { ok: true }
    } catch { return { error: "Cannot connect to server. Is the backend running?" } }
  }, [])

  const logout = useCallback(() => {
    const t = typeof window !== "undefined" ? localStorage.getItem("ff_token") : token
    if (t) fetch(`${API}/api/auth/logout`, { method: "POST", headers: { Authorization: `Bearer ${t}` } }).catch(() => {})
    _clearStorage(); setToken(""); setUser(null)
  }, [token])

  const can = useCallback((perm: string) => user?.permissions?.includes(perm) ?? false, [user])

  const authFetch = useCallback((url: string, opts: RequestInit = {}) => {
    const t = typeof window !== "undefined" ? (localStorage.getItem("ff_token") || token) : token
    return fetch(url, { ...opts, headers: { ...(opts.headers || {}), Authorization: `Bearer ${t}` } })
  }, [token])

  const isAdmin      = user?.role_name === "admin" || user?.role_name === "super_admin"
  const isSuperAdmin = user?.role_name === "super_admin" || user?.is_super_admin === true

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, can, authFetch, isAdmin, isSuperAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
