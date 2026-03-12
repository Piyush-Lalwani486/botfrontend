"use client"

import { useEffect, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2 } from "lucide-react"

const API = "http://127.0.0.1:5000"

interface ReportRecord { date: string; name: string; type: string; class: string; status: string }
interface ReportsTableProps { dateFrom?: string; dateTo?: string; status?: string; userType?: string }

export function ReportsTable({ dateFrom, dateTo, status, userType }: ReportsTableProps) {
  const [records, setRecords]     = useState<ReportRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => { fetchReports() }, [dateFrom, dateTo, status, userType])

  const fetchReports = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (dateFrom)                        params.append("date_from", dateFrom)
      if (dateTo)                          params.append("date_to",   dateTo)
      if (status   && status   !== "all")  params.append("status",    status)
      if (userType && userType !== "all")  params.append("user_type", userType)
      const res = await fetch(`${API}/attendance/reports?${params.toString()}`).then(r=>r.json())
      setRecords(res)
    } catch (e) { console.error("Failed to fetch reports", e) }
    finally { setIsLoading(false) }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      present: "bg-green-500/10 text-green-600 border border-green-500/20",
      absent:  "bg-red-500/10 text-red-600 border border-red-500/20",
      late:    "bg-orange-500/10 text-orange-600 border border-orange-500/20",
      leave:   "bg-blue-500/10 text-blue-600 border border-blue-500/20",
      excused: "bg-purple-500/10 text-purple-600 border border-purple-500/20",
    }
    return (
      <span className={`inline-flex px-2.5 py-0.5 rounded-md text-xs font-medium ${styles[status] || "bg-muted text-muted-foreground"}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mb-2" /><p>Loading reports...</p>
      </div>
    )
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold">Date</TableHead>
            <TableHead className="font-semibold">Name</TableHead>
            <TableHead className="font-semibold">Type</TableHead>
            <TableHead className="font-semibold">Class / Subject</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.length === 0 ? (
            <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No records found for the selected filters.</TableCell></TableRow>
          ) : records.map((record, index) => (
            <TableRow key={index} className="transition-colors hover:bg-muted/30 animate-slide-in" style={{ animationDelay: `${index * 30}ms` }}>
              <TableCell className="font-medium">{record.date}</TableCell>
              <TableCell>{record.name}</TableCell>
              <TableCell><span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">{record.type}</span></TableCell>
              <TableCell className="text-muted-foreground">{record.class}</TableCell>
              <TableCell>{getStatusBadge(record.status)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {records.length > 0 && (
        <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground">
          Showing {records.length} records
        </div>
      )}
    </div>
  )
}
