import { useRef, useState } from 'react'
import { Camera } from 'lucide-react'
import DogAvatar from './DogAvatar'
import { fileToDogPhotoDataUrl } from '../../utils/dogPhoto'

/** Tappable profile avatar — pick a photo, preview in place. Commits via parent Save. */
export default function DogPhotoPicker({
  name = '',
  photoUrl = '',
  initials = '',
  onChange,
  onError,
}) {
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)

  const label = photoUrl ? 'Change photo' : 'Add photo'

  function openPicker() {
    if (busy) return
    onError?.('')
    inputRef.current?.click()
  }

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setBusy(true)
    onError?.('')
    try {
      const nextUrl = await fileToDogPhotoDataUrl(file)
      onChange?.(nextUrl)
    } catch (err) {
      onError?.(err?.message || "Couldn't use that photo.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={openPicker}
        disabled={busy}
        aria-label={label}
        aria-busy={busy}
        className="relative rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F59E0B] focus-visible:outline-offset-2 disabled:opacity-60"
      >
        <DogAvatar name={name} photoUrl={photoUrl} initials={initials} size="md" />
        <span
          className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#F59E0B] text-white shadow-sm"
          aria-hidden
        >
          <Camera size={12} strokeWidth={2.5} />
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        onChange={handleFile}
      />
    </div>
  )
}
