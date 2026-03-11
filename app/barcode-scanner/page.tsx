"use client"
/**
 * Barcode Scanner — Multi-Session Dashboard
 *
 * HOW SCANNING WORKS (no browser scanner needed):
 * ─────────────────────────────────────────────
 * 1. Start a session for a batch
 * 2. A webhook URL is generated for that session
 * 3. Set up "Barcode to PC" app (Android/iOS) with that URL
 * 4. Scan student ID barcodes → results appear live on this dashboard
 *
 * Also supports: manual barcode entry as fallback
 */
import { useEffect, useState, useRef, useCallback } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Play, Square, CheckCircle, Clock, XCircle, Loader2,
  Wifi, WifiOff, Plus, Download, Radio, Keyboard,
  Smartphone, Copy, ExternalLink, Info
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import axios from "axios"
import { io, Socket } from "socket.io-client"

const API = "http://127.0.0.1:5000"
const WS  = "http://127.0.0.1:5000"

interface Batch { id: number; name: string }
interface ScanEvent {
  ok: boolean; session_id?: number; student_name?: string; barcode_id?: string
  status?: string; scanned_at?: string; roll_number?: string
  batch?: string; error?: string; duplicate?: boolean
}
interface SessionInfo {
  session_id: number; batch_id: number | null; batch: string
  course: string; started_at: string; scan_count: number
  present: number; late: number; is_active: boolean
}
interface LiveSession {
  info:        SessionInfo
  scans:       ScanEvent[]
  lastScan:    ScanEvent | null
  webhookUrl:  string
  qrImg:       string
  scannerCount: number
}

const COLORS = [
  { ring:"ring-[#F16265]", bg:"bg-[#F16265]/10", dot:"bg-[#F16265]",   text:"text-[#F16265]"   },
  { ring:"ring-blue-500",  bg:"bg-blue-500/10",  dot:"bg-blue-500",    text:"text-blue-600"    },
  { ring:"ring-emerald-500",bg:"bg-emerald-500/10",dot:"bg-emerald-500",text:"text-emerald-600" },
  { ring:"ring-violet-500",bg:"bg-violet-500/10", dot:"bg-violet-500", text:"text-violet-600"  },
  { ring:"ring-amber-500", bg:"bg-amber-500/10",  dot:"bg-amber-500",  text:"text-amber-600"   },
]

