"use client"
import { useState, useRef, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Send, Copy, Download, Loader2, Sparkles, X } from "lucide-react"

const API = "http://127.0.0.1:5000"

const EXAMS = [
  { id:"jee",label:"JEE" },{ id:"neet",label:"NEET" },{ id:"cbse",label:"CBSE" },
  { id:"upsc",label:"UPSC" },{ id:"ssc",label:"SSC" },{ id:"general",label:"General" },
]
const MODES = [
  { id:"explain",icon:"🎯",label:"Explain" },{ id:"questions",icon:"✏️",label:"Questions" },
  { id:"formula",icon:"📐",label:"Formulas" },{ id:"notes",icon:"📓",label:"Notes" },
  { id:"quiz",icon:"🧠",label:"Quiz" },{ id:"strategy",icon:"🏆",label:"Strategy" },
  { id:"doubt",icon:"💬",label:"Doubt" },{ id:"pyq",icon:"📅",label:"PYQ" },
  { id:"summary",icon:"📋",label:"Summary" },
]
const SUBJECTS = ["Physics","Chemistry","Mathematics","Biology","English","History","Geography","Economics","Computer Science"]
const QUICK    = ["Explain Newton's Laws of Motion","Practice questions on Integration","Formula sheet for Organic Chemistry","Quiz on Cell Biology","JEE strategy for Maths","Previous year questions on Thermodynamics"]

interface Msg { role:"user"|"assistant"; content:string; mode?:string; elapsed?:number }

