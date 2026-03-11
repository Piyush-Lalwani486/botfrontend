"use client"
import { useEffect, useState, useCallback, useMemo } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Layers, Edit, Trash2, Loader2, X, Users, Search, Upload, FileText } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import axios from "axios"

const API = "http://127.0.0.1:5000"
interface Batch { id: number; name: string; description: string; schedule: string; capacity: number; student_count: number }

function BatchForm({ name, onName, desc, onDesc, schedule, onSchedule, capacity, onCapacity, onSubmit, onClose, isSaving, isAdd }:
  { name:string; onName:(v:string)=>void; desc:string; onDesc:(v:string)=>void; schedule:string; onSchedule:(v:string)=>void;
    capacity:string; onCapacity:(v:string)=>void; onSubmit:(e:any)=>void; onClose:()=>void; isSaving:boolean; isAdd:boolean }) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2"><Label>Batch Name *</Label><Input placeholder="e.g. Morning Batch A" value={name} onChange={e=>onName(e.target.value)} required /></div>
      <div className="space-y-2"><Label>Description</Label><Input placeholder="Brief description" value={desc} onChange={e=>onDesc(e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Schedule</Label><Input placeholder="e.g. Mon-Fri 9am" value={schedule} onChange={e=>onSchedule(e.target.value)} /></div>
        <div className="space-y-2"><Label>Capacity</Label><Input type="number" min="1" max="200" value={capacity} onChange={e=>onCapacity(e.target.value)} /></div>
      </div>
      <div className="flex gap-3 pt-4 border-t">
        <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90" disabled={isSaving}>{isSaving ? "Saving..." : isAdd ? "Add Batch" : "Update Batch"}</Button>
      </div>
    </form>
  )
}

