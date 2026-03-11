"use client"

import { useEffect, useState, useCallback, useMemo, memo } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, BookOpen, Edit, Trash2, Loader2, X, Users, Upload, FileText } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import axios from "axios"

const API = "http://127.0.0.1:5000"

interface Teacher { id: number; name: string }
interface Course { id: number; name: string; description: string; teacher_id: number | null; teacher_name: string | null; student_count: number }

interface CourseFormProps {
  name: string; onName: (v: string) => void
  description: string; onDescription: (v: string) => void
  teacherId: string; onTeacherId: (v: string) => void
  teachers: Teacher[]
  onSubmit: (e: React.FormEvent) => void
  onClose: () => void
  isSaving: boolean
  isAdd: boolean
}

const CourseForm = memo(({ name, onName, description, onDescription, teacherId, onTeacherId, teachers, onSubmit, onClose, isSaving, isAdd }: CourseFormProps) => (
  <form onSubmit={onSubmit} className="space-y-4">
    <div className="space-y-2">
      <Label>Course Name <span className="text-destructive">*</span></Label>
      <Input placeholder="e.g. CPDM, Frontend Development" value={name} onChange={e => onName(e.target.value)} required />
    </div>
    <div className="space-y-2">
      <Label>Description</Label>
      <Textarea placeholder="Brief course description..." value={description} onChange={e => onDescription(e.target.value)} rows={3} className="resize-none" />
    </div>
    <div className="space-y-2">
      <Label>Assign Teacher</Label>
      <Select value={teacherId} onValueChange={onTeacherId}>
        <SelectTrigger><SelectValue placeholder="Select a teacher (optional)" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No teacher assigned</SelectItem>
          {teachers.map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}
        </SelectContent>
      </Select>
      {teachers.length === 0 && <p className="text-xs text-muted-foreground">No teachers found. Add teachers first.</p>}
    </div>
    <div className="flex gap-3 pt-4 border-t">
      <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
      <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90" disabled={isSaving}>
        {isSaving ? "Saving..." : isAdd ? "Add Course" : "Update Course"}
      </Button>
    </div>
  </form>
))
CourseForm.displayName = "CourseForm"

