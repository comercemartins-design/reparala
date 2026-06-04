'use client'

import { useEffect } from 'react'

interface Props {
  url: string
  onClose: () => void
}

export default function Lightbox({ url, onClose }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white text-3xl font-bold hover:text-gray-300 transition z-10"
        aria-label="Fechar"
      >
        ×
      </button>
      <img
        src={url}
        alt="Foto"
        className="max-w-[90vw] max-h-[90vh] rounded-2xl shadow-2xl object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}
