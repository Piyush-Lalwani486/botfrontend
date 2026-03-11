"use client"
import type React from "react"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, Users, UserCheck, FileText, Settings, Menu, X,
  ChevronLeft, LogOut, BookOpen, GraduationCap, QrCode, Layers,
  CreditCard, MessageSquare, BarChart2, Upload, DollarSign,
  Briefcase, ShieldCheck, TrendingUp, Bell, ChevronRight,
  Banknote, Users2, Cpu,
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"

interface DashboardLayoutProps { children: React.ReactNode }

const ALL_NAV = [
  { section: "Main",
    items: [
      { name:"Dashboard",          href:"/dashboard",          icon:LayoutDashboard, perm:null },
    ]
  },
  { section: "Attendance",
    items: [
      { name:"Student Attendance", href:"/student-attendance", icon:Users,       perm:null },
      { name:"Barcode Scanner",    href:"/barcode-scanner",    icon:QrCode,      perm:null },
      { name:"Teacher Attendance", href:"/teacher-attendance", icon:UserCheck,   perm:null },
    ]
  },
  { section: "People",
    items: [
      { name:"Students",           href:"/student-data",       icon:GraduationCap, perm:null },
      { name:"Batches",            href:"/batches",            icon:Layers,        perm:null },
      { name:"ID Cards",           href:"/student-id-cards",   icon:CreditCard,    perm:null },
      { name:"Teachers",           href:"/teachers",           icon:Users2,        perm:null },
      { name:"Staff Payroll",      href:"/staff-payroll",      icon:Briefcase,     perm:"staff.view" },
    ]
  },
  { section: "Finance",
    items: [
      { name:"Payments & Fees",    href:"/payments",           icon:Banknote,      perm:"payments.view" },
      { name:"Expenses",           href:"/expenses",           icon:DollarSign,    perm:"expenses.view" },
    ]
  },
  { section: "AI & Analytics",
    items: [
      { name:"AI Tutor",           href:"/ai-tutor",           icon:Cpu,           perm:"ai_chat.use" },
      { name:"Data Insights",      href:"/insights",           icon:BarChart2,     perm:"reports.view" },
      { name:"CSV Upload & Clean", href:"/csv-upload",         icon:Upload,        perm:"csv.upload" },
      { name:"Reports",            href:"/reports",            icon:FileText,      perm:"reports.view" },
    ]
  },
  { section: "Admin",
    items: [
      { name:"Team & Roles",       href:"/user-management",    icon:ShieldCheck,   perm:"users.view" },
      { name:"Courses",            href:"/courses",            icon:BookOpen,      perm:null },
      { name:"Settings",           href:"/settings",           icon:Settings,      perm:null },
    ]
  },
]

function Sidebar({ collapsed, mobile, onClose }: { collapsed: boolean; mobile?: boolean; onClose?: () => void }) {
  const pathname = usePathname()
  const { user, logout, can, isAdmin } = useAuth()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  const visibleSections = ALL_NAV.map(section => ({
    ...section,
    items: section.items.filter(item => !item.perm || can(item.perm) || isAdmin)
  })).filter(s => s.items.length > 0)

  return (
    <div className={cn(
      "flex flex-col h-full bg-[#0A0A0F] text-white transition-all duration-300 border-r border-white/5",
      collapsed && !mobile ? "w-[68px]" : "w-64"
    )}>
      {/* Brand */}
      <div className={cn("flex items-center gap-3 p-4 border-b border-white/10 min-h-[64px]",
        collapsed && !mobile && "justify-center px-2")}>
        {(!collapsed || mobile) ? (
          <>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#F16265] to-[#D94F52] flex items-center justify-center flex-shrink-0 shadow-lg">
              <span className="text-white font-bold text-sm">FF</span>
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm text-white leading-tight truncate">Flip Flop Digital</p>
              <p className="text-[11px] text-white/40 leading-tight">Udaipur · Institute</p>
            </div>
          </>
        ) : (
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#F16265] to-[#D94F52] flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-sm">FF</span>
          </div>
        )}
        {mobile && onClose && (
          <button onClick={onClose} className="ml-auto p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-1 px-2">
        {visibleSections.map((section) => (
          <div key={section.section}>
            {(!collapsed || mobile) && (
              <p className="px-3 py-1.5 text-[10px] font-semibold tracking-widest uppercase text-white/25 mt-2 first:mt-0">
                {section.section}
              </p>
            )}
            {section.items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
              return (
                <Link key={item.href} href={item.href} prefetch={true}
                  onClick={() => mobile && onClose?.()}
                  title={collapsed && !mobile ? item.name : undefined}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 group",
                    isActive
                      ? "bg-[#F16265] text-white shadow-md shadow-[#F16265]/30"
                      : "text-white/55 hover:bg-white/8 hover:text-white",
                    collapsed && !mobile && "justify-center px-2"
                  )}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  {(!collapsed || mobile) && <span>{item.name}</span>}
                  {isActive && (!collapsed || mobile) && <ChevronRight className="w-3 h-3 ml-auto opacity-60" />}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User */}
      {user && (
        <div className={cn("border-t border-white/10 p-3", collapsed && !mobile && "flex justify-center")}>
          {(!collapsed || mobile) ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ background: user.role_color || "#F16265" }}>
                {user.name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                <p className="text-[11px] truncate" style={{ color: user.role_color || "#F16265" }}>{user.role_label}</p>
              </div>
              <button onClick={handleLogout} title="Sign out"
                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button onClick={handleLogout} title="Sign out"
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ background: user.role_color || "#F16265" }}>
              {user.name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [collapsed,  setCollapsed]  = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, loading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [loading, user, router])

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-[#F5F5F7]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#F16265] to-[#D94F52] flex items-center justify-center">
          <span className="text-white font-bold">FF</span>
        </div>
        <div className="flex gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#F16265] animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 rounded-full bg-[#F16265] animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 rounded-full bg-[#F16265] animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  )

  if (!user) return null

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F5F7]">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative z-50 flex h-full">
            <Sidebar collapsed={false} mobile onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col relative flex-shrink-0">
        <Sidebar collapsed={collapsed} />
        <button onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full border border-gray-200 bg-white shadow-md flex items-center justify-center hover:bg-gray-50 z-10 transition-colors">
          <ChevronLeft className={cn("w-3 h-3 text-gray-500 transition-transform duration-300", collapsed && "rotate-180")} />
        </button>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center gap-4 px-6 flex-shrink-0 shadow-sm">
          <button onClick={() => setMobileOpen(true)} className="md:hidden p-2 rounded-lg hover:bg-gray-100">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h2 className="text-[15px] font-semibold text-gray-900 capitalize">
              {pathname.split("/").filter(Boolean).join(" › ").replace(/-/g," ") || "Dashboard"}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Online
            </div>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ background: user?.role_color || "#F16265" }}>
              {user?.name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
