"use client"
import { useEffect, useState, useRef, useCallback } from "react"
import { useParams } from "next/navigation"
import { CheckCircle, XCircle, Clock, Loader2, CameraOff, RefreshCw, Wifi } from "lucide-react"

interface ScanResult {
  ok: boolean
  student_name?: string
  status?: string
  error?: string
  duplicate?: boolean
  roll_number?: string
}

// jsQR loaded once at module level — never inside a loop
let jsQRInstance: ((data: Uint8ClampedArray, w: number, h: number, opts?: any) => any) | null = null
async function loadJsQR() {
  if (!jsQRInstance) {
    const mod = await import("jsqr")
    jsQRInstance = mod.default
  }
  return jsQRInstance
}

export default function PhoneScannerPage() {
  const params    = useParams()
  const sessionId = params?.sessionId as string
  const [apiBase] = useState(() =>
    typeof window !== "undefined" ? `http://${window.location.hostname}:5000` : "http://localhost:5000"
  )

  const [lastResult,   setLastResult]   = useState<ScanResult | null>(null)
  const [scanCount,    setScanCount]    = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [cameraError,  setCameraError]  = useState("")
  const [flashColor,   setFlashColor]   = useState<"green"|"red"|"yellow"|null>(null)
  const [sessionInfo,  setSessionInfo]  = useState<{batch:string;course:string}|null>(null)
  const [manualInput,  setManualInput]  = useState("")
  const [serverOk,     setServerOk]     = useState<boolean|null>(null)
  const [cameraReady,  setCameraReady]  = useState(false)

  const videoRef   = useRef<HTMLVideoElement>(null)
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const rafRef     = useRef<number|null>(null)
  const cooldown   = useRef(false)
  const streamRef  = useRef<MediaStream|null>(null)
  const flashTimer = useRef<ReturnType<typeof setTimeout>|null>(null)
  const processingRef = useRef(false)

  useEffect(() => {
    fetch(`${apiBase}/api/health`).then(() => setServerOk(true)).catch(() => setServerOk(false))
    if (sessionId) {
      fetch(`${apiBase}/attendance/session/${sessionId}`)
        .then(r => r.json())
        .then(d => { if (d.batch) setSessionInfo({ batch: d.batch, course: d.course || "" }) })
        .catch(() => {})
    }
    loadJsQR() // preload so first scan is instant
  }, [apiBase, sessionId])

  const triggerFlash = useCallback((color: "green"|"red"|"yellow") => {
    setFlashColor(color)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setFlashColor(null), 1400)
  }, [])

  const sendScan = useCallback(async (qrValue: string) => {
    if (cooldown.current || processingRef.current || !qrValue.trim()) return
    cooldown.current     = true
    processingRef.current = true
    setIsProcessing(true)
    try {
      const r = await fetch(`${apiBase}/api/scan/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode: qrValue.trim().toUpperCase() }),
      })
      const data: ScanResult = await r.json()
      setLastResult(data)
      if (data.ok) {
        setScanCount(c => c + 1)
        triggerFlash(data.status === "Late" ? "yellow" : "green")
        if (navigator.vibrate) navigator.vibrate([80, 40, 80])
      } else if (data.duplicate) {
        triggerFlash("yellow")
        if (navigator.vibrate) navigator.vibrate(150)
      } else {
        triggerFlash("red")
        if (navigator.vibrate) navigator.vibrate([200, 80, 200])
      }
    } catch {
      setLastResult({ ok: false, error: `Cannot reach server at ${apiBase}` })
      triggerFlash("red")
      setServerOk(false)
    } finally {
      setIsProcessing(false)
      processingRef.current = false
      setTimeout(() => { cooldown.current = false }, 2000)
    }
  }, [sessionId, apiBase, triggerFlash])

  const scanLoop = useCallback(async () => {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2 || cooldown.current) {
      rafRef.current = requestAnimationFrame(scanLoop)
      return
    }
    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) return
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const qr = jsQRInstance
    if (qr) {
      const code = qr(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" })
      if (code?.data) {
        sendScan(code.data)
      }
    }
    rafRef.current = requestAnimationFrame(scanLoop)
  }, [sendScan])

  const startCamera = useCallback(async () => {
    setCameraError("")
    setCameraReady(false)
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())

    try {
      await loadJsQR()
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      streamRef.current = stream
      const v = videoRef.current
      if (v) {
        v.srcObject = stream
        v.onloadedmetadata = () => {
          v.play()
          setCameraReady(true)
          rafRef.current = requestAnimationFrame(scanLoop)
        }
      }
    } catch (err: any) {
      setCameraError(
        err.name === "NotAllowedError"
          ? "Camera permission denied. Tap the lock icon in the address bar and allow camera access."
          : err.name === "NotFoundError"
            ? "No camera found on this device."
            : `Camera error: ${err.message}`
      )
    }
  }, [scanLoop])

  useEffect(() => {
    startCamera()
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    }
  }, []) // eslint-disable-line

  const flashBg =
    flashColor === "green"  ? "rgba(34,197,94,0.3)"  :
    flashColor === "red"    ? "rgba(239,68,68,0.3)"   :
    flashColor === "yellow" ? "rgba(234,179,8,0.3)"   : "transparent"

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col" style={{ userSelect: "none" }}>
      <div className="pointer-events-none fixed inset-0 z-50 transition-all duration-300"
        style={{ background: flashBg, opacity: flashColor ? 1 : 0 }} />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-950 border-b border-gray-800">
        <div>
          <p className="text-white font-bold text-sm">QR Attendance Scanner</p>
          <p className="text-gray-400 text-xs truncate max-w-[200px]">
            {sessionInfo ? `${sessionInfo.batch}${sessionInfo.course ? ` · ${sessionInfo.course}` : ""}` : `Session #${sessionId}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
            serverOk === true ? "bg-green-500/20 text-green-400" : serverOk === false ? "bg-red-500/20 text-red-400" : "bg-gray-500/20 text-gray-400"
          }`}>
            <Wifi className="w-3 h-3" />
            {serverOk === true ? "Connected" : serverOk === false ? "No server" : "…"}
          </div>
          <div className="bg-[#F16265]/90 text-white text-xs font-bold px-2.5 py-1 rounded-full">{scanCount} ✓</div>
          <button onClick={startCamera} className="text-gray-400 hover:text-white p-1">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Camera */}
      <div className="relative bg-black" style={{ minHeight: 280, maxHeight: 400, flex: "0 0 55vw" }}>
        {cameraError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <CameraOff className="w-12 h-12 text-red-400" />
            <p className="text-white text-sm">{cameraError}</p>
            <button onClick={startCamera} className="px-5 py-2 bg-white text-gray-900 rounded-xl font-semibold text-sm flex items-center gap-2">
              <RefreshCw className="w-4 h-4" /> Retry
            </button>
          </div>
        ) : (
          <>
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-52 h-52">
                <div className="absolute top-0 left-0 w-7 h-7" style={{ borderTop: "3px solid white", borderLeft: "3px solid white" }} />
                <div className="absolute top-0 right-0 w-7 h-7" style={{ borderTop: "3px solid white", borderRight: "3px solid white" }} />
                <div className="absolute bottom-0 left-0 w-7 h-7" style={{ borderBottom: "3px solid white", borderLeft: "3px solid white" }} />
                <div className="absolute bottom-0 right-0 w-7 h-7" style={{ borderBottom: "3px solid white", borderRight: "3px solid white" }} />
                {cameraReady && (
                  <div className="absolute left-2 right-2 h-0.5 bg-[#F16265]"
                    style={{ animation: "scanline 2s ease-in-out infinite", top: "50%" }} />
                )}
              </div>
            </div>
            {isProcessing && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/70 rounded-full px-3 py-1.5 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#F16265]" />
                <span className="text-white text-xs">Checking…</span>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`@keyframes scanline { 0%,100%{top:15%} 50%{top:85%} }`}</style>

      {/* Result */}
      <div className="px-4 py-3 min-h-[110px]">
        {lastResult ? (
          lastResult.ok ? (
            <div className={`rounded-2xl p-4 flex items-center gap-4 ${lastResult.status === "Late" ? "bg-yellow-500/15 border border-yellow-500/30" : "bg-green-500/15 border border-green-500/30"}`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white flex-shrink-0 ${lastResult.status === "Late" ? "bg-yellow-500" : "bg-green-500"}`}>
                {lastResult.status === "Late" ? <Clock className="w-6 h-6" /> : <CheckCircle className="w-6 h-6" />}
              </div>
              <div>
                <p className="text-white font-bold text-lg">{lastResult.student_name}</p>
                <p className={`text-sm font-semibold ${lastResult.status === "Late" ? "text-yellow-400" : "text-green-400"}`}>
                  ✓ {lastResult.status}{lastResult.roll_number ? ` · ${lastResult.roll_number}` : ""}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl p-4 flex items-center gap-4 bg-red-500/15 border border-red-500/30">
              <div className="w-12 h-12 rounded-xl bg-red-500 flex items-center justify-center flex-shrink-0">
                <XCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-white font-bold">{lastResult.duplicate ? "Already Marked" : "Not Found"}</p>
                <p className="text-red-400 text-xs mt-0.5">{lastResult.error}</p>
              </div>
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-1 text-gray-500 py-2 text-center">
            <p className="text-sm">Hold student QR card inside the frame</p>
            <p className="text-xs text-gray-600">Card must be well-lit and held steady</p>
          </div>
        )}
      </div>

      {/* Manual entry */}
      <div className="px-4 pb-6 mt-auto">
        <p className="text-xs text-gray-600 mb-2 text-center">Can't scan? Type QR code ID manually:</p>
        <div className="flex gap-2">
          <input value={manualInput} onChange={e => setManualInput(e.target.value.toUpperCase())}
            onKeyDown={e => { if (e.key === "Enter" && manualInput.trim()) { sendScan(manualInput.trim()); setManualInput("") } }}
            placeholder="e.g. FF-PCM-001"
            className="flex-1 bg-gray-800 text-white border border-gray-700 rounded-xl px-3 py-2.5 text-sm placeholder-gray-600 outline-none focus:border-[#F16265]"
            autoCapitalize="characters" autoCorrect="off" spellCheck={false} />
          <button onClick={() => { if (manualInput.trim()) { sendScan(manualInput.trim()); setManualInput("") } }}
            disabled={!manualInput.trim() || isProcessing}
            className="px-4 py-2.5 bg-[#F16265] text-white rounded-xl text-sm font-semibold disabled:opacity-40">
            Mark
          </button>
        </div>
        {serverOk === false && (
          <p className="mt-3 text-xs text-red-400 text-center bg-red-900/30 border border-red-800/50 rounded-xl px-3 py-2">
            ⚠ Cannot reach <span className="font-mono">{apiBase}</span> — make sure phone and PC are on the same Wi-Fi
          </p>
        )}
      </div>
    </div>
  )
}
