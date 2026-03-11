"use client"
import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Upload, Download, Save, Trash2, Loader2, FileSpreadsheet, AlertTriangle, CheckCircle } from "lucide-react"

const API = "http://127.0.0.1:5000"

interface ValidationResult { issues:any[]; issue_count:number; rows:number; columns:number[]; is_clean:boolean }
interface CleanResult     { cleaned_csv:string; changes_made:number; audit:any[]; original_rows:number; cleaned_rows:number }
interface DataFile        { name:string; size:number; modified:number }

export default function CSVUploadPage() {
  const [step,       setStep]       = useState<"upload"|"validate"|"clean">("upload")
  const [rawCSV,     setRawCSV]     = useState("")
  const [filename,   setFilename]   = useState("")
  const [validation, setValidation] = useState<ValidationResult|null>(null)
  const [cleanResult,setClean]      = useState<CleanResult|null>(null)
  const [dataFiles,  setDataFiles]  = useState<DataFile[]>([])
  const [loading,    setLoading]    = useState(false)
  const [msg,        setMsg]        = useState("")
  const [saveName,   setSaveName]   = useState("")

  const flash = (m:string) => { setMsg(m); setTimeout(()=>setMsg(""),5000) }

  const fetchFiles = async () => {
    try {
      const r = await fetch(`${API}/api/data/files`)
      const d = await r.json()
      setDataFiles(d.files||[])
    } catch {}
  }

  useEffect(() => { fetchFiles() }, [])

  const handleFile = async (file: File) => {
    if (!file.name.endsWith(".csv")) { flash("⚠ Please upload a .csv file"); return }
    setFilename(file.name); setSaveName(file.name.replace(".csv",""))
    const text = await file.text()
    setRawCSV(text); setValidation(null); setClean(null); setStep("validate")
    setLoading(true)
    try {
      const r = await fetch(`${API}/api/csv/validate`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ csv_text:text })
      })
      const d = await r.json()
      setValidation(d)
    } catch { flash("⚠ Cannot connect to server") }
    finally { setLoading(false) }
  }

  const autoClean = async () => {
    if (!rawCSV) return
    setLoading(true)
    try {
      const r = await fetch(`${API}/api/csv/clean`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ csv_text:rawCSV })
      })
      const d = await r.json()
      if (d.error) flash(`⚠ ${d.error}`)
      else { setClean(d); setStep("clean") }
    } catch { flash("⚠ Cannot connect") }
    finally { setLoading(false) }
  }

  const downloadClean = async () => {
    if (!cleanResult) return
    const blob = new Blob([cleanResult.cleaned_csv], { type:"text/csv" })
    const a    = document.createElement("a")
    a.href     = URL.createObjectURL(blob)
    a.download = filename.replace(".csv","_cleaned.csv")
    a.click()
  }

  const saveToServer = async () => {
    const name = saveName.trim() || filename.replace(".csv","")
    const text = cleanResult ? cleanResult.cleaned_csv : rawCSV
    if (!text) { flash("⚠ No data to save"); return }
    try {
      await fetch(`${API}/api/data/save`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ filename:name, csv_text:text })
      })
      flash(`✅ Saved as ${name}.csv`); fetchFiles()
    } catch { flash("⚠ Could not save") }
  }

  const loadFile = async (fname: string) => {
    try {
      const r = await fetch(`${API}/api/data/load/${fname}`)
      const d = await r.json()
      if (d.csv_text) {
        setRawCSV(d.csv_text); setFilename(fname); setSaveName(fname.replace(".csv",""))
        setValidation(null); setClean(null); setStep("validate")
        setLoading(true)
        const r2 = await fetch(`${API}/api/csv/validate`, {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ csv_text:d.csv_text })
        })
        const d2 = await r2.json()
        setValidation(d2); setLoading(false)
        flash(`✅ Loaded ${fname}`)
      }
    } catch { flash("⚠ Cannot load file") }
  }

  const deleteFile = async (fname: string) => {
    if (!confirm(`Delete ${fname}?`)) return
    try {
      await fetch(`${API}/api/data/delete/${fname}`, { method:"DELETE" })
      flash(`✅ ${fname} deleted`); fetchFiles()
    } catch { flash("⚠ Could not delete") }
  }

  const downloadSample = (fname: string) => {
    window.open(`${API}/api/sample-data/${fname}`, "_blank")
  }

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CSV Upload & Cleaner</h1>
          <p className="text-gray-500 text-sm">Upload, validate, auto-clean, and manage your data files</p>
        </div>

        {msg && <div className={`px-4 py-3 rounded-xl text-sm font-medium ${msg.startsWith("✅") ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>{msg}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left: Upload + Files */}
          <div className="space-y-4">
            {/* Upload zone */}
            <label className="block bg-white rounded-2xl border-2 border-dashed border-gray-200 p-8 text-center cursor-pointer hover:border-[#F16265]/50 hover:bg-[#F16265]/3 transition-all group">
              <Upload className="w-8 h-8 text-gray-300 group-hover:text-[#F16265] mx-auto mb-3 transition-colors" />
              <p className="font-medium text-gray-700 text-sm">Drop a CSV file or click to browse</p>
              <p className="text-xs text-gray-400 mt-1">Supports student, staff, expense data</p>
              <input type="file" accept=".csv" className="hidden" onChange={e=>e.target.files?.[0] && handleFile(e.target.files[0])} />
            </label>

            {/* Sample downloads */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Sample Files</p>
              {["students_data.csv","staff_data.csv","expenses_data.csv","placements_data.csv"].map(f=>(
                <button key={f} onClick={()=>downloadSample(f)}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded-lg text-sm text-gray-600 transition-colors text-left">
                  <FileSpreadsheet className="w-4 h-4 text-green-500" /> {f}
                  <Download className="w-3.5 h-3.5 ml-auto text-gray-300" />
                </button>
              ))}
            </div>

            {/* Saved files */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Saved Files ({dataFiles.length})</p>
              {dataFiles.length === 0 ? <p className="text-xs text-gray-400">No files saved yet</p> :
                dataFiles.map(f=>(
                  <div key={f.name} className="flex items-center gap-2 py-2 hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors">
                    <FileSpreadsheet className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <button onClick={()=>loadFile(f.name)} className="text-sm text-gray-700 flex-1 text-left truncate hover:text-[#F16265]">{f.name}</button>
                    <span className="text-[10px] text-gray-400">{Math.round(f.size/1024)}KB</span>
                    <button onClick={()=>deleteFile(f.name)} className="p-1 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              }
            </div>
          </div>

          {/* Right: Validation + Clean results */}
          <div className="lg:col-span-2 space-y-4">
            {step==="upload" && !rawCSV && (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <FileSpreadsheet className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-400">Upload a CSV file to validate and clean it</p>
              </div>
            )}

            {loading && (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 flex items-center justify-center gap-3 text-gray-500">
                <Loader2 className="w-5 h-5 animate-spin text-[#F16265]" /> Analyzing CSV...
              </div>
            )}

            {validation && !loading && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center gap-3 mb-4">
                  {validation.is_clean
                    ? <CheckCircle className="w-6 h-6 text-green-500" />
                    : <AlertTriangle className="w-6 h-6 text-amber-500" />
                  }
                  <div>
                    <h3 className="font-bold text-gray-900">{filename}</h3>
                    <p className="text-xs text-gray-500">{validation.rows} rows · {validation.issue_count} issues found</p>
                  </div>
                  <div className="ml-auto flex gap-2">
                    {!validation.is_clean && (
                      <button onClick={autoClean}
                        className="px-3 py-1.5 bg-[#F16265] text-white rounded-xl text-xs font-semibold hover:bg-[#D94F52] transition-colors flex items-center gap-1.5">
                        ✨ Auto-Clean
                      </button>
                    )}
                    <button onClick={saveToServer} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-200 transition-colors flex items-center gap-1.5">
                      <Save className="w-3.5 h-3.5" /> Save
                    </button>
                  </div>
                </div>

                {validation.is_clean ? (
                  <div className="bg-green-50 text-green-700 rounded-xl p-4 text-sm">✅ This CSV looks clean! No issues found.</div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {validation.issues.map((issue:any,i:number)=>(
                      <div key={i} className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-100 rounded-xl text-xs">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-medium text-amber-800">Row {issue.row}, {issue.column}:</span>
                          <span className="text-amber-700 ml-1">{issue.description}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {cleanResult && !loading && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                  <div>
                    <h3 className="font-bold text-gray-900">✨ Auto-Clean Complete!</h3>
                    <p className="text-xs text-gray-500">{cleanResult.changes_made} fixes applied · {cleanResult.original_rows}→{cleanResult.cleaned_rows} rows</p>
                  </div>
                  <div className="ml-auto flex gap-2">
                    <button onClick={downloadClean}
                      className="px-3 py-1.5 bg-green-500 text-white rounded-xl text-xs font-semibold hover:bg-green-600 transition-colors flex items-center gap-1.5">
                      <Download className="w-3.5 h-3.5" /> Download
                    </button>
                    <div className="flex items-center gap-1.5">
                      <input value={saveName} onChange={e=>setSaveName(e.target.value)}
                        className="border border-gray-200 rounded-xl px-2 py-1 text-xs w-32 outline-none" placeholder="filename" />
                      <button onClick={saveToServer}
                        className="px-3 py-1.5 bg-[#F16265] text-white rounded-xl text-xs font-semibold hover:bg-[#D94F52] transition-colors flex items-center gap-1.5">
                        <Save className="w-3.5 h-3.5" /> Save
                      </button>
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {cleanResult.audit.map((a:any,i:number)=>(
                    <div key={i} className="flex items-start gap-2 text-xs text-gray-600">
                      <span className="text-green-500">✓</span> {a}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
