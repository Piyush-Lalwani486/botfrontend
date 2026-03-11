"use client"
import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Plus, Trash2, Filter } from "lucide-react"

const API = "http://127.0.0.1:5000"
const fmt = (n: number) => `₹${Number(n).toLocaleString("en-IN")}`
const CATEGORIES = ["Rent","Utilities","Salary","Stationery","Marketing","Maintenance","Technology","Transport","Food","Other"]
const MODES      = ["Cash","UPI","Bank Transfer","Cheque","Card"]

interface Expense { Date:string; Category:string; Description:string; Amount:string; PaidTo:string; PaidBy:string; PaymentMode:string; Notes:string }
interface Stats   { total:number; this_month:number; by_category:Record<string,number> }

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [stats,    setStats]    = useState<Stats|null>(null)
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [catFilter,setCat]      = useState("all")
  const [msg,      setMsg]      = useState("")
  const [form,     setForm]     = useState({
    Date: new Date().toISOString().slice(0,10), Category:"", Description:"", Amount:"",
    PaidTo:"", PaidBy:"", PaymentMode:"UPI", Notes:""
  })

  const flash = (m:string) => { setMsg(m); setTimeout(()=>setMsg(""),4000) }

  const load = async () => {
    setLoading(true)
    try {
      const r = await fetch(`${API}/api/expenses`)
      const d = await r.json()
      setExpenses((d.expenses||[]).reverse())
      setStats(d.stats||null)
    } catch { flash("⚠ Cannot connect to server") }
    finally { setLoading(false) }
  }

  const addExpense = async () => {
    if (!form.Date || !form.Category || !form.Amount) { flash("⚠ Date, Category and Amount are required"); return }
    try {
      await fetch(`${API}/api/expenses`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(form) })
      flash("✅ Expense recorded")
      setShowForm(false)
      setForm({ Date:new Date().toISOString().slice(0,10), Category:"", Description:"", Amount:"", PaidTo:"", PaidBy:"", PaymentMode:"UPI", Notes:"" })
      load()
    } catch { flash("⚠ Could not save") }
  }

  const deleteExpense = async (idx: number) => {
    if (!confirm("Delete this expense?")) return
    const realIdx = expenses.length - 1 - idx
    try {
      await fetch(`${API}/api/expenses/${realIdx}`, { method:"DELETE" })
      flash("✅ Deleted"); load()
    } catch { flash("⚠ Could not delete") }
  }

  useEffect(() => { load() }, [])

  const cats = [...new Set(expenses.map(e=>e.Category).filter(Boolean))]
  const filtered = catFilter === "all" ? expenses : expenses.filter(e=>e.Category===catFilter)

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
            <p className="text-gray-500 text-sm">Track institute expenditure and payments</p>
          </div>
          <button onClick={()=>setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-[#F16265] text-white rounded-xl text-sm font-semibold hover:bg-[#D94F52] transition-colors">
            <Plus className="w-4 h-4" /> Add Expense
          </button>
        </div>

        {msg && <div className={`px-4 py-3 rounded-xl text-sm font-medium ${msg.startsWith("✅") ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>{msg}</div>}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-gray-100">
              <p className="text-2xl font-bold text-gray-900">{fmt(stats.total)}</p>
              <p className="text-xs text-gray-500 mt-1">Total All Time</p>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-gray-100">
              <p className="text-2xl font-bold text-gray-900">{fmt(stats.this_month)}</p>
              <p className="text-xs text-gray-500 mt-1">This Month</p>
            </div>
            <div className="col-span-2 bg-white rounded-2xl p-5 border border-gray-100">
              <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">By Category</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.by_category).map(([cat,amt])=>(
                  <span key={cat} className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-700">
                    {cat}: {fmt(amt)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Add form */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">New Expense Entry</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label:"Date *",        key:"Date",        type:"date" },
                { label:"Amount (₹) *",  key:"Amount",      type:"number", placeholder:"e.g. 5000" },
                { label:"Paid To",       key:"PaidTo",      type:"text", placeholder:"Vendor/person name" },
                { label:"Paid By",       key:"PaidBy",      type:"text", placeholder:"Staff name" },
                { label:"Description",   key:"Description", type:"text", placeholder:"What was it for?" },
                { label:"Notes",         key:"Notes",       type:"text", placeholder:"Additional notes" },
              ].map(f=>(
                <div key={f.key}>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">{f.label}</label>
                  <input type={f.type} value={(form as any)[f.key]} placeholder={f.placeholder}
                    onChange={e=>setForm({...form,[f.key]:e.target.value})}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#F16265] focus:ring-1 focus:ring-[#F16265]/20 transition-all" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Category *</label>
                <select value={form.Category} onChange={e=>setForm({...form,Category:e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#F16265] transition-all bg-white">
                  <option value="">Select category</option>
                  {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Payment Mode</label>
                <select value={form.PaymentMode} onChange={e=>setForm({...form,PaymentMode:e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#F16265] transition-all bg-white">
                  {MODES.map(m=><option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={addExpense} className="px-5 py-2 bg-[#F16265] text-white rounded-xl text-sm font-semibold hover:bg-[#D94F52] transition-colors">Save Expense</button>
              <button onClick={()=>setShowForm(false)} className="px-5 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">Cancel</button>
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 font-medium">Filter:</span>
          {["all",...cats].map(c=>(
            <button key={c} onClick={()=>setCat(c)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${catFilter===c ? "bg-[#F16265] text-white" : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"}`}>
              {c==="all" ? "All" : c}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100">
          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No expenses recorded yet. Add your first expense above.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {["Date","Category","Description","Amount","Paid To","Paid By","Mode",""].map(h=>(
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((e,i)=>(
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{e.Date}</td>
                      <td className="px-4 py-3"><span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-xs">{e.Category}</span></td>
                      <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{e.Description}</td>
                      <td className="px-4 py-3 font-bold text-gray-900">{fmt(Number(e.Amount)||0)}</td>
                      <td className="px-4 py-3 text-gray-600">{e.PaidTo||"—"}</td>
                      <td className="px-4 py-3 text-gray-600">{e.PaidBy||"—"}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{e.PaymentMode}</td>
                      <td className="px-4 py-3">
                        <button onClick={()=>deleteExpense(i)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
