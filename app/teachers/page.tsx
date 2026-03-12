"use client"
import { useEffect, useState, useCallback, useMemo, memo } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Search, User, Edit, Trash2, Loader2, X, BookOpen, Upload, FileText } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000"

interface Teacher { id: number; name: string; email: string; subject: string; course_count: number; courses: string[] }

interface TeacherFormProps {
  name: string; onName: (v: string) => void
  email: string; onEmail: (v: string) => void
  subject: string; onSubject: (v: string) => void
  onSubmit: (e: React.FormEvent) => void
  onClose: () => void
  isSaving: boolean
  submitLabel: string
}

const TeacherForm = memo(({ name, onName, email, onEmail, subject, onSubject, onSubmit, onClose, isSaving, submitLabel }: TeacherFormProps) => (
  <form onSubmit={onSubmit} className="space-y-4">
    <div className="space-y-2"><Label>Full Name</Label><Input placeholder="e.g. Sarah Wilson" value={name} onChange={e => onName(e.target.value)} required /></div>
    <div className="space-y-2"><Label>Email Address</Label><Input type="email" placeholder="sarah@school.edu" value={email} onChange={e => onEmail(e.target.value)} required /></div>
    <div className="space-y-2"><Label>Subject</Label><Input placeholder="e.g. Mathematics" value={subject} onChange={e => onSubject(e.target.value)} required /></div>
    <div className="flex gap-3 pt-4 border-t border-border/50">
      <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
      <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90" disabled={isSaving}>
        {isSaving ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Saving...</span> : submitLabel}
      </Button>
    </div>
  </form>
))
TeacherForm.displayName = "TeacherForm"

