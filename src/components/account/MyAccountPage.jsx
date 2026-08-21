import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import { Field, fieldClassName } from '../ui/Field'
import { useApp } from '../../context/AppContext'
import { EMPTY_OWNER_ACCOUNT } from '../../utils/storage'
import DogPhotoPicker from '../profile/DogPhotoPicker'
import { initialsFromName } from '../profile/DogAvatar'
import { track } from '../../analytics'

/** Owner contact details that seed Care contacts on the Trip tab */
export default function MyAccountPage({ onBack }) {
  const { ownerAccount, dispatch } = useApp()
  const [form, setForm] = useState({
    ...EMPTY_OWNER_ACCOUNT,
    ...(ownerAccount ?? {}),
  })
  const [savedFlash, setSavedFlash] = useState(false)
  const [photoError, setPhotoError] = useState('')

  useEffect(() => {
    setForm({ ...EMPTY_OWNER_ACCOUNT, ...(ownerAccount ?? {}) })
    setPhotoError('')
  }, [ownerAccount])

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleSave(e) {
    e.preventDefault()
    dispatch({
      type: 'SET_OWNER_ACCOUNT',
      payload: {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        photoUrl: form.photoUrl ?? '',
      },
    })
    track('save_account', {
      has_name: form.name.trim() ? 'Yes' : 'No',
      has_phone: form.phone.trim() ? 'Yes' : 'No',
      has_email: form.email.trim() ? 'Yes' : 'No',
      has_photo: form.photoUrl ? 'Yes' : 'No',
    })
    setSavedFlash(true)
    window.setTimeout(() => setSavedFlash(false), 1600)
  }

  const accountInitials = initialsFromName(form.name) || 'ME'

  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-[#FBF9F5] pb-8">
      <header className="flex items-start gap-3 px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
        <button
          type="button"
          className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-amber-200 bg-white text-slate-700 shadow-sm hover:bg-amber-50"
          aria-label="Back"
          onClick={onBack}
        >
          <ArrowLeft size={22} strokeWidth={2.5} />
        </button>
        <div>
          <p className="text-2xl font-extrabold tracking-tight text-[#F59E0B]">
            My Account
          </p>
          <p className="mt-0.5 text-sm text-slate-500">
            Your contact details for care sheets
          </p>
        </div>
      </header>

      <main className="space-y-4 px-4">
        <Card>
          <div className="flex items-start gap-3">
            <DogPhotoPicker
              name={form.name}
              photoUrl={form.photoUrl}
              initials={accountInitials}
              onChange={(photoUrl) => {
                update('photoUrl', photoUrl)
                setPhotoError('')
              }}
              onError={setPhotoError}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-500">
                Saved here and filled into Care contacts for every pup on the
                Trip planner.
              </p>
              {form.photoUrl ? (
                <button
                  type="button"
                  className="mt-1 text-xs font-semibold text-slate-400 hover:text-slate-600"
                  onClick={() => {
                    update('photoUrl', '')
                    setPhotoError('')
                  }}
                >
                  Remove photo
                </button>
              ) : null}
              {photoError ? (
                <p className="mt-1 text-xs text-red-500" role="alert">
                  {photoError}
                </p>
              ) : null}
            </div>
          </div>

          <form className="mt-4 space-y-3" onSubmit={handleSave}>
            <Field label="Name" htmlFor="account-name">
              <input
                id="account-name"
                className={fieldClassName}
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="Alex"
                autoComplete="name"
              />
            </Field>
            <Field label="Phone number" htmlFor="account-phone">
              <input
                id="account-phone"
                className={fieldClassName}
                type="tel"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                placeholder="555-0100"
                autoComplete="tel"
              />
            </Field>
            <Field label="Email address" htmlFor="account-email">
              <input
                id="account-email"
                className={fieldClassName}
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                placeholder="alex@example.com"
                autoComplete="email"
              />
            </Field>

            <Button type="submit" className="w-full">
              {savedFlash ? 'Account saved' : 'Save account'}
            </Button>
          </form>
        </Card>
      </main>
    </div>
  )
}
