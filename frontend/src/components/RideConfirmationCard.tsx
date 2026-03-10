import * as React from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./ui/card"
import { Button } from "./ui/button"

interface RideConfirmationCardProps {
  driverName: string
  price: number
  onReset: () => void
}

export function RideConfirmationCard({ driverName, price, onReset }: RideConfirmationCardProps) {
  return (
    <Card className="w-full max-w-md mx-auto overflow-hidden border-0 sm:border sm:border-gray-200 shadow-xl sm:shadow-2xl">
      <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white pb-8 pt-8 rounded-t-xl sm:rounded-t-none text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-10 rounded-full blur-xl"></div>
        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-32 h-32 bg-white opacity-10 rounded-full blur-xl"></div>
        
        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm shadow-inner relative z-10">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <CardTitle className="text-3xl font-bold relative z-10">Ride Confirmed!</CardTitle>
        <CardDescription className="text-emerald-50 text-lg mt-2 relative z-10">Your driver is on the way.</CardDescription>
      </CardHeader>
      
      <CardContent className="pt-8 space-y-6">
        <div className="flex bg-gray-50 rounded-xl p-4 border border-gray-100 items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Driver</p>
              <p className="font-bold text-gray-900 text-lg">{driverName}</p>
            </div>
          </div>
          <div className="text-right">
             <div className="flex items-center gap-1 text-yellow-500 justify-end">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                <span className="font-bold text-sm text-gray-700">4.9</span>
             </div>
             <p className="text-xs text-gray-400">Rating</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
            <p className="text-sm text-gray-500 font-medium mb-1">Vehicle</p>
            <p className="font-semibold text-gray-900 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a2 2 0 0 0-1.6-.8H8.3a2 2 0 0 0-1.6.8L4 11l-5.16.86a1 1 0 0 0-.84.99V16h3"/><circle cx="6.5" cy="16.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/></svg>
              Swift
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
            <p className="text-sm text-gray-500 font-medium mb-1">ETA</p>
            <p className="font-semibold text-gray-900 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              3 minutes
            </p>
          </div>
        </div>
        
        <div className="flex justify-between items-center py-4 border-t border-gray-100">
          <span className="text-gray-600 font-medium">Total Fare</span>
          <span className="text-2xl font-bold text-gray-900">₹{price}</span>
        </div>
      </CardContent>
      <CardFooter className="pb-6 pt-0">
        <Button variant="outline" className="w-full text-gray-600 border-gray-200" onClick={onReset}>
          Book Another Ride
        </Button>
      </CardFooter>
    </Card>
  )
}
