"use client"
import { useEffect, useState, useRef } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CreditCard, Printer, Search, Loader2, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import axios from "axios"

const API = "http://127.0.0.1:5000"

interface Student {
  id: number; first_name: string; last_name: string; barcode_id: string | null
  roll_number: string | null; batch_name: string | null; courses: string[]; joining_date: string | null; age: number
}
interface Batch { id: number; name: string }

function IDCard({ student }: { student: Student }) {
  const barcodeRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!student.barcode_id || !barcodeRef.current) return
    // Simple barcode rendering using SVG bars
    const svg = barcodeRef.current
    const code = student.barcode_id
    svg.innerHTML = ""
    const barW = 2; const total = code.length * 11
    svg.setAttribute("viewBox", `0 0 ${total} 40`)
    svg.setAttribute("width", "160"); svg.setAttribute("height", "40")
    let x = 0
    for (const ch of code) {
      const n = ch.charCodeAt(0) % 3
      for (let b = 0; b < 11; b++) {
        const fill = (b % (n+2) === 0) ? "#1a1a1a" : "white"
        const rect = document.createElementNS("http://www.w3.org/2000/svg","rect")
        rect.setAttribute("x", String(x)); rect.setAttribute("y","0")
        rect.setAttribute("width", String(barW)); rect.setAttribute("height","40")
        rect.setAttribute("fill", fill)
        svg.appendChild(rect); x += barW
      }
    }
    // Always start/end with thick black bars
    const startBar = document.createElementNS("http://www.w3.org/2000/svg","rect")
    startBar.setAttribute("x","0"); startBar.setAttribute("y","0")
    startBar.setAttribute("width","4"); startBar.setAttribute("height","40")
    startBar.setAttribute("fill","#1a1a1a"); svg.insertBefore(startBar, svg.firstChild)
    const endBar = document.createElementNS("http://www.w3.org/2000/svg","rect")
    endBar.setAttribute("x", String(total-4)); endBar.setAttribute("y","0")
    endBar.setAttribute("width","4"); endBar.setAttribute("height","40")
    endBar.setAttribute("fill","#1a1a1a"); svg.appendChild(endBar)
  }, [student.barcode_id])

  return (
    <div className="id-card w-[340px] bg-white rounded-xl overflow-hidden shadow-lg border border-gray-200 text-black" style={{ fontFamily: "sans-serif" }}>
      {/* Header strip */}
      <div className="flex items-center gap-2 px-4 py-2" style={{ background: "hsl(5,84%,58%)" }}>
        <CreditCard className="h-4 w-4 text-white" />
        <span className="text-white text-xs font-bold tracking-wide">FLIPFLOP DIGITAL LEARNING</span>
      </div>
      {/* Body */}
      <div className="px-4 py-3 flex gap-3">
        {/* Avatar */}
        <div className="w-16 h-20 rounded-lg flex-shrink-0 flex items-center justify-center text-2xl font-bold text-white" style={{ background: "hsl(5,84%,58%)" }}>
          {student.first_name[0]}{student.last_name[0]}
        </div>
        {/* Info */}
        <div className="flex-1 space-y-0.5">
          <p className="font-bold text-sm">{student.first_name} {student.last_name}</p>
          {student.roll_number && <p className="text-xs text-gray-500">Roll No: {student.roll_number}</p>}
          <p className="text-xs text-gray-500">ID: #{student.id}</p>
          {student.batch_name && <p className="text-xs text-gray-500">Batch: {student.batch_name}</p>}
          {student.courses.length > 0 && <p className="text-xs text-gray-500">Course: {student.courses[0]}</p>}
          {student.joining_date && <p className="text-xs text-gray-500">Joined: {new Date(student.joining_date).toLocaleDateString()}</p>}
        </div>
      </div>
      {/* Barcode */}
      <div className="flex flex-col items-center pb-3 px-4">
        {student.barcode_id ? (
          <>
            <svg ref={barcodeRef} className="w-40 h-10" />
            <p className="text-[9px] text-gray-400 mt-0.5 font-mono tracking-widest">{student.barcode_id}</p>
          </>
        ) : (
          <p className="text-xs text-red-500">No barcode assigned</p>
        )}
      </div>
      <div className="border-t border-gray-100 px-4 py-1.5 text-center">
        <p className="text-[9px] text-gray-400">If found, please return to Flipflop Digital Learning Institute</p>
      </div>
    </div>
  )
}

