"use client"
import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { IndianRupee, AlertTriangle, CheckCircle, Upload, Search, Filter } from "lucide-react"

const API = "http://127.0.0.1:5000"
const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`

interface Student {
  roll:string; name:string; batch:string; phone:string
  total_fee:number; paid:number; pending:number
  last_payment:string; last_amount:number; payment_mode:string; status:string
}
interface Summary {
  total_fee:number; total_paid:number; total_pending:number
  fully_paid:number; has_pending:number; total_students:number
  by_mode:Record<string,number>; by_batch:Record<string,{total_fee:number;paid:number;pending:number;count:number}>
  students:Student[]
}

export default function PaymentsPage() {
  const [summary, setSummary]     = useState<Summary|null>(null)
  const [alerts,  setAlerts]      = useState<any[]>([])
  const [loading, setLoading]     = useState(false)
  const [tab,     setTab]         = useState<"overview"|"students"|"alerts">("overview")
  const [search,  setSearch]      = useState("")
  const [batchFilter, setBatch]   = useState("all")
  const [dueDate, setDueDate]     = useState(() => new Date().toISOString().split('T')[0])
  const [sending, setSending]     = useState(false)
  const [sendResult, setSendResult] = useState("")
  const [csvFile, setCsvFile]     = useState<File|null>(null)
  const [csvText, setCsvText]     = useState("")
  const [msg,     setMsg]         = useState("")

  const flash = (m:string) => { setMsg(m); setTimeout(()=>setMsg(""),4000) }

  const loadData = async (text?: string) => {
    const ct = text || csvText
    setLoading(true)
    try {
      const r = await fetch(`${API}/api/payments/summary`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ csv_text: ct })
      })
      const d = await r.json()
      if (d.error) flash(`⚠ ${d.error}`)
      else setSummary(d)
    } catch { flash("⚠ Cannot connect to server") }
    finally { setLoading(false) }
  }

  const checkAlerts = async () => {
    setLoading(true)
    try {
      const r = await fetch(`${API}/api/fee-alerts/check`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ csv_text: csvText, due_date: dueDate })
      })
      const d = await r.json()
      setAlerts(d.alerts || []); setTab("alerts")
    } catch { flash("⚠ Error") }
    finally { setLoading(false) }
  }

  const sendAlerts = async () => {
    setSending(true); setSendResult("")
    try {
      const r = await fetch(`${API}/api/fee-alerts/send`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ csv_text: csvText, due_date: dueDate })
      })
      const d = await r.json()
      if (d.error) setSendResult(`⚠ ${d.error}`)
      else setSendResult(`✅ Sent: ${d.sent} · Failed: ${d.failed} · Skipped: ${d.skipped}${d.note ? ` — ${d.note}` : ""}`)
    } catch { setSendResult("⚠ Could not send") }
    finally { setSending(false); setTimeout(() => setSendResult(""), 8000) }
  }

  const handleFile = async (f: File) => {
    setCsvFile(f)
    const text = await f.text()
    setCsvText(text)
    await loadData(text)
    flash(`✅ ${f.name} loaded`)
  }

  const loadDefault = async () => {
    const r = await fetch(`${API}/api/data/load/students_data.csv`)
    const d = await r.json()
    if (d.csv_text) { setCsvText(d.csv_text); await loadData(d.csv_text); flash("✅ Loaded students_data.csv") }
    else flash("⚠ No file. Upload a student CSV.")
  }

  useEffect(() => { loadDefault() }, [])

  const students = summary?.students || []
  const batches  = [...new Set(students.map(s=>s.batch).filter(Boolean))]
  const filtered = students.filter(s =>
    (batchFilter==="all" || s.batch===batchFilter) &&
    (s.name.toLowerCase().includes(search.toLowerCase()) || s.roll.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payments & Fees</h1>
            <p className="text-gray-500 text-sm">Track student fee collection and pending payments</p>
          </div>
          <div className="flex gap-2">
            <label className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors">
              <Upload className="w-4 h-4 text-gray-500" />
              {csvFile ? csvFile.name : "Upload CSV"}
              <input type="file" accept=".csv" className="hidden" onChange={e=>e.target.files?.[0] && handleFile(e.target.files[0])} />
            </label>
            <button onClick={loadDefault} className="px-4 py-2 bg-[#F16265] text-white rounded-xl text-sm font-medium hover:bg-[#D94F52] transition-colors">
              Reload Default
            </button>
          </div>
        </div>

        {msg && <div className={`px-4 py-3 rounded-xl text-sm font-medium ${msg.startsWith("✅") ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>{msg}</div>}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          {[["overview","📊 Overview"],["students","👥 Students"],["alerts","🔔 Fee Alerts"]].map(([id,label])=>(
            <button key={id} onClick={()=>setTab(id as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab===id ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
              {label}
            </button>
          ))}
        </div>

        {loading && <div className="flex items-center gap-3 text-gray-500 text-sm py-8 justify-center"><div className="w-5 h-5 border-2 border-[#F16265] border-t-transparent rounded-full animate-spin" /> Loading...</div>}

        {!loading && tab==="overview" && summary && (
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label:"Total Fee", value:fmt(summary.total_fee), color:"#3B82F6", icon:"💰" },
                { label:"Collected", value:fmt(summary.total_paid), color:"#10B981", icon:"✅" },
                { label:"Pending",   value:fmt(summary.total_pending), color:"#EF4444", icon:"⚠️" },
                { label:"Fully Paid",value:`${summary.fully_paid} / ${summary.total_students}`, color:"#8B5CF6", icon:"👥" },
              ].map(s=>(
                <div key={s.label} className="bg-white rounded-2xl p-5 border border-gray-100">
                  <div className="flex items-center gap-2 mb-2"><span className="text-xl">{s.icon}</span></div>
                  <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
            {/* Progress */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100">
              <h3 className="font-semibold text-gray-800 mb-3">Collection Progress</h3>
              <div className="w-full bg-gray-100 rounded-full h-4">
                <div className="bg-gradient-to-r from-green-400 to-green-500 h-4 rounded-full"
                  style={{ width:`${summary.total_fee > 0 ? Math.round(summary.total_paid/summary.total_fee*100) : 0}%` }} />
              </div>
              <p className="text-sm text-gray-500 mt-2">{Math.round(summary.total_paid/summary.total_fee*100)}% collected</p>
            </div>
            {/* By batch */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100">
              <h3 className="font-semibold text-gray-800 mb-4">By Batch</h3>
              <div className="space-y-3">
                {Object.entries(summary.by_batch).map(([batch, data])=>(
                  <div key={batch} className="flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-700 w-28 flex-shrink-0">{batch}</span>
                    <div className="flex-1">
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full"
                          style={{ width:`${data.total_fee > 0 ? Math.round(data.paid/data.total_fee*100) : 0}%` }} />
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 w-20 text-right">{fmt(data.paid)} / {fmt(data.total_fee)}</span>
                    <span className={`text-xs font-semibold w-10 text-right ${data.pending>0 ? "text-red-500" : "text-green-500"}`}>
                      {data.total_fee > 0 ? Math.round(data.paid/data.total_fee*100) : 0}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
            {/* By mode */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100">
              <h3 className="font-semibold text-gray-800 mb-4">Payment Mode</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(summary.by_mode).map(([mode,amount])=>(
                  <div key={mode} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500">{mode}</p>
                    <p className="font-bold text-gray-900 mt-1">{fmt(amount)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!loading && tab==="students" && (
          <div className="bg-white rounded-2xl border border-gray-100">
            <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3">
              <div className="flex-1 min-w-48 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                <Search className="w-4 h-4 text-gray-400" />
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search students..." className="bg-transparent text-sm flex-1 outline-none" />
              </div>
              <select value={batchFilter} onChange={e=>setBatch(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none">
                <option value="all">All Batches</option>
                {batches.map(b=><option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {["Roll","Name","Batch","Total Fee","Paid","Pending","Last Payment","Mode"].map(h=>(
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((s,i)=>(
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{s.roll}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                      <td className="px-4 py-3"><span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs">{s.batch}</span></td>
                      <td className="px-4 py-3 text-gray-700">{fmt(s.total_fee)}</td>
                      <td className="px-4 py-3 text-green-600 font-medium">{fmt(s.paid)}</td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold ${s.pending>0?"text-red-500":"text-green-500"}`}>
                          {s.pending>0 ? fmt(s.pending) : "✓ Paid"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{s.last_payment || "—"}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{s.payment_mode || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length===0 && <div className="text-center text-gray-400 py-12">No students found</div>}
            </div>
          </div>
        )}

        {!loading && tab==="alerts" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <span>Students whose last payment was before:</span>
                  <input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)}
                    className="border border-gray-200 rounded-lg px-2 py-1 text-sm outline-none focus:border-[#F16265]" />
                </div>
                <button onClick={checkAlerts} className="px-4 py-2 bg-[#F16265] text-white rounded-xl text-sm font-medium hover:bg-[#D94F52] transition-colors">
                  Check Alerts
                </button>
                {alerts.length>0 && (
                  <>
                    <span className="text-sm text-red-600 font-semibold">{alerts.length} students overdue</span>
                    <button onClick={sendAlerts} disabled={sending}
                      className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-60 flex items-center gap-2">
                      {sending ? <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" /> : "📱"}
                      Send Notifications
                    </button>
                  </>
                )}
              </div>
              <div className="text-xs text-gray-500 bg-blue-50 rounded-xl px-3 py-2">
                💡 To enable SMS/WhatsApp sending: add your Twilio credentials in <strong>Settings → Fee Alerts</strong>. Without Twilio, this shows who to call.
              </div>
            </div>
            {sendResult && (
              <div className={`rounded-xl p-3 text-sm font-medium ${sendResult.startsWith("✅") ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                {sendResult}
              </div>
            )}
            {alerts.map((a,i)=>(
              <div key={i} className="bg-white rounded-2xl p-5 border border-red-100 flex items-start gap-4">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">{a.name}</span>
                    <span className="text-xs text-gray-500 font-mono">{a.roll}</span>
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs">{a.batch}</span>
                    <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded-full text-xs font-semibold">Last paid: {a.last_payment || "Never"}</span>
                  </div>
                  <div className="mt-1 text-sm text-gray-600">Pending: <span className="font-bold text-red-600">{fmt(a.pending)}</span> · Last: {a.last_payment||"Never"} · 📞 {a.phone}</div>
                </div>
              </div>
            ))}
            {alerts.length===0 && tab==="alerts" && <div className="text-center text-gray-400 py-12 bg-white rounded-2xl border border-gray-100">Click "Check Alerts" to find overdue payments</div>}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
