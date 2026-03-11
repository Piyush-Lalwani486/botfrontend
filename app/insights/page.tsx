"use client"
import { useState, useRef } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Upload, Send, BarChart2, Loader2 } from "lucide-react"

const API = "http://127.0.0.1:5000"

const QUICK = [
  { icon:"💰", label:"Pending Fees",    q:"Which students have pending fee payments? List their names and amount due." },
  { icon:"🏆", label:"Top Students",    q:"Who are the top 5 students with highest average scores?" },
  { icon:"⚠️", label:"Needs Attention", q:"Which students are scoring below 65 average and need extra attention?" },
  { icon:"📉", label:"Low Attendance",  q:"Which students have attendance below 80%?" },
  { icon:"📊", label:"Batch Summary",   q:"How many students are in each batch? Show summary." },
  { icon:"📈", label:"Most Improved",   q:"Which students have improved the most from Test 1 to the latest test?" },
  { icon:"💸", label:"Fee Defaulters",  q:"List all students who have not paid any fees at all." },
  { icon:"🔬", label:"Subject Toppers", q:"Who is the best student in Physics, Chemistry, and Maths/Biology separately?" },
]

interface Answer { question:string; answer:string; analysis_type:string; timestamp:string; elapsed:number }
interface Summary { title:string; total_records:number; data_type:string; key_stats:any[]; quick_questions:string[]; insights:string }

