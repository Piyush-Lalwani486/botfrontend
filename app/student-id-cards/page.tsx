"use client"
import { useEffect, useState, useRef, useCallback } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CreditCard, Printer, Search, Loader2, RefreshCw, QrCode } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000"

interface Student {
  id: number; first_name: string; last_name: string
  barcode_id: string | null; roll_number: string | null
  batch_name: string | null; courses: string[]; joining_date: string | null; age: number
}
interface Batch { id: number; name: string }

import QRCodeLib from "qrcode"

async function makeQR(text: string, size = 120): Promise<string> {
  try {
    return await QRCodeLib.toDataURL(text, {
      width: size, margin: 1,
      color: { dark: "#1a1a1a", light: "#ffffff" },
    })
  } catch {
    return ""
  }
}

function IDCard({ student }: { student: Student }) {
  const [qrSrc, setQrSrc] = useState("")

  useEffect(() => {
    if (!student.barcode_id) return
    makeQR(student.barcode_id).then(setQrSrc)
  }, [student.barcode_id])

  const initials = `${student.first_name[0] || ""}${student.last_name[0] || ""}`.toUpperCase()

  return (
    <div className="id-card w-[340px] bg-white rounded-xl overflow-hidden shadow-lg border border-gray-200 text-black select-none"
      style={{ fontFamily: "Arial, sans-serif" }}>

      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: "#F16265" }}>
        <CreditCard className="h-4 w-4 text-white flex-shrink-0" />
        <span className="text-white text-[11px] font-bold tracking-wide">FLIPFLOP DIGITAL LEARNING</span>
      </div>

      {/* Body */}
      <div className="px-4 pt-3 pb-2 flex gap-3">
        {/* Avatar */}
        <div className="w-16 h-20 rounded-xl flex-shrink-0 flex items-center justify-center text-2xl font-bold text-white"
          style={{ background: "#F16265" }}>
          {initials}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-0.5 text-[11px] text-gray-600">
          <p className="font-bold text-sm text-gray-900 truncate">{student.first_name} {student.last_name}</p>
          {student.roll_number && (
            <p className="font-mono font-semibold text-[#F16265] text-xs">{student.roll_number}</p>
          )}
          {student.batch_name && <p>📚 {student.batch_name}</p>}
          {student.courses.length > 0 && <p>📖 {student.courses.slice(0, 2).join(", ")}</p>}
          {student.joining_date && (
            <p>📅 {new Date(student.joining_date).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })}</p>
          )}
        </div>
      </div>

      {/* QR Code */}
      <div className="flex flex-col items-center py-3 bg-gray-50 mx-3 mb-3 rounded-xl border border-gray-100">
        {qrSrc ? (
          <>
            <img src={qrSrc} alt="QR" className="w-24 h-24" />
            <p className="text-[9px] font-mono text-gray-400 mt-1 tracking-widest">{student.barcode_id}</p>
          </>
        ) : (
          <div className="w-24 h-24 flex flex-col items-center justify-center text-gray-300 gap-1">
            <QrCode className="w-8 h-8" />
            <p className="text-[9px]">No QR code</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 px-4 py-1.5 text-center">
        <p className="text-[9px] text-gray-400">If found, please return to Flipflop Digital Learning</p>
      </div>
    </div>
  )
}

