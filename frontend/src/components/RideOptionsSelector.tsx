import * as React from "react"

interface RideOption {
  id: string
  name: string
  time: string
  priceMultiplier: number
  icon: React.ReactNode
}

const options: RideOption[] = [
  {
    id: "mini",
    name: "Mini",
    time: "3 min",
    priceMultiplier: 1,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a2 2 0 0 0-1.6-.8H8.3a2 2 0 0 0-1.6.8L4 11l-5.16.86a1 1 0 0 0-.84.99V16h3"/><circle cx="6.5" cy="16.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/></svg>
    ),
  },
  {
    id: "sedan",
    name: "Sedan",
    time: "5 min",
    priceMultiplier: 1.5,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
    ),
  },
  {
    id: "suv",
    name: "SUV",
    time: "8 min",
    priceMultiplier: 2,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a2 2 0 0 0-1.6-.8H8.3a2 2 0 0 0-1.6.8L4 11l-5.16.86a1 1 0 0 0-.84.99V16h3"/><circle cx="6.5" cy="16.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/><path d="M12 7v4"/><path d="M8 7v4"/><path d="M16 7v4"/></svg>
    ),
  }
]

export function RideOptionsSelector() {
  const [selected, setSelected] = React.useState<string>("mini")

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-900">Choose a ride</h3>
      <div className="grid grid-cols-1 gap-3">
        {options.map((opt) => (
          <div
            key={opt.id}
            onClick={() => setSelected(opt.id)}
            className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
              selected === opt.id 
                ? "border-gray-900 bg-gray-50 ring-1 ring-gray-900" 
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="text-gray-700">{opt.icon}</div>
              <div>
                <div className="font-medium text-gray-900">{opt.name}</div>
                <div className="text-xs text-gray-500">{opt.time} away</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
