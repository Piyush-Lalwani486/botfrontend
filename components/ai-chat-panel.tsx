"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { X, Send, Mic, MicOff, Volume2, VolumeX, Trash2, Copy, Check } from "lucide-react"
import { cn } from "@/lib/utils"

const API = "http://127.0.0.1:5000"

const TOPICS = [
  { k: "general",  label: "General" },
  { k: "physics",  label: "Physics" },
  { k: "chemistry",label: "Chemistry" },
  { k: "maths",    label: "Maths" },
  { k: "biology",  label: "Biology" },
  { k: "jee",      label: "JEE" },
  { k: "neet",     label: "NEET" },
]

interface Message {
  id:        number
  role:      "user" | "assistant"
  content:   string
  timestamp: string
  isError?:  boolean
}

export function AIChatPanel({ onClose }: { onClose: () => void }) {
  const [messages,    setMessages]    = useState<Message[]>([])
  const [input,       setInput]       = useState("")
  const [topic,       setTopic]       = useState("general")
  const [loading,     setLoading]     = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [muted,       setMuted]       = useState(false)
  const [copied,      setCopied]      = useState<number | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)
  const recRef    = useRef<any>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages, loading])

  const sendMessage = useCallback(async (text?: string) => {
    const content = (text || input).trim()
    if (!content || loading) return
    setInput("")
    const ts  = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    const msg: Message = { id: Date.now(), role: "user", content, timestamp: ts }
    const newMsgs = [...messages, msg]
    setMessages(newMsgs)
    setLoading(true)
    try {
      const res  = await fetch(`${API}/api/chat`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ messages: newMsgs.map(m => ({ role: m.role, content: m.content })), topic }),
      })
      const data = await res.json()
      const reply = data.error ? `Error: ${data.error}` : data.reply
      const ts2   = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
      setMessages(prev => [...prev, { id: Date.now(), role: "assistant", content: reply, timestamp: ts2, isError: !!data.error }])
      if (!muted && !data.error) speak(reply)
    } catch {
      const ts2 = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
      setMessages(prev => [...prev, { id: Date.now(), role: "assistant", content: "Could not reach the server. Make sure the backend is running.", timestamp: ts2, isError: true }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }, [input, messages, topic, muted])

  const speak = (text: string) => {
    window.speechSynthesis?.cancel()
    const u = new SpeechSynthesisUtterance(text.slice(0, 1500))
    u.lang = "en-IN"; u.rate = 0.95
    window.speechSynthesis?.speak(u)
  }

  const toggleListen = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    if (isListening && recRef.current) { recRef.current.stop(); return }
    const rec = new SR()
    rec.lang = "en-IN"; rec.continuous = false; rec.interimResults = false
    recRef.current = rec
    rec.onstart  = () => setIsListening(true)
    rec.onend    = () => setIsListening(false)
    rec.onresult = (e: any) => setInput(e.results[0][0].transcript)
    rec.onerror  = () => setIsListening(false)
    rec.start()
  }

  const copyMsg = async (id: number, text: string) => {
    await navigator.clipboard.writeText(text).catch(() => {})
    setCopied(id); setTimeout(() => setCopied(null), 2000)
  }

  const EXAMPLES = [
    "How do I prepare for JEE Maths?",
    "Explain Newton's Laws of Motion",
    "Give me 5 practice questions on Organic Chemistry",
    "What are tips for improving attendance?",
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div>
          <p className="text-sm font-semibold">AI Study Assistant</p>
          <p className="text-xs text-muted-foreground">Powered by Gemini AI</p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setMuted(m => !m); window.speechSynthesis?.cancel() }} title={muted ? "Unmute" : "Mute"}>
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setMessages([]); window.speechSynthesis?.cancel() }} title="Clear chat">
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Topic pills */}
      <div className="flex gap-1 px-3 py-2 border-b border-border overflow-x-auto">
        {TOPICS.map(t => (
          <button key={t.k}
            onClick={() => setTopic(t.k)}
            className={cn(
              "text-xs px-2.5 py-1 rounded-full border whitespace-nowrap transition-colors",
              topic === t.k
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:bg-muted"
            )}
          >{t.label}</button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto text-2xl">🎓</div>
            <div>
              <p className="font-semibold text-sm">Hello! I am your AI Assistant</p>
              <p className="text-xs text-muted-foreground mt-1">Ask me anything about your studies or courses.</p>
            </div>
            <div className="space-y-2">
              {EXAMPLES.map((ex, i) => (
                <button key={i} onClick={() => sendMessage(ex)}
                  className="w-full text-left text-xs px-3 py-2 rounded-lg border border-border hover:bg-muted transition-colors">
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={cn("flex flex-col gap-1", msg.role === "user" ? "items-end" : "items-start")}>
            <div className={cn(
              "max-w-[85%] rounded-2xl px-3 py-2 text-sm relative group",
              msg.role === "user"
                ? "bg-primary text-primary-foreground rounded-br-sm"
                : msg.isError
                  ? "bg-destructive/10 text-destructive border border-destructive/20 rounded-bl-sm"
                  : "bg-muted text-foreground rounded-bl-sm"
            )}>
              <p className="whitespace-pre-wrap text-xs leading-relaxed">{msg.content}</p>
              <div className="flex items-center justify-between gap-2 mt-1">
                <span className={cn("text-[10px]", msg.role === "user" ? "text-primary-foreground/60" : "text-muted-foreground")}>
                  {msg.timestamp}
                </span>
                <button onClick={() => copyMsg(msg.id, msg.content)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                  {copied === msg.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-start">
            <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-border bg-card">
        <div className="flex items-end gap-2 rounded-xl border border-border bg-background px-3 py-2">
          <textarea
            ref={inputRef}
            rows={1}
            className="flex-1 bg-transparent text-sm resize-none outline-none max-h-24 placeholder:text-muted-foreground"
            placeholder="Ask anything…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
          />
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className={cn("h-7 w-7", isListening && "text-destructive")} onClick={toggleListen}>
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Button size="icon" className="h-7 w-7 bg-primary hover:bg-primary/90" disabled={!input.trim() || loading} onClick={() => sendMessage()}>
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-1.5">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  )
}
