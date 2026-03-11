"use client"
import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Upload, IndianRupee } from "lucide-react"

const API = "http://127.0.0.1:5000"
const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`

interface Staff { name:string; role:string; phone:string; email:string; salary:number; paid:number; due:number; pay_date:string; join_date:string; status:string; notes:string }

export default function StaffPayrollPage() {
  const [staff,     setStaff]    = useState<Staff[]>([])
  const [stats,     setStats]    = useState({ total_due:0, count:0 })
  const [loading,   setLoading]  = useState(false)
  const [csvFile,   setCsvFile]  = useState<File|null>(null)
  const [msg,       setMsg]      = useState("")
  const [search,    setSearch]   = useState("")

  const flash = (m:string) => { setMsg(m); setTimeout(()=>setMsg(""),4000) }

  const loadData = async (text?: string) => {
    setLoading(true)
    try {
      const r = await fetch(`${API}/api/staff/payroll`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ csv_text: text || "" })
      })
      const d = await r.json()
      if (d.error) flash(`⚠ ${d.error}`)
      else { setStaff(d.staff||[]); setStats({ total_due:d.total_due||0, count:d.count||0 }) }
    } catch { flash("⚠ Cannot connect to server") }
    finally { setLoading(false) }
  }

  const loadDefault = async () => {
    const r = await fetch(`${API}/api/staff/default`)
    const d = await r.json()
    if (d.csv_text) loadData(d.csv_text)
    else flash("No default staff file. Please upload staff_data.csv")
  }

  const handleFile = async (f: File) => {
    setCsvFile(f)
    const text = await f.text()
    await loadData(text)
    flash(`✅ ${f.name} loaded`)
  }

  useEffect(() => { loadDefault() }, [])

  const filtered = staff.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.role.toLowerCase().includes(search.toLowerCase()))

  const totalSalary = staff.reduce((a,s)=>a+s.salary,0)
  const totalPaid   = staff.reduce((a,s)=>a+s.paid,0)
  const totalDue    = staff.reduce((a,s)=>a+s.due,0)
  const active      = staff.filter(s=>s.status==="Active").length

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Staff Payroll</h1>
            <p className="text-gray-500 text-sm">Manage staff salaries and payment tracking</p>
          </div>
          <div className="flex gap-2">
            <label className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors">
              <Upload className="w-4 h-4 text-gray-500" />
              {csvFile ? csvFile.name : "Upload Staff CSV"}
              <input type="file" accept=".csv" className="hidden" onChange={e=>e.target.files?.[0] && handleFile(e.target.files[0])} />
            </label>
            <button onClick={loadDefault} className="px-4 py-2 bg-[#F16265] text-white rounded-xl text-sm font-medium hover:bg-[#D94F52] transition-colors">
              Load Default
            </button>
          </div>
        </div>

        {msg && <div className={`px-4 py-3 rounded-xl text-sm font-medium ${msg.startsWith("✅") ? "bg-green-50 text-green-700 border border-green-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>{msg}</div>}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label:"Total Staff",       value:`${active} Active / ${staff.length} Total`, icon:"👥" },
            { label:"Total Payroll",     value:fmt(totalSalary), icon:"💰" },
            { label:"Paid This Month",   value:fmt(totalPaid),   icon:"✅" },
            { label:"Salary Due",        value:fmt(totalDue),    icon:"⏳", highlight: totalDue > 0 },
          ].map(s=>(
            <div key={s.label} className={`bg-white rounded-2xl p-5 border ${s.highlight ? "border-red-200" : "border-gray-100"}`}>
              <div className="text-xl mb-2">{s.icon}</div>
              <p className={`text-xl font-bold ${s.highlight ? "text-red-600" : "text-gray-900"}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or role..."
            className="w-full max-w-xs border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#F16265] transition-all" />
        </div>

        {/* Staff table */}
        <div className="bg-white rounded-2xl border border-gray-100">
          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading staff data...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-3">👨‍🏫</p>
              <p>No staff data loaded. Upload staff_data.csv or use the "Load Default" button.</p>
              <p className="text-xs mt-2">CSV should have: StaffName, Role, Phone, Email, Salary, SalaryPaid, PayDate, JoinDate, Status, Notes</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {["Name","Role","Phone","Salary","Paid","Due","Pay Date","Status"].map(h=>(
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((s,i)=>(
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{s.name}</p>
                        {s.notes && <p className="text-[11px] text-gray-400 truncate max-w-xs">{s.notes}</p>}
                      </td>
                      <td className="px-4 py-3"><span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs">{s.role}</span></td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{s.phone}</td>
                      <td className="px-4 py-3 text-gray-700 font-medium">{fmt(s.salary)}</td>
                      <td className="px-4 py-3 text-green-600 font-medium">{fmt(s.paid)}</td>
                      <td className="px-4 py-3">
                        <span className={`font-bold ${s.due>0 ? "text-red-500" : "text-green-500"}`}>
                          {s.due>0 ? fmt(s.due) : "✓ Paid"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{s.pay_date||"—"}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.status==="Active" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>{s.status}</span>
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
