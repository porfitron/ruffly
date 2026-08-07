import { X } from 'lucide-react'
import Button from './Button'

export default function Modal({ open, title, children, onClose }) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-white p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 id="modal-title" className="text-lg font-bold text-slate-800">
            {title}
          </h2>
          <Button
            variant="ghost"
            className="h-10 w-10 !rounded-full px-0"
            aria-label="Close"
            onClick={onClose}
          >
            <X size={18} />
          </Button>
        </div>
        {children}
      </div>
    </div>
  )
}
