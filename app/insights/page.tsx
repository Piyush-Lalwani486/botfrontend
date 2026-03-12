"use client"
/**
 * Data Insights — AI-powered analysis with full chat history.
 *
 * - Auto-loads CSVs from backend (no dummy data)
 * - Full conversation history passed on every turn
 * - Clickable quick questions always work (auto-picks right CSV)
 * - Tokens capped — short context, efficient prompts
 */
import { useState, useRef, useEffect, useCallback } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Upload, Send, BarChart2, Loader2, RefreshCw, Database, X, ChevronDown } from "lucide-react"

const API = "http://127.0.0.1:5000"

const QUICK = [
  { icon:"💰", label:"Pending Fees",    q:"Which students have pending fee payments? List names and exact amount due (highest first).", file:"students_data.csv" },
  { icon:"🏆", label:"Top Scorers",     q:"Who are the top 5 students with highest average test scores? Show their scores.", file:"students_data.csv" },
  { icon:"⚠️", label:"Needs Attention", q:"Which students have average scores below 65 and need extra attention? List them.", file:"students_data.csv" },
  { icon:"📉", label:"Low Attendance",  q:"Which students have attendance below 80%? List names and their attendance %.", file:"students_data.csv" },
  { icon:"📊", label:"Batch Summary",   q:"How many students are in each batch? Give a count per batch.", file:"students_data.csv" },
  { icon:"💸", label:"Fee Defaulters",  q:"List all students who have paid zero fees or have the highest fees pending.", file:"students_data.csv" },
  { icon:"💼", label:"Staff Salary",    q:"What is the total salary payout this month? List staff with unpaid salaries.", file:"staff_data.csv" },
  { icon:"📦", label:"Expenses",        q:"What are the total expenses by category? Which category is highest?", file:"expenses_data.csv" },
]

interface Message {
  role: "user" | "assistant"
  content: string
  timestamp?: string
  elapsed?: number
  analysis_type?: string
  filename?: string
  error?: boolean
}

interface CsvFile { filename: string; size_kb: number; rows: number }

const TYPE_COLOR: Record<string, string> = {
  financial:"#059669", scores:"#3b82f6", students:"#6366f1",
  staff:"#7c3aed", expenses:"#dc2626", general:"#475569"
}
const TYPE_ICON: Record<string, string> = {
  financial:"💰", scores:"📊", students:"👥",
  staff:"👨‍🏫", expenses:"💸", general:"📋"
}

