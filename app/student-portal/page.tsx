"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  LogOut, Send, BookOpen, CheckCircle, XCircle, Clock,
  TrendingUp, Star, BarChart2, MessageSquare, Loader2,
  ChevronDown, Copy, Check, User, Menu, X,
} from "lucide-react"

const API = "http://127.0.0.1:5000"

const EXAMS = [
  { id:"jee",label:"JEE" },{ id:"neet",label:"NEET" },{ id:"cbse",label:"CBSE" },
  { id:"general",label:"General" },
]
const QUICK_PROMPTS = [
  "Explain Newton's Laws of Motion",
  "Practice questions on Integration",
  "What are the key topics for JEE Physics?",
  "Explain photosynthesis simply",
  "How to improve my weak subjects?",
  "Create a study plan for next week",
]

interface Student {
  roll:string; name:string; batch:string; class:string; attendance:string
  status:string; subject_type:string; joining:string
  phy_2024:string[]; chem_2024:string[]; math_bio_2024:string[]
  phy_2023:string[]; chem_2023:string[]; math_bio_2023:string[]
}
interface Msg { role:"user"|"assistant"; content:string; elapsed?:number }

function MarkdownText({ text }: { text:string }) {
  const html = text
    .replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>")
    .replace(/\*(.+?)\*/g,"<em>$1</em>")
    .replace(/`([^`]+)`/g,'<code class="bg-yellow-50 px-1 rounded text-[13px] font-mono text-orange-600">$1</code>')
    .replace(/^### (.+)$/gm,'<h4 class="text-sm font-bold mt-3 mb-1 text-gray-800">$1</h4>')
    .replace(/^## (.+)$/gm,'<h3 class="text-base font-bold mt-3 mb-1 text-gray-900">$1</h3>')
    .replace(/^# (.+)$/gm,'<h2 class="text-lg font-bold mt-4 mb-2 text-gray-900">$1</h2>')
    .replace(/^\d+\. (.+)$/gm,'<div class="flex gap-2 my-1"><span class="text-orange-500 font-bold flex-shrink-0">•</span><span>$1</span></div>')
    .replace(/^- (.+)$/gm,'<div class="flex gap-2 my-0.5"><span class="text-orange-400 flex-shrink-0">‣</span><span>$1</span></div>')
    .replace(/\n\n/g,'<br/><br/>')
  return <div className="text-[14px] text-gray-800 leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />
}

function ScoreBar({ label, scores }: { label:string; scores:string[] }) {
  const valid = scores.filter(s=>s && s.trim() !== "").map(Number)
  if (!valid.length) return null
  const avg = Math.round(valid.reduce((a,b)=>a+b,0)/valid.length)
  const color = avg>=75?"#10B981":avg>=50?"#F59E0B":"#EF4444"
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="font-bold" style={{ color }}>{avg}% avg</span>
      </div>
      <div className="flex gap-1">
        {scores.map((s,i) => {
          const v = s && s.trim() !== "" ? Number(s) : null
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="w-full rounded-full h-2 bg-gray-100 overflow-hidden">
                {v !== null && <div className="h-full rounded-full transition-all" style={{ width:`${Math.min(100,v)}%`, background:v>=75?"#10B981":v>=50?"#F59E0B":"#EF4444" }} />}
              </div>
              <span className="text-[10px] text-gray-400">{v !== null ? `${v}` : "—"}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function StudentPortalPage() {
  const router  = useRouter()
  const [student, setStudent] = useState<Student|null>(null)
  const [tab, setTab]         = useState<"chat"|"scores"|"attendance">("chat")
  const [mobileMenu, setMobileMenu] = useState(false)
  // Chat
  const [messages, setMessages]   = useState<Msg[]>([])
  const [input,    setInput]       = useState("")
  const [exam,     setExam]        = useState("general")
  const [busy,     setBusy]        = useState(false)
  const [copied,   setCopied]      = useState<number|null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("ff_student") : null
    if (!stored) { router.push("/login"); return }
    setStudent(JSON.parse(stored))
  }, [router])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }) }, [messages])

  const logout = () => {
    if (typeof window !== "undefined") localStorage.removeItem("ff_student")
    router.push("/login")
  }

  const copyMsg = (idx:number, text:string) => {
    navigator.clipboard.writeText(text)
    setCopied(idx); setTimeout(()=>setCopied(null), 1800)
  }

  const sendMessage = async (text?: string) => {
    const msg = (text || input).trim()
    if (!msg || busy || !student) return
    setInput("")
    const newMsgs: Msg[] = [...messages, { role:"user", content:msg }]
    setMessages(newMsgs)
    setBusy(true)
    try {
      const systemContext = `Student Name: ${student.name}, Batch: ${student.batch}, Class: ${student.class}, Subject Type: ${student.subject_type}. This is the STUDENT PORTAL — be warm, encouraging, and focused on learning. Help with studies, exam prep, and understanding concepts.`
      const r = await fetch(`${API}/api/chat`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          messages: newMsgs.map(m=>({ role:m.role, content:m.content })),
          exam, session_key:`student_${student.roll}`,
          system_extra: systemContext,
        })
      })
      const d = await r.json()
      setMessages(prev => [...prev, { role:"assistant", content:d.reply || d.error || "Sorry, I couldn't respond.", elapsed:d.elapsed }])
    } catch {
      setMessages(prev => [...prev, { role:"assistant", content:"⚠ Could not connect to AI server. Please try again." }])
    } finally { setBusy(false) }
  }

  if (!student) return (
    <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const initials = student.name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()
  const attPct = parseInt(student.attendance || "0")

  return (
    <div className="min-h-screen bg-[#FFF8F0] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-orange-100 sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-400 to-[#F16265] flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-xs">FF</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-900 leading-tight">{student.name}</p>
            <p className="text-[11px] text-gray-400">{student.roll} · {student.batch}</p>
          </div>
          {/* Desktop tabs */}
          <nav className="hidden sm:flex gap-1 bg-gray-50 rounded-xl p-1">
            {[["chat","💬 AI Tutor"],["scores","📊 Scores"],["attendance","✅ Attendance"]].map(([id,label])=>(
              <button key={id} onClick={()=>setTab(id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${tab===id?"bg-white shadow-sm text-gray-900":"text-gray-500 hover:text-gray-700"}`}>
                {label}
              </button>
            ))}
          </nav>
          {/* Mobile menu */}
          <button onClick={()=>setMobileMenu(!mobileMenu)} className="sm:hidden p-2 rounded-lg hover:bg-gray-100">
            {mobileMenu ? <X className="w-4 h-4"/> : <Menu className="w-4 h-4"/>}
          </button>
          <button onClick={logout} className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Logout">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
        {/* Mobile dropdown tabs */}
        {mobileMenu && (
          <div className="sm:hidden bg-white border-t border-gray-100 px-4 py-2 flex gap-2">
            {[["chat","💬 Chat"],["scores","📊 Scores"],["attendance","✅ Attendance"]].map(([id,label])=>(
              <button key={id} onClick={()=>{setTab(id as any);setMobileMenu(false)}}
                className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${tab===id?"bg-orange-500 text-white":"bg-gray-100 text-gray-600"}`}>
                {label}
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-4">

        {/* ── AI TUTOR TAB ── */}
        {tab === "chat" && (
          <div className="flex flex-col h-[calc(100vh-120px)]">
            {/* Exam selector */}
            <div className="flex gap-2 mb-3 flex-wrap">
              {EXAMS.map(e=>(
                <button key={e.id} onClick={()=>setExam(e.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${exam===e.id?"bg-orange-500 text-white shadow-sm":"bg-white text-gray-600 border border-gray-200 hover:border-orange-300"}`}>
                  {e.label}
                </button>
              ))}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {messages.length === 0 && (
                <div className="space-y-4 py-4">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center mx-auto mb-3">
                      <span className="text-3xl">🤖</span>
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">Hi {student.name.split(" ")[0]}! 👋</h2>
                    <p className="text-sm text-gray-500 mt-1">I'm your personal AI tutor. Ask me anything about your studies!</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {QUICK_PROMPTS.map((q,i)=>(
                      <button key={i} onClick={()=>sendMessage(q)}
                        className="bg-white border border-gray-200 rounded-xl p-3 text-left text-sm text-gray-700 hover:border-orange-300 hover:bg-orange-50 transition-all">
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((msg,i)=>(
                <div key={i} className={`flex gap-3 ${msg.role==="user"?"justify-end":""}`}>
                  {msg.role==="assistant" && (
                    <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-base">🤖</span>
                    </div>
                  )}
                  <div className={`max-w-[85%] ${msg.role==="user"?"":"flex-1"}`}>
                    <div className={`rounded-2xl px-4 py-3 ${msg.role==="user"
                      ? "bg-orange-500 text-white ml-auto"
                      : "bg-white border border-gray-100 shadow-sm"}`}>
                      {msg.role==="user"
                        ? <p className="text-sm">{msg.content}</p>
                        : <MarkdownText text={msg.content} />}
                    </div>
                    {msg.role==="assistant" && (
                      <div className="flex items-center gap-2 mt-1 px-1">
                        {msg.elapsed && <span className="text-[10px] text-gray-400">{msg.elapsed}s</span>}
                        <button onClick={()=>copyMsg(i,msg.content)}
                          className="text-[10px] text-gray-400 hover:text-gray-600 flex items-center gap-1">
                          {copied===i ? <><Check className="w-3 h-3"/>Copied</> : <><Copy className="w-3 h-3"/>Copy</>}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {busy && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-base">🤖</span>
                  </div>
                  <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 flex items-center gap-2">
                    <div className="flex gap-1">
                      {[0,150,300].map(d=><span key={d} className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{animationDelay:`${d}ms`}}/>)}
                    </div>
                    <span className="text-xs text-gray-400">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="mt-3 bg-white border border-gray-200 rounded-2xl shadow-sm flex items-end gap-2 p-2">
              <textarea value={input} onChange={e=>setInput(e.target.value)}
                onKeyDown={e=>{ if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); sendMessage() }}}
                placeholder="Ask me anything about your studies... (Enter to send)"
                className="flex-1 resize-none text-sm text-gray-800 placeholder-gray-400 outline-none p-2 max-h-32 min-h-[40px] leading-relaxed"
                rows={1} />
              <button onClick={()=>sendMessage()} disabled={busy || !input.trim()}
                className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center text-white disabled:opacity-40 hover:bg-orange-600 transition-colors flex-shrink-0">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── SCORES TAB ── */}
        {tab === "scores" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h2 className="font-bold text-gray-900 mb-1">📊 My Test Scores</h2>
              <p className="text-xs text-gray-400 mb-5">Each bar shows your score (0–100) for each test</p>
              <div className="space-y-5">
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">2024 Tests</h3>
                  <div className="space-y-4">
                    <ScoreBar label="Physics" scores={student.phy_2024} />
                    <ScoreBar label="Chemistry" scores={student.chem_2024} />
                    <ScoreBar label={student.subject_type?.includes("B")?"Biology":"Mathematics"} scores={student.math_bio_2024} />
                  </div>
                </div>
                {(student.phy_2023?.some(s=>s) || student.chem_2023?.some(s=>s)) && (
                  <div className="border-t pt-4">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">2023 Tests (Historical)</h3>
                    <div className="space-y-4">
                      <ScoreBar label="Physics" scores={student.phy_2023} />
                      <ScoreBar label="Chemistry" scores={student.chem_2023} />
                      <ScoreBar label={student.subject_type?.includes("B")?"Biology":"Mathematics"} scores={student.math_bio_2023} />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 text-sm text-orange-800">
              💡 <strong>Tip:</strong> Ask the AI Tutor for personalised recommendations based on your scores!
            </div>
          </div>
        )}

        {/* ── ATTENDANCE TAB ── */}
        {tab === "attendance" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h2 className="font-bold text-gray-900 mb-4">✅ My Attendance</h2>
              <div className="flex items-center gap-6 mb-5">
                <div className="relative w-24 h-24">
                  <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none" stroke="#F3F4F6" strokeWidth="3" />
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none" stroke={attPct>=75?"#10B981":attPct>=60?"#F59E0B":"#EF4444"}
                      strokeWidth="3" strokeDasharray={`${attPct}, 100`} />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-bold text-gray-900">{attPct}%</span>
                  </div>
                </div>
                <div>
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold mb-2 ${
                    attPct>=75?"bg-green-50 text-green-700":attPct>=60?"bg-yellow-50 text-yellow-700":"bg-red-50 text-red-700"}`}>
                    {attPct>=75 ? <><CheckCircle className="w-4 h-4"/>Good Standing</> :
                     attPct>=60 ? <><Clock className="w-4 h-4"/>Needs Improvement</> :
                     <><XCircle className="w-4 h-4"/>Critical — Below 60%</>}
                  </div>
                  <p className="text-xs text-gray-500">2024 Attendance: {student.attendance}</p>
                  {student.att_2023 && <p className="text-xs text-gray-400 mt-0.5">2023: {student.att_2023}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Batch</p>
                  <p className="font-bold text-gray-900 mt-0.5">{student.batch}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Status</p>
                  <p className="font-bold text-gray-900 mt-0.5">{student.status || "Active"}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Joined</p>
                  <p className="font-bold text-gray-900 mt-0.5">{student.joining || "—"}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Subjects</p>
                  <p className="font-bold text-gray-900 mt-0.5">{student.subject_type || "—"}</p>
                </div>
              </div>
            </div>
            {attPct < 75 && (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-sm text-red-800">
                ⚠ Your attendance is below 75%. Please ensure regular attendance to avoid academic issues.
                Contact the institute if you have any concerns.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
