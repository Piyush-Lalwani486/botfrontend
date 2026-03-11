"use client"
import React, { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"

const API = "http://127.0.0.1:5000"

export default function LoginPage() {
  const router    = useRouter()
  const { login } = useAuth()
  const { toast } = useToast()
  const [mode, setMode]           = useState<"choose"|"staff"|"student">("choose")
  // Staff login
  const [email, setEmail]         = useState("")
  const [password, setPassword]   = useState("")
  const [busy, setBusy]           = useState(false)
  // Student portal
  const [roll, setRoll]           = useState("")
  const [pin, setPin]             = useState("")
  const [studentBusy, setStudentBusy] = useState(false)

  const handleStaffLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const res = await login(email, password)
    if (res.error) {
      toast({ variant:"destructive", title:"Login Failed", description:res.error })
    } else {
      router.push("/dashboard")
    }
    setBusy(false)
  }, [email, password, login, router, toast])

  const handleStudentLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setStudentBusy(true)
    try {
      const r = await fetch(`${API}/api/student/login`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ roll: roll.trim().toUpperCase(), pin: pin.trim() })
      })
      const d = await r.json()
      if (d.success) {
        localStorage.setItem("ff_student", JSON.stringify(d.student))
        router.push("/student-portal")
      } else {
        toast({ variant:"destructive", title:"Access Denied", description:d.error })
      }
    } catch {
      toast({ variant:"destructive", title:"Error", description:"Cannot connect to server." })
    } finally {
      setStudentBusy(false)
    }
  }, [roll, pin, router, toast])

  if (mode === "choose") return (
    <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#F16265] to-[#D94F52] flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-[#F16265]/30">
            <span className="text-white font-bold text-2xl">FF</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Flip Flop Digital Learning</h1>
          <p className="text-sm text-white/40 mt-1">Udaipur, Rajasthan · Near CPS School</p>
        </div>
        {/* Choices */}
        <div className="space-y-3">
          <button onClick={() => setMode("staff")}
            className="w-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#F16265]/50 rounded-2xl p-5 text-left transition-all duration-200 group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#F16265]/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">🏫</div>
              <div>
                <p className="text-white font-semibold">Staff / Admin Login</p>
                <p className="text-white/40 text-sm mt-0.5">Teachers, Reception, Management</p>
              </div>
              <div className="ml-auto text-white/30 group-hover:text-[#F16265] transition-colors">→</div>
            </div>
          </button>
          <button onClick={() => setMode("student")}
            className="w-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#FDC163]/50 rounded-2xl p-5 text-left transition-all duration-200 group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#FDC163]/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">🎓</div>
              <div>
                <p className="text-white font-semibold">Student / Parent Portal</p>
                <p className="text-white/40 text-sm mt-0.5">View scores, attendance, AI tutor</p>
              </div>
              <div className="ml-auto text-white/30 group-hover:text-[#FDC163] transition-colors">→</div>
            </div>
          </button>
        </div>
        <p className="text-center text-white/20 text-xs mt-8">All data is private and encrypted.</p>
      </div>
    </div>
  )

  if (mode === "student") return (
    <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <button onClick={() => setMode("choose")} className="text-white/40 hover:text-white text-sm mb-8 flex items-center gap-2 transition-colors">
          ← Back
        </button>
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[#FDC163]/20 flex items-center justify-center mx-auto mb-4 text-3xl">🎓</div>
          <h2 className="text-2xl font-bold text-white">Student Portal</h2>
          <p className="text-white/40 text-sm mt-1">Enter your Roll No and PIN to continue</p>
        </div>
        <form onSubmit={handleStudentLogin} className="space-y-4">
          <div>
            <label className="block text-white/60 text-sm mb-1.5">Roll Number</label>
            <input value={roll} onChange={e=>setRoll(e.target.value.toUpperCase())}
              placeholder="e.g. FF001"
              className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/25 focus:outline-none focus:border-[#FDC163]/60 focus:ring-1 focus:ring-[#FDC163]/30 transition-all uppercase"
              required />
          </div>
          <div>
            <label className="block text-white/60 text-sm mb-1.5">PIN</label>
            <input type="password" value={pin} onChange={e=>setPin(e.target.value)}
              placeholder="Last 4 digits of registered mobile"
              maxLength={6}
              className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/25 focus:outline-none focus:border-[#FDC163]/60 focus:ring-1 focus:ring-[#FDC163]/30 transition-all"
              required />
          </div>
          <button type="submit" disabled={studentBusy || !roll || !pin}
            className="w-full py-3 rounded-xl font-semibold transition-all text-[#0A0A0F] disabled:opacity-50"
            style={{ background: "#FDC163" }}>
            {studentBusy ? "Checking..." : "Access My Portal →"}
          </button>
        </form>
        <p className="text-center text-white/25 text-xs mt-6">PIN = last 4 digits of your parent's mobile number</p>
      </div>
    </div>
  )

  // Staff login
  return (
    <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <button onClick={() => setMode("choose")} className="text-white/40 hover:text-white text-sm mb-8 flex items-center gap-2 transition-colors">
          ← Back
        </button>
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[#F16265]/20 flex items-center justify-center mx-auto mb-4 text-3xl">🏫</div>
          <h2 className="text-2xl font-bold text-white">Staff Login</h2>
          <p className="text-white/40 text-sm mt-1">Sign in with your institute account</p>
        </div>
        <form onSubmit={handleStaffLogin} className="space-y-4">
          <div>
            <label className="block text-white/60 text-sm mb-1.5">Email Address</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
              placeholder="your@email.com" autoFocus
              className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/25 focus:outline-none focus:border-[#F16265]/60 focus:ring-1 focus:ring-[#F16265]/30 transition-all"
              required />
          </div>
          <div>
            <label className="block text-white/60 text-sm mb-1.5">Password</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
              placeholder="Your password"
              className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/25 focus:outline-none focus:border-[#F16265]/60 focus:ring-1 focus:ring-[#F16265]/30 transition-all"
              required />
          </div>
          <button type="submit" disabled={busy || !email || !password}
            className="w-full py-3 rounded-xl bg-[#F16265] hover:bg-[#D94F52] text-white font-semibold transition-all disabled:opacity-50 shadow-lg shadow-[#F16265]/25">
            {busy ? "Signing in..." : "Sign In →"}
          </button>
        </form>
        <p className="text-center text-white/25 text-xs mt-6">Forgot password? Contact the Super Admin.</p>
      </div>
    </div>
  )
}
