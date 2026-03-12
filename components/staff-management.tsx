"use client"

import { useEffect, useState, useCallback, memo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { UserPlus, Loader2, Edit, Trash2, X, KeyRound } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const API = "http://127.0.0.1:5000"

interface StaffMember { id: number; name: string }

interface StaffFormProps {
  name: string; onName: (v: string) => void
  password: string; onPassword: (v: string) => void
  onSubmit: (e: React.FormEvent) => void
  onClose: () => void
  isSaving: boolean
  isEdit: boolean
}

const StaffForm = memo(({ name, onName, password, onPassword, onSubmit, onClose, isSaving, isEdit }: StaffFormProps) => (
  <form onSubmit={onSubmit} className="space-y-4">
    <div className="space-y-2">
      <Label>Username</Label>
      <Input value={name} onChange={e => onName(e.target.value)} placeholder="Enter username" required={!isEdit} />
      {isEdit && <p className="text-xs text-muted-foreground">Leave blank to keep current username.</p>}
    </div>
    <div className="space-y-2">
      <Label>{isEdit ? "New Password" : "Password"}</Label>
      <Input type="password" value={password} onChange={e => onPassword(e.target.value)} placeholder={isEdit ? "Leave blank to keep current" : "Enter password"} required={!isEdit} />
      {isEdit && <p className="text-xs text-muted-foreground">Leave blank to keep current password.</p>}
    </div>
    <div className="flex gap-3 pt-2">
      <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
      <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90" disabled={isSaving}>
        {isSaving ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Saving...</span> : isEdit ? "Update User" : "Add Staff Member"}
      </Button>
    </div>
  </form>
))
StaffForm.displayName = "StaffForm"

export function StaffManagement() {
  const [staff, setStaff]         = useState<StaffMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isSaving, setIsSaving]   = useState(false)
  const [currentId, setCurrentId] = useState<number | null>(null)
  const [formName, setFormName]   = useState("")
  const [formPassword, setFormPassword] = useState("")
  const { toast } = useToast()

  useEffect(() => { fetchStaff() }, [])

  const fetchStaff = async () => {
    try {
      setIsLoading(true)
      const res = await fetch(`${API}/login/debug/users`).then(r=>r.json())
      setStaff(res)
    } catch (e) { console.error("Failed to fetch staff", e) }
    finally { setIsLoading(false) }
  }

  const openAddModal = useCallback(() => { setFormName(""); setFormPassword(""); setIsAddOpen(true) }, [])
  const openEditModal = useCallback((member: StaffMember) => {
    setCurrentId(member.id); setFormName(member.name); setFormPassword("")
    setIsEditOpen(true)
  }, [])
  const closeAll = useCallback(() => { setIsAddOpen(false); setIsEditOpen(false) }, [])

  const handleAdd = useCallback(async (e: React.FormEvent) => {
    e.preventDefault(); setIsSaving(true)
    try {
      await fetch(`${API}/login/add`, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ name: formName, password: formPassword })}).then(r=>r.json())
      toast({ title: "Staff Added", description: `${formName} can now log in.` })
      setIsAddOpen(false); fetchStaff()
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.response?.status === 409 ? "User already exists." : "Failed to add staff." })
    } finally { setIsSaving(false) }
  }, [formName, formPassword, toast])

  const handleUpdate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault(); if (!currentId) return; setIsSaving(true)
    try {
      const payload: any = {}
      if (formName.trim()) payload.name = formName.trim()
      if (formPassword.trim()) payload.password = formPassword.trim()
      await fetch(`${API}/login/users/${currentId}`, {method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)}).then(r=>r.json())
      toast({ title: "User Updated" })
      setIsEditOpen(false); fetchStaff()
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.response?.status === 409 ? "Username already exists." : "Failed to update user." })
    } finally { setIsSaving(false) }
  }, [currentId, formName, formPassword, toast])

  const handleDelete = useCallback(async (id: number, memberName: string) => {
    if (!confirm(`Remove staff member "${memberName}"? This cannot be undone.`)) return
    try {
      await fetch(`${API}/login/users/${id}`, {method:"DELETE"}).then(r=>r.json())
      toast({ title: "User Removed", description: `${memberName} has been deleted.` })
      setStaff(prev => prev.filter(s => s.id !== id))
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to delete user." })
    }
  }, [toast])

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Manage Staff Users</CardTitle>
        <Button onClick={openAddModal} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <UserPlus className="w-4 h-4 mr-2" />Add Staff
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground font-medium">
                <tr>
                  <th className="h-11 px-4 align-middle">Username</th>
                  <th className="h-11 px-4 align-middle">Role</th>
                  <th className="h-11 px-4 align-middle">Status</th>
                  <th className="h-11 px-4 align-middle text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">No staff members found.</td></tr>
                ) : staff.map((member) => (
                  <tr key={member.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="p-4 align-middle font-medium">{member.name}</td>
                    <td className="p-4 align-middle"><span className="px-2 py-1 rounded text-xs bg-primary/10 text-primary">Staff</span></td>
                    <td className="p-4 align-middle"><span className="px-2 py-1 rounded text-xs bg-green-500/10 text-green-600">Active</span></td>
                    <td className="p-4 align-middle text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary" onClick={() => openEditModal(member)} title="Edit user">
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => handleDelete(member.id, member.name)} title="Delete user">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-sm shadow-2xl bg-background border-border relative m-4">
            <Button variant="ghost" size="icon" className="absolute right-2 top-2 text-muted-foreground" onClick={closeAll}><X className="h-4 w-4" /></Button>
            <CardHeader><CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" />Add New Staff Member</CardTitle></CardHeader>
            <CardContent>
              <StaffForm name={formName} onName={setFormName} password={formPassword} onPassword={setFormPassword} onSubmit={handleAdd} onClose={closeAll} isSaving={isSaving} isEdit={false} />
            </CardContent>
          </Card>
        </div>
      )}

      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-sm shadow-2xl bg-background border-border relative m-4">
            <Button variant="ghost" size="icon" className="absolute right-2 top-2 text-muted-foreground" onClick={closeAll}><X className="h-4 w-4" /></Button>
            <CardHeader><CardTitle className="flex items-center gap-2"><Edit className="h-5 w-5" />Edit Staff Member</CardTitle></CardHeader>
            <CardContent>
              <StaffForm name={formName} onName={setFormName} password={formPassword} onPassword={setFormPassword} onSubmit={handleUpdate} onClose={closeAll} isSaving={isSaving} isEdit={true} />
            </CardContent>
          </Card>
        </div>
      )}
    </Card>
  )
}
