"use client"
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
  Smartphone, Copy, ExternalLink, CloudLightning, AlertCircle
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import type { Socket } from "socket.io-client"

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000"
const WS  = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000"

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
  info:         SessionInfo
  scans:        ScanEvent[]
  lastScan:     ScanEvent | null
  scannerUrl:   string
  qrImg:        string
  scannerCount: number
}

const COLORS = [
  { ring:"ring-[#F16265]",   bg:"bg-[#F16265]/10",   dot:"bg-[#F16265]",    text:"text-[#F16265]"   },
  { ring:"ring-blue-500",    bg:"bg-blue-500/10",    dot:"bg-blue-500",     text:"text-blue-600"    },
  { ring:"ring-emerald-500", bg:"bg-emerald-500/10", dot:"bg-emerald-500",  text:"text-emerald-600" },
  { ring:"ring-violet-500",  bg:"bg-violet-500/10",  dot:"bg-violet-500",   text:"text-violet-600"  },
  { ring:"ring-amber-500",   bg:"bg-amber-500/10",   dot:"bg-amber-500",    text:"text-amber-600"   },
]

function SetupModal({ url, qr, isTunnel, tunnelUrl, onClose }: {
  url: string; qr: string; isTunnel: boolean; tunnelUrl: string | null; onClose: () => void
}) {
  const { toast } = useToast()
  const copy = (text: string) => { navigator.clipboard.writeText(text); toast({ title: "Copied!" }) }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 space-y-5">
          <div>
            <h2 className="text-lg font-bold">📱 Connect Phone to Scan</h2>
            <p className="text-sm text-gray-500 mt-1">Open this page on your phone — no app needed</p>
          </div>

          {isTunnel ? (
            <div className="border-2 border-green-300 bg-green-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CloudLightning className="w-5 h-5 text-green-600" />
                <p className="font-semibold text-green-800">Cloudflare Tunnel Active ✅</p>
              </div>
              <p className="text-sm text-green-700">Works on <strong>any network</strong> — mobile data, any WiFi, anything.</p>
              <div className="flex items-start gap-4">
                {qr ? (
                  <img src={qr} alt="QR" className="w-36 h-36 rounded-xl border-2 border-green-300 flex-shrink-0" />
                ) : (
                  <div className="w-36 h-36 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                )}
                <div className="space-y-2 text-sm text-green-800">
                  <p><strong>Step 1:</strong> Open your phone camera</p>
                  <p><strong>Step 2:</strong> Point at the QR code</p>
                  <p><strong>Step 3:</strong> Tap the link that appears</p>
                  <p><strong>Step 4:</strong> Allow camera → scan student cards</p>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-green-200 px-3 py-2 flex items-center gap-2">
                <code className="flex-1 text-xs text-gray-700 font-mono break-all">{url}</code>
                <button onClick={() => copy(url)} className="text-green-600 hover:text-green-800 flex-shrink-0"><Copy className="w-4 h-4" /></button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="border border-amber-200 bg-amber-50 rounded-xl p-3 flex gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  <strong>Tunnel not running.</strong> Phone must be on the same Wi-Fi as this PC.
                  To use from any network, run <code className="bg-white px-1 rounded">python start_tunnel.py</code>.
                </p>
              </div>
              <div className="border-2 border-gray-200 rounded-xl p-4 space-y-3">
                <p className="font-semibold text-gray-800">📶 Same Wi-Fi</p>
                <div className="flex items-start gap-4">
                  {qr ? (
                    <img src={qr} alt="QR" className="w-32 h-32 rounded-xl border flex-shrink-0" />
                  ) : (
                    <div className="w-32 h-32 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                  )}
                  <div className="space-y-2 text-sm text-gray-700">
                    <p><strong>Step 1:</strong> Connect phone to <strong>same Wi-Fi</strong> as this PC</p>
                    <p><strong>Step 2:</strong> Scan the QR code with camera</p>
                    <p><strong>Step 3:</strong> Allow camera → scan student cards</p>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg border px-3 py-2 flex items-center gap-2">
                  <code className="flex-1 text-xs text-gray-700 font-mono break-all">{url}</code>
                  <button onClick={() => copy(url)} className="text-blue-600 hover:text-blue-800 flex-shrink-0"><Copy className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="border border-blue-200 bg-blue-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-blue-800 mb-1 flex items-center gap-1">
                  <CloudLightning className="w-3.5 h-3.5" /> Use from any network (recommended)
                </p>
                <p className="text-xs text-blue-700 mb-2">
                  1. Download <strong>cloudflared.exe</strong> → put in <code className="bg-white px-1 rounded">backend/</code> folder<br/>
                  2. Run <code className="bg-white px-1 rounded font-mono">python start_tunnel.py</code> instead of <code className="bg-white px-1 rounded font-mono">app.py</code>
                </p>
                <a href="https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
                  target="_blank" className="inline-flex items-center gap-1 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">
                  <ExternalLink className="w-3 h-3" /> Download cloudflared
                </a>
              </div>
            </div>
          )}

          <Button onClick={onClose} className="w-full">Done</Button>
        </div>
      </div>
    </div>
  )
}

function SessionCard({ session, colorIdx, onEnd }: {
  session: LiveSession; colorIdx: number; onEnd: (id: number) => void
}) {
  const col  = COLORS[colorIdx % COLORS.length]
  const info = session.info
  const { toast } = useToast()
  const [ending, setEnding]         = useState(false)
  const [showSetup, setShowSetup]   = useState(false)
  const [manualCode, setManualCode] = useState("")
  const [scanning, setScanning]     = useState(false)
  const isTunnel = session.scannerUrl.includes("trycloudflare.com")

  const handleEnd = async () => {
    if (!confirm(`End session for "${info.batch}"? Unscanned students will be marked Absent.`)) return
    setEnding(true)
    try {
      await fetch(`${API}/attendance/session/${info.session_id}/end`, { method: "POST" }).then(r => r.json())
      onEnd(info.session_id)
    } catch { alert("Could not end session") }
    finally { setEnding(false) }
  }

  const handleManualScan = async () => {
    const code = manualCode.trim().toUpperCase()
    if (!code) return
    setScanning(true)
    try {
      await fetch(`${API}/api/scan/${info.session_id}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode: code })
      }).then(r => r.json())
      setManualCode("")
    } catch { toast({ variant: "destructive", title: "Scan failed" }) }
    finally { setScanning(false) }
  }

  const exportCSV = () => {
    if (!session.scans.length) return
    const rows = [["Name","Roll","Status","Time"],
      ...session.scans.filter(s => s.ok).map(s => [s.student_name||"", s.roll_number||"", s.status||"", s.scanned_at||""])]
    const a = document.createElement("a")
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(rows.map(r => r.join(",")).join("\n"))
    a.download = `${info.batch.replace(/\s+/g,"-")}_${info.session_id}.csv`
    a.click()
  }

  const last = session.lastScan

  return (
    <>
      {showSetup && <SetupModal url={session.scannerUrl} qr={session.qrImg} isTunnel={isTunnel} tunnelUrl={session.scannerUrl} onClose={() => setShowSetup(false)} />}
      <Card className={cn("border-2 transition-all", col.ring)}>
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
          <div className="bg-gray-50 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {isTunnel
                  ? <><CloudLightning className="w-3.5 h-3.5 text-green-600" /><p className="text-xs font-semibold text-green-700">Tunnel — works anywhere</p></>
                  : <><Wifi className="w-3.5 h-3.5 text-amber-500" /><p className="text-xs font-semibold text-amber-600">Same Wi-Fi only</p></>
                }
              </div>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={() => setShowSetup(true)}>
                <Smartphone className="w-3.5 h-3.5" /> Open on Phone
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-[11px] font-mono text-gray-600 bg-white border rounded-lg px-2 py-1.5 break-all">{session.scannerUrl}</code>
              <button onClick={() => navigator.clipboard.writeText(session.scannerUrl)} className="flex-shrink-0 text-gray-400 hover:text-gray-700 p-1">
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

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
                  <p className={cn("text-xs", last.status === "Late" ? "text-yellow-600" : "text-green-600")}>{last.status} · {last.roll_number} · {last.scanned_at}</p>
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
              <Smartphone className="w-7 h-7" /><p className="text-xs">Waiting for first scan…</p>
            </div>
          )}

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

          <div className="border-t pt-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Keyboard className="w-3.5 h-3.5" /> Manual Entry (fallback)
            </p>
            <div className="flex gap-2">
              <Input placeholder="Type or paste QR code value…" value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleManualScan()}
                className="h-9 font-mono text-sm" />
              <Button size="sm" className="h-9 px-4 flex-shrink-0" onClick={handleManualScan} disabled={scanning || !manualCode.trim()}>
                {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : "Scan"}
              </Button>
            </div>
          </div>

          <div className="flex gap-2 pt-1 border-t">
            <Button variant="destructive" size="sm" className="gap-1.5" onClick={handleEnd} disabled={ending}>
              {ending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Square className="w-3.5 h-3.5" />} End Session
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

export default function BarcodeScannerPage() {
  const [batches,      setBatches]      = useState<Batch[]>([])
  const [sessions,     setSessions]     = useState<Map<number, LiveSession>>(new Map())
  const [wsConn,       setWsConn]       = useState(false)
  const [newBatch,     setNewBatch]     = useState("none")
  const [newCourse,    setNewCourse]    = useState("")
  const [lateAfter,    setLateAfter]    = useState("15")
  const [starting,     setStarting]     = useState(false)
  const [tunnelUrl,    setTunnelUrl]    = useState<string | null>(null)
  const [tunnelActive, setTunnelActive] = useState(false)

  const socketRef   = useRef<Socket | null>(null)
  const flashTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())
  const { toast }   = useToast()

  // Poll for tunnel URL every 10s
  useEffect(() => {
    const checkTunnel = async () => {
      try {
        const r = await fetch(`${API}/api/tunnel-url`).then(r => r.json())
        if (r.active && r.url) { setTunnelUrl(r.url); setTunnelActive(true) }
        else { setTunnelActive(false) }
      } catch {}
    }
    checkTunnel()
    const iv = setInterval(checkTunnel, 10000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    fetch(`${API}/batches/`).then(r => r.json()).then(d => setBatches(Array.isArray(d) ? d : (d.data ?? []))).catch(() => {})
    fetch(`${API}/attendance/sessions/active`).then(r => r.json()).then(data => {
      const list = data.sessions || data || []
      list.forEach((s: SessionInfo) => loadSession(s))
    }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let socket: any = null
    import("socket.io-client").then(({ io }) => {
      socket = io(WS, { transports: ["websocket", "polling"] })
      socketRef.current = socket
      socket.on("connect",    () => setWsConn(true))
      socket.on("disconnect", () => setWsConn(false))
      socket.on("scan_event", (data: ScanEvent) => {
        const sid = data.session_id
        if (!sid) return
        const t = flashTimers.current.get(sid)
        if (t) clearTimeout(t)
        flashTimers.current.set(sid, setTimeout(() => {
          setSessions(p => { const m = new Map(p); const ss = m.get(sid); if (ss) m.set(sid, { ...ss, lastScan: null }); return m })
        }, 4000))
        setSessions(prev => {
          const next = new Map(prev); const s = next.get(sid)
          if (!s) return prev
          const newScans = data.ok ? [data, ...s.scans.slice(0, 99)] : s.scans
          const newInfo  = data.ok ? { ...s.info, scan_count: s.info.scan_count + 1,
            present: s.info.present + (data.status !== "Late" ? 1 : 0),
            late:    s.info.late    + (data.status === "Late" ? 1 : 0),
          } : s.info
          next.set(sid, { ...s, lastScan: data, scans: newScans, info: newInfo })
          return next
        })
      })
    }).catch(() => {})
    return () => { if (socket) socket.disconnect() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadSession = useCallback(async (info: SessionInfo) => {
    // Get fresh tunnel status
    let activeTunnel: string | null = null
    try {
      const tr = await fetch(`${API}/api/tunnel-url`).then(r => r.json())
      if (tr.active && tr.url) activeTunnel = tr.url
    } catch {}

    // Build scanner URL — tunnel gets priority
    let scannerUrl: string
    if (activeTunnel) {
      scannerUrl = `${activeTunnel}/mobile-scan/${info.session_id}`
    } else {
      const hostname = typeof window !== "undefined" ? window.location.hostname : "localhost"
      scannerUrl = `http://${hostname}:5000/mobile-scan/${info.session_id}`
    }

    // Generate QR
    let qrImg = ""
    try {
      const { default: QRCodeLib } = await import("qrcode")
      qrImg = await QRCodeLib.toDataURL(scannerUrl, { width: 220, margin: 1, color: { dark: "#000", light: "#fff" } })
    } catch {}

    setSessions(prev => new Map(prev).set(info.session_id, {
      info, scans: [], lastScan: null, scannerUrl, qrImg, scannerCount: 0,
    }))
    if (socketRef.current?.connected) {
      socketRef.current.emit("join_session", { session_id: info.session_id })
    }
  }, [])

  const startSession = async () => {
    const batchId = newBatch === "none" ? null : parseInt(newBatch)
    const running = Array.from(sessions.values()).find(s => s.info.batch_id === batchId)
    if (running) {
      toast({ variant:"destructive", title:"Already running", description:`Session #${running.info.session_id} is live.` })
      return
    }
    setStarting(true)
    try {
      const r = await fetch(`${API}/attendance/session/start`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batch_id: batchId, course: newCourse.trim(), late_after: parseInt(lateAfter) })
      }).then(res => res.json())
      const info: SessionInfo = {
        session_id: r.session_id, batch_id: batchId,
        batch: r.batch || r.data?.batch || "All Students",
        course: newCourse.trim(),
        started_at: new Date().toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" }),
        scan_count: 0, present: 0, late: 0, is_active: true,
      }
      await loadSession(info)
      setNewBatch("none"); setNewCourse("")
      toast({ title:`✅ Session started — ${info.batch}` })
    } catch {
      toast({ variant:"destructive", title:"Error", description:"Could not start session." })
    } finally { setStarting(false) }
  }

  const handleEnd = useCallback((sessionId: number) => {
    setSessions(prev => { const next = new Map(prev); next.delete(sessionId); return next })
  }, [])

  const activeSessions = Array.from(sessions.values())

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">QR Code Attendance</h1>
            <p className="text-sm text-gray-500 mt-0.5">Start a session · phone scans student QR cards · attendance marked live</p>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn("flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full",
              tunnelActive ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")}>
              <CloudLightning className="w-3.5 h-3.5" />
              {tunnelActive ? "Tunnel Active" : "Local only"}
            </div>
            <div className={cn("flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full",
              wsConn ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600")}>
              {wsConn ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              {wsConn ? "Live" : "Offline"}
            </div>
          </div>
        </div>

        {tunnelActive ? (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex gap-3 items-start text-sm">
            <CloudLightning className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-green-800">Cloudflare Tunnel is running 🎉  — phone works on any network!</p>
              <p className="text-green-600 text-xs mt-0.5 font-mono">{tunnelUrl}</p>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex gap-3 items-start text-sm">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800">Local mode — phone must be on the same Wi-Fi as this PC</p>
              <p className="text-amber-700 text-xs mt-0.5">
                For any-network scanning: put <strong>cloudflared.exe</strong> in <code className="bg-white/70 px-1 rounded">backend/</code> folder, then run{" "}
                <code className="bg-white/70 px-1 rounded font-mono">python start_tunnel.py</code> instead of <code className="bg-white/70 px-1 rounded font-mono">app.py</code>.{" "}
                <a href="https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
                  target="_blank" className="underline text-amber-800">Download cloudflared →</a>
              </p>
            </div>
          </div>
        )}

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
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select batch" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">All Students</SelectItem>
                    {batches.map(b => {
                      const busy = Array.from(sessions.values()).some(s => s.info.batch_id === b.id)
                      return <SelectItem key={b.id} value={String(b.id)} disabled={busy}>{b.name}{busy ? " 🔴" : ""}</SelectItem>
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Course / Subject</Label>
                <Input placeholder="e.g. Physics…" value={newCourse} onChange={e => setNewCourse(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Late after (mins)</Label>
                <Input type="number" value={lateAfter} onChange={e => setLateAfter(e.target.value)} className="h-9" min={1} />
              </div>
              <Button onClick={startSession} disabled={starting} className="h-9 bg-[#F16265] hover:bg-[#D94F52] text-white gap-2">
                {starting ? <><Loader2 className="w-4 h-4 animate-spin"/>Starting…</> : <><Play className="w-4 h-4"/>Start Session</>}
              </Button>
            </div>
            {activeSessions.length > 0 && (
              <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                <div className="flex gap-1">
                  {activeSessions.map((_, i) => <span key={i} className={cn("w-2.5 h-2.5 rounded-full animate-pulse", COLORS[i % COLORS.length].dot)} />)}
                </div>
                {activeSessions.length} session{activeSessions.length !== 1 ? "s" : ""} running
              </div>
            )}
          </CardContent>
        </Card>

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