export default function BatchesPage() {
  const [batches, setBatches]     = useState<Batch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch]       = useState("")
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isSaving, setIsSaving]   = useState(false)
  const [currentId, setCurrentId] = useState<number|null>(null)
  const [name, setName]           = useState("")
  const [desc, setDesc]           = useState("")
  const [schedule, setSchedule]   = useState("")
  const [capacity, setCapacity]   = useState("30")
  const { toast } = useToast()
  const [csvImporting, setCsvImporting] = useState(false)
  const [csvMsg, setCsvMsg]             = useState("")

  const handleCsvImport = useCallback(async (file: File) => {
    setCsvImporting(true); setCsvMsg("")
    try {
      const text = await file.text()
      const r = await axios.post(`${API}/batches/import-csv`, { csv_text: text })
      const d = r.data
      setCsvMsg(`✅ Imported ${d.added} batches${d.skipped ? `, skipped ${d.skipped}` : ""}${d.errors?.length ? ` — ${d.errors[0]}` : ""}`)
      fetchBatches()
    } catch(e: any) {
      setCsvMsg(`⚠ ${e.response?.data?.error || "Import failed"}`)
    } finally { setCsvImporting(false); setTimeout(() => setCsvMsg(""), 6000) }
  }, [fetchBatches])

  const fetchBatches = useCallback(async () => {
    try { setIsLoading(true); const r = await axios.get(`${API}/batches/`); setBatches(r.data) }
    catch { toast({ variant:"destructive", title:"Error", description:"Failed to load batches." }) }
    finally { setIsLoading(false) }
  }, [toast])

  useEffect(() => { fetchBatches() }, [fetchBatches])

  const openAdd = () => { setName(""); setDesc(""); setSchedule(""); setCapacity("30"); setIsAddOpen(true) }
  const openEdit = (b: Batch) => { setCurrentId(b.id); setName(b.name); setDesc(b.description); setSchedule(b.schedule); setCapacity(String(b.capacity)); setIsEditOpen(true) }
  const closeAll = () => { setIsAddOpen(false); setIsEditOpen(false) }

  const handleAdd = async (e: any) => {
    e.preventDefault(); setIsSaving(true)
    try { await axios.post(`${API}/batches/add`, { name, description:desc, schedule, capacity:parseInt(capacity) }); toast({ title:"Batch Added" }); closeAll(); fetchBatches() }
    catch { toast({ variant:"destructive", title:"Error", description:"Failed to add batch." }) }
    finally { setIsSaving(false) }
  }

  const handleUpdate = async (e: any) => {
    e.preventDefault(); if (!currentId) return; setIsSaving(true)
    try { await axios.put(`${API}/batches/${currentId}`, { name, description:desc, schedule, capacity:parseInt(capacity) }); toast({ title:"Batch Updated" }); closeAll(); fetchBatches() }
    catch { toast({ variant:"destructive", title:"Error", description:"Failed to update batch." }) }
    finally { setIsSaving(false) }
  }

  const handleDelete = async (id: number, bname: string) => {
    if (!confirm(`Delete batch "${bname}"? Students will be unassigned.`)) return
    try { await axios.delete(`${API}/batches/${id}`); toast({ title:"Batch Deleted" }); setBatches(p => p.filter(b => b.id !== id)) }
    catch { toast({ variant:"destructive", title:"Error", description:"Failed to delete batch." }) }
  }

  const filtered = useMemo(() => batches.filter(b => b.name.toLowerCase().includes(search.toLowerCase())), [batches, search])

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div><h1 className="text-3xl font-semibold mb-2">Batches</h1><p className="text-muted-foreground">Organise students into class batches.</p></div>
          <div className="flex gap-2">
            <label className={`flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors ${csvImporting?"opacity-60 pointer-events-none":""}`}>
              {csvImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-gray-500" />}
              Import CSV
              <input type="file" accept=".csv" className="hidden" onChange={e => e.target.files?.[0] && handleCsvImport(e.target.files[0])} />
            </label>
            <Button onClick={openAdd} className="bg-primary hover:bg-primary/90 shadow-lg"><Plus className="mr-2 h-4 w-4" />Add Batch</Button>
          </div>
        </div>

        {csvMsg && <div className={`px-4 py-3 rounded-xl text-sm font-medium ${csvMsg.startsWith("✅") ? "bg-green-50 text-green-700 border border-green-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>{csvMsg}</div>}

        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700 flex items-start gap-2">
          <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span><strong>CSV Import columns:</strong> Name, Description, Schedule (e.g. Mon-Fri 9am), Capacity</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label:"Total Batches",    value: batches.length,                                         icon: Layers, color:"text-primary/60" },
            { label:"Total Students",   value: batches.reduce((s,b)=>s+b.student_count,0),             icon: Users,  color:"text-green-500/60" },
            { label:"Total Capacity",   value: batches.reduce((s,b)=>s+b.capacity,0),                  icon: Users,  color:"text-accent" },
          ].map(stat => (
            <Card key={stat.label} className="border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div><p className="text-sm text-muted-foreground">{stat.label}</p><p className="text-2xl font-semibold">{stat.value}</p></div>
                  <stat.icon className={`h-8 w-8 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>All Batches</CardTitle>
              <div className="relative w-full max-w-xs hidden sm:block">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search batches..." className="pl-8" value={search} onChange={e=>setSearch(e.target.value)} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground"><Loader2 className="h-8 w-8 animate-spin mb-2" /><p>Loading batches...</p></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed rounded-lg border-border/50">
                <Layers className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <h3 className="text-lg font-medium mb-1">No batches found</h3>
                <p className="text-sm text-muted-foreground">{search ? "Try a different search." : 'Click "Add Batch" to get started.'}</p>
              </div>
            ) : (
              <div className="rounded-md border border-border/50 overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground font-medium">
                    <tr>
                      <th className="h-12 px-4 align-middle">ID</th>
                      <th className="h-12 px-4 align-middle">Batch Name</th>
                      <th className="h-12 px-4 align-middle hidden md:table-cell">Schedule</th>
                      <th className="h-12 px-4 align-middle hidden md:table-cell">Description</th>
                      <th className="h-12 px-4 align-middle">Students</th>
                      <th className="h-12 px-4 align-middle">Capacity</th>
                      <th className="h-12 px-4 align-middle text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(batch => (
                      <tr key={batch.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                        <td className="p-4 align-middle text-muted-foreground">#{batch.id}</td>
                        <td className="p-4 align-middle font-medium">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                            {batch.name}
                          </div>
                        </td>
                        <td className="p-4 align-middle text-muted-foreground hidden md:table-cell">{batch.schedule || "—"}</td>
                        <td className="p-4 align-middle text-muted-foreground hidden md:table-cell max-w-[160px]"><span className="line-clamp-1">{batch.description || "—"}</span></td>
                        <td className="p-4 align-middle">
                          <span className="inline-flex items-center gap-1 text-sm"><Users className="h-3.5 w-3.5 text-muted-foreground" />{batch.student_count}</span>
                        </td>
                        <td className="p-4 align-middle">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, (batch.student_count/batch.capacity)*100)}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground">{batch.capacity}</span>
                          </div>
                        </td>
                        <td className="p-4 align-middle text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary" onClick={() => openEdit(batch)}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => handleDelete(batch.id, batch.name)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <Card className="w-full max-w-lg shadow-2xl bg-background border-border relative m-4">
              <Button variant="ghost" size="icon" className="absolute right-2 top-2 text-muted-foreground" onClick={closeAll}><X className="h-4 w-4" /></Button>
              <CardHeader><CardTitle className="flex items-center gap-2"><Layers className="h-5 w-5" />Add New Batch</CardTitle></CardHeader>
              <CardContent><BatchForm name={name} onName={setName} desc={desc} onDesc={setDesc} schedule={schedule} onSchedule={setSchedule} capacity={capacity} onCapacity={setCapacity} onSubmit={handleAdd} onClose={closeAll} isSaving={isSaving} isAdd={true} /></CardContent>
            </Card>
          </div>
        )}
        {isEditOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <Card className="w-full max-w-lg shadow-2xl bg-background border-border relative m-4">
              <Button variant="ghost" size="icon" className="absolute right-2 top-2 text-muted-foreground" onClick={closeAll}><X className="h-4 w-4" /></Button>
              <CardHeader><CardTitle className="flex items-center gap-2"><Edit className="h-5 w-5" />Edit Batch</CardTitle></CardHeader>
              <CardContent><BatchForm name={name} onName={setName} desc={desc} onDesc={setDesc} schedule={schedule} onSchedule={setSchedule} capacity={capacity} onCapacity={setCapacity} onSubmit={handleUpdate} onClose={closeAll} isSaving={isSaving} isAdd={false} /></CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
