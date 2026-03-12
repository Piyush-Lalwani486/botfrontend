"use client"
import { useEffect, useState, useCallback, useMemo, memo, useRef } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, User, Edit, Trash2, Loader2, X, UserCheck, UserMinus, CreditCard, QrCode, Upload, FileText, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000"

interface Course { id: number; name: string }
interface Batch  { id: number; name: string }
interface Student {
  id: number; first_name: string; last_name: string
  age: number; joining_date: string | null; courses: string[]; course: string | null
  status: string; barcode_id: string | null; roll_number: string | null
  phone: string | null; email: string | null; pin: string | null
  batch_id: number | null; batch_name: string | null
}

const CourseSelector = memo(({ allCourses, selectedCourseIds, onToggle }:
  { allCourses: Course[]; selectedCourseIds: number[]; onToggle: (id: number) => void }) => (
  <div className="space-y-2">
    <Label>Enroll in Courses</Label>
    {allCourses.length === 0
      ? <p className="text-sm text-muted-foreground">No courses available.</p>
      : <div className="grid grid-cols-2 gap-2">
          {allCourses.map(course => (
            <label key={course.id} className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer text-sm transition-colors ${selectedCourseIds.includes(course.id) ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-muted/50"}`}>
              <input type="checkbox" className="hidden" checked={selectedCourseIds.includes(course.id)} onChange={() => onToggle(course.id)} />
              {selectedCourseIds.includes(course.id) ? "✓" : "○"} {course.name}
            </label>
          ))}
        </div>
    }
  </div>
))
CourseSelector.displayName = "CourseSelector"

interface ModalFormProps {
  firstName: string; onFirstName: (v:string)=>void
  lastName: string; onLastName: (v:string)=>void
  age: string; onAge: (v:string)=>void
  joiningDate: string; onJoiningDate: (v:string)=>void
  phone: string; onPhone: (v:string)=>void
  email: string; onEmail: (v:string)=>void
  rollNumber: string; onRollNumber: (v:string)=>void
  batchId: string; onBatchId: (v:string)=>void
  allBatches: Batch[]
  allCourses: Course[]; selectedCourseIds: number[]; onToggleCourse: (id:number)=>void
  onSubmit: (e: React.FormEvent) => void; onClose: () => void
  isSaving: boolean; submitLabel: string
  isAddMode?: boolean
}

function RollPreview({ batchId, courseIds, manual }: { batchId: string; courseIds: number[]; manual: string }) {
  const [preview, setPreview] = useState<{roll:string;batch_name:string;course_names:string[]} | null>(null)
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>|null>(null)

  useEffect(() => {
    if (manual.trim()) { setPreview(null); return }
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const r = await fetch(`${API}/students/preview-roll`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            batch_id:   batchId !== "none" ? parseInt(batchId) : null,
            course_ids: courseIds,
          })
        }).then(r => r.json())
        setPreview(r)
      } catch { setPreview(null) }
      finally { setLoading(false) }
    }, 400)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [batchId, courseIds, manual])

  if (manual.trim()) return (
    <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
      <span>🔒</span><span>Using manual roll: <strong>{manual}</strong></span>
    </div>
  )
  if (loading) return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-gray-50 rounded-lg px-3 py-2">
      <RefreshCw className="h-3 w-3 animate-spin" /><span>Generating roll number…</span>
    </div>
  )
  if (!preview) return null
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-blue-600 font-medium">Auto Roll Number</span>
        <span className="font-mono font-bold text-blue-800 text-sm tracking-wider">{preview.roll}</span>
      </div>
      <div className="text-xs text-blue-500">
        {preview.batch_name} · {preview.course_names.length > 0 ? preview.course_names.join(", ") : "General"}
      </div>
    </div>
  )
}

