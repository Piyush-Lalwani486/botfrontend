"use client"
import { useEffect, useState, useRef, useCallback } from "react"
import { useParams } from "next/navigation"
import { io, Socket } from "socket.io-client"
import { CheckCircle, XCircle, Clock, Wifi, WifiOff, Camera, CameraOff, Loader2, QrCode } from "lucide-react"

const WS = "http://127.0.0.1:5000"

// ── Replace this with your PC's local IP when using on phone ──────────────
// e.g. "http://192.168.1.10:5000" — find with ipconfig/ifconfig on the PC
// The page auto-detects the host from the URL it was opened from.

interface ScanResult {
  ok: boolean
  student_name?: string
  status?: string
  error?: string
  duplicate?: boolean
  barcode_id?: string
}

export default function PhoneScannerPage() {
  const params    = useParams()
  const sessionId = params?.sessionId as string

  const [wsConnected,   setWsConnected]   = useState(false)
  const [cameraActive,  setCameraActive]  = useState(false)
  const [cameraError,   setCameraError]   = useState("")
  const [lastResult,    setLastResult]    = useState<ScanResult | null>(null)
  const [scanCount,     setScanCount]     = useState(0)
  const [isProcessing,  setIsProcessing]  = useState(false)
  const [flashColor,    setFlashColor]    = useState<"green" | "red" | "yellow" | null>(null)
  const [sessionEnded,  setSessionEnded]  = useState(false)
  const [cameras,       setCameras]       = useState<MediaDeviceInfo[]>([])
  const [activeCam,     setActiveCam]     = useState<string>("")

  const socketRef   = useRef<Socket | null>(null)
  const videoRef    = useRef<HTMLVideoElement>(null)
  const scannerRef  = useRef<any>(null)
  const flashTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cooldown    = useRef<boolean>(false)

  // ── Derive WS URL from current page host (works on phone/tablet on same Wi-Fi)
  const wsUrl = typeof window !== "undefined"
    ? `http://${window.location.hostname}:5000`
    : WS

  // ── Connect WebSocket ────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId) return
    const socket = io(wsUrl, { transports: ["websocket", "polling"] })
    socketRef.current = socket

    socket.on("connect", () => {
      setWsConnected(true)
      // Tell the backend a scanner device joined
      socket.emit("scanner_joined_room", { session_id: sessionId })
    })
    socket.on("disconnect", () => setWsConnected(false))

    socket.on("session_ended", () => {
      setSessionEnded(true)
      stopCamera()
    })

    return () => {
      socket.emit("scanner_left_room", { session_id: sessionId })
      socket.disconnect()
    }
  }, [sessionId, wsUrl])

  // ── Trigger flash ────────────────────────────────────────────────
  const triggerFlash = useCallback((color: "green" | "red" | "yellow") => {
    setFlashColor(color)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setFlashColor(null), 1200)
  }, [])

  // ── Send scan via WebSocket ──────────────────────────────────────
  const sendScan = useCallback((barcode: string) => {
    if (!socketRef.current || !wsConnected || isProcessing || cooldown.current) return
    cooldown.current = true
    setIsProcessing(true)

    socketRef.current.emit("mobile_scan", { session_id: parseInt(sessionId), barcode_id: barcode })

    socketRef.current.once("scan_result", (result: ScanResult) => {
      setLastResult(result)
      setIsProcessing(false)
      if (result.ok) {
        setScanCount(c => c + 1)
        triggerFlash(result.status === "Late" ? "yellow" : "green")
      } else {
        triggerFlash("red")
      }
      // Cooldown before next scan — avoids double-reads
      setTimeout(() => { cooldown.current = false }, 1800)
    })
  }, [wsConnected, isProcessing, sessionId, triggerFlash])

  // ── Start ZXing camera ───────────────────────────────────────────
  const startCamera = useCallback(async (deviceId?: string) => {
    setCameraError("")
    if (!videoRef.current) return
    try {
      // Stop any existing scanner first
      if (scannerRef.current?.reset) { try { scannerRef.current.reset() } catch {} }

      const { BrowserMultiFormatReader } = await import("@zxing/browser" as any)
      const hints = new Map()
      // Prioritise 1D barcodes (Code128, Code39, EAN) then QR as fallback
      hints.set(2 /* DecodeHintType.TRY_HARDER */, true)

      const reader = new BrowserMultiFormatReader(hints, {
        delayBetweenScanAttempts: 250,
        delayBetweenScanSuccess:  1800,
      })
      scannerRef.current = reader

      const constraints: MediaStreamConstraints = deviceId
        ? { video: { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } } }
        : { video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } } }

      await reader.decodeFromConstraints(constraints, videoRef.current, (result: any) => {
        if (result && !cooldown.current) sendScan(result.getText())
      })

      setCameraActive(true)

      // Enumerate cameras after permission granted
      const devices = await navigator.mediaDevices.enumerateDevices()
      const cams = devices.filter(d => d.kind === "videoinput")
      setCameras(cams)
      if (!deviceId) {
        const back = cams.find(c => /back|rear|environment/i.test(c.label))
        setActiveCam(back?.deviceId || cams[cams.length - 1]?.deviceId || "")
      }
    } catch (e: any) {
      setCameraActive(false)
      if (e?.name === "NotAllowedError") {
        setCameraError("Camera permission denied.\nPlease tap Allow when asked.")
      } else {
        setCameraError(`Could not start camera:\n${e?.message || "Unknown error"}`)
      }
    }
  }, [sendScan])

  const stopCamera = useCallback(() => {
    try { if (scannerRef.current?.reset) scannerRef.current.reset() } catch {}
    scannerRef.current = null
    setCameraActive(false)
  }, [])

  const switchCamera = useCallback((deviceId: string) => {
    setActiveCam(deviceId)
    startCamera(deviceId)
  }, [startCamera])

  // ── Auto-start camera on first connect ──────────────────────────
  useEffect(() => {
    if (wsConnected && !cameraActive && !sessionEnded) {
      startCamera()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsConnected])

  useEffect(() => () => { stopCamera() }, [stopCamera])

  // ── Render ────────────────────────────────────────────────────────
  if (!sessionId) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="text-center text-white space-y-3">
          <QrCode className="w-14 h-14 mx-auto opacity-40" />
          <p className="text-lg font-semibold">No session ID</p>
          <p className="text-sm text-gray-400">Open this page from the QR code on the PC</p>
        </div>
      </div>
    )
  }

  if (sessionEnded) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="text-center text-white space-y-4">
          <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
          <p className="text-2xl font-bold">Session Ended</p>
          <p className="text-gray-400">{scanCount} students scanned</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col select-none">

      {/* Flash overlay */}
      {flashColor && (
        <div className={`fixed inset-0 z-50 pointer-events-none transition-opacity duration-300 ${
          flashColor === "green"  ? "bg-green-400/30" :
          flashColor === "yellow" ? "bg-yellow-400/30" : "bg-red-400/30"
        }`} />
      )}

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-safe pt-4 pb-3 bg-gray-950/90 backdrop-blur-sm">
        <div>
          <p className="text-white text-sm font-bold">FlipFlop Scanner</p>
          <p className="text-gray-500 text-xs">Session #{sessionId}</p>
        </div>
        <div className="flex items-center gap-3">
          {scanCount > 0 && (
            <span className="bg-green-500/20 text-green-400 text-xs font-bold px-2.5 py-1 rounded-full">
              {scanCount} scanned
            </span>
          )}
          <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
            wsConnected ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"
          }`}>
            {wsConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {wsConnected ? "Live" : "Offline"}
          </div>
        </div>
      </div>

      {/* Camera view — takes most of screen */}
      <div className="relative flex-1 bg-black">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
          autoPlay
        />

        {/* Camera not active — center message */}
        {!cameraActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gray-950 px-6">
            {cameraError ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-red-900/40 flex items-center justify-center mx-auto">
                  <CameraOff className="w-8 h-8 text-red-400" />
                </div>
                <p className="text-red-300 text-sm whitespace-pre-line text-center">{cameraError}</p>
                <button
                  onClick={() => startCamera(activeCam || undefined)}
                  className="bg-white text-gray-900 font-semibold px-6 py-3 rounded-2xl text-sm active:scale-95 transition-transform">
                  Try Again
                </button>
              </div>
            ) : !wsConnected ? (
              <div className="text-center space-y-3">
                <Loader2 className="w-10 h-10 text-gray-500 animate-spin mx-auto" />
                <p className="text-gray-400 text-sm">Connecting to server...</p>
                <p className="text-gray-600 text-xs">Make sure you're on the same Wi-Fi as the PC</p>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <Camera className="w-12 h-12 text-gray-600 mx-auto" />
                <p className="text-gray-300 font-medium">Camera not started</p>
                <button
                  onClick={() => startCamera(activeCam || undefined)}
                  className="bg-white text-gray-900 font-semibold px-8 py-3 rounded-2xl text-sm active:scale-95 transition-transform">
                  Start Camera
                </button>
              </div>
            )}
          </div>
        )}

        {/* Scan overlay frame */}
        {cameraActive && (
          <>
            {/* Dark vignette */}
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: "radial-gradient(ellipse 65% 45% at 50% 45%, transparent 0%, rgba(0,0,0,0.55) 100%)" }} />

            {/* Corner frame */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ paddingBottom: "15%" }}>
              <div className="relative w-64 h-40">
                <span className="absolute top-0 left-0 w-8 h-8 border-t-[3px] border-l-[3px] border-white rounded-tl-lg" />
                <span className="absolute top-0 right-0 w-8 h-8 border-t-[3px] border-r-[3px] border-white rounded-tr-lg" />
                <span className="absolute bottom-0 left-0 w-8 h-8 border-b-[3px] border-l-[3px] border-white rounded-bl-lg" />
                <span className="absolute bottom-0 right-0 w-8 h-8 border-b-[3px] border-r-[3px] border-white rounded-br-lg" />
                {/* Scan line animation */}
                <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-[#F16265] to-transparent animate-scan-line" />
              </div>
            </div>

            {/* Processing spinner */}
            {isProcessing && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-black/60 rounded-2xl px-5 py-3 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                  <span className="text-white text-sm font-medium">Checking...</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom result panel */}
      <div className="bg-gray-950 px-4 pb-safe pb-6 pt-4 min-h-[160px]">
        {/* Camera switch if multiple cameras */}
        {cameras.length > 1 && (
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
            {cameras.map((cam, i) => (
              <button key={cam.deviceId}
                onClick={() => switchCamera(cam.deviceId)}
                className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                  activeCam === cam.deviceId
                    ? "bg-white text-gray-900"
                    : "bg-gray-800 text-gray-400 active:bg-gray-700"
                }`}>
                {cam.label || `Camera ${i + 1}`}
              </button>
            ))}
          </div>
        )}

        {!lastResult ? (
          <div className="flex flex-col items-center justify-center py-4 gap-2 text-gray-600">
            <QrCode className="w-7 h-7 opacity-40" />
            <p className="text-sm">Point camera at a student barcode</p>
          </div>
        ) : lastResult.ok ? (
          <div className={`rounded-2xl p-4 flex items-center gap-4 ${
            lastResult.status === "Late" ? "bg-yellow-500/15 border border-yellow-500/30" : "bg-green-500/15 border border-green-500/30"
          }`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
              lastResult.status === "Late" ? "bg-yellow-500/20" : "bg-green-500/20"
            }`}>
              {lastResult.status === "Late"
                ? <Clock className="w-6 h-6 text-yellow-400" />
                : <CheckCircle className="w-6 h-6 text-green-400" />}
            </div>
            <div className="min-w-0">
              <p className="text-white font-bold text-lg truncate">{lastResult.student_name}</p>
              <p className={`text-sm font-medium ${lastResult.status === "Late" ? "text-yellow-400" : "text-green-400"}`}>
                {lastResult.status}
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl p-4 flex items-center gap-4 bg-red-500/15 border border-red-500/30">
            <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <XCircle className="w-6 h-6 text-red-400" />
            </div>
            <div className="min-w-0">
              <p className="text-red-300 font-bold text-base">
                {lastResult.duplicate ? "Already Scanned" : "Not Found"}
              </p>
              <p className="text-red-400/70 text-xs truncate mt-0.5">{lastResult.error}</p>
            </div>
          </div>
        )}

        {/* Stop/start camera toggle */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => cameraActive ? stopCamera() : startCamera(activeCam || undefined)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-all active:scale-95 ${
              cameraActive
                ? "bg-gray-800 text-gray-300"
                : "bg-[#F16265] text-white"
            }`}>
            {cameraActive
              ? <><CameraOff className="w-4 h-4" />Pause Camera</>
              : <><Camera className="w-4 h-4" />Start Camera</>}
          </button>
        </div>
      </div>
    </div>
  )
}
