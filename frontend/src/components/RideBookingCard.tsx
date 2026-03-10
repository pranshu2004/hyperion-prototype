import * as React from "react"
import { Input } from "./ui/input"
import { Button } from "./ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "./ui/card"
import { MapPlaceholder } from "./MapPlaceholder"
import { RideOptionsSelector } from "./RideOptionsSelector"

interface RideBookingCardProps {
  onBook: (pickup: string, destination: string) => void
  isLoading: boolean
}

export function RideBookingCard({ onBook, isLoading }: RideBookingCardProps) {
  const [pickup, setPickup] = React.useState("IIT Kharagpur")
  const [destination, setDestination] = React.useState("Kharagpur Railway Station")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onBook(pickup, destination)
  }

  return (
    <Card className="w-full max-w-md mx-auto overflow-hidden border-0 sm:border sm:border-gray-200 shadow-xl sm:shadow-2xl">
      <CardHeader className="bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-t-xl sm:rounded-t-none pb-8 pt-8">
        <CardTitle className="text-2xl font-bold">Book a Ride</CardTitle>
        <CardDescription className="text-gray-300">Get to your destination quickly and safely.</CardDescription>
      </CardHeader>
      
      <div className="px-6 -mt-4 relative z-10">
        <MapPlaceholder />
      </div>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6 pt-6">
          <div className="space-y-4 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
            
            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className="flex items-center justify-center w-8 h-8 rounded-full border border-gray-300 bg-white text-gray-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-slate-200 z-10">
                <div className="w-2.5 h-2.5 bg-gray-900 rounded-full" />
              </div>
              <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] ml-3">
                <Input 
                  placeholder="Pickup Location" 
                  value={pickup} 
                  onChange={(e) => setPickup(e.target.value)}
                  disabled={isLoading}
                  className="bg-gray-50"
                  required
                />
              </div>
            </div>

            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className="flex items-center justify-center w-8 h-8 rounded-full border border-gray-300 bg-white text-gray-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-slate-200 z-10">
                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-900"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              </div>
              <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] ml-3">
                <Input 
                  placeholder="Destination" 
                  value={destination} 
                  onChange={(e) => setDestination(e.target.value)}
                  disabled={isLoading}
                  className="bg-gray-50"
                  required
                />
              </div>
            </div>

          </div>

          <div className="h-px bg-gray-100 my-6" />
          
          <RideOptionsSelector />
          
        </CardContent>
        <CardFooter className="pb-6">
          <Button 
            type="submit" 
            className="w-full text-lg h-12 bg-gray-900 hover:bg-gray-800 transition-all font-semibold" 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Finding available drivers...
              </>
            ) : (
              "BOOK RIDE"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