export default function TeacherManagementPage() {
  const [teachers, setTeachers]     = useState<Teacher[]>([])
  const [isLoading, setIsLoading]   = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const { toast } = useToast()
  const [isAddOpen, setIsAddOpen]   = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isSaving, setIsSaving]     = useState(false)
  const [currentId, setCurrentId]   = useState<number | null>(null)
  const [name, setName]       = useState("")
  const [email, setEmail]     = useState("")
  const [subject, setSubject] = useState("")
  const [csvImporting, setCsvImporting] = useState(false)
  const [csvMsg, setCsvMsg]             = useState("")

  const fetchTeachers = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch(`${API}/teacher_details/`).then(r => r.json())
      setTeachers(Array.isArray(res) ? res : (res.data ?? []))
    } catch {
      toast({ variant: "destructive", title: "Connection Error", description: "Could not load teacher data." })
    } finally { setIsLoading(false) }
  }, [toast])

  const handleCsvImport = useCallback(async (file: File) => {
    setCsvImporting(true); setCsvMsg("")
    try {
      const text = await file.text()
      const r = await fetch(`${API}/teacher_details/import-csv`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv_text: text })
      }).then(r => r.json())
      const d = r.data ?? r
      setCsvMsg(`✅ Imported ${d.added ?? 0} teachers${d.skipped ? `, skipped ${d.skipped}` : ""}`)
      fetchTeachers()
    } catch { setCsvMsg("⚠ Import failed") }
    finally { setCsvImporting(false); setTimeout(() => setCsvMsg(""), 6000) }
  }, [fetchTeachers])

  useEffect(() => { fetchTeachers() }, [fetchTeachers])

  const handleDelete = useCallback(async (id: number, teacherName: string) => {
    if (!confirm(`Remove "${teacherName}"?`)) return
    try {
      await fetch(`${API}/teacher_details/${id}`, { method: "DELETE" }).then(r => r.json())
      toast({ title: "Teacher Removed" })
      setTeachers(prev => prev.filter(t => t.id !== id))
    } catch { toast({ variant: "destructive", title: "Error", description: "Failed to delete teacher." }) }
  }, [toast])

  const openAddModal  = useCallback(() => { setName(""); setEmail(""); setSubject(""); setIsAddOpen(true) }, [])
  const openEditModal = useCallback((t: Teacher) => { setCurrentId(t.id); setName(t.name); setEmail(t.email); setSubject(t.subject); setIsEditOpen(true) }, [])
  const closeAll      = useCallback(() => { setIsAddOpen(false); setIsEditOpen(false) }, [])

  const handleSaveNew = useCallback(async (e: React.FormEvent) => {
    e.preventDefault(); setIsSaving(true)
    try {
      await fetch(`${API}/teacher_details/add`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject })
      }).then(r => r.json())
      toast({ title: "Success", description: "New teacher added!" }); setIsAddOpen(false); fetchTeachers()
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error?.status === 409 ? "Email already exists." : "Failed to save teacher." })
    } finally { setIsSaving(false) }
  }, [name, email, subject, toast, fetchTeachers])

  const handleUpdate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault(); if (!currentId) return; setIsSaving(true)
    try {
      await fetch(`${API}/teacher_details/${currentId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject })
      }).then(r => r.json())
      toast({ title: "Updated" }); setIsEditOpen(false); fetchTeachers()
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error?.status === 409 ? "Email already exists." : "Failed to update." })
    } finally { setIsSaving(false) }
  }, [currentId, name, email, subject, toast, fetchTeachers])

  const filteredTeachers = useMemo(() =>
    teachers.filter(t =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.email.toLowerCase().includes(searchTerm.toLowerCase()))
  , [teachers, searchTerm])

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in relative">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div><h1 className="text-3xl font-semibold mb-2">Teacher Management</h1><p className="text-muted-foreground">Manage teacher profiles and subject assignments.</p></div>
          <div className="flex gap-2 flex-wrap">
            <a href={`${API}/api/export/teachers`} download
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors">
              <FileText className="h-4 w-4" /> Export CSV
            </a>
            <label className={`flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors ${csvImporting ? "opacity-60 pointer-events-none" : ""}`}>
              {csvImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-gray-500" />}
              Import CSV
              <input type="file" accept=".csv" className="hidden" onChange={e => e.target.files?.[0] && handleCsvImport(e.target.files[0])} />
            </label>
            <Button onClick={openAddModal} className="bg-primary hover:bg-primary/90 shadow-lg"><Plus className="mr-2 h-4 w-4" />Add New Teacher</Button>
          </div>
        </div>

        {csvMsg && <div className={`px-4 py-3 rounded-xl text-sm font-medium ${csvMsg.startsWith("✅") ? "bg-green-50 text-green-700 border border-green-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>{csvMsg}</div>}

        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700 flex items-start gap-2">
          <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span><strong>CSV Import columns:</strong> Name, Email, Subject</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Total Teachers",      value: teachers.length,                                    icon: User,     color: "text-primary/60" },
            { label: "Assigned to Courses", value: teachers.filter(t => t.course_count > 0).length,   icon: BookOpen, color: "text-green-500/60" },
            { label: "Unassigned",          value: teachers.filter(t => t.course_count === 0).length, icon: User,     color: "text-accent" },
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
              <CardTitle>Teacher List</CardTitle>
              <div className="relative w-full max-w-xs hidden sm:block">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search..." className="pl-8" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground"><Loader2 className="h-8 w-8 animate-spin mb-2" /><p>Loading teachers...</p></div>
            ) : filteredTeachers.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-lg border-border/50">
                <User className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <h3 className="text-lg font-medium">No teachers found</h3>
              </div>
            ) : (
              <div className="rounded-md border border-border/50 overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground font-medium">
                    <tr>
                      <th className="h-12 px-4 align-middle">ID</th>
                      <th className="h-12 px-4 align-middle">Name</th>
                      <th className="h-12 px-4 align-middle">Subject</th>
                      <th className="h-12 px-4 align-middle hidden md:table-cell">Assigned Courses</th>
                      <th className="h-12 px-4 align-middle text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTeachers.map(teacher => (
                      <tr key={teacher.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                        <td className="p-4 align-middle text-muted-foreground">#{teacher.id}</td>
                        <td className="p-4 align-middle font-medium">
                          <div className="flex flex-col"><span>{teacher.name}</span><span className="text-xs text-muted-foreground font-normal">{teacher.email}</span></div>
                        </td>
                        <td className="p-4 align-middle">
                          <span className="inline-flex items-center rounded-md bg-accent/20 px-2 py-1 text-xs font-medium text-foreground border border-accent/40">{teacher.subject}</span>
                        </td>
                        <td className="p-4 align-middle hidden md:table-cell">
                          {teacher.courses?.length > 0
                            ? <div className="flex flex-wrap gap-1">{teacher.courses.map(c => <span key={c} className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{c}</span>)}</div>
                            : <span className="text-xs text-muted-foreground italic">No courses assigned</span>}
                        </td>
                        <td className="p-4 align-middle text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary" onClick={() => openEditModal(teacher)}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => handleDelete(teacher.id, teacher.name)}><Trash2 className="h-4 w-4" /></Button>
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
            <Card className="w-full max-w-md shadow-2xl bg-background border-border relative m-4">
              <Button variant="ghost" size="icon" className="absolute right-2 top-2 text-muted-foreground" onClick={closeAll}><X className="h-4 w-4" /></Button>
              <CardHeader><CardTitle>Add New Teacher</CardTitle></CardHeader>
              <CardContent>
                <TeacherForm name={name} onName={setName} email={email} onEmail={setEmail} subject={subject} onSubject={setSubject} onSubmit={handleSaveNew} onClose={closeAll} isSaving={isSaving} submitLabel="Save Teacher" />
              </CardContent>
            </Card>
          </div>
        )}
        {isEditOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <Card className="w-full max-w-md shadow-2xl bg-background border-border relative m-4">
              <Button variant="ghost" size="icon" className="absolute right-2 top-2 text-muted-foreground" onClick={closeAll}><X className="h-4 w-4" /></Button>
              <CardHeader><CardTitle>Edit Teacher Details</CardTitle></CardHeader>
              <CardContent>
                <TeacherForm name={name} onName={setName} email={email} onEmail={setEmail} subject={subject} onSubject={setSubject} onSubmit={handleUpdate} onClose={closeAll} isSaving={isSaving} submitLabel="Update Teacher" />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