function MarkdownText({ text }: { text:string }) {
  const html = text
    .replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>")
    .replace(/\*(.+?)\*/g,"<em>$1</em>")
    .replace(/`([^`]+)`/g,'<code class="bg-gray-100 px-1 rounded text-[13px] font-mono text-red-600">$1</code>')
    .replace(/^# (.+)$/gm,'<h3 class="text-lg font-bold mt-3 mb-1 text-gray-900">$1</h3>')
    .replace(/^## (.+)$/gm,'<h4 class="text-base font-semibold mt-2 mb-1 text-gray-800">$1</h4>')
    .replace(/^- (.+)$/gm,'<li class="ml-4 list-disc text-gray-700">$1</li>')
    .replace(/^\d+\. (.+)$/gm,'<li class="ml-4 list-decimal text-gray-700">$1</li>')
    .replace(/\n\n/g,"</p><p class=\"mb-2\">")
    .replace(/\n/g,"<br/>")
  return <div className="prose prose-sm max-w-none text-sm text-gray-800 leading-relaxed"
    dangerouslySetInnerHTML={{ __html:`<p class="mb-2">${html}</p>` }} />
}

export default function AITutorPage() {
  const [tab,       setTab]       = useState<"chat"|"generate">("chat")
  const [messages,  setMessages]  = useState<Msg[]>([])
  const [input,     setInput]     = useState("")
  const [exam,      setExam]      = useState("jee")
  const [mode,      setMode]      = useState("explain")
  const [creativity,setCreat]     = useState(2)
  const [topic,     setTopic]     = useState("")
  const [result,    setResult]    = useState<{text:string;mode:string;elapsed:number}|null>(null)
  const [loading,   setLoading]   = useState(false)
  const [convId]                  = useState(()=>Math.random().toString(36).slice(2))
  const bottom                    = useRef<HTMLDivElement>(null)

  useEffect(() => { bottom.current?.scrollIntoView({ behavior:"smooth" }) }, [messages])

  const sendChat = async () => {
    if (!input.trim() || loading) return
    const userMsg: Msg = { role:"user", content:input.trim() }
    const newMsgs = [...messages, userMsg]
    setMessages(newMsgs); setInput(""); setLoading(true)
    const ctrl = new AbortController()
    const tid = setTimeout(() => ctrl.abort(), 90000)
    try {
      const r = await fetch(`${API}/api/chat`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ messages:newMsgs.slice(-10), exam, role:"staff", conv_id:convId }),
        signal: ctrl.signal
      })
      const d = await r.json()
      if (d.reply) setMessages(m=>[...m,{ role:"assistant", content:d.reply, elapsed:d.elapsed }])
      else setMessages(m=>[...m,{ role:"assistant", content:`Error: ${d.error||"AI unavailable"}` }])
    } catch(e:any) {
      const msg = e?.name==="AbortError" ? "The AI is taking longer than usual. Please try again — it should work on the next attempt." : "Cannot connect to AI. Check backend is running and GEMINI_API_KEY is set."
      setMessages(m=>[...m,{ role:"assistant", content:msg }])
    }
    finally { clearTimeout(tid); setLoading(false) }
  }

  const generate = async () => {
    if (!topic.trim() || loading) return
    setLoading(true); setResult(null)
    const ctrl = new AbortController()
    const tid = setTimeout(() => ctrl.abort(), 90000)
    try {
      const r = await fetch(`${API}/api/generate`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ topic:topic.trim(), mode, exam, creativity }),
        signal: ctrl.signal
      })
      const d = await r.json()
      if (d.result) setResult({ text:d.result, mode:d.mode_label, elapsed:d.elapsed })
      else setResult({ text:`Error: ${d.error}`, mode:"Error", elapsed:0 })
    } catch(e:any) {
      const msg = e?.name==="AbortError" ? "The AI is taking longer than usual. Please try again in a moment." : "Cannot connect. Check backend."
      setResult({ text:msg, mode:"Error", elapsed:0 })
    }
    finally { clearTimeout(tid); setLoading(false) }
  }

  const copy  = (text:string) => { navigator.clipboard.writeText(text) }
  const exportTxt = (text:string) => {
    const a = document.createElement("a")
    a.href = URL.createObjectURL(new Blob([text], { type:"text/plain" }))
    a.download = `${mode}_${topic.replace(/\s/g,"_")}.txt`; a.click()
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-7rem)] space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-[#F16265]" /> AI Tutor
            </h1>
            <p className="text-gray-500 text-sm">Generate study content and chat with AI — powered by Gemini</p>
          </div>
          {/* Exam selector */}
          <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl">
            {EXAMS.map(e=>(
              <button key={e.id} onClick={()=>setExam(e.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${exam===e.id ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
                {e.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          <button onClick={()=>setTab("chat")} className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${tab==="chat" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
            💬 AI Chat
          </button>
          <button onClick={()=>setTab("generate")} className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${tab==="generate" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
            ✨ Generate Content
          </button>
        </div>

        {/* Chat */}
        {tab==="chat" && (
          <div className="flex-1 flex flex-col min-h-0 bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="text-4xl mb-3">🤖</div>
                  <p className="font-semibold text-gray-700">Ask me anything!</p>
                  <p className="text-sm text-gray-400 mt-1 mb-6">I'm your AI tutor. Try a question below.</p>
                  <div className="grid grid-cols-2 gap-2 max-w-lg">
                    {QUICK.map(q=>(
                      <button key={q} onClick={()=>setInput(q)}
                        className="text-left px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600 hover:border-[#F16265]/50 hover:bg-[#F16265]/5 transition-all">
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m,i)=>(
                <div key={i} className={`flex ${m.role==="user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${m.role==="user"
                    ? "bg-[#F16265] text-white rounded-br-sm"
                    : "bg-gray-50 border border-gray-100 rounded-bl-sm"
                  }`}>
                    {m.role==="assistant" ? <MarkdownText text={m.content} /> :
                      <p className="text-sm">{m.content}</p>}
                    {m.role==="assistant" && (
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200">
                        <button onClick={()=>copy(m.content)} className="text-[11px] text-gray-400 hover:text-gray-600 flex items-center gap-1">
                          <Copy className="w-3 h-3" /> Copy
                        </button>
                        {m.elapsed && <span className="text-[10px] text-gray-300 ml-auto">{m.elapsed}s</span>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-50 border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottom} />
            </div>
            <div className="border-t border-gray-100 p-4">
              <div className="flex gap-3">
                <input value={input} onChange={e=>setInput(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&sendChat()}
                  placeholder={`Ask about any topic... (${EXAMS.find(e2=>e2.id===exam)?.label} mode)`}
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#F16265] focus:ring-1 focus:ring-[#F16265]/20 transition-all" />
                {messages.length>0 && (
                  <button onClick={()=>setMessages([])} className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors" title="Clear chat">
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button onClick={sendChat} disabled={loading||!input.trim()}
                  className="px-4 py-2.5 bg-[#F16265] text-white rounded-xl hover:bg-[#D94F52] disabled:opacity-50 transition-colors flex items-center gap-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Generate */}
        {tab==="generate" && (
          <div className="flex-1 overflow-y-auto space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-800 mb-4">Content Type</h3>
              <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
                {MODES.map(m=>(
                  <button key={m.id} onClick={()=>setMode(m.id)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${mode===m.id ? "border-[#F16265] bg-[#F16265]/8 text-gray-900" : "border-gray-200 hover:border-gray-300 text-gray-600"}`}>
                    <span className="text-xl">{m.icon}</span>
                    <span className="text-[11px] font-medium">{m.label}</span>
                  </button>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-3">
                <span className="text-xs text-gray-500">Creativity:</span>
                {[1,2,3].map(c=>(
                  <button key={c} onClick={()=>setCreat(c)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${creativity===c ? "bg-[#F16265] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                    {c===1?"Precise":c===2?"Balanced":"Creative"}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-800 mb-3">Topic</h3>
              <div className="flex gap-3">
                <input value={topic} onChange={e=>setTopic(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&generate()}
                  placeholder="e.g. Newton's Laws of Motion, Organic Chemistry, Integration by Parts..."
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#F16265] focus:ring-1 focus:ring-[#F16265]/20 transition-all" />
                <button onClick={generate} disabled={loading||!topic.trim()}
                  className="px-5 py-2.5 bg-[#F16265] text-white rounded-xl font-semibold hover:bg-[#D94F52] disabled:opacity-50 transition-colors flex items-center gap-2">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4" /> Generate</>}
                </button>
              </div>
              {/* Quick topics */}
              <div className="flex flex-wrap gap-2 mt-3">
                {SUBJECTS.map(s=>(
                  <button key={s} onClick={()=>setTopic(s)}
                    className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600 hover:border-[#F16265]/50 hover:bg-[#F16265]/5 transition-all">
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {result && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{result.mode}</h3>
                    <p className="text-xs text-gray-400">{topic} · {result.elapsed}s</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={()=>copy(result.text)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-medium hover:bg-gray-200 transition-colors">
                      <Copy className="w-3.5 h-3.5" /> Copy
                    </button>
                    <button onClick={()=>exportTxt(result.text)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F16265]/10 text-[#F16265] rounded-xl text-xs font-medium hover:bg-[#F16265]/20 transition-colors">
                      <Download className="w-3.5 h-3.5" /> Export
                    </button>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 max-h-[500px] overflow-y-auto">
                  <MarkdownText text={result.text} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