// ── Setup instructions modal ──────────────────────────────────────
function SetupModal({ url, qr, onClose }: { url: string; qr: string; onClose: () => void }) {
  const { toast } = useToast()
  const copy = () => { navigator.clipboard.writeText(url); toast({ title: "Copied!" }) }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 space-y-5">
          <div>
            <h2 className="text-lg font-bold">📱 Set Up Phone Scanner</h2>
            <p className="text-sm text-gray-500 mt-1">Use any of these 3 methods — easiest first</p>
          </div>

          {/* Method 1 — Barcode to PC */}
          <div className="border rounded-xl p-4 space-y-2 bg-blue-50 border-blue-200">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">1</span>
              <p className="font-semibold text-blue-800">Barcode to PC (Recommended — Free)</p>
            </div>
            <ol className="text-sm text-blue-700 space-y-1 pl-8 list-decimal">
              <li>Install <strong>Barcode to PC</strong> on your phone (Android / iPhone)</li>
              <li>Open the app → tap <strong>Settings</strong> → <strong>Server URL</strong></li>
              <li>Paste this URL:</li>
            </ol>
            <div className="flex items-center gap-2 bg-white rounded-lg border border-blue-200 px-3 py-2 mt-1">
              <code className="flex-1 text-xs break-all text-gray-800 font-mono">{url}</code>
              <button onClick={copy} className="text-blue-600 hover:text-blue-800 flex-shrink-0">
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <ol className="text-sm text-blue-700 space-y-1 pl-8 list-decimal" start={4}>
              <li>Set <strong>Method: POST</strong>, Body: <code className="bg-white px-1 rounded text-xs">{`{"barcode": "$CODE"}`}</code></li>
              <li>Start scanning — results appear live on dashboard</li>
            </ol>
            <div className="flex gap-2 pt-1">
              <a href="https://play.google.com/store/apps/details?id=com.barcodetopc.barcodetopc" target="_blank"
                className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-blue-700">
                <ExternalLink className="w-3 h-3" /> Android
              </a>
              <a href="https://apps.apple.com/app/barcode-to-pc/id1180278965" target="_blank"
                className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-blue-700">
                <ExternalLink className="w-3 h-3" /> iPhone
              </a>
            </div>
          </div>

          {/* Method 2 — Scan to URL apps */}
          <div className="border rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-gray-600 text-white text-xs flex items-center justify-center font-bold">2</span>
              <p className="font-semibold">Any "Scan to URL" app</p>
            </div>
            <p className="text-sm text-gray-600">Apps like <strong>Automate</strong>, <strong>Tasker</strong>, or <strong>HTTP Request Shortcuts</strong> — set URL template to:</p>
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg border px-3 py-2">
              <code className="flex-1 text-xs break-all text-gray-700 font-mono">{url}/{"BARCODE_VALUE"}</code>
              <button onClick={() => { navigator.clipboard.writeText(url + "/$CODE"); toast({ title:"Copied!" }) }}
                className="text-gray-500 hover:text-gray-700 flex-shrink-0"><Copy className="w-4 h-4" /></button>
            </div>
            <p className="text-xs text-gray-500">Replace <code>BARCODE_VALUE</code> with your app's scanned code variable</p>
          </div>

          {/* Method 3 — QR for easy URL copy */}
          <div className="border rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-gray-600 text-white text-xs flex items-center justify-center font-bold">3</span>
              <p className="font-semibold">Scan QR to copy URL on phone</p>
            </div>
            {qr ? (
              <div className="flex items-center gap-4">
                <img src={qr} alt="QR" className="w-28 h-28 rounded-xl border" />
                <p className="text-sm text-gray-500">Scan this QR with your phone camera to open the webhook URL — then paste it into your scanner app settings</p>
              </div>
            ) : (
              <p className="text-sm text-gray-400">QR not available</p>
            )}
          </div>

          <Button onClick={onClose} className="w-full">Done</Button>
        </div>
      </div>
    </div>
  )
}

