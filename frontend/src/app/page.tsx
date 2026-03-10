"use client"

import * as React from "react"
import { RideBookingCard } from "@/components/RideBookingCard"
import { RideConfirmationCard } from "@/components/RideConfirmationCard"
import { ErrorStateCard } from "@/components/ErrorStateCard"
import { FaultControlPanel } from "@/components/FaultControlPanel"

export default function Home() {
  const [status, setStatus] = React.useState<"INPUT" | "LOADING" | "SUCCESS" | "ERROR">("INPUT")
  
  // Success state data
  const [rideData, setRideData] = React.useState<{ driverName: string; price: number } | null>(null)

  const handleBookRide = async (pickup: string, destination: string) => {
    setStatus("LOADING")
    
    try {
      const response = await fetch("http://localhost:8000/book-ride", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pickup,
          destination
        }),
      })

      if (!response.ok) {
        throw new Error("API responded with an error")
      }

      const data = await response.json()
      
      // Handle the exact response JSON format:
      // { "ride_id": "...", "status": "...", "driver": { "driver_id": "...", "driver_name": "..." }, "price": ... }
      if (data && data.driver && data.price) {
        setRideData({
          driverName: data.driver.driver_name || "Unknown Driver",
          price: data.price
        })
        setStatus("SUCCESS")
      } else {
        throw new Error("Unexpected response format")
      }
      
    } catch (error) {
      console.error("Booking failed:", error)
      setStatus("ERROR")
    }
  }

  const resetState = () => {
    setStatus("INPUT")
    setRideData(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 selection:bg-gray-900 selection:text-white">
      <div className="w-full max-w-md">
        
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-900 text-white rounded-xl mb-4 shadow-lg shadow-gray-900/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a2 2 0 0 0-1.6-.8H8.3a2 2 0 0 0-1.6.8L4 11l-5.16.86a1 1 0 0 0-.84.99V16h3"/><circle cx="6.5" cy="16.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/></svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">RideShare</h1>
          <p className="text-gray-500 mt-1">Get wherever you need to go</p>
        </div>

        <div className="relative">
          <div className={`transition-all duration-300 ease-in-out ${status === "INPUT" || status === "LOADING" ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 md:scale-100 hidden"}`}>
            {(status === "INPUT" || status === "LOADING") && (
              <RideBookingCard onBook={handleBookRide} isLoading={status === "LOADING"} />
            )}
          </div>
          
          {status === "SUCCESS" && rideData && (
            <div className="animate-in fade-in zoom-in-95 duration-300">
              <RideConfirmationCard driverName={rideData.driverName} price={rideData.price} onReset={resetState} />
            </div>
          )}
          
          {status === "ERROR" && (
            <div className="animate-in fade-in zoom-in-95 duration-300">
              <ErrorStateCard onRetry={resetState} />
            </div>
          )}
        </div>

      </div>
      
      {/* SRE Demo Tools */}
      <FaultControlPanel />
      
    </div>
  )
}