export default function CoursesPage() {
  const [courses, setCourses]     = useState<Course[]>([])
  const [teachers, setTeachers]   = useState<Teacher[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const { toast } = useToast()
  const [isAddOpen, setIsAddOpen]   = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isSaving, setIsSaving]     = useState(false)
  const [currentId, setCurrentId]   = useState<number | null>(null)
  const [name, setName]             = useState("")
  const [description, setDescription] = useState("")
  const [teacherId, setTeacherId]   = useState<string>("none")
  const [csvImporting, setCsvImporting] = useState(false)
  const [csvMsg, setCsvMsg]             = useState("")

  const handleCsvImport = useCallback(async (file: File) => {
    setCsvImporting(true); setCsvMsg("")
    try {
      const text = await file.text()
      const r = await axios.post(`${API}/courses/import-csv`, { csv_text: text })
      const d = r.data
      setCsvMsg(`✅ Imported ${d.added} courses${d.skipped ? `, skipped ${d.skipped}` : ""}${d.errors?.length ? ` — ${d.errors[0]}` : ""}`)
      fetchCourses()
    } catch(e: any) {
      setCsvMsg(`⚠ ${e.response?.data?.error || "Import failed"}`)
    } finally { setCsvImporting(false); setTimeout(() => setCsvMsg(""), 6000) }
  }, [])

  useEffect(() => { fetchCourses(); fetchTeachers() }, [])

  const fetchCourses = async () => {
    try {
      setIsLoading(true)
      const res = await axios.get<Course[]>(`${API}/courses/`)
      setCourses(res.data)
    } catch { toast({ variant: "destructive", title: "Error", description: "Failed to load courses." }) }
    finally { setIsLoading(false) }
  }

  const fetchTeachers = async () => {
    try {
      const res = await axios.get<Teacher[]>(`${API}/courses/teachers/all`)
      setTeachers(res.data)
    } catch (e) { console.error("Failed to load teachers", e) }
  }

  const openAddModal = useCallback(() => { setName(""); setDescription(""); setTeacherId("none"); setIsAddOpen(true) }, [])
  const openEditModal = useCallback((c: Course) => {
    setCurrentId(c.id); setName(c.name); setDescription(c.description)
    setTeacherId(c.teacher_id ? c.teacher_id.toString() : "none"); setIsEditOpen(true)
  }, [])
  const closeAll = useCallback(() => { setIsAddOpen(false); setIsEditOpen(false) }, [])

  const handleAdd = useCallback(async (e: React.FormEvent) => {
    e.preventDefault(); setIsSaving(true)
    try {
      await axios.post(`${API}/courses/add`, { name, description, teacher_id: teacherId !== "none" ? parseInt(teacherId) : null })
      toast({ title: "Course Added", description: `${name} created successfully.` }); setIsAddOpen(false); fetchCourses()
    } catch { toast({ variant: "destructive", title: "Error", description: "Failed to add course." }) }
    finally { setIsSaving(false) }
  }, [name, description, teacherId, toast])

  const handleUpdate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault(); if (!currentId) return; setIsSaving(true)
    try {
      await axios.put(`${API}/courses/${currentId}`, { name, description, teacher_id: teacherId !== "none" ? parseInt(teacherId) : null })
      toast({ title: "Course Updated" }); setIsEditOpen(false); fetchCourses()
    } catch { toast({ variant: "destructive", title: "Error", description: "Failed to update course." }) }
    finally { setIsSaving(false) }
  }, [currentId, name, description, teacherId, toast])

  const handleDelete = useCallback(async (id: number, courseName: string) => {
    if (!confirm(`Delete "${courseName}"?`)) return
    try {
      await axios.delete(`${API}/courses/${id}`)
      toast({ title: "Course Deleted" })
      setCourses(prev => prev.filter(c => c.id !== id))
    } catch { toast({ variant: "destructive", title: "Error", description: "Failed to delete course." }) }
  }, [toast])

  const filteredCourses = useMemo(() =>
    courses.filter(c =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.teacher_name || "").toLowerCase().includes(searchTerm.toLowerCase()))
  , [courses, searchTerm])

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div><h1 className="text-3xl font-semibold mb-2">Courses</h1><p className="text-muted-foreground">Manage courses and teacher assignments.</p></div>
          <div className="flex gap-2">
            <label className={`flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors ${csvImporting?"opacity-60 pointer-events-none":""}`}>
              {csvImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-gray-500" />}
              Import CSV
              <input type="file" accept=".csv" className="hidden" onChange={e => e.target.files?.[0] && handleCsvImport(e.target.files[0])} />
            </label>
            <Button onClick={openAddModal} className="bg-primary hover:bg-primary/90 shadow-lg"><Plus className="mr-2 h-4 w-4" />Add New Course</Button>
          </div>
        </div>

        {csvMsg && <div className={`px-4 py-3 rounded-xl text-sm font-medium ${csvMsg.startsWith("✅") ? "bg-green-50 text-green-700 border border-green-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>{csvMsg}</div>}

        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700 flex items-start gap-2">
          <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span><strong>CSV Import columns:</strong> Name, Description, TeacherName (must match an existing teacher's name)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Total Courses",     value: courses.length,                                       icon: BookOpen, color: "text-primary/60" },
            { label: "Assigned Teachers", value: courses.filter(c => c.teacher_id).length,             icon: Users,    color: "text-green-500/60" },
            { label: "Total Enrollments", value: courses.reduce((sum, c) => sum + c.student_count, 0), icon: Users,    color: "text-accent" },
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
              <CardTitle>All Courses</CardTitle>
              <div className="relative w-full max-w-xs hidden sm:block">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search courses..." className="pl-8" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground"><Loader2 className="h-8 w-8 animate-spin mb-2" /><p>Loading courses...</p></div>
            ) : filteredCourses.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed rounded-lg border-border/50">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <h3 className="text-lg font-medium mb-1">No courses found</h3>
                <p className="text-sm text-muted-foreground">{searchTerm ? "Try a different search." : 'Click "Add New Course" to get started.'}</p>
              </div>
            ) : (
              <div className="rounded-md border border-border/50 overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground font-medium">
                    <tr>
                      <th className="h-12 px-4 align-middle">ID</th>
                      <th className="h-12 px-4 align-middle">Course Name</th>
                      <th className="h-12 px-4 align-middle hidden md:table-cell">Description</th>
                      <th className="h-12 px-4 align-middle">Teacher</th>
                      <th className="h-12 px-4 align-middle">Students</th>
                      <th className="h-12 px-4 align-middle text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCourses.map(course => (
                      <tr key={course.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                        <td className="p-4 align-middle text-muted-foreground">#{course.id}</td>
                        <td className="p-4 align-middle font-medium">{course.name}</td>
                        <td className="p-4 align-middle text-muted-foreground hidden md:table-cell max-w-[200px]">
                          <span className="line-clamp-1">{course.description || <span className="italic text-muted-foreground/50">No description</span>}</span>
                        </td>
                        <td className="p-4 align-middle">
                          {course.teacher_name
                            ? <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">{course.teacher_name}</span>
                            : <span className="text-xs text-muted-foreground italic">Unassigned</span>}
                        </td>
                        <td className="p-4 align-middle">
                          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground"><Users className="h-3.5 w-3.5" />{course.student_count}</span>
                        </td>
                        <td className="p-4 align-middle text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary" onClick={() => openEditModal(course)}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => handleDelete(course.id, course.name)}><Trash2 className="h-4 w-4" /></Button>
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
              <CardHeader><CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5" />Add New Course</CardTitle></CardHeader>
              <CardContent>
                <CourseForm name={name} onName={setName} description={description} onDescription={setDescription} teacherId={teacherId} onTeacherId={setTeacherId} teachers={teachers} onSubmit={handleAdd} onClose={closeAll} isSaving={isSaving} isAdd={true} />
              </CardContent>
            </Card>
          </div>
        )}
        {isEditOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <Card className="w-full max-w-lg shadow-2xl bg-background border-border relative m-4">
              <Button variant="ghost" size="icon" className="absolute right-2 top-2 text-muted-foreground" onClick={closeAll}><X className="h-4 w-4" /></Button>
              <CardHeader><CardTitle className="flex items-center gap-2"><Edit className="h-5 w-5" />Edit Course</CardTitle></CardHeader>
              <CardContent>
                <CourseForm name={name} onName={setName} description={description} onDescription={setDescription} teacherId={teacherId} onTeacherId={setTeacherId} teachers={teachers} onSubmit={handleUpdate} onClose={closeAll} isSaving={isSaving} isAdd={false} />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