export default function InsightsPage() {
  const [csvFiles,   setCsvFiles]   = useState<CsvFile[]>([])
  const [csvText,    setCsvText]    = useState("")
  const [filename,   setFilename]   = useState("")
  const [messages,   setMessages]   = useState<Message[]>([])
  const [question,   setQuestion]   = useState("")
  const [loading,    setLoading]    = useState(false)
  const [loadingCsv, setLoadingCsv] = useState<string | null>(null)
  const [msg,        setMsg]        = useState("")
  const [filesOpen,  setFilesOpen]  = useState(false)
  const fileRef   = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Load list of available CSVs from backend on mount
  useEffect(() => {
    fetch(`${API}/api/data/list`)
      .then(r => r.json())
      .then(d => setCsvFiles(d.files || []))
      .catch(() => {})
  }, [])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 4000) }

  const loadCsv = useCallback(async (fname: string) => {
    setLoadingCsv(fname)
    try {
      const r = await fetch(`${API}/api/data/load/${fname}`)
      const d = await r.json()
      if (d.csv_text) {
        setCsvText(d.csv_text); setFilename(fname)
        flash(`✅ Loaded ${fname} (${d.csv_text.split("\n").length - 1} rows)`)
        setMessages(prev => [...prev, {
          role: "assistant",
          content: `📂 Loaded **${fname}**. Ask me anything about this data — fees, scores, attendance, summaries, comparisons.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        }])
      } else {
        flash(`⚠ ${d.error || "File not found"}`)
      }
    } catch { flash("⚠ Cannot connect to server") }
    finally { setLoadingCsv(null) }
  }, [])

  const handleUpload = useCallback(async (file: File) => {
    if (!file.name.endsWith(".csv")) { flash("⚠ Please upload a .csv file"); return }
    setLoadingCsv(file.name)
    try {
      const text = await file.text()
      // Save to backend data folder
      await fetch(`${API}/api/data/save`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, csv_text: text })
      })
      setCsvText(text); setFilename(file.name)
      // Refresh file list
      const r2 = await fetch(`${API}/api/data/list`)
      const d2 = await r2.json()
      setCsvFiles(d2.files || [])
      flash(`✅ Uploaded and saved ${file.name}`)
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `📂 Uploaded **${file.name}**. It's now saved on the server and will be available next time. Ask me anything about this data.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }])
    } catch { flash("⚠ Upload failed") }
    finally { setLoadingCsv(null) }
  }, [])

  const ask = useCallback(async (qText: string, autoFile?: string) => {
    const q = qText.trim()
    if (!q) return

    let activeCsvText = csvText
    let activeFilename = filename
    if (autoFile && autoFile !== filename) {
      setLoadingCsv(autoFile)
      try {
        const r = await fetch(`${API}/api/data/load/${autoFile}`)
        const d = await r.json()
        if (d.csv_text) {
          activeCsvText  = d.csv_text
          activeFilename = autoFile
          setCsvText(d.csv_text); setFilename(autoFile)
        }
      } catch { /* fall through, backend will auto-pick */ }
      finally { setLoadingCsv(null) }
    }

    // Add user message to chat
    const userMsg: Message = {
      role: "user", content: q,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }
    setMessages(prev => [...prev, userMsg])
    setQuestion("")
    setLoading(true)

    const ctrl = new AbortController()
    const tid  = setTimeout(() => ctrl.abort(), 90000)

    try {
      const historyForApi = messages
        .filter(m => m.role === "user" || m.role === "assistant")
        .filter(m => !m.content.startsWith("📂"))  // skip file-load messages
        .slice(-10)  // last 10 turns max
        .map(m => ({ role: m.role, content: m.content.slice(0, 500) }))

      const r = await fetch(`${API}/api/insights/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question:  q,
          csv_text:  activeCsvText,
          filename:  activeFilename,
          history:   historyForApi,
        }),
        signal: ctrl.signal,
      })
      const d = await r.json()
      if (d.answer) {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: d.answer,
          timestamp:     d.timestamp,
          elapsed:       d.elapsed,
          analysis_type: d.analysis_type,
          filename:      d.filename,
        }])
      } else {
        setMessages(prev => [...prev, {
          role: "assistant", content: `⚠ ${d.error || "Something went wrong"}`, error: true,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        }])
      }
    } catch (e: any) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: e?.name === "AbortError"
          ? "⚠ The AI took too long. Please try a simpler question."
          : "⚠ Cannot connect to the backend server.",
        error: true,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }])
    } finally {
      clearTimeout(tid)
      setLoading(false)
    }
  }, [csvText, filename, messages])

  const clearChat = () => setMessages([])

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-80px)] gap-4">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart2 className="w-6 h-6 text-[#F16265]" /> Data Insights AI
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">Ask anything about fees, scores, attendance, staff — AI reads your CSV data</p>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <Button variant="outline" size="sm" onClick={clearChat} className="gap-1.5 text-xs">
                <X className="w-3.5 h-3.5" /> Clear Chat
              </Button>
            )}
            <label className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:border-[#F16265] hover:text-[#F16265] cursor-pointer transition-all bg-white">
              <Upload className="w-4 h-4" /> Upload CSV
              <input ref={fileRef} type="file" accept=".csv" className="hidden"
                onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />
            </label>
          </div>
        </div>

        {msg && (
          <div className={`px-4 py-2.5 rounded-xl text-sm font-medium ${msg.startsWith("✅") ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
            {msg}
          </div>
        )}

        <div className="flex gap-4 flex-1 min-h-0">

          {/* Sidebar — Files + Quick Questions */}
          <div className="w-56 flex-shrink-0 flex flex-col gap-3 hidden md:flex">

            {/* Available CSVs */}
            <div className="bg-white rounded-2xl border border-gray-100 p-3">
              <button className="flex items-center justify-between w-full mb-2"
                onClick={() => setFilesOpen(v => !v)}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5" /> Data Files
                </p>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${filesOpen ? "rotate-180" : ""}`} />
              </button>

              {csvFiles.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-2">No CSV files yet.<br />Upload one to get started.</p>
              ) : (
                <div className="space-y-1">
                  {csvFiles.map(f => (
                    <button key={f.filename} onClick={() => loadCsv(f.filename)}
                      className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-all ${
                        filename === f.filename
                          ? "bg-[#F16265]/10 text-[#F16265] font-semibold border border-[#F16265]/20"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                      disabled={loadingCsv === f.filename}
                    >
                      <div className="flex items-center gap-1.5">
                        {loadingCsv === f.filename
                          ? <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" />
                          : <span className="text-base">📄</span>
                        }
                        <span className="truncate">{f.filename}</span>
                      </div>
                      <p className="text-gray-400 ml-5 mt-0.5">{f.rows} rows · {f.size_kb}KB</p>
                    </button>
                  ))}
                </div>
              )}

              <button onClick={() => fetch(`${API}/api/data/list`).then(r=>r.json()).then(d=>setCsvFiles(d.files||[]))}
                className="mt-2 w-full flex items-center justify-center gap-1 text-xs text-gray-400 hover:text-gray-600 py-1">
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>

            {/* Quick questions */}
            <div className="bg-white rounded-2xl border border-gray-100 p-3 flex-1 overflow-y-auto">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Quick Questions</p>
              <div className="space-y-1.5">
                {QUICK.map(q => (
                  <button key={q.q}
                    onClick={() => ask(q.q, q.file)}
                    disabled={loading}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left hover:bg-[#F16265]/5 hover:border-[#F16265]/30 border border-transparent transition-all group disabled:opacity-50">
                    <span className="text-base flex-shrink-0">{q.icon}</span>
                    <span className="text-xs font-medium text-gray-700 group-hover:text-[#F16265]">{q.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main chat area */}
          <div className="flex-1 flex flex-col min-h-0 bg-white rounded-2xl border border-gray-100 overflow-hidden">

            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center gap-4 text-gray-300">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
                    <BarChart2 className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-gray-500 font-semibold">Ask anything about your institute</p>
                    <p className="text-sm mt-1">Select a data file from the sidebar or click a Quick Question</p>
                    <p className="text-sm">It remembers the whole conversation — ask follow-up questions!</p>
                  </div>
                  {/* Mobile quick questions */}
                  <div className="flex flex-wrap gap-2 justify-center md:hidden">
                    {QUICK.slice(0, 4).map(q => (
                      <button key={q.q} onClick={() => ask(q.q, q.file)}
                        className="px-3 py-1.5 bg-gray-100 rounded-xl text-xs text-gray-600 hover:bg-[#F16265]/10 hover:text-[#F16265] transition-all">
                        {q.icon} {q.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 ${
                    m.role === "user" ? "bg-[#F16265] text-white" : "bg-gray-100 text-gray-600"
                  }`}>
                    {m.role === "user" ? "👤" : TYPE_ICON[m.analysis_type||""] || "🤖"}
                  </div>

                  {/* Bubble */}
                  <div className={`max-w-[78%] ${m.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
                    <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                      m.role === "user"
                        ? "bg-[#F16265] text-white rounded-tr-sm"
                        : m.error
                          ? "bg-red-50 border border-red-200 text-red-700 rounded-tl-sm"
                          : "bg-gray-50 border border-gray-100 text-gray-800 rounded-tl-sm"
                    }`}>
                      {m.content}
                    </div>
                    <div className="flex items-center gap-2 px-1">
                      {m.timestamp && <span className="text-[10px] text-gray-400">{m.timestamp}</span>}
                      {m.elapsed && <span className="text-[10px] text-gray-400">{m.elapsed}s</span>}
                      {m.filename && m.role === "assistant" && (
                        <span className="text-[10px] text-gray-400">📄 {m.filename}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-sm flex-shrink-0">🤖</div>
                  <div className="bg-gray-50 border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#F16265]" />
                    <span className="text-sm text-gray-500">Analyzing data…</span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Active file indicator */}
            {filename && (
              <div className="px-4 py-2 bg-blue-50 border-t border-blue-100 flex items-center justify-between">
                <span className="text-xs text-blue-600 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5" />
                  Active: <strong>{filename}</strong>
                </span>
                <button onClick={() => { setCsvText(""); setFilename("") }}
                  className="text-xs text-blue-400 hover:text-blue-600 flex items-center gap-1">
                  <X className="w-3 h-3" /> Unload
                </button>
              </div>
            )}

            {/* Input */}
            <div className="p-3 border-t border-gray-100">
              <div className="flex gap-2">
                <Input
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !loading && ask(question)}
                  placeholder={filename ? `Ask about ${filename}…` : "Select a file or ask a question…"}
                  className="flex-1 rounded-xl border-gray-200 focus:border-[#F16265]"
                  disabled={loading}
                />
                <Button onClick={() => ask(question)} disabled={loading || !question.trim()}
                  className="bg-[#F16265] hover:bg-[#D94F52] rounded-xl px-4">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-[10px] text-gray-400 mt-1.5 ml-1">
                💡 Ask follow-up questions like "from the above, who has the most?" — it remembers the conversation
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