export default function StudentIDCardsPage() {
  const [students, setStudents]   = useState<Student[]>([])
  const [batches, setBatches]     = useState<Batch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch]       = useState("")
  const [batchFilter, setBatchFilter] = useState("all")
  const [selected, setSelected]   = useState<Set<number>>(new Set())
  const [isRegen, setIsRegen]     = useState<number|null>(null)
  const { toast } = useToast()

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/students/`),
      axios.get(`${API}/batches/`),
    ]).then(([s, b]) => { setStudents(s.data); setBatches(b.data) })
      .catch(() => toast({ variant:"destructive", title:"Error", description:"Failed to load data." }))
      .finally(() => setIsLoading(false))
  }, [])

  const filtered = students.filter(s => {
    const matchSearch = `${s.first_name} ${s.last_name} ${s.barcode_id || ""}`.toLowerCase().includes(search.toLowerCase())
    const matchBatch  = batchFilter === "all" || s.batch_name === batchFilter
    return matchSearch && matchBatch
  })

  const toggleSelect = (id: number) => setSelected(prev => {
    const n = new Set(prev)
    n.has(id) ? n.delete(id) : n.add(id)
    return n
  })

  const selectAll   = () => setSelected(new Set(filtered.map(s => s.id)))
  const clearSelect = () => setSelected(new Set())

  const regenBarcode = async (id: number) => {
    if (!confirm("Regenerate barcode? Old barcode will stop working.")) return
    setIsRegen(id)
    try {
      const r = await axios.post(`${API}/students/${id}/regenerate-barcode`)
      setStudents(prev => prev.map(s => s.id === id ? { ...s, barcode_id: r.data.barcode_id } : s))
      toast({ title:"Barcode Regenerated" })
    } catch { toast({ variant:"destructive", title:"Error", description:"Failed to regenerate barcode." }) }
    finally { setIsRegen(null) }
  }

  const printCards = () => {
    const cardStudents = selected.size > 0
      ? filtered.filter(s => selected.has(s.id))
      : filtered

    const cardsHtml = cardStudents.map(s => `
      <div class="id-card">
        <div class="card-header"><span>FLIPFLOP DIGITAL LEARNING</span></div>
        <div class="card-body">
          <div class="card-avatar">${s.first_name[0]}${s.last_name[0]}</div>
          <div class="card-info">
            <p class="name">${s.first_name} ${s.last_name}</p>
            ${s.roll_number ? `<p>Roll No: ${s.roll_number}</p>` : ""}
            <p>Student ID: #${s.id}</p>
            ${s.batch_name ? `<p>Batch: ${s.batch_name}</p>` : ""}
            ${s.courses.length > 0 ? `<p>Course: ${s.courses[0]}</p>` : ""}
            ${s.joining_date ? `<p>Joined: ${new Date(s.joining_date).toLocaleDateString()}</p>` : ""}
          </div>
        </div>
        <div class="barcode-area">
          ${s.barcode_id ? `
            <svg id="bc-${s.id}" width="160" height="40"></svg>
            <p class="barcode-text">${s.barcode_id}</p>
          ` : "<p style='color:red;font-size:10px'>No barcode</p>"}
        </div>
        <div class="card-footer">If found, return to Flipflop Digital Learning</div>
      </div>
    `).join("")

    const barcodeScripts = cardStudents.filter(s => s.barcode_id).map(s => `
      (function() {
        var svg = document.getElementById('bc-${s.id}');
        if (!svg) return;
        var code = '${s.barcode_id}';
        var total = code.length * 11;
        svg.setAttribute('viewBox', '0 0 '+total+' 40');
        var x = 0;
        for (var i=0; i<code.length; i++) {
          var n = code.charCodeAt(i) % 3;
          for (var b=0; b<11; b++) {
            var fill = (b%(n+2)===0) ? '#1a1a1a' : 'white';
            var rect = document.createElementNS('http://www.w3.org/2000/svg','rect');
            rect.setAttribute('x',x); rect.setAttribute('y',0);
            rect.setAttribute('width',2); rect.setAttribute('height',40);
            rect.setAttribute('fill',fill); svg.appendChild(rect); x+=2;
          }
        }
        var sb = document.createElementNS('http://www.w3.org/2000/svg','rect');
        sb.setAttribute('x',0);sb.setAttribute('y',0);sb.setAttribute('width',4);sb.setAttribute('height',40);sb.setAttribute('fill','#1a1a1a');svg.insertBefore(sb,svg.firstChild);
        var eb = document.createElementNS('http://www.w3.org/2000/svg','rect');
        eb.setAttribute('x',total-4);eb.setAttribute('y',0);eb.setAttribute('width',4);eb.setAttribute('height',40);eb.setAttribute('fill','#1a1a1a');svg.appendChild(eb);
      })();
    `).join("")

    const win = window.open("", "_blank")!
    win.document.write(`<!DOCTYPE html><html><head><title>Student ID Cards</title>
    <style>
      body{margin:0;padding:20px;background:#eee;font-family:Arial,sans-serif}
      .grid{display:flex;flex-wrap:wrap;gap:16px}
      .id-card{width:340px;background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.15);border:1px solid #ddd;page-break-inside:avoid}
      .card-header{background:hsl(5,84%,58%);color:white;padding:6px 12px;font-size:11px;font-weight:bold;display:flex;align-items:center;gap:6px}
      .card-body{display:flex;gap:12px;padding:12px}
      .card-avatar{width:64px;height:80px;background:hsl(5,84%,58%);border-radius:8px;display:flex;align-items:center;justify-content:center;color:white;font-size:22px;font-weight:bold;flex-shrink:0}
      .card-info{flex:1;font-size:11px;color:#333;line-height:1.7}
      .card-info .name{font-weight:bold;font-size:13px}
      .barcode-area{display:flex;flex-direction:column;align-items:center;padding:4px 12px 8px}
      .barcode-text{font-size:9px;color:#999;letter-spacing:3px;margin-top:2px;font-family:monospace}
      .card-footer{border-top:1px solid #eee;padding:5px 12px;font-size:9px;color:#aaa;text-align:center}
      @media print{body{background:white;padding:8px}.id-card{box-shadow:none}}
    </style></head>
    <body><div class="grid">${cardsHtml}</div>
    <script>${barcodeScripts} window.print();<\/script></body></html>`)
    win.document.close()
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div><h1 className="text-3xl font-semibold mb-2 flex items-center gap-3"><CreditCard className="h-8 w-8 text-primary" />Student ID Cards</h1><p className="text-muted-foreground">Preview and print ID cards with student barcodes.</p></div>
          <div className="flex gap-2">
            {selected.size > 0 && <Button variant="outline" onClick={clearSelect}>Clear ({selected.size})</Button>}
            <Button className="bg-primary hover:bg-primary/90" onClick={printCards}><Printer className="mr-2 h-4 w-4" />Print {selected.size > 0 ? `${selected.size} Cards` : "All"}</Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search students..." className="pl-8" value={search} onChange={e=>setSearch(e.target.value)} />
          </div>
          <Select value={batchFilter} onValueChange={setBatchFilter}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="All Batches" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Batches</SelectItem>
              {batches.map(b => <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={selectAll}>Select All</Button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground"><Loader2 className="h-8 w-8 animate-spin mb-2" /><p>Loading students...</p></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground"><CreditCard className="h-12 w-12 mx-auto opacity-30 mb-3" /><p>No students found</p></div>
        ) : (
          <div className="flex flex-wrap gap-6">
            {filtered.map(student => (
              <div key={student.id} className="space-y-2">
                <IDCard student={student} />
                <div className="flex gap-2">
                  <Button
                    size="sm" variant={selected.has(student.id) ? "default" : "outline"}
                    className="flex-1 h-7 text-xs"
                    onClick={() => toggleSelect(student.id)}
                  >
                    {selected.has(student.id) ? "✓ Selected" : "Select"}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2" title="Regenerate barcode" onClick={() => regenBarcode(student.id)} disabled={isRegen === student.id}>
                    {isRegen === student.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
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