export default function InsightsPage() {
  const [csvText,  setCsvText]  = useState("")
  const [filename, setFilename] = useState("")
  const [summary,  setSummary]  = useState<Summary|null>(null)
  const [answers,  setAnswers]  = useState<Answer[]>([])
  const [question, setQuestion] = useState("")
  const [loading,  setLoading]  = useState(false)
  const [loadingS, setLoadingS] = useState(false)
  const [msg,      setMsg]      = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  const flash = (m:string) => { setMsg(m); setTimeout(()=>setMsg(""),4000) }

  const trimCsv = (text: string, maxRows = 60) => {
    const lines = text.trim().split("\n")
    if (lines.length <= maxRows + 1) return text
    return lines.slice(0, maxRows + 1).join("\n") + `\n... (${lines.length - 1} total rows)`
  }

  const processFile = async (file: File) => {
    if (!file.name.endsWith(".csv")) { flash("⚠ Please upload a .csv file"); return }
    const text = await file.text()
    setCsvText(text); setFilename(file.name); setSummary(null); setAnswers([])
    setLoadingS(true)
    try {
      const r = await fetch(`${API}/api/insights/summary`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ csv_text:trimCsv(text), filename:file.name })
      })
      const d = await r.json()
      if (!d.error) setSummary(d)
    } catch { flash("⚠ Cannot connect to server") }
    finally { setLoadingS(false) }
  }

  const loadDefault = async (fname: string) => {
    setLoadingS(true)
    try {
      const r = await fetch(`${API}/api/data/load/${fname}`)
      const d = await r.json()
      if (d.csv_text) {
        setCsvText(d.csv_text); setFilename(fname); setSummary(null); setAnswers([])
        const r2 = await fetch(`${API}/api/insights/summary`, {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ csv_text:d.csv_text, filename:fname })
        })
        const d2 = await r2.json()
        if (!d2.error) setSummary(d2)
        flash(`✅ Loaded ${fname}`)
      } else flash(`⚠ ${d.error||"File not found"}`)
    } catch { flash("⚠ Cannot connect") }
    finally { setLoadingS(false) }
  }

  const ask = async (q?: string) => {
    const qText = q || question.trim()
    if (!qText || !csvText) { flash("⚠ Upload a CSV first"); return }
    setLoading(true)
    const ctrl = new AbortController()
    const tid = setTimeout(() => ctrl.abort(), 90000)
    try {
      const r = await fetch(`${API}/api/insights/query`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ question:qText, csv_text:trimCsv(csvText, 50), filename, history:answers.slice(-3) }),
        signal: ctrl.signal
      })
      const d = await r.json()
      if (d.answer) {
        setAnswers(prev=>[...prev,{ question:qText, answer:d.answer, analysis_type:d.analysis_type, timestamp:d.timestamp, elapsed:d.elapsed }])
        if (!q) setQuestion("")
      } else flash(`⚠ ${d.error}`)
    } catch(e:any) {
      flash(e?.name==="AbortError" ? "⚠ The AI is taking longer than usual — please try again" : "⚠ Cannot connect to backend")
    }
    finally { clearTimeout(tid); setLoading(false) }
  }

  const TYPE_COLOR: Record<string,string> = { financial:"#059669", students:"#3b82f6", staff:"#7c3aed", expenses:"#dc2626", general:"#475569" }
  const TYPE_ICON:  Record<string,string> = { financial:"💰", students:"👥", staff:"👨‍🏫", expenses:"💸", general:"📋" }

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-[#F16265]" /> Data Insights
          </h1>
          <p className="text-gray-500 text-sm">Upload any CSV and ask questions — AI will analyze your data</p>
        </div>

        {msg && <div className={`px-4 py-3 rounded-xl text-sm font-medium ${msg.startsWith("✅") ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>{msg}</div>}

        {/* Upload */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex flex-wrap gap-3 items-center">
            <label className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-600 hover:border-[#F16265] hover:text-[#F16265] cursor-pointer transition-all">
              <Upload className="w-4 h-4" /> Upload CSV File
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e=>e.target.files?.[0] && processFile(e.target.files[0])} />
            </label>
            <span className="text-gray-300 text-sm">or load sample:</span>
            {["students_data.csv","expenses_data.csv","staff_data.csv"].map(f=>(
              <button key={f} onClick={()=>loadDefault(f)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-600 hover:border-[#F16265]/50 hover:bg-[#F16265]/5 transition-all">
                {f}
              </button>
            ))}
            {csvText && <span className="text-xs text-green-600 font-medium flex items-center gap-1">✅ {filename} loaded</span>}
          </div>
        </div>

        {/* Summary */}
        {loadingS && <div className="flex items-center gap-3 text-gray-500 text-sm py-6 justify-center"><Loader2 className="w-5 h-5 animate-spin text-[#F16265]" /> Analyzing CSV...</div>}

        {summary && !loadingS && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold text-gray-900">{summary.title}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{summary.total_records} records · {summary.data_type}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {summary.key_stats.map((s:any,i:number)=>(
                <div key={i} className="bg-gray-50 rounded-xl p-3">
                  <div className="text-xl mb-1">{s.icon}</div>
                  <p className="font-bold text-gray-900 text-sm">{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>
            {summary.insights && <p className="text-sm text-gray-600 bg-blue-50 rounded-xl p-3 border border-blue-100">{summary.insights}</p>}
            <div className="mt-4">
              <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Suggested Questions:</p>
              <div className="flex flex-wrap gap-2">
                {summary.quick_questions?.map((q:string,i:number)=>(
                  <button key={i} onClick={()=>ask(q)}
                    className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600 hover:border-[#F16265]/50 hover:bg-[#F16265]/5 transition-all text-left">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Quick prompts */}
        {csvText && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Quick Questions</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {QUICK.map(q=>(
                <button key={q.q} onClick={()=>ask(q.q)}
                  className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-left hover:border-[#F16265]/50 hover:bg-[#F16265]/5 transition-all group">
                  <span className="text-lg">{q.icon}</span>
                  <span className="text-xs font-medium text-gray-700 group-hover:text-gray-900">{q.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Ask */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-3">
          <input value={question} onChange={e=>setQuestion(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&ask()}
            placeholder={csvText ? "Ask anything about your data..." : "Upload a CSV first, then ask questions"}
            disabled={!csvText}
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#F16265] focus:ring-1 focus:ring-[#F16265]/20 disabled:bg-gray-50 disabled:text-gray-400 transition-all" />
          <button onClick={()=>ask()} disabled={loading||!question.trim()||!csvText}
            className="px-4 py-2.5 bg-[#F16265] text-white rounded-xl hover:bg-[#D94F52] disabled:opacity-50 transition-colors flex items-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>

        {/* Answers */}
        {answers.length > 0 && (
          <div className="space-y-4">
            {[...answers].reverse().map((a,i)=>(
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-xl">{TYPE_ICON[a.analysis_type]||"📋"}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 text-sm">{a.question}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{a.timestamp} · {a.elapsed}s</p>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed border border-gray-100">
                  {a.answer}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
