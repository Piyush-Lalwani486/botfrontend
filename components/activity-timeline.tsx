"use client"

import { useEffect, useState } from "react"
import { Clock, UserCheck, Users, Loader2 } from "lucide-react"

const API = "http://127.0.0.1:5000"

interface Activity { id: number; action: string; user: string; role: string; icon_type: string; date: string; time: string }

const iconMap: Record<string, React.ElementType> = {
  users: Users, user_check: UserCheck, clock: Clock,
}

export function ActivityTimeline() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [isLoading, setIsLoading]   = useState(true)

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const res = await fetch(`${API}/activity/?limit=10`).then(r=>r.json())
        setActivities(res)
      } catch (e) { console.error("Failed to fetch activities", e) }
      finally { setIsLoading(false) }
    }
    fetchActivities()
  }, [])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mb-2" /><p className="text-sm">Loading activity...</p>
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No activity yet. Start marking attendance to see logs here.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {activities.map((activity, index) => {
        const Icon = iconMap[activity.icon_type] || Clock
        return (
          <div key={activity.id}
            className="flex gap-4 p-4 rounded-lg border border-border hover:bg-muted/30 transition-all duration-200 animate-slide-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground mb-1">{activity.action}</p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{activity.user}</span><span>•</span>
                <span className={`px-2 py-0.5 rounded ${activity.role === "Admin" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {activity.role}
                </span>
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground flex-shrink-0">
              <div>{activity.date}</div>
              <div className="text-muted-foreground/70">{activity.time}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