const ModalForm = memo((props: ModalFormProps) => (
  <form onSubmit={props.onSubmit} className="space-y-4">
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2"><Label>First Name *</Label><Input value={props.firstName} onChange={e=>props.onFirstName(e.target.value)} required /></div>
      <div className="space-y-2"><Label>Last Name *</Label><Input value={props.lastName} onChange={e=>props.onLastName(e.target.value)} required /></div>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2"><Label>Age *</Label><Input type="number" value={props.age} onChange={e=>props.onAge(e.target.value)} required /></div>
      <div className="space-y-2"><Label>Joining Date *</Label><Input type="date" value={props.joiningDate} onChange={e=>props.onJoiningDate(e.target.value)} required /></div>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2"><Label>Phone *</Label><Input placeholder="10-digit mobile" value={props.phone} onChange={e=>props.onPhone(e.target.value)} required /></div>
      <div className="space-y-2"><Label>Email *</Label><Input type="email" placeholder="student@email.com" value={props.email} onChange={e=>props.onEmail(e.target.value)} required /></div>
    </div>
    <div className="space-y-2">
      <Label>Batch</Label>
      <Select value={props.batchId} onValueChange={props.onBatchId}>
        <SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No Batch</SelectItem>
          {props.allBatches.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
    <CourseSelector allCourses={props.allCourses} selectedCourseIds={props.selectedCourseIds} onToggle={props.onToggleCourse} />
    {props.isAddMode && (
      <RollPreview batchId={props.batchId} courseIds={props.selectedCourseIds} manual={props.rollNumber} />
    )}
    <div className="space-y-2">
      <Label>Roll Number <span className="text-xs text-muted-foreground">(leave blank to auto-generate from batch + course)</span></Label>
      <Input placeholder="e.g. JEE25-PCM-001 — auto if blank" value={props.rollNumber} onChange={e=>props.onRollNumber(e.target.value)} />
    </div>
    <div className="flex gap-3 pt-4 border-t">
      <Button type="button" variant="outline" className="flex-1" onClick={props.onClose}>Cancel</Button>
      <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90" disabled={props.isSaving}>
        {props.isSaving ? "Saving..." : props.submitLabel}
      </Button>
    </div>
  </form>
))
ModalForm.displayName = "ModalForm"

export default function StudentDataPage() {
  const [students, setStudents]       = useState<Student[]>([])
  const [allCourses, setAllCourses]   = useState<Course[]>([])
  const [allBatches, setAllBatches]   = useState<Batch[]>([])
  const [isLoading, setIsLoading]     = useState(true)
  const [searchTerm, setSearchTerm]   = useState("")
  const [batchFilter, setBatchFilter] = useState("all")
  const { toast } = useToast()
  const router = useRouter()

  const [isAddOpen, setIsAddOpen]   = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isSaving, setIsSaving]     = useState(false)
  const [currentId, setCurrentId]   = useState<number|null>(null)
  const [firstName, setFirstName]   = useState("")
  const [lastName, setLastName]     = useState("")
  const [age, setAge]               = useState("")
  const [joiningDate, setJoiningDate] = useState("")
  const [phone, setPhone]           = useState("")
  const [email, setEmail]           = useState("")
  const [rollNumber, setRollNumber] = useState("")
  const [batchId, setBatchId]       = useState("none")
  const [selectedCourseIds, setSelectedCourseIds] = useState<number[]>([])
  const [enrollStudent, setEnrollStudent] = useState<Student|null>(null)
  const [csvImporting, setCsvImporting]   = useState(false)
  const [csvMsg, setCsvMsg]               = useState("")

  const fetchStudents = useCallback(async () => {
    try {
      setIsLoading(true)
      const r = await fetch(`${API}/students/`).then(r=>r.json())
      setStudents(r)
    } catch { toast({ variant:"destructive", title:"Error", description:"Failed to load students." }) }
    finally { setIsLoading(false) }
  }, [toast])

  const handleCsvImport = useCallback(async (file: File) => {
    setCsvImporting(true); setCsvMsg("")
    try {
      const text = await file.text()
      const r = await fetch(`${API}/students/import-csv`, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ csv_text: text })}).then(r=>r.json())
      const d = r.data
      setCsvMsg(`✅ Imported ${d.added} students${d.skipped ? `, skipped ${d.skipped}` : ""}${d.errors?.length ? ` — ${d.errors[0]}` : ""}`)
      fetchStudents()
    } catch(e: any) {
      setCsvMsg(`⚠ ${e.response?.data?.error || "Import failed"}`)
    } finally { setCsvImporting(false); setTimeout(() => setCsvMsg(""), 6000) }
  }, [fetchStudents])

  useEffect(() => {
    fetchStudents()
    fetch(`${API}/students/courses/all`).then(r=>r.json()).then(r => setAllCourses(Array.isArray(r) ? r : (r.data ?? []))).catch(()=>{})
    fetch(`${API}/batches/`).then(r=>r.json()).then(r => setAllBatches(Array.isArray(r) ? r : (r.data ?? []))).catch(()=>{})
  }, [fetchStudents])

  const handleDelete = useCallback(async (id: number) => {
    if (!confirm("Delete this student? This cannot be undone.")) return
    try {
      await fetch(`${API}/students/${id}`, {method:"DELETE"}).then(r=>r.json())
      toast({ title:"Student Deleted" })
      setStudents(prev => prev.filter(s => s.id !== id))
    } catch(e: any) {
      toast({ variant:"destructive", title:"Error", description: e.response?.data?.error || "Failed to delete." })
    }
  }, [toast])

  const openAddModal = useCallback(() => {
    setFirstName(""); setLastName(""); setAge(""); setJoiningDate("")
    setPhone(""); setEmail(""); setRollNumber(""); setBatchId("none"); setSelectedCourseIds([])
    setIsAddOpen(true)
  }, [])

  const openEditModal = useCallback((s: Student) => {
    setCurrentId(s.id); setFirstName(s.first_name); setLastName(s.last_name)
    setAge(s.age.toString()); setJoiningDate(s.joining_date ? s.joining_date.split("T")[0] : "")
    setPhone(s.phone || ""); setEmail(s.email || ""); setRollNumber(s.roll_number || "")
    setBatchId(s.batch_id ? String(s.batch_id) : "none")
    setSelectedCourseIds(allCourses.filter(c => s.courses.includes(c.name)).map(c => c.id))
    setIsEditOpen(true)
  }, [allCourses])

  const toggleCourse = useCallback((id: number) =>
    setSelectedCourseIds(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]), [])
  const closeAll = useCallback(() => { setIsAddOpen(false); setIsEditOpen(false) }, [])

  const formData = () => ({
    first_name: firstName, last_name: lastName, age, joining_date: joiningDate,
    phone, email, roll_number: rollNumber,
    batch_id: (batchId && batchId !== "none") ? parseInt(batchId) : null,
    course_ids: selectedCourseIds
  })

  const handleSaveNew = useCallback(async (e: React.FormEvent) => {
    e.preventDefault(); setIsSaving(true)
    try {
      const r = await fetch(`${API}/students/add`, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(formData())}).then(r=>r.json())
      const d = r.data
      toast({
        title: `✅ ${d.roll_number} — Student Added!`,
        description: `PIN: ${d.pin} · Batch: ${d.batch} · ${d.courses?.join(", ") || "No course"}  ← Share Roll + PIN for portal login`,
      })
      setIsAddOpen(false); fetchStudents()
    } catch(e: any) { toast({ variant:"destructive", title:"Error", description: e.response?.data?.error || "Failed to add." }) }
    finally { setIsSaving(false) }
  }, [firstName, lastName, age, joiningDate, phone, email, rollNumber, batchId, selectedCourseIds, toast])

  const handleUpdate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault(); if (!currentId) return; setIsSaving(true)
    try {
      await fetch(`${API}/students/${currentId}`, {method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(formData())}).then(r=>r.json())
      toast({ title:"Student Updated" }); setIsEditOpen(false); fetchStudents()
    } catch(e: any) { toast({ variant:"destructive", title:"Error", description: e.response?.data?.error || "Failed to update." }) }
    finally { setIsSaving(false) }
  }, [currentId, firstName, lastName, age, joiningDate, phone, email, rollNumber, batchId, selectedCourseIds, toast])

  const handleEnrollSave = useCallback(async (studentId: number, courseIds: number[]) => {
    try {
      await fetch(`${API}/students/${studentId}/enrollment`, {method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({ course_ids: courseIds })}).then(r=>r.json())
      toast({ title:"Enrollment Updated" }); setEnrollStudent(null); fetchStudents()
    } catch { toast({ variant:"destructive", title:"Error", description:"Failed to update enrollment." }) }
  }, [toast])

  const filteredStudents = useMemo(() =>
    students.filter(s => {
      const matchSearch = `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
      const matchBatch  = batchFilter === "all" || String(s.batch_id) === batchFilter
      return matchSearch && matchBatch
    }), [students, searchTerm, batchFilter])

  const ModalProps = {
    firstName, onFirstName: setFirstName, lastName, onLastName: setLastName,
    age, onAge: setAge, joiningDate, onJoiningDate: setJoiningDate,
    phone, onPhone: setPhone, email, onEmail: setEmail,
    rollNumber, onRollNumber: setRollNumber, batchId, onBatchId: setBatchId,
    allBatches, allCourses, selectedCourseIds, onToggleCourse: toggleCourse,
    onClose: closeAll, isSaving, isAddMode: isAddOpen
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in relative">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div><h1 className="text-3xl font-semibold mb-2">Student Directory</h1><p className="text-muted-foreground">Manage student profiles, batches, and enrollments.</p></div>
          <div className="flex gap-2 flex-wrap">
            <label className={`flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors ${csvImporting?"opacity-60 pointer-events-none":""}`}>
              {csvImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="mr-0 h-4 w-4 text-gray-500" />}
              Import CSV
              <input type="file" accept=".csv" className="hidden" onChange={e => e.target.files?.[0] && handleCsvImport(e.target.files[0])} />
            </label>
            <Button variant="outline" onClick={() => router.push("/student-id-cards")}><CreditCard className="mr-2 h-4 w-4" />ID Cards</Button>
            <>
              <a href={`${API}/students/export-csv`} download
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors">
                <FileText className="h-4 w-4" /> Export CSV
              </a>
              <Button onClick={openAddModal} className="bg-primary hover:bg-primary/90 shadow-lg"><Plus className="mr-2 h-4 w-4" />Add Student</Button>
            </>
          </div>
        </div>

        {csvMsg && <div className={`px-4 py-3 rounded-xl text-sm font-medium ${csvMsg.startsWith("✅") ? "bg-green-50 text-green-700 border border-green-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>{csvMsg}</div>}

        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700 flex items-start gap-2">
          <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span><strong>CSV Import columns:</strong> FirstName, LastName, Age, JoiningDate (YYYY-MM-DD), Phone, Email, RollNumber, BatchName, Courses (semicolon-separated e.g. Physics;Chemistry)</span>
        </div>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <CardTitle>Registered Students ({filteredStudents.length})</CardTitle>
              <div className="flex gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-56">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search..." className="pl-8" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
                </div>
                <Select value={batchFilter} onValueChange={setBatchFilter}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="All Batches" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Batches</SelectItem>
                    {allBatches.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground"><Loader2 className="h-8 w-8 animate-spin mb-2" /><p>Loading...</p></div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-lg border-border/50"><User className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" /><h3 className="text-lg font-medium">No students found</h3></div>
            ) : (
              <div className="rounded-md border border-border/50 overflow-hidden overflow-x-auto">
                <table className="w-full text-sm text-left min-w-[700px]">
                  <thead className="bg-muted/50 text-muted-foreground font-medium">
                    <tr>
                      <th className="h-12 px-4 align-middle">Roll No.</th>
                      <th className="h-12 px-4 align-middle">Name</th>
                      <th className="h-12 px-4 align-middle hidden md:table-cell">Batch</th>
                      <th className="h-12 px-4 align-middle hidden lg:table-cell">Barcode ID</th>
                      <th className="h-12 px-4 align-middle">Courses</th>
                      <th className="h-12 px-4 align-middle">Enrollment</th>
                      <th className="h-12 px-4 align-middle text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map(student => (
                      <tr key={student.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                        <td className="p-4 align-middle">
                          {student.roll_number
                            ? <span className="font-mono text-xs font-semibold text-primary bg-primary/8 px-2 py-1 rounded-md border border-primary/20">{student.roll_number}</span>
                            : <span className="text-xs text-muted-foreground italic">#{student.id}</span>}
                        </td>
                        <td className="p-4 align-middle">
                          <div>
                            <p className="font-medium">{student.first_name} {student.last_name}</p>
                            {student.phone && <p className="text-xs text-muted-foreground">{student.phone}</p>}
                            {student.pin && (
                              <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                PIN: <span className="font-bold text-amber-600">{student.pin}</span>
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="p-4 align-middle hidden md:table-cell">
                          <div className="space-y-0.5">
                            {student.batch_name
                              ? <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{student.batch_name}</span>
                              : <span className="text-xs text-muted-foreground italic">No batch</span>}
                            {student.roll_number?.includes("-") && (
                              <p className="text-[10px] text-muted-foreground font-mono pl-0.5">
                                {student.roll_number.split("-").slice(0,2).join("-")}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="p-4 align-middle hidden lg:table-cell">
                          {student.barcode_id
                            ? <span className="font-mono text-xs text-muted-foreground flex items-center gap-1"><QrCode className="h-3 w-3" />{student.barcode_id}</span>
                            : <span className="text-xs text-muted-foreground italic">—</span>}
                        </td>
                        <td className="p-4 align-middle">
                          <div className="flex flex-wrap gap-1">
                            {student.courses.length > 0
                              ? student.courses.map(c => <span key={c} className="inline-flex items-center rounded-md bg-accent/20 px-2 py-0.5 text-xs font-medium border border-accent/40">{c}</span>)
                              : <span className="text-muted-foreground text-xs">None</span>}
                          </div>
                        </td>
                        <td className="p-4 align-middle">
                          <Button variant="ghost" size="sm" className={`h-7 px-2 text-xs gap-1 ${student.status === "enrolled" ? "text-green-700 hover:text-green-800 hover:bg-green-50" : "text-muted-foreground hover:text-primary hover:bg-primary/5"}`}
                            onClick={() => setEnrollStudent(student)}>
                            {student.status === "enrolled" ? <><UserCheck className="h-3.5 w-3.5" /> Enrolled</> : <><UserMinus className="h-3.5 w-3.5" /> Unenrolled</>}
                          </Button>
                        </td>
                        <td className="p-4 align-middle text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary" onClick={() => openEditModal(student)}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => handleDelete(student.id)}><Trash2 className="h-4 w-4" /></Button>
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

        {/* Add Modal */}
        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <Card className="w-full max-w-lg shadow-2xl bg-background border-border relative m-4 max-h-[90vh] overflow-y-auto">
              <Button variant="ghost" size="icon" className="absolute right-2 top-2 text-muted-foreground" onClick={closeAll}><X className="h-4 w-4" /></Button>
              <CardHeader><CardTitle>Add New Student</CardTitle></CardHeader>
              <CardContent><ModalForm {...ModalProps} onSubmit={handleSaveNew} submitLabel="Add Student" /></CardContent>
            </Card>
          </div>
        )}

        {/* Edit Modal */}
        {isEditOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <Card className="w-full max-w-lg shadow-2xl bg-background border-border relative m-4 max-h-[90vh] overflow-y-auto">
              <Button variant="ghost" size="icon" className="absolute right-2 top-2 text-muted-foreground" onClick={closeAll}><X className="h-4 w-4" /></Button>
              <CardHeader><CardTitle>Edit Student</CardTitle></CardHeader>
              <CardContent><ModalForm {...ModalProps} onSubmit={handleUpdate} submitLabel="Update Student" /></CardContent>
            </Card>
          </div>
        )}

        {/* Enroll Modal */}
        {enrollStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <Card className="w-full max-w-md shadow-2xl bg-background border-border relative m-4">
              <Button variant="ghost" size="icon" className="absolute right-2 top-2 text-muted-foreground" onClick={() => setEnrollStudent(null)}><X className="h-4 w-4" /></Button>
              <CardHeader><CardTitle>Manage Enrollment — {enrollStudent.first_name}</CardTitle></CardHeader>
              <CardContent>
                <EnrollModal student={enrollStudent} allCourses={allCourses} onClose={() => setEnrollStudent(null)} onSave={handleEnrollSave} />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

function EnrollModal({ student, allCourses, onClose, onSave }: {
  student: Student; allCourses: Course[]; onClose: () => void
  onSave: (studentId: number, courseIds: number[]) => Promise<void>
}) {
  const [selected, setSelected] = useState<number[]>(() =>
    allCourses.filter(c => student.courses.includes(c.name)).map(c => c.id))
  const [saving, setSaving] = useState(false)

  const toggle = (id: number) => setSelected(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    await onSave(student.id, selected)
    setSaving(false)
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <CourseSelector allCourses={allCourses} selectedCourseIds={selected} onToggle={toggle} />
      <div className="flex gap-3 pt-4 border-t">
        <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90" disabled={saving}>{saving ? "Saving..." : "Save Enrollment"}</Button>
      </div>
    </form>
  )
}
