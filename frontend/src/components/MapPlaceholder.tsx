import * as React from "react"

export function MapPlaceholder() {
  return (
    <div className="w-full h-48 bg-gray-100 rounded-xl overflow-hidden relative border border-gray-200 shadow-inner">
      <iframe
        width="100%"
        height="100%"
        style={{ border: 0 }}
        src="https://www.openstreetmap.org/export/embed.html?bbox=87.27,22.30,87.35,22.35&amp;layer=mapnik"
        allowFullScreen
        title="Interactive Map"
        className="w-full h-full"
      ></iframe>
      <div className="absolute top-2 right-2 px-2 py-1 bg-white/90 backdrop-blur-sm shadow-sm border border-gray-200 rounded text-xs font-semibold text-gray-700 pointer-events-none z-10">
        Live Region
      </div>
    </div>
  )
}
