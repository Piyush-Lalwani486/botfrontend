"use client"
import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Bell, MessageCircle, Save, Eye, EyeOff } from "lucide-react"

const API = "http://127.0.0.1:5000"

export default function SettingsPage() {
  const { authFetch, isSuperAdmin } = useAuth()
  const { toast } = useToast()
  const [tab, setTab] = useState<"fee_alerts"|"account">("fee_alerts")
  const [loading, setLoading] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [showToken, setShowToken] = useState(false)

  const [cfg, setCfg] = useState({
    days_threshold:    30,
    check_time:        "09:00",
    whatsapp_enabled:  false,
    sms_enabled:       false,
    twilio_sid:        "",
    twilio_token:      "",
    twilio_from:       "",
    message_template:  "Dear {name}, your fee of Rs.{pending} is overdue by {days} days. Please pay at the earliest. - FlipFlop Digital Learning",
  })

  useEffect(() => {
    setLoading(true)
    authFetch(`${API}/api/fee-alerts/settings`)
      .then((r: Response) => r.json())
      .then((d: any) => {
        if (!d.error) setCfg({
          days_threshold:   d.days_threshold  ?? 30,
          check_time:       d.check_time       ?? "09:00",
          whatsapp_enabled: Boolean(d.whatsapp_enabled),
          sms_enabled:      Boolean(d.sms_enabled),
          twilio_sid:       d.twilio_sid       ?? "",
          twilio_token:     d.twilio_token     ?? "",
          twilio_from:      d.twilio_from      ?? "",
          message_template: d.message_template ?? cfg.message_template,
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      const r = await authFetch(`${API}/api/fee-alerts/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cfg),
      })
      const d = await r.json()
      if (d.error) throw new Error(d.error)
      toast({ title: "Settings Saved", description: "Fee alert configuration updated." })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message })
    } finally { setSaving(false) }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 text-sm mt-0.5">Configure system-wide settings</p>
        </div>

        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          {([["fee_alerts","🔔 Fee Alerts"]] as const).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab===id ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
              {label}
            </button>
          ))}
        </div>

        {loading && <div className="flex items-center gap-2 text-gray-400 py-8 justify-center"><Loader2 className="w-5 h-5 animate-spin" />Loading...</div>}

        {!loading && tab === "fee_alerts" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">

            {/* Timing Settings */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#F16265]" />
                <h3 className="font-bold text-gray-900">Alert Timing</h3>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-600 block">Fee overdue threshold (days)</label>
                <div className="flex items-center gap-2">
                  <input type="number" min={1} max={365} value={cfg.days_threshold}
                    onChange={e => setCfg(c => ({...c, days_threshold: Number(e.target.value)}))}
                    className="w-24 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#F16265]" />
                  <span className="text-sm text-gray-500">days without payment = alert</span>
                </div>
                <p className="text-xs text-gray-400">Students with fee pending for longer than this will show in alerts and get notified.</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-600 block">Message Template</label>
                <textarea value={cfg.message_template}
                  onChange={e => setCfg(c => ({...c, message_template: e.target.value}))}
                  rows={4}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#F16265] resize-none" />
                <p className="text-xs text-gray-400">Variables: <code className="bg-gray-100 px-1 rounded">{"{name}"}</code> <code className="bg-gray-100 px-1 rounded">{"{pending}"}</code> <code className="bg-gray-100 px-1 rounded">{"{days}"}</code> <code className="bg-gray-100 px-1 rounded">{"{roll}"}</code> <code className="bg-gray-100 px-1 rounded">{"{batch}"}</code></p>
              </div>
            </div>

            {/* Twilio / SMS Settings */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-green-500" />
                <h3 className="font-bold text-gray-900">SMS / WhatsApp (Twilio)</h3>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div onClick={() => setCfg(c => ({...c, sms_enabled: !c.sms_enabled}))}
                    className={`w-10 h-6 rounded-full transition-all cursor-pointer ${cfg.sms_enabled ? "bg-[#F16265]" : "bg-gray-200"}`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow m-0.5 transition-transform ${cfg.sms_enabled ? "translate-x-4" : ""}`} />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Enable SMS Notifications</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <div onClick={() => setCfg(c => ({...c, whatsapp_enabled: !c.whatsapp_enabled}))}
                    className={`w-10 h-6 rounded-full transition-all cursor-pointer ${cfg.whatsapp_enabled ? "bg-green-500" : "bg-gray-200"}`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow m-0.5 transition-transform ${cfg.whatsapp_enabled ? "translate-x-4" : ""}`} />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Enable WhatsApp Notifications</span>
                </label>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Twilio Account SID</label>
                  <input value={cfg.twilio_sid} onChange={e => setCfg(c => ({...c, twilio_sid: e.target.value}))}
                    placeholder="ACxxxxxxxxxxxx"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono outline-none focus:border-[#F16265]" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Twilio Auth Token</label>
                  <div className="relative">
                    <input type={showToken ? "text" : "password"} value={cfg.twilio_token}
                      onChange={e => setCfg(c => ({...c, twilio_token: e.target.value}))}
                      placeholder="••••••••••••••••"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono outline-none focus:border-[#F16265] pr-10" />
                    <button onClick={() => setShowToken(s => !s)} className="absolute right-3 top-2.5 text-gray-400">
                      {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">
                    Twilio From Number {cfg.whatsapp_enabled && <span className="text-green-600">(for WhatsApp: +14155238886)</span>}
                  </label>
                  <input value={cfg.twilio_from} onChange={e => setCfg(c => ({...c, twilio_from: e.target.value}))}
                    placeholder="+1234567890"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono outline-none focus:border-[#F16265]" />
                </div>
              </div>

              <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700 space-y-1">
                <p className="font-semibold">How to set up Twilio:</p>
                <p>1. Register free at <strong>twilio.com</strong></p>
                <p>2. Get Account SID + Auth Token from dashboard</p>
                <p>3. For WhatsApp: join Twilio sandbox (free) or buy a number</p>
                <p>4. Student phone numbers must include country code or start with 10 digits (Indian numbers auto-prefixed with +91)</p>
              </div>
            </div>

            <div className="lg:col-span-2">
              <button onClick={save} disabled={saving || !isSuperAdmin}
                className="flex items-center gap-2 px-6 py-3 bg-[#F16265] text-white rounded-xl text-sm font-semibold hover:bg-[#D94F52] disabled:opacity-60 transition-all">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Settings
              </button>
              {!isSuperAdmin && <p className="text-xs text-amber-600 mt-2">Only Super Admin can save settings.</p>}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