export default function StudentIDCardsPage() {
  const [students, setStudents]     = useState<Student[]>([])
  const [batches, setBatches]       = useState<Batch[]>([])
  const [isLoading, setIsLoading]   = useState(true)
  const [search, setSearch]         = useState("")
  const [batchFilter, setBatchFilter] = useState("all")
  const [selected, setSelected]     = useState<Set<number>>(new Set())
  const [isRegen, setIsRegen]       = useState<number | null>(null)
  const [isPrinting, setIsPrinting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    Promise.all([
      fetch(`${API}/students/`).then(r=>r.json()),
      fetch(`${API}/batches/`).then(r=>r.json()),
    ]).then(([s, b]) => {
      setStudents(Array.isArray(s) ? s : (s.data ?? []))
      setBatches(Array.isArray(b) ? b : (b.data ?? []))
    })
      .catch(() => toast({ variant: "destructive", title: "Error loading data" }))
      .finally(() => setIsLoading(false))
  }, [])

  const filtered = students.filter(s => {
    const matchSearch = `${s.first_name} ${s.last_name} ${s.roll_number || ""} ${s.barcode_id || ""}`
      .toLowerCase().includes(search.toLowerCase())
    const matchBatch  = batchFilter === "all" || s.batch_name === batchFilter
    return matchSearch && matchBatch
  })

  const toggleSelect = (id: number) => setSelected(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n
  })
  const selectAll   = () => setSelected(new Set(filtered.map(s => s.id)))
  const clearSelect = () => setSelected(new Set())

  const regenQR = async (id: number) => {
    if (!confirm("Regenerate QR code? Old QR will stop working for attendance.")) return
    setIsRegen(id)
    try {
      const r = await fetch(`${API}/students/${id}/regenerate-barcode`, {method:"POST"}).then(res=>res.json())
      setStudents(prev => prev.map(s => s.id === id ? { ...s, barcode_id: r.barcode_id } : s))
      toast({ title: "QR Code Regenerated" })
    } catch {
      toast({ variant: "destructive", title: "Failed to regenerate QR" })
    } finally { setIsRegen(null) }
  }

  // Print: pre-generate all QR data URLs then open print window
  const printCards = useCallback(async () => {
    const cardStudents = selected.size > 0
      ? filtered.filter(s => selected.has(s.id))
      : filtered

    if (cardStudents.length === 0) return
    setIsPrinting(true)

    try {
      // Generate all QR codes upfront
      const qrMap: Record<string, string> = {}
      await Promise.all(
        cardStudents.filter(s => s.barcode_id).map(async s => {
          qrMap[s.id] = await makeQR(s.barcode_id!, 200)
        })
      )

      const cardsHtml = cardStudents.map(s => {
        const initials = `${s.first_name[0]||""}${s.last_name[0]||""}`.toUpperCase()
        const qrImg    = qrMap[s.id] || ""
        const joinDate = s.joining_date
          ? new Date(s.joining_date).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })
          : ""
        return `
          <div class="id-card">
            <div class="card-header">
              <span>FLIPFLOP DIGITAL LEARNING</span>
            </div>
            <div class="card-body">
              <div class="avatar">${initials}</div>
              <div class="info">
                <p class="name">${s.first_name} ${s.last_name}</p>
                ${s.roll_number ? `<p class="roll">${s.roll_number}</p>` : ""}
                ${s.batch_name  ? `<p>📚 ${s.batch_name}</p>` : ""}
                ${s.courses.length > 0 ? `<p>📖 ${s.courses.slice(0,2).join(", ")}</p>` : ""}
                ${joinDate ? `<p>📅 ${joinDate}</p>` : ""}
              </div>
            </div>
            <div class="qr-area">
              ${qrImg
                ? `<img src="${qrImg}" alt="QR" width="96" height="96" />
                   <p class="qr-text">${s.barcode_id}</p>`
                : `<p style="color:#aaa;font-size:10px">No QR code</p>`
              }
            </div>
            <div class="card-footer">If found, return to Flipflop Digital Learning</div>
          </div>`
      }).join("")

      const win = window.open("", "_blank")!
      win.document.write(`<!DOCTYPE html><html><head>
        <title>Student ID Cards — Flipflop</title>
        <style>
          *{box-sizing:border-box;margin:0;padding:0}
          body{background:#eee;padding:20px;font-family:Arial,sans-serif}
          .grid{display:flex;flex-wrap:wrap;gap:16px}
          .id-card{width:320px;background:white;border-radius:12px;overflow:hidden;
            box-shadow:0 2px 8px rgba(0,0,0,.15);border:1px solid #ddd;page-break-inside:avoid}
          .card-header{background:#F16265;color:white;padding:7px 12px;
            font-size:11px;font-weight:bold;letter-spacing:.5px}
          .card-body{display:flex;gap:10px;padding:12px}
          .avatar{width:60px;height:76px;background:#F16265;border-radius:10px;
            display:flex;align-items:center;justify-content:center;
            color:white;font-size:20px;font-weight:bold;flex-shrink:0}
          .info{flex:1;font-size:11px;color:#555;line-height:1.8;min-width:0}
          .info .name{font-weight:bold;font-size:13px;color:#111}
          .info .roll{color:#F16265;font-family:monospace;font-weight:600;font-size:12px}
          .qr-area{display:flex;flex-direction:column;align-items:center;
            background:#f9f9f9;margin:0 10px 10px;border-radius:10px;
            border:1px solid #eee;padding:8px 12px}
          .qr-text{font-size:8px;color:#aaa;letter-spacing:2px;
            margin-top:4px;font-family:monospace}
          .card-footer{border-top:1px solid #eee;padding:5px 12px;
            font-size:9px;color:#bbb;text-align:center}
          @media print{
            body{background:white;padding:0}
            .grid{gap:8px}
            .id-card{box-shadow:none;border:1px solid #ccc}
          }
        </style>
      </head><body>
        <div class="grid">${cardsHtml}</div>
        <script>window.onload=function(){window.print()}<\/script>
      </body></html>`)
      win.document.close()
    } finally {
      setIsPrinting(false)
    }
  }, [filtered, selected])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold mb-1 flex items-center gap-3">
              <CreditCard className="h-8 w-8 text-primary" /> Student ID Cards
            </h1>
            <p className="text-muted-foreground text-sm">
              Each card has a QR code — scan it with any scanner app for attendance
            </p>
          </div>
          <div className="flex gap-2">
            {selected.size > 0 && (
              <Button variant="outline" onClick={clearSelect}>Clear ({selected.size})</Button>
            )}
            <Button className="bg-primary hover:bg-primary/90 gap-2" onClick={printCards} disabled={isPrinting}>
              {isPrinting
                ? <><Loader2 className="w-4 h-4 animate-spin" />Generating…</>
                : <><Printer className="h-4 w-4" />Print {selected.size > 0 ? `${selected.size} Cards` : "All"}</>
              }
            </Button>
          </div>
        </div>

        {/* How scanning works */}
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex gap-3 items-start text-sm">
          <QrCode className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-green-800">How QR attendance works</p>
            <p className="text-green-700 text-xs mt-0.5">
              Print these cards → give to students → go to <strong>QR Code Attendance</strong> page → start a session →
              click <strong>"Open on Phone"</strong> → scan QR codes with your phone camera →
              attendance marked instantly. Works on any network with Cloudflare Tunnel.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name, roll, or QR ID…" className="pl-8"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={batchFilter} onValueChange={setBatchFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All Batches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Batches</SelectItem>
              {batches.map(b => <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={selectAll}>Select All</Button>
        </div>

        {/* Cards grid */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mb-2" /><p>Loading students…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <CreditCard className="h-12 w-12 mx-auto opacity-30 mb-3" /><p>No students found</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-6">
            {filtered.map(student => (
              <div key={student.id} className="space-y-2">
                <IDCard student={student} />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={selected.has(student.id) ? "default" : "outline"}
                    className="flex-1 h-7 text-xs"
                    onClick={() => toggleSelect(student.id)}
                  >
                    {selected.has(student.id) ? "✓ Selected" : "Select"}
                  </Button>
                  <Button
                    size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1"
                    title="Regenerate QR code"
                    onClick={() => regenQR(student.id)}
                    disabled={isRegen === student.id}
                  >
                    {isRegen === student.id
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <RefreshCw className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
