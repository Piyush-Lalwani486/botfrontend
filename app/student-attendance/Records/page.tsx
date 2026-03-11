"use client"
import { useState, useEffect, useCallback } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarIcon, ArrowLeft, Loader2, Trash2, Edit, X, Check } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import Link from "next/link"
import axios from "axios"
import { useToast } from "@/hooks/use-toast"

const API = "http://127.0.0.1:5000"
interface AttendanceRecord { id: number; student_id: number; student_name: string; batch: string; course: string; date: string; status: string }

const statusStyle = (s: string) => {
  if (s === "Present") return "bg-green-50 text-green-700 border-green-200"
  if (s === "Absent")  return "bg-red-50 text-red-700 border-red-200"
  if (s === "Late")    return "bg-yellow-50 text-yellow-700 border-yellow-200"
  return "bg-blue-50 text-blue-700 border-blue-200"
}

export default function StudentAttendanceRecordsPage() {
  const [date, setDate]               = useState<Date | undefined>(undefined)
  const [selectedCourse, setSelectedCourse] = useState("all")
  const [records, setRecords]         = useState<AttendanceRecord[]>([])
  const [isLoading, setIsLoading]     = useState(true)
  const [editId, setEditId]           = useState<number | null>(null)
  const [editStatus, setEditStatus]   = useState("")
  const [isUpdating, setIsUpdating]   = useState(false)
  const { toast } = useToast()

  const fetchRecords = useCallback(async () => {
    try {
      setIsLoading(true)
      const params: any = {}
      if (date) params.date = format(date, "yyyy-MM-dd")
      if (selectedCourse !== "all") params.course = selectedCourse
      const r = await axios.get<AttendanceRecord[]>(`${API}/attendance/records`, { params })
      setRecords(r.data)
    } catch { toast({ variant:"destructive", title:"Error", description:"Failed to load records." }) }
    finally { setIsLoading(false) }
  }, [date, selectedCourse, toast])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this attendance record?")) return
    try {
      await axios.delete(`${API}/attendance/records/${id}`)
      toast({ title:"Record Deleted" })
      setRecords(prev => prev.filter(r => r.id !== id))
    } catch(e: any) { toast({ variant:"destructive", title:"Error", description: e.response?.data?.error || "Failed to delete." }) }
  }

  const startEdit = (record: AttendanceRecord) => { setEditId(record.id); setEditStatus(record.status) }

  const saveEdit = async (id: number) => {
    setIsUpdating(true)
    try {
      await axios.put(`${API}/attendance/records/${id}`, { status: editStatus })
      toast({ title:"Record Updated" })
      setRecords(prev => prev.map(r => r.id === id ? { ...r, status: editStatus } : r))
      setEditId(null)
    } catch(e: any) { toast({ variant:"destructive", title:"Error", description: e.response?.data?.error || "Failed to update." }) }
    finally { setIsUpdating(false) }
  }

  const counts = { total: records.length, present: records.filter(r=>r.status==="Present").length, absent: records.filter(r=>r.status==="Absent").length, late: records.filter(r=>r.status==="Late").length }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Link href="/student-attendance" className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm mb-2">
              <ArrowLeft className="h-3.5 w-3.5" />Back to Attendance
            </Link>
            <h1 className="text-3xl font-semibold">Attendance Records</h1>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label:"Total",   value: counts.total,   color:"bg-muted/50" },
            { label:"Present", value: counts.present, color:"bg-green-50 text-green-700" },
            { label:"Absent",  value: counts.absent,  color:"bg-red-50 text-red-700" },
            { label:"Late",    value: counts.late,    color:"bg-yellow-50 text-yellow-700" },
          ].map(s => (
            <Card key={s.label} className="border-border/50"><CardContent className={`pt-4 pb-3 rounded-lg ${s.color}`}><p className="text-2xl font-bold text-center">{s.value}</p><p className="text-xs text-center font-medium">{s.label}</p></CardContent></Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="border-border/50">
          <CardHeader className="pb-3"><CardTitle>Filter Records</CardTitle></CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-11", !date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : "All dates"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                </PopoverContent>
              </Popover>
              {date && <Button variant="ghost" size="sm" className="mt-1 h-7 text-xs text-muted-foreground" onClick={() => setDate(undefined)}>Clear date</Button>}
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Course</label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  <SelectItem value="CPDM">CPDM</SelectItem>
                  <SelectItem value="AGDM">AGDM</SelectItem>
                  <SelectItem value="AACP">AACP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Records table */}
        <Card className="border-border/50">
          <CardHeader><CardTitle>Records ({records.length})</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground"><Loader2 className="h-8 w-8 animate-spin mb-2" /><p>Loading records...</p></div>
            ) : records.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-lg border-border/50"><p className="text-muted-foreground">No records found for this filter.</p></div>
            ) : (
              <div className="rounded-md border border-border/50 overflow-hidden overflow-x-auto">
                <table className="w-full text-sm text-left min-w-[600px]">
                  <thead className="bg-muted/50 text-muted-foreground font-medium">
                    <tr>
                      <th className="h-12 px-4 align-middle">Date</th>
                      <th className="h-12 px-4 align-middle">Student</th>
                      <th className="h-12 px-4 align-middle hidden md:table-cell">Batch</th>
                      <th className="h-12 px-4 align-middle hidden sm:table-cell">Course</th>
                      <th className="h-12 px-4 align-middle">Status</th>
                      <th className="h-12 px-4 align-middle text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map(record => (
                      <tr key={record.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                        <td className="p-4 align-middle text-muted-foreground text-sm">{format(new Date(record.date), "MMM d, yyyy")}</td>
                        <td className="p-4 align-middle font-medium">{record.student_name}</td>
                        <td className="p-4 align-middle hidden md:table-cell text-muted-foreground text-xs">{record.batch}</td>
                        <td className="p-4 align-middle hidden sm:table-cell text-muted-foreground">{record.course}</td>
                        <td className="p-4 align-middle">
                          {editId === record.id ? (
                            <Select value={editStatus} onValueChange={setEditStatus}>
                              <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Present">Present</SelectItem>
                                <SelectItem value="Absent">Absent</SelectItem>
                                <SelectItem value="Late">Late</SelectItem>
                                <SelectItem value="Excused">Excused</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border", statusStyle(record.status))}>
                              {record.status}
                            </span>
                          )}
                        </td>
                        <td className="p-4 align-middle text-right">
                          <div className="flex justify-end gap-1">
                            {editId === record.id ? (
                              <>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => saveEdit(record.id)} disabled={isUpdating}>
                                  {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => setEditId(null)}><X className="h-4 w-4" /></Button>
                              </>
                            ) : (
                              <>
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary" onClick={() => startEdit(record)}><Edit className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => handleDelete(record.id)}><Trash2 className="h-4 w-4" /></Button>
                              </>
                            )}
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
      </div>
    </DashboardLayout>
  )
}
