"use client"
import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useAuth } from "@/contexts/auth-context"
import { Plus, Edit2, Trash2, Shield, User, Check, X, Loader2, ChevronDown } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const API = "http://127.0.0.1:5000"

interface UserItem {
  id:string; name:string; email:string; role_name:string; role_label:string
  role_color:string; is_active:boolean; created_at:string; last_login:string; notes:string
}
interface Role {
  id:string; name:string; label:string; description:string; permissions:string[]; color:string; is_system:boolean
}
interface PermGroup { group:string; icon:string; perms:string[] }
interface AllPerms { [key:string]:string }

export default function UserManagementPage() {
  const { authFetch, isAdmin, isSuperAdmin, user:me } = useAuth()
  const { toast } = useToast()
  const [tab,    setTab]   = useState<"users"|"roles">("users")
  const [users,  setUsers] = useState<UserItem[]>([])
  const [roles,  setRoles] = useState<Role[]>([])
  const [permsGroups, setPermsGroups] = useState<PermGroup[]>([])
  const [allPerms,    setAllPerms]    = useState<AllPerms>({})
  const [loading, setLoading] = useState(true)
  const [authLog, setAuthLog] = useState<any[]>([])
  // Modals
  const [userModal, setUserModal] = useState<"add"|"edit"|null>(null)
  const [roleModal, setRoleModal] = useState<"add"|"edit"|null>(null)
  const [editUser, setEditUser]   = useState<UserItem|null>(null)
  const [editRole, setEditRole]   = useState<Role|null>(null)
  // Form state
  const [uName,     setUName]     = useState("")
  const [uEmail,    setUEmail]    = useState("")
  const [uPass,     setUPass]     = useState("")
  const [uRole,     setURole]     = useState("teacher")
  const [uNotes,    setUNotes]    = useState("")
  const [rName,     setRName]     = useState("")
  const [rLabel,    setRLabel]    = useState("")
  const [rDesc,     setRDesc]     = useState("")
  const [rColor,    setRColor]    = useState("#475569")
  const [rPerms,    setRPerms]    = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [ur, rr, pr] = await Promise.all([
        authFetch(`${API}/api/users`).then(r=>r.json()),
        authFetch(`${API}/api/roles`).then(r=>r.json()),
        authFetch(`${API}/api/auth/permissions`).then(r=>r.json()),
      ])
      setUsers(ur.users || [])
      setRoles(rr.roles || [])
      setPermsGroups(pr.permission_groups || [])
      setAllPerms(pr.all_permissions || {})
      // Auth log
      const lr = await authFetch(`${API}/api/admin/auth-log`).then(r=>r.json())
      setAuthLog(lr.logs || [])
    } catch { toast({ variant:"destructive", title:"Error", description:"Failed to load data" }) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchAll() }, [])

  // ── User actions ────────────────────────────────────────────────
  const openAddUser = () => {
    setUName(""); setUEmail(""); setUPass(""); setURole("teacher"); setUNotes("")
    setEditUser(null); setUserModal("add")
  }
  const openEditUser = (u:UserItem) => {
    setUName(u.name); setUEmail(u.email); setUPass(""); setURole(u.role_name); setUNotes(u.notes||"")
    setEditUser(u); setUserModal("edit")
  }
  const saveUser = async () => {
    setSaving(true)
    try {
      const body: any = { name:uName, email:uEmail, role_name:uRole, notes:uNotes }
      if (uPass) body.password = uPass
      const r = userModal==="add"
        ? await authFetch(`${API}/api/users`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({...body,password:uPass}) })
        : await authFetch(`${API}/api/users/${editUser?.id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body) })
      const d = await r.json()
      if (d.error) throw new Error(d.error)
      toast({ title:userModal==="add"?"User Created":"User Updated", description:`${uName} saved successfully.` })
      setUserModal(null); fetchAll()
    } catch (e:any) {
      toast({ variant:"destructive", title:"Error", description:e.message })
    } finally { setSaving(false) }
  }
  const deleteUser = async (u:UserItem) => {
    if (!confirm(`Delete user ${u.name}? This cannot be undone.`)) return
    const r = await authFetch(`${API}/api/users/${u.id}`, { method:"DELETE" })
    const d = await r.json()
    if (d.error) toast({ variant:"destructive", title:"Error", description:d.error })
    else { toast({ title:"User Deleted" }); fetchAll() }
  }
  const toggleActive = async (u:UserItem) => {
    await authFetch(`${API}/api/users/${u.id}`, {
      method:"PATCH", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({ is_active:!u.is_active })
    })
    fetchAll()
  }

  // ── Role actions ─────────────────────────────────────────────────
  const openAddRole = () => {
    setRName(""); setRLabel(""); setRDesc(""); setRColor("#475569"); setRPerms([])
    setEditRole(null); setRoleModal("add")
  }
  const openEditRole = (r:Role) => {
    setRName(r.name); setRLabel(r.label); setRDesc(r.description); setRColor(r.color); setRPerms([...r.permissions])
    setEditRole(r); setRoleModal("edit")
  }
  const saveRole = async () => {
    setSaving(true)
    try {
      const body = { name:rName, label:rLabel, description:rDesc, color:rColor, permissions:rPerms }
      const r = roleModal==="add"
        ? await authFetch(`${API}/api/roles`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body) })
        : await authFetch(`${API}/api/roles/${editRole?.id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body) })
      const d = await r.json()
      if (d.error) throw new Error(d.error)
      toast({ title:roleModal==="add"?"Role Created":"Role Updated" })
      setRoleModal(null); fetchAll()
    } catch (e:any) {
      toast({ variant:"destructive", title:"Error", description:e.message })
    } finally { setSaving(false) }
  }
  const deleteRole = async (r:Role) => {
    if (r.is_system) { toast({ variant:"destructive", title:"Cannot delete system roles" }); return }
    if (!confirm(`Delete role "${r.label}"?`)) return
    const res = await authFetch(`${API}/api/roles/${r.id}`, { method:"DELETE" })
    const d = await res.json()
    if (d.error) toast({ variant:"destructive", title:"Error", description:d.error })
    else { toast({ title:"Role Deleted" }); fetchAll() }
  }
  const togglePerm = (p:string) => setRPerms(prev => prev.includes(p) ? prev.filter(x=>x!==p) : [...prev,p])

  if (!isAdmin) return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="text-center">
          <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">Admin access required</p>
        </div>
      </div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Team & Roles</h1>
            <p className="text-gray-500 text-sm">Manage staff accounts and access permissions</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit flex-wrap">
          {[["users","👥 Users"],["roles","🔐 Roles"],["log","📋 Auth Log"],["cleanup","🧹 Cleanup"]].map(([id,label])=>(
            <button key={id} onClick={()=>setTab(id as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab===id?"bg-white shadow-sm text-gray-900":"text-gray-500 hover:text-gray-700"}`}>
              {label}
            </button>
          ))}
        </div>

        {loading && <div className="flex items-center gap-3 text-gray-500 text-sm py-12 justify-center"><Loader2 className="w-5 h-5 animate-spin text-[#F16265]" /> Loading...</div>}

        {/* ── USERS ── */}
        {!loading && tab==="users" && (
          <div>
            <div className="flex justify-end mb-3">
              <button onClick={openAddUser}
                className="flex items-center gap-2 px-4 py-2 bg-[#F16265] text-white rounded-xl text-sm font-medium hover:bg-[#D94F52] transition-colors shadow-sm">
                <Plus className="w-4 h-4"/>Add User
              </button>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {["Name","Email","Role","Status","Last Login","Actions"].map(h=>(
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map(u=>(
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ background:u.role_color||"#475569" }}>
                            {u.name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{u.name}</p>
                            {u.notes && <p className="text-[11px] text-gray-400 truncate max-w-[120px]">{u.notes}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold text-white"
                          style={{ background:u.role_color||"#475569" }}>
                          {u.role_label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={()=>u.id!==me?.id && toggleActive(u)}
                          disabled={u.id===me?.id}
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${u.is_active?"bg-green-50 text-green-700":"bg-red-50 text-red-600"}`}>
                          {u.is_active?"Active":"Inactive"}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">{u.last_login ? new Date(u.last_login).toLocaleDateString("en-IN") : "Never"}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={()=>openEditUser(u)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                            <Edit2 className="w-3.5 h-3.5"/>
                          </button>
                          {isSuperAdmin && u.id!==me?.id && (
                            <button onClick={()=>deleteUser(u)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                              <Trash2 className="w-3.5 h-3.5"/>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length===0 && <div className="text-center text-gray-400 py-12">No users found</div>}
            </div>
          </div>
        )}

        {/* ── ROLES ── */}
        {!loading && tab==="roles" && (
          <div>
            <div className="flex justify-end mb-3">
              {isSuperAdmin && (
                <button onClick={openAddRole}
                  className="flex items-center gap-2 px-4 py-2 bg-[#F16265] text-white rounded-xl text-sm font-medium hover:bg-[#D94F52] transition-colors shadow-sm">
                  <Plus className="w-4 h-4"/>Add Role
                </button>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {roles.map(r=>(
                <div key={r.id} className="bg-white rounded-2xl p-4 border border-gray-100 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background:r.color }}/>
                        <span className="font-bold text-gray-900 text-sm">{r.label}</span>
                        {r.is_system && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">System</span>}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{r.description}</p>
                    </div>
                    {!r.is_system && isSuperAdmin && (
                      <div className="flex gap-1 flex-shrink-0 ml-2">
                        <button onClick={()=>openEditRole(r)} className="p-1 text-gray-400 hover:text-blue-600 transition-colors"><Edit2 className="w-3.5 h-3.5"/></button>
                        <button onClick={()=>deleteRole(r)} className="p-1 text-gray-400 hover:text-red-600 transition-colors"><Trash2 className="w-3.5 h-3.5"/></button>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-3">
                    {r.permissions.slice(0,6).map(p=>(
                      <span key={p} className="text-[10px] bg-gray-50 text-gray-600 border border-gray-200 px-1.5 py-0.5 rounded-full">{p}</span>
                    ))}
                    {r.permissions.length>6 && <span className="text-[10px] text-gray-400">+{r.permissions.length-6} more</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── AUTH LOG ── */}
        {!loading && tab==="log" && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">Login Activity Log</h3>
              <p className="text-xs text-gray-400 mt-0.5">Recent authentication events</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {["Time","User","Email","Action","IP"].map(h=>(
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {authLog.slice(0,50).map((log,i)=>(
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-xs text-gray-400">{log.created_at || log.timestamp ? new Date(log.created_at || log.timestamp).toLocaleString("en-IN") : "—"}</td>
                      <td className="px-4 py-2 font-medium text-gray-800 text-xs">{log.name||log.user_email||"—"}</td>
                      <td className="px-4 py-2 text-gray-500 text-xs">{log.email||log.user_email||"—"}</td>
                      <td className="px-4 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${log.action==="login"?"bg-green-50 text-green-700":log.action==="logout"?"bg-gray-100 text-gray-600":"bg-red-50 text-red-600"}`}>
                          {log.action||"—"}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-400 font-mono">{log.ip||"—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {authLog.length===0 && <div className="text-center text-gray-400 py-12">No log entries</div>}
            </div>
          </div>
        )}

        {/* ── CLEANUP TAB ── */}
        {tab==="cleanup" && isSuperAdmin && (
          <CleanupPanel authFetch={authFetch} />
        )}
        {tab==="cleanup" && !isSuperAdmin && (
          <div className="text-center text-gray-400 py-16">Only Super Admin can run data cleanup.</div>
        )}
      </div>

      {/* ── USER MODAL ── */}
      {userModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={()=>setUserModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">{userModal==="add"?"Add New User":"Edit User"}</h3>
              <button onClick={()=>setUserModal(null)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-4 h-4"/></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Full Name *</label>
                <input value={uName} onChange={e=>setUName(e.target.value)} placeholder="e.g. Priya Sharma"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#F16265] focus:ring-1 focus:ring-[#F16265]/20" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block flex items-center gap-1">
                  Email *
                  {!isSuperAdmin && <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">Super Admin only</span>}
                </label>
                <input type="email" value={uEmail} onChange={e=>setUEmail(e.target.value)} placeholder="priya@flipflop.edu"
                  disabled={!isSuperAdmin && userModal==="edit"}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#F16265] focus:ring-1 focus:ring-[#F16265]/20 disabled:bg-gray-50 disabled:text-gray-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block flex items-center gap-1">
                  {userModal==="add"?"Password *":"New Password (leave blank to keep)"}
                  {!isSuperAdmin && userModal==="edit" && <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">Super Admin only</span>}
                </label>
                <input type="password" value={uPass} onChange={e=>setUPass(e.target.value)} placeholder="••••••••"
                  disabled={!isSuperAdmin && userModal==="edit"}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#F16265] focus:ring-1 focus:ring-[#F16265]/20 disabled:bg-gray-50" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Role *</label>
                <select value={uRole} onChange={e=>setURole(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#F16265] bg-white">
                  {roles.map(r=><option key={r.id} value={r.name}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Notes</label>
                <input value={uNotes} onChange={e=>setUNotes(e.target.value)} placeholder="e.g. Physics teacher, batch A"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#F16265] focus:ring-1 focus:ring-[#F16265]/20" />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={()=>setUserModal(null)} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={saveUser} disabled={saving||!uName||!uEmail}
                className="flex-1 py-2 bg-[#F16265] text-white rounded-xl text-sm font-medium hover:bg-[#D94F52] disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Check className="w-4 h-4"/>}
                {userModal==="add"?"Create User":"Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ROLE MODAL ── */}
      {roleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={()=>setRoleModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">{roleModal==="add"?"Create Role":"Edit Role"}</h3>
              <button onClick={()=>setRoleModal(null)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-4 h-4"/></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Role Name (slug) *</label>
                  <input value={rName} onChange={e=>setRName(e.target.value.toLowerCase().replace(/\s/g,"_"))} placeholder="e.g. accounts_manager"
                    disabled={roleModal==="edit" && !!editRole?.is_system}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#F16265] disabled:bg-gray-50" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Display Label *</label>
                  <input value={rLabel} onChange={e=>setRLabel(e.target.value)} placeholder="e.g. Accounts Manager"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#F16265]" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Description</label>
                <input value={rDesc} onChange={e=>setRDesc(e.target.value)} placeholder="What can this role do?"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#F16265]" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {["#F16265","#3B82F6","#10B981","#8B5CF6","#F59E0B","#EF4444","#475569","#0891B2"].map(c=>(
                    <button key={c} onClick={()=>setRColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform ${rColor===c?"scale-125 ring-2 ring-offset-2 ring-gray-400":""}`}
                      style={{ background:c }} />
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-2 block">Permissions ({rPerms.length} selected)</label>
                <div className="space-y-3 max-h-64 overflow-y-auto border border-gray-100 rounded-xl p-3">
                  {permsGroups.map(grp=>(
                    <div key={grp.group}>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-sm">{grp.icon}</span>
                        <span className="text-xs font-bold text-gray-600">{grp.group}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 pl-4">
                        {grp.perms.map(p=>(
                          <label key={p} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded-lg p-1">
                            <div onClick={()=>togglePerm(p)}
                              className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border transition-colors cursor-pointer ${rPerms.includes(p)?"bg-[#F16265] border-[#F16265]":"border-gray-300"}`}>
                              {rPerms.includes(p) && <Check className="w-2.5 h-2.5 text-white" />}
                            </div>
                            <span className="text-xs text-gray-700">{allPerms[p]||p}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={()=>setRoleModal(null)} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={saveRole} disabled={saving||!rName||!rLabel}
                className="flex-1 py-2 bg-[#F16265] text-white rounded-xl text-sm font-medium hover:bg-[#D94F52] disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Check className="w-4 h-4"/>}
                {roleModal==="add"?"Create Role":"Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

function CleanupPanel({ authFetch }: { authFetch: any }) {
  const [running, setRunning] = useState(false)
  const [result,  setResult]  = useState<any>(null)
  const [opts, setOpts] = useState({
    old_scan_sessions: true, orphaned_attend: true,
    old_ai_sessions: false, ai_days: 30,
    old_activity_log: false, activity_days: 90,
  })

  const run = async () => {
    if (!confirm("Run data cleanup? This removes unused records permanently.")) return
    setRunning(true)
    try {
      const r = await authFetch("http://127.0.0.1:5000/api/admin/data-cleanup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(opts),
      })
      setResult(await r.json())
    } catch { setResult({ error: "Failed" }) }
    finally { setRunning(false) }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5 max-w-lg">
      <div>
        <h3 className="font-bold text-gray-900">Data Cleanup</h3>
        <p className="text-sm text-gray-500 mt-0.5">Remove unused records to keep the system fast. Only unused data is removed.</p>
      </div>
      <div className="space-y-3">
        {[
          ["old_scan_sessions", "Old ended attendance sessions (keeps all attendance records)"],
          ["orphaned_attend",   "Attendance records for deleted students"],
          ["old_ai_sessions",   `AI session history older than ${opts.ai_days} days`],
          ["old_activity_log",  `Activity log entries older than ${opts.activity_days} days`],
        ].map(([key, label]) => (
          <label key={key} className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={(opts as any)[key]} onChange={e => setOpts(o => ({...o, [key]: e.target.checked}))}
              className="mt-0.5 accent-[#F16265]" />
            <span className="text-sm text-gray-700">{label}</span>
          </label>
        ))}
      </div>
      <button onClick={run} disabled={running}
        className="w-full py-2.5 bg-[#F16265] text-white rounded-xl text-sm font-semibold hover:bg-[#D94F52] disabled:opacity-60 flex items-center justify-center gap-2">
        {running ? <><Loader2 className="w-4 h-4 animate-spin"/>Running...</> : "🧹 Run Cleanup Now"}
      </button>
      {result && (
        <div className={`rounded-xl p-3 text-sm ${result.error ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
          {result.error ? result.error : (
            <div>
              <p className="font-semibold">Cleanup complete!</p>
              {Object.entries(result.deleted || {}).map(([k,v]) => (
                <p key={k} className="text-xs mt-0.5">• {k.replace(/_/g," ")}: {String(v)} removed</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
