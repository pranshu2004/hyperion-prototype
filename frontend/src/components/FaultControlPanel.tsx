"use client"

import * as React from "react"

type FaultMode = "normal" | "driver_failure" | "payment_latency" | "db_failure"

export function FaultControlPanel() {
  const [mode, setMode] = React.useState<FaultMode>("normal")
  const [isMinimized, setIsMinimized] = React.useState(false)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  
  const clearError = () => {
    if (errorMsg) setErrorMsg(null)
  }

  React.useEffect(() => {
    // Fetch initial fault state from API Gateway on mount
    const fetchState = async () => {
      try {
        const response = await fetch("http://localhost:8000/fault-state")
        if (response.ok) {
          const data = await response.json()
          if (data.fault_mode) {
            setMode(data.fault_mode as FaultMode)
          }
        }
      } catch (e) {
        console.error("Failed to fetch initial fault state API", e)
      }
    }
    fetchState()
  }, [])

  const handleReset = async () => {
    clearError()
    try {
      const response = await fetch("http://localhost:8000/reset-faults", {
        method: "POST"
      })
      if (response.ok) {
        setMode("normal")
      } else {
        setErrorMsg("Failed to reset system faults.")
      }
    } catch (e) {
      console.error(e)
      setErrorMsg("Network error trying to contact API gateway.")
    }
  }

  const handleInject = async (targetFault: FaultMode) => {
    if (targetFault === "normal") {
      return handleReset()
    }
    
    clearError()
    try {
      const response = await fetch("http://localhost:8000/inject-fault", {
         method: "POST",
         headers: {
           "Content-Type": "application/json"
         },
         body: JSON.stringify({ fault: targetFault })
      })
      if (response.ok) {
        setMode(targetFault)
      } else {
        setErrorMsg(`Failed to inject ${targetFault}.`)
      }
    } catch (e) {
       console.error(e)
       setErrorMsg("Network error trying to contact API gateway.")
    }
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button 
          onClick={() => setIsMinimized(false)}
          className="bg-gray-950 text-emerald-400 hover:bg-gray-900 border border-gray-800 shadow-xl rounded-full p-4 flex items-center gap-2 transition-all font-mono text-sm shadow-black/40"
          title="Open Fault Control Panel"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
          <span className="hidden sm:inline">
            <span className="text-gray-400">Mode:</span> {mode}
          </span>
        </button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-full max-w-sm">
      <div className="bg-gray-950 border border-gray-800 rounded-xl shadow-2xl overflow-hidden shadow-black/50 text-gray-300 font-mono text-sm flex flex-col">
        
        {/* Header bar */}
        <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between cursor-default">
          <div className="flex items-center gap-2 text-gray-100 font-semibold tracking-tight">
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
             SYSTEM FAULT CONTROL
          </div>
          <button 
            onClick={() => setIsMinimized(true)}
            className="text-gray-500 hover:text-white transition-colors p-1"
            title="Minimize Dashboard"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/></svg>
          </button>
        </div>

        {/* Status Indicator */}
        <div className="px-4 py-3 bg-black/40 border-b border-gray-800/60 flex flex-col gap-1 text-xs">
           <div className="flex justify-between items-center text-gray-500">
             <span>ACTIVE FAULT:</span>
             <span className={`${mode === 'normal' ? 'text-emerald-500' : 'text-red-400'} font-bold px-2 py-0.5 rounded bg-white/5 border border-white/10 uppercase tracking-wider`}>
               {mode}
             </span>
           </div>
        </div>

        {/* Controls */}
        <div className="p-4 flex flex-col gap-2">
          <p className="text-gray-500 text-xs mb-1">INJECTION TARGETS</p>

          <button 
            onClick={() => handleInject("normal")}
            className={`text-left px-3 py-2.5 rounded border transition-all flex items-center justify-between ${mode === 'normal' ? 'bg-emerald-950/30 border-emerald-900/50 text-emerald-400' : 'bg-gray-900/50 border-gray-800 hover:border-gray-700 hover:bg-gray-800 text-gray-400'}`}
          >
            <span>Normal System</span>
            {mode === 'normal' && <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />}
          </button>
          
          <button 
            onClick={() => handleInject("driver_failure")}
            className={`text-left px-3 py-2.5 rounded border transition-all flex items-center justify-between ${mode === 'driver_failure' ? 'bg-red-950/30 border-red-900/50 text-red-400' : 'bg-gray-900/50 border-gray-800 hover:border-gray-700 hover:bg-gray-800 text-gray-400'}`}
          >
            <span>Driver Matching Failure</span>
            {mode === 'driver_failure' && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />}
          </button>

          <button 
            onClick={() => handleInject("payment_latency")}
            className={`text-left px-3 py-2.5 rounded border transition-all flex items-center justify-between ${mode === 'payment_latency' ? 'bg-amber-950/30 border-amber-900/50 text-amber-500' : 'bg-gray-900/50 border-gray-800 hover:border-gray-700 hover:bg-gray-800 text-gray-400'}`}
          >
            <span>Payment Latency</span>
            {mode === 'payment_latency' && <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.8)]" />}
          </button>
          
          <button 
            onClick={() => handleInject("db_failure")}
            className={`text-left px-3 py-2.5 rounded border transition-all flex items-center justify-between ${mode === 'db_failure' ? 'bg-rose-950/30 border-rose-900/50 text-rose-500' : 'bg-gray-900/50 border-gray-800 hover:border-gray-700 hover:bg-gray-800 text-gray-400'}`}
          >
            <span>Database Failure</span>
            {mode === 'db_failure' && <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.8)]" />}
          </button>
        </div>

        {/* Error Toast area */}
        {errorMsg && (
          <div className="mx-4 mb-4 px-3 py-2 bg-red-950/50 text-red-400 text-xs border border-red-900/50 rounded flex justify-between items-center">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="hover:text-red-200">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
