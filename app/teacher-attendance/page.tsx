"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarIcon, Save, FileText, Loader2, User } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import axios from "axios"

const API = "http://127.0.0.1:5000"

interface Teacher { id: number; name: string; email: string; subject: string }
interface AttendanceRecord { [teacherId: number]: string }

export default function TeacherAttendancePage() {
  const [date, setDate]             = useState<Date>(new Date())
  const [isSaving, setIsSaving]     = useState(false)
  const { toast } = useToast()
  const [teachers, setTeachers]     = useState<Teacher[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord>({})
  const [isLoading, setIsLoading]   = useState(true)

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        setIsLoading(true)
        const res = await axios.get<Teacher[]>(`${API}/teacher-attendance/`)
        setTeachers(res.data)
        const init: AttendanceRecord = {}
        res.data.forEach(t => { init[t.id] = "Present" })
        setAttendance(init)
      } catch {
        toast({ variant: "destructive", title: "Error", description: "Failed to load teachers." })
      } finally { setIsLoading(false) }
    }
    fetchTeachers()
  }, [])

  const handleStatusChange = (teacherId: number, status: string) =>
    setAttendance(prev => ({ ...prev, [teacherId]: status }))

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await axios.post(`${API}/teacher-attendance/save`, {
        date:    format(date, "yyyy-MM-dd"),
        records: Object.entries(attendance).map(([id, status]) => ({
          teacher_id: parseInt(id), status
        })),
      })
      toast({ title: "Attendance Saved", description: `Recorded for ${format(date, "MMM d, yyyy")}.` })
    } catch {
      toast({ variant: "destructive", title: "Save Failed", description: "Could not save attendance." })
    } finally { setIsSaving(false) }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold mb-2">Teacher Attendance</h1>
            <p className="text-muted-foreground">Mark and manage teacher attendance records.</p>
          </div>
          <Link href="/teacher-attendance/records">
            <Button variant="outline" className="shadow-sm hover:bg-secondary/50">
              <FileText className="mr-2 h-4 w-4" />View Past Records
            </Button>
          </Link>
        </div>

        <Card className="border-border/50">
          <CardHeader><CardTitle>Attendance Management</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="flex-1 max-w-xs">
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

            <div className="rounded-md border border-border/50 overflow-hidden min-h-[300px]">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin mb-2" /><p>Loading teachers...</p>
                </div>
              ) : teachers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <User className="h-10 w-10 mb-2 opacity-50" /><p>No teachers found.</p>
                </div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground font-medium">
                    <tr>
                      <th className="h-12 px-4 align-middle">ID</th>
                      <th className="h-12 px-4 align-middle">Teacher Name</th>
                      <th className="h-12 px-4 align-middle">Subject</th>
                      <th className="h-12 px-4 align-middle text-right">Mark Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teachers.map(teacher => (
                      <tr key={teacher.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                        <td className="p-4 align-middle text-muted-foreground">#{teacher.id}</td>
                        <td className="p-4 align-middle">
                          <div className="flex flex-col">
                            <span className="font-medium">{teacher.name}</span>
                            <span className="text-xs text-muted-foreground">{teacher.email}</span>
                          </div>
                        </td>
                        <td className="p-4 align-middle">
                          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">{teacher.subject}</span>
                        </td>
                        <td className="p-4 align-middle text-right">
                          <div className="flex justify-end">
                            <Select value={attendance[teacher.id] || "Present"} onValueChange={val => handleStatusChange(teacher.id, val)}>
                              <SelectTrigger className={cn("w-[140px] h-9 transition-colors",
                                attendance[teacher.id] === "Present" && "text-green-600 border-green-200 bg-green-50",
                                attendance[teacher.id] === "Absent"  && "text-red-600 border-red-200 bg-red-50",
                                attendance[teacher.id] === "Late"    && "text-yellow-600 border-yellow-200 bg-yellow-50",
                              )}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Present">Present</SelectItem>
                                <SelectItem value="Absent">Absent</SelectItem>
                                <SelectItem value="Late">Late</SelectItem>
                                <SelectItem value="Excused">Excused</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
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
