import * as React from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./ui/card"
import { Button } from "./ui/button"

interface ErrorStateCardProps {
  onRetry: () => void
}

export function ErrorStateCard({ onRetry }: ErrorStateCardProps) {
  return (
    <Card className="w-full max-w-md mx-auto overflow-hidden border-0 sm:border border-red-100 shadow-xl shadow-red-900/5">
      <CardHeader className="bg-red-50 text-red-900 pb-6 pt-8 text-center border-b border-red-100">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
        <CardTitle className="text-2xl font-bold">Booking Failed</CardTitle>
        <CardDescription className="text-red-700/80 mt-2 text-base">
          Unable to book ride. Please try again later.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-8 pb-4">
        <div className="text-sm text-gray-500 text-center space-y-2">
          <p>We couldn't connect to our drivers right now. This might be due to high demand or network issues.</p>
        </div>
      </CardContent>
      <CardFooter className="pb-8">
        <Button 
          onClick={onRetry}
          className="w-full bg-red-600 hover:bg-red-700 text-lg h-12"
        >
          Try Again
        </Button>
      </CardFooter>
    </Card>
  )
}