// ── Single session card ───────────────────────────────────────────
function SessionCard({
  session, colorIdx, onEnd,
}: {
  session: LiveSession; colorIdx: number; onEnd: (id: number) => void
}) {
  const col     = COLORS[colorIdx % COLORS.length]
  const info    = session.info
  const { toast } = useToast()
  const [ending, setEnding]       = useState(false)
  const [showSetup, setShowSetup] = useState(false)
  const [manualCode, setManualCode] = useState("")
  const [scanning, setScanning]   = useState(false)

  const handleEnd = async () => {
    if (!confirm(`End session for "${info.batch}"? Unscanned students will be marked Absent.`)) return
    setEnding(true)
    try {
      await axios.post(`${API}/attendance/session/${info.session_id}/end`)
      onEnd(info.session_id)
    } catch(e: any) {
      alert(e.response?.data?.error || "Could not end session")
    } finally { setEnding(false) }
  }

  const handleManualScan = async () => {
    const code = manualCode.trim().toUpperCase()
    if (!code) return
    setScanning(true)
    try {
      await axios.post(`${API}/api/scan/${info.session_id}`, { barcode: code })
      setManualCode("")
    } catch(e: any) {
      const msg = e.response?.data?.error || "Scan failed"
      toast({ variant: "destructive", title: msg })
    } finally { setScanning(false) }
  }

  const exportCSV = () => {
    if (!session.scans.length) return
    const rows = [["Name","Roll","Status","Time"],
      ...session.scans.filter(s=>s.ok).map(s=>[
        s.student_name||"", s.roll_number||"", s.status||"", s.scanned_at||""
      ])]
    const a = document.createElement("a")
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(rows.map(r=>r.join(",")).join("\n"))
    a.download = `${info.batch.replace(/\s+/g,"-")}_${info.session_id}.csv`
    a.click()
  }

  const last = session.lastScan

  return (
    <>
      {showSetup && (
        <SetupModal url={session.webhookUrl} qr={session.qrImg} onClose={() => setShowSetup(false)} />
      )}
      <Card className={cn("border-2 transition-all", col.ring)}>
        {/* Header */}
        <CardHeader className={cn("pb-3", col.bg)}>
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn("flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-white/80", col.text)}>
                  <Radio className="w-3 h-3 animate-pulse" /> LIVE
                </span>
                <span className="font-bold">{info.batch}</span>
                {info.course && <span className="text-xs bg-white/70 text-gray-600 px-2 py-0.5 rounded-full">{info.course}</span>}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">Started {info.started_at} · Session #{info.session_id}</p>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-1 rounded-lg">✅ {info.present}</span>
              <span className="text-xs bg-yellow-100 text-yellow-700 font-semibold px-2 py-1 rounded-lg">⏰ {info.late}</span>
              <span className="text-xs bg-gray-100 text-gray-600 font-semibold px-2 py-1 rounded-lg">👥 {info.scan_count}</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          {/* Webhook URL + Setup button */}
          <div className="bg-gray-50 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Webhook URL</p>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={() => setShowSetup(true)}>
                <Smartphone className="w-3.5 h-3.5" /> Setup Phone App
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-[11px] font-mono text-gray-600 bg-white border rounded-lg px-2 py-1.5 break-all">
                {session.webhookUrl}
              </code>
              <button
                onClick={() => { navigator.clipboard.writeText(session.webhookUrl); }}
                className="flex-shrink-0 text-gray-400 hover:text-gray-700 p-1">
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-gray-400 flex items-center gap-1">
              <Info className="w-3 h-3" />
              Send POST with <code className="bg-white px-1 rounded">{`{"barcode":"CODE"}`}</code> — or GET to <code className="bg-white px-1 rounded">{session.webhookUrl}/CODE</code>
            </p>
          </div>

          {/* Last scan result */}
          {last ? (
            last.ok ? (
              <div className={cn("rounded-xl p-3 flex items-center gap-3 text-sm",
                last.status === "Late" ? "bg-yellow-50 border border-yellow-200" : "bg-green-50 border border-green-200")}>
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0",
                  last.status === "Late" ? "bg-yellow-100" : "bg-green-100")}>
                  {last.status === "Late" ? <Clock className="w-5 h-5 text-yellow-600" /> : <CheckCircle className="w-5 h-5 text-green-600" />}
                </div>
                <div>
                  <p className="font-semibold">{last.student_name}</p>
                  <p className={cn("text-xs", last.status === "Late" ? "text-yellow-600" : "text-green-600")}>
                    {last.status} · {last.roll_number} · {last.scanned_at}
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl p-3 flex items-center gap-3 text-sm bg-red-50 border border-red-200">
                <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                  <XCircle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="font-semibold text-red-700">{last.duplicate ? "Already Scanned" : "Not Found"}</p>
                  <p className="text-xs text-red-400">{last.error}</p>
                </div>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center py-5 text-gray-300 gap-1.5 bg-gray-50 rounded-xl border-2 border-dashed">
              <Smartphone className="w-7 h-7" />
              <p className="text-xs">Waiting for first scan from phone app…</p>
            </div>
          )}

          {/* Scan log */}
          {session.scans.length > 0 && (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {session.scans.slice(0, 10).map((s, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-2.5 py-1.5">
                  <span className="font-medium truncate flex-1">{s.student_name}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={s.status === "Late" ? "text-yellow-600" : "text-green-600"}>{s.status}</span>
                    <span className="text-gray-400">{s.scanned_at}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Manual input fallback */}
          <div className="border-t pt-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Keyboard className="w-3.5 h-3.5" /> Manual Entry (fallback)
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="Type or paste barcode ID…"
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleManualScan()}
                className="h-9 font-mono text-sm"
              />
              <Button size="sm" className="h-9 px-4 flex-shrink-0" onClick={handleManualScan} disabled={scanning || !manualCode.trim()}>
                {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : "Scan"}
              </Button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Press Enter or click Scan to submit a barcode manually</p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1 border-t">
            <Button variant="destructive" size="sm" className="gap-1.5" onClick={handleEnd} disabled={ending}>
              {ending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Square className="w-3.5 h-3.5" />}
              End Session
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={exportCSV} disabled={!session.scans.length}>
              <Download className="w-3.5 h-3.5" /> Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

// ── Main page ─────────────────────────────────────────────────────
export default function BarcodeScannerPage() {
  const [batches,  setBatches]  = useState<Batch[]>([])
  const [sessions, setSessions] = useState<Map<number, LiveSession>>(new Map())
  const [wsConn,   setWsConn]   = useState(false)
  const [newBatch, setNewBatch] = useState("none")
  const [newCourse,setNewCourse]= useState("")
  const [lateAfter,setLateAfter]= useState("15")
  const [starting, setStarting] = useState(false)

  const socketRef   = useRef<Socket | null>(null)
  const flashTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())
  const { toast }   = useToast()

  // Load batches + restore active sessions
  useEffect(() => {
    axios.get(`${API}/batches/`).then(r => setBatches(r.data)).catch(() => {})
    axios.get(`${API}/attendance/sessions/active`).then(r => {
      r.data.forEach((s: SessionInfo) => loadSession(s))
    }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // WebSocket
  useEffect(() => {
    const socket = io(WS, { transports: ["websocket", "polling"] })
    socketRef.current = socket
    socket.on("connect",    () => setWsConn(true))
    socket.on("disconnect", () => setWsConn(false))

    socket.on("scan_event", (data: ScanEvent) => {
      const sid = data.session_id
      if (!sid) return
      // Clear flash timer
      const t = flashTimers.current.get(sid)
      if (t) clearTimeout(t)
      const newTimer = setTimeout(() => {
        setSessions(p => {
          const m = new Map(p); const ss = m.get(sid)
          if (ss) m.set(sid, { ...ss, lastScan: null })
          return m
        })
      }, 4000)
      flashTimers.current.set(sid, newTimer)

      setSessions(prev => {
        const next = new Map(prev); const s = next.get(sid)
        if (!s) return prev
        const newScans = data.ok ? [data, ...s.scans.slice(0, 99)] : s.scans
        const newInfo  = data.ok ? {
          ...s.info, scan_count: s.info.scan_count + 1,
          present: s.info.present + (data.status !== "Late" ? 1 : 0),
          late:    s.info.late    + (data.status === "Late" ? 1 : 0),
        } : s.info
        next.set(sid, { ...s, lastScan: data, scans: newScans, info: newInfo })
        return next
      })
    })

    socket.on("scanner_joined", (d: { session_id: number }) => {
      setSessions(prev => {
        const next = new Map(prev); const s = next.get(d.session_id)
        if (s) next.set(d.session_id, { ...s, scannerCount: s.scannerCount + 1 })
        return next
      })
    })

    return () => { socket.disconnect() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadSession = useCallback(async (info: SessionInfo) => {
    // Get webhook URL + QR for this session
    let webhookUrl = `${API}/api/scan/${info.session_id}`
    let qrImg = ""
    try {
      const r = await axios.get(`${API}/api/session/${info.session_id}/qr`)
      webhookUrl = r.data.webhook_url || webhookUrl
      qrImg      = r.data.qr || ""
    } catch { /* use default */ }

    const ls: LiveSession = {
      info, scans: [], lastScan: null, webhookUrl, qrImg, scannerCount: 0,
    }
    setSessions(prev => new Map(prev).set(info.session_id, ls))
    if (socketRef.current?.connected) {
      socketRef.current.emit("join_session", { session_id: info.session_id })
    }
  }, [])

  const startSession = async () => {
    const batchId = newBatch === "none" ? null : parseInt(newBatch)
    const running = Array.from(sessions.values()).find(s => s.info.batch_id === batchId)
    if (running) {
      toast({ variant:"destructive", title:"Already running", description:`Session #${running.info.session_id} is live for this batch.` })
      return
    }
    setStarting(true)
    try {
      const r = await axios.post(`${API}/attendance/session/start`, {
        batch_id: batchId, course: newCourse.trim(), late_after: parseInt(lateAfter),
      })
      const info: SessionInfo = {
        session_id: r.data.session_id, batch_id: batchId,
        batch:      r.data.batch || "All Students",
        course:     newCourse.trim(),
        started_at: new Date().toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" }),
        scan_count: 0, present: 0, late: 0, is_active: true,
      }
      await loadSession(info)
      setNewBatch("none"); setNewCourse("")
      toast({ title:`✅ Session started — ${info.batch}`, description:"Set up the phone app using the webhook URL." })
    } catch(e: any) {
      toast({ variant:"destructive", title:"Error", description: e.response?.data?.error || "Could not start." })
    } finally { setStarting(false) }
  }

  const handleEnd = useCallback((sessionId: number) => {
    setSessions(prev => { const next = new Map(prev); next.delete(sessionId); return next })
  }, [])

  const activeSessions = Array.from(sessions.values())

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Barcode Attendance</h1>
            <p className="text-sm text-gray-500 mt-0.5">Multiple live sessions · Uses Barcode to PC app on phone</p>
          </div>
          <div className={cn("flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full",
            wsConn ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600")}>
            {wsConn ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {wsConn ? "Live" : "Offline"}
          </div>
        </div>

        {/* How it works banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex gap-3 items-start text-sm">
          <Smartphone className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-800">How to scan with your phone</p>
            <p className="text-blue-600 text-xs mt-0.5">
              Install <strong>Barcode to PC</strong> (free, Android/iOS) → start a session below → click <strong>Setup Phone App</strong> inside the session card → follow the 3-step instructions to connect your phone. No Wi-Fi sharing needed — works over internet too.
            </p>
          </div>
        </div>

        {/* Start new session */}
        <Card className="border-dashed border-2 border-[#F16265]/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-[#F16265] flex items-center gap-2">
              <Plus className="w-4 h-4" /> Start New Session
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div className="space-y-1.5">
                <Label className="text-xs">Batch *</Label>
                <Select value={newBatch} onValueChange={setNewBatch}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select batch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">All Students</SelectItem>
                    {batches.map(b => {
                      const busy = Array.from(sessions.values()).some(s => s.info.batch_id === b.id)
                      return (
                        <SelectItem key={b.id} value={String(b.id)} disabled={busy}>
                          {b.name}{busy ? " 🔴" : ""}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Course / Subject</Label>
                <Input placeholder="e.g. Physics…" value={newCourse} onChange={e=>setNewCourse(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Late after (mins)</Label>
                <Input type="number" value={lateAfter} onChange={e=>setLateAfter(e.target.value)} className="h-9" min={1} />
              </div>
              <Button onClick={startSession} disabled={starting}
                className="h-9 bg-[#F16265] hover:bg-[#D94F52] text-white gap-2">
                {starting ? <><Loader2 className="w-4 h-4 animate-spin"/>Starting…</> : <><Play className="w-4 h-4"/>Start Session</>}
              </Button>
            </div>
            {activeSessions.length > 0 && (
              <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                <div className="flex gap-1">
                  {activeSessions.map((_,i) => (
                    <span key={i} className={cn("w-2.5 h-2.5 rounded-full animate-pulse", COLORS[i % COLORS.length].dot)} />
                  ))}
                </div>
                {activeSessions.length} session{activeSessions.length !== 1 ? "s" : ""} running
              </div>
            )}
          </CardContent>
        </Card>

        {/* Empty state */}
        {activeSessions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-300">
            <div className="w-20 h-20 rounded-3xl bg-gray-100 flex items-center justify-center">
              <Smartphone className="w-10 h-10" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-400">No active sessions</p>
              <p className="text-sm">Select a batch above and click Start Session</p>
            </div>
          </div>
        )}

        {/* Session cards */}
        {activeSessions.length > 0 && (
          <div className={cn("grid gap-5", activeSessions.length === 1 ? "grid-cols-1 max-w-2xl" : "grid-cols-1 xl:grid-cols-2")}>
            {activeSessions.map((session, idx) => (
              <SessionCard key={session.info.session_id} session={session} colorIdx={idx} onEnd={handleEnd} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
