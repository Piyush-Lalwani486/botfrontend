"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarIcon, FileSpreadsheet } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { ReportsTable } from "@/components/reports-table"
import { useToast } from "@/hooks/use-toast"

const API = "http://127.0.0.1:5000"

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState<Date | undefined>()
  const [dateTo, setDateTo]     = useState<Date | undefined>()
  const [status, setStatus]     = useState("all")
  const [userType, setUserType] = useState("all")
  const { toast } = useToast()

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams()
      if (dateFrom)                        params.append("date_from",  format(dateFrom, "yyyy-MM-dd"))
      if (dateTo)                          params.append("date_to",    format(dateTo,   "yyyy-MM-dd"))
      if (status   && status   !== "all")  params.append("status",     status)
      if (userType && userType !== "all")  params.append("user_type",  userType)

      const res     = await fetch(`${API}/attendance/reports?${params.toString()}`).then(r=>r.json())
      const records = res.data
      const headers = ["Date", "Name", "Type", "Class/Subject", "Status"]
      const rows    = records.map((r: any) => [r.date, r.name, r.type, r.class, r.status])
      const csv     = [headers, ...rows].map(row => row.join(",")).join("\n")
      const blob    = new Blob([csv], { type: "text/csv" })
      const url     = URL.createObjectURL(blob)
      const a       = document.createElement("a")
      a.href = url; a.download = `attendance_${format(new Date(), "yyyy-MM-dd")}.csv`; a.click()
      URL.revokeObjectURL(url)
      toast({ title: "Exported", description: "Report downloaded as CSV." })
    } catch {
      toast({ variant: "destructive", title: "Export Failed", description: "Could not export report." })
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Reports & History</h1>
          <p className="text-muted-foreground">View and export attendance reports.</p>
        </div>
        <Card className="border-border/50">
          <CardHeader><CardTitle>Attendance History</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "From Date", value: dateFrom, setter: setDateFrom, placeholder: "Start date" },
                { label: "To Date",   value: dateTo,   setter: setDateTo,   placeholder: "End date" },
              ].map(({ label, value, setter, placeholder }) => (
                <div key={label}>
                  <label className="text-sm font-medium mb-2 block">{label}</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-11", !value && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {value ? format(value, "PP") : <span>{placeholder}</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={value} onSelect={setter} initialFocus />
                      {value && (
                        <div className="p-2 border-t">
                          <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setter(undefined)}>Clear</Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>
              ))}
              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="late">Late</SelectItem>
                    <SelectItem value="excused">Excused</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">User Type</label>
                <Select value={userType} onValueChange={setUserType}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="student">Students</SelectItem>
                    <SelectItem value="teacher">Teachers</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={handleExportCSV}
                className="hover:bg-primary/10 hover:text-primary hover:border-primary bg-transparent">
                <FileSpreadsheet className="w-4 h-4 mr-2" />Export to CSV
              </Button>
            </div>
            <ReportsTable
              dateFrom={dateFrom ? format(dateFrom, "yyyy-MM-dd") : undefined}
              dateTo={dateTo     ? format(dateTo,   "yyyy-MM-dd") : undefined}
              status={status}
              userType={userType}
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
