"use client"
import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarIcon, Save, FileText, Loader2, User, QrCode } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { useRouter } from "next/navigation"
import axios from "axios"

const API = "http://127.0.0.1:5000"

interface Student { id: number; first_name: string; last_name: string; roll_number: string | null; course: string | null; status: string; batch_id: number | null; batch_name: string | null }
interface Batch { id: number; name: string }
interface AttendanceRecord { [studentId: number]: string }

export default function StudentAttendancePage() {
  const [date, setDate]             = useState<Date>(new Date())
  const [selectedClass, setSelectedClass] = useState("all")
  const [selectedBatch, setSelectedBatch] = useState("all")
  const [enrollmentStatus, setEnrollmentStatus] = useState("enrolled")
  const [isSaving, setIsSaving]     = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const [students, setStudents]     = useState<Student[]>([])
  const [batches, setBatches]       = useState<Batch[]>([])
  const [courses, setCourses]       = useState<string[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord>({})
  const [isLoading, setIsLoading]   = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true)
        const [sRes, bRes, cRes] = await Promise.all([
          axios.get<Student[]>(`${API}/students/`),
          axios.get<Batch[]>(`${API}/batches/`),
          axios.get(`${API}/courses/`),
        ])
        setStudents(sRes.data)
        setBatches(bRes.data)
        setCourses(cRes.data.map((c: any) => c.name))
        const init: AttendanceRecord = {}
        sRes.data.forEach((s: Student) => { init[s.id] = "Present" })
        setAttendance(init)
      } catch { toast({ variant:"destructive", title:"Error", description:"Failed to load data." }) }
      finally { setIsLoading(false) }
    }
    load()
  }, [])

  const handleStatusChange = (studentId: number, status: string) =>
    setAttendance(prev => ({ ...prev, [studentId]: status }))

  const markAll = (status: string) => {
    const updated: AttendanceRecord = {}
    filteredStudents.forEach(s => { updated[s.id] = status })
    setAttendance(prev => ({ ...prev, ...updated }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await axios.post(`${API}/attendance/save`, {
        date:    format(date, "yyyy-MM-dd"),
        course:  selectedClass,
        records: filteredStudents.map(s => ({ student_id: s.id, status: attendance[s.id] || "Present" })),
      })
      toast({ title:"Attendance Saved", description:`Recorded for ${format(date, "MMM d, yyyy")}.` })
    } catch { toast({ variant:"destructive", title:"Save Failed", description:"Could not save attendance." }) }
    finally { setIsSaving(false) }
  }

  const filteredStudents = students.filter(student => {
    const matchCourse  = selectedClass === "all" || (student.course?.toLowerCase() || "") === selectedClass.toLowerCase()
    const matchBatch   = selectedBatch === "all" || String(student.batch_id) === selectedBatch
    const matchStatus  = enrollmentStatus === "all" || student.status === enrollmentStatus
    return matchCourse && matchBatch && matchStatus
  })

  const statusCounts = {
    present: filteredStudents.filter(s => attendance[s.id] === "Present").length,
    absent:  filteredStudents.filter(s => attendance[s.id] === "Absent").length,
    late:    filteredStudents.filter(s => attendance[s.id] === "Late").length,
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold mb-2">Student Attendance</h1>
            <p className="text-muted-foreground">Mark and manage student attendance records.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push("/barcode-scanner")} className="shadow-sm hover:bg-secondary/50">
              <QrCode className="mr-2 h-4 w-4" />Barcode Scanner
            </Button>
            <Link href="/student-attendance/Records">
              <Button variant="outline" className="shadow-sm hover:bg-secondary/50"><FileText className="mr-2 h-4 w-4" />Past Records</Button>
            </Link>
          </div>
        </div>

        {/* Quick stats */}
        {!isLoading && filteredStudents.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label:"Present", count: statusCounts.present, color:"text-green-600 bg-green-50" },
              { label:"Absent",  count: statusCounts.absent,  color:"text-red-600 bg-red-50" },
              { label:"Late",    count: statusCounts.late,    color:"text-yellow-600 bg-yellow-50" },
            ].map(s => (
              <Card key={s.label} className="border-border/50">
                <CardContent className={`pt-4 pb-3 rounded-lg ${s.color}`}>
                  <p className="text-2xl font-bold text-center">{s.count}</p>
                  <p className="text-xs text-center font-medium">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card className="border-border/50">
          <CardHeader><CardTitle>Attendance Management</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            {/* Filters row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-11", !date && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={date} onSelect={day => day && setDate(day)} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Batch</label>
                <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="All Batches" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Batches</SelectItem>
                    {batches.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Course</label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="All Courses" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Courses</SelectItem>
                    {courses.map(c => <SelectItem key={c} value={c.toLowerCase()}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Enrollment</label>
                <Select value={enrollmentStatus} onValueChange={setEnrollmentStatus}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="enrolled">Enrolled</SelectItem>
                    <SelectItem value="unenrolled">Unenrolled</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Mark all buttons */}
            <div className="flex gap-2 flex-wrap">
              <span className="text-sm font-medium self-center text-muted-foreground">Mark all as:</span>
              {["Present","Absent","Late","Excused"].map(s => (
                <Button key={s} size="sm" variant="outline" onClick={() => markAll(s)}
                  className={cn("h-8 text-xs",
                    s==="Present" && "hover:bg-green-50 hover:text-green-700 hover:border-green-200",
                    s==="Absent"  && "hover:bg-red-50 hover:text-red-700 hover:border-red-200",
                    s==="Late"    && "hover:bg-yellow-50 hover:text-yellow-700 hover:border-yellow-200",
                  )}>{s}</Button>
              ))}
            </div>

            <div className="rounded-md border border-border/50 overflow-hidden min-h-[300px]">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin mb-2" /><p>Loading students...</p>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <User className="h-10 w-10 mb-2 opacity-50" /><p>No students found for this filter.</p>
                </div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground font-medium">
                    <tr>
                      <th className="h-12 px-4 align-middle">ID</th>
                      <th className="h-12 px-4 align-middle">Student Name</th>
                      <th className="h-12 px-4 align-middle hidden sm:table-cell">Batch</th>
                      <th className="h-12 px-4 align-middle hidden md:table-cell">Course</th>
                      <th className="h-12 px-4 align-middle text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map(student => (
                      <tr key={student.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                        <td className="p-4 align-middle text-muted-foreground">#{student.id}</td>
                        <td className="p-4 align-middle font-medium">{student.first_name} {student.last_name}</td>
                        <td className="p-4 align-middle hidden sm:table-cell">
                          {student.batch_name
                            ? <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{student.batch_name}</span>
                            : <span className="text-xs text-muted-foreground">—</span>}
                        </td>
                        <td className="p-4 align-middle hidden md:table-cell">
                          {student.course
                            ? <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">{student.course}</span>
                            : <span className="text-xs text-muted-foreground">—</span>}
                        </td>
                        <td className="p-4 align-middle text-right">
                          <Select value={attendance[student.id] || "Present"} onValueChange={val => handleStatusChange(student.id, val)}>
                            <SelectTrigger className={cn("w-[130px] h-9 transition-colors",
                              attendance[student.id] === "Present" && "text-green-600 border-green-200 bg-green-50",
                              attendance[student.id] === "Absent"  && "text-red-600 border-red-200 bg-red-50",
                              attendance[student.id] === "Late"    && "text-yellow-600 border-yellow-200 bg-yellow-50",
                            )}><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Present">Present</SelectItem>
                              <SelectItem value="Absent">Absent</SelectItem>
                              <SelectItem value="Late">Late</SelectItem>
                              <SelectItem value="Excused">Excused</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-border">
              <Button onClick={handleSave} disabled={isSaving || isLoading} className="bg-primary hover:bg-primary/90 shadow-lg min-w-[150px]">
                {isSaving
                  ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Saving...</span>
                  : <span className="flex items-center gap-2"><Save className="w-4 h-4" />Save Attendance</span>}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
