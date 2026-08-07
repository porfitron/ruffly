import { useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { useApp } from '../../context/AppContext'

/** False-door Pro teaser for multi-dog */
export default function ProTeaserModal() {
  const { proTeaser, dispatch } = useApp()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState(proTeaser.userEmail ?? '')

  function handleAddDogClick() {
    dispatch({ type: 'MARK_ADD_DOG_TEASER' })
    setOpen(true)
  }

  function handleSubmit(e) {
    e.preventDefault()
    dispatch({ type: 'SET_PRO_EMAIL', payload: email.trim() || null })
    setOpen(false)
  }

  return (
    <>
      <Button variant="secondary" className="w-full" onClick={handleAddDogClick}>
        + Add another dog
      </Button>

      <Modal
        open={open}
        title="Ruffly Pro is coming soon!"
        onClose={() => setOpen(false)}
      >
        <p className="text-sm text-slate-500">
          Managing a multi-pup pack? Join the waitlist and we&apos;ll bark when
          Pro launches.
        </p>
        <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
          <label className="block text-left text-sm font-medium text-slate-700">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1 h-12 w-full rounded-2xl border border-amber-200 bg-[#FBF9F5] px-4 outline-none focus:border-[#F59E0B]"
            />
          </label>
          <Button type="submit" className="w-full">
            Join waitlist
          </Button>
        </form>
      </Modal>
    </>
  )
}
