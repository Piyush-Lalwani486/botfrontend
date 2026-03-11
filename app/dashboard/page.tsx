"use client"
import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Users, UserCheck, BookOpen, Layers, TrendingDown, IndianRupee, ReceiptText, Loader2, ArrowUpRight } from "lucide-react"
import axios from "axios"
import Link from "next/link"

const API = "http://127.0.0.1:5000"
const fmt = (n: number) => n >= 100000 ? `₹${(n/100000).toFixed(1)}L` : n >= 1000 ? `₹${(n/1000).toFixed(0)}K` : `₹${n}`

interface Overview {
  students: number; teachers: number; courses: number; batches: number
  total_fee: number; total_paid: number; total_pending: number
  expenses_this_month: number; staff_due: number
}

export default function DashboardPage() {
  const [stats, setStats]     = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get(`${API}/api/overview`)
      .then(r => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const statCards = [
    { label:"Total Students",    value:stats?.students,       icon:Users,       color:"#3B82F6", link:"/student-data", suffix:"" },
    { label:"Teachers",          value:stats?.teachers,       icon:UserCheck,   color:"#10B981", link:"/teachers",     suffix:"" },
    { label:"Courses",           value:stats?.courses,        icon:BookOpen,    color:"#8B5CF6", link:"/courses",      suffix:"" },
    { label:"Batches",           value:stats?.batches,        icon:Layers,      color:"#F59E0B", link:"/batches",      suffix:"" },
  ]

  const financeCards = [
    { label:"Total Fees Collected",  value:stats ? fmt(stats.total_paid)    : "-", icon:IndianRupee,  color:"#10B981", link:"/payments",      note:stats ? `of ${fmt(stats.total_fee)} total` : "" },
    { label:"Pending Fees",          value:stats ? fmt(stats.total_pending)  : "-", icon:TrendingDown, color:"#EF4444", link:"/payments",      note:"fee recovery needed" },
    { label:"Expenses This Month",   value:stats ? fmt(stats.expenses_this_month) : "-", icon:ReceiptText, color:"#F59E0B", link:"/expenses", note:"current month" },
    { label:"Staff Salary Due",      value:stats ? fmt(stats.staff_due)     : "-", icon:UserCheck,    color:"#8B5CF6", link:"/staff-payroll", note:"payroll pending" },
  ]

  const quickLinks = [
    { label:"Mark Attendance",   href:"/student-attendance", emoji:"✅", color:"#3B82F6" },
    { label:"Barcode Scanner",   href:"/barcode-scanner",    emoji:"📷", color:"#10B981" },
    { label:"Collect Payment",   href:"/payments",           emoji:"💰", color:"#F59E0B" },
    { label:"Add Expense",       href:"/expenses",           emoji:"🧾", color:"#EF4444" },
    { label:"AI Tutor",          href:"/ai-tutor",           emoji:"🤖", color:"#8B5CF6" },
    { label:"Data Insights",     href:"/insights",           emoji:"📊", color:"#F16265" },
    { label:"Upload CSV",        href:"/csv-upload",         emoji:"📂", color:"#06B6D4" },
    { label:"Manage Team",       href:"/user-management",    emoji:"🔐", color:"#64748B" },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500 text-sm mt-0.5">Flip Flop Digital Learning · Udaipur</p>
          </div>
          <div className="text-right text-sm text-gray-400">
            {new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"})}
          </div>
        </div>

        {/* People stats */}
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">People</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map(c => (
              <Link key={c.label} href={c.link}
                className="bg-white rounded-2xl p-5 border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all duration-200 group">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background:`${c.color}15` }}>
                    <c.icon className="w-4 h-4" style={{ color:c.color }} />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                </div>
                {loading ? <div className="w-12 h-8 bg-gray-100 rounded animate-pulse mt-1 mb-1" /> :
                  <p className="text-3xl font-bold text-gray-900">{c.value ?? 0}</p>}
                <p className="text-xs text-gray-500 mt-1">{c.label}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Finance stats */}
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Finance Overview</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {financeCards.map(c => (
              <Link key={c.label} href={c.link}
                className="bg-white rounded-2xl p-5 border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all duration-200 group">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background:`${c.color}15` }}>
                    <c.icon className="w-4 h-4" style={{ color:c.color }} />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                </div>
                {loading ? <div className="w-20 h-8 bg-gray-100 rounded animate-pulse mt-1 mb-1" /> :
                  <p className="text-2xl font-bold text-gray-900">{c.value}</p>}
                <p className="text-xs text-gray-500 mt-1">{c.label}</p>
                {c.note && <p className="text-[10px] text-gray-400 mt-0.5">{c.note}</p>}
              </Link>
            ))}
          </div>
        </div>

        {/* Fee collection progress */}
        {stats && stats.total_fee > 0 && (
          <div className="bg-white rounded-2xl p-5 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700">Fee Collection Progress</h2>
              <span className="text-sm font-bold text-green-600">{Math.round(stats.total_paid/stats.total_fee*100)}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div className="bg-gradient-to-r from-green-400 to-green-500 h-3 rounded-full transition-all duration-700"
                style={{ width:`${Math.min(100,Math.round(stats.total_paid/stats.total_fee*100))}%` }} />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-2">
              <span>Collected: {fmt(stats.total_paid)}</span>
              <span>Pending: {fmt(stats.total_pending)}</span>
              <span>Total: {fmt(stats.total_fee)}</span>
            </div>
          </div>
        )}

        {/* Quick links */}
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Quick Actions</h2>
          <div className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {quickLinks.map(q => (
              <Link key={q.href} href={q.href}
                className="bg-white rounded-2xl p-4 border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all duration-200 flex flex-col items-center gap-2 text-center group">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform"
                  style={{ background:`${q.color}12` }}>
                  {q.emoji}
                </div>
                <span className="text-[11px] font-medium text-gray-600 leading-tight">{q.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
