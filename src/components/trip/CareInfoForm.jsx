import { useEffect, useState } from 'react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import { Field, fieldClassName } from '../ui/Field'
import { useApp } from '../../context/AppContext'
import { EMPTY_CARE_INFO, EMPTY_OWNER_ACCOUNT } from '../../utils/storage'

function careInfoHasContent(careInfo) {
  if (!careInfo) return false
  return Object.values(careInfo).some(
    (value) => typeof value === 'string' && value.trim().length > 0,
  )
}

function careSummary(careInfo) {
  if (!careInfo) return null
  const bits = []
  if (careInfo.ownerName?.trim()) bits.push(careInfo.ownerName.trim())
  if (careInfo.vetName?.trim()) bits.push(careInfo.vetName.trim())
  if (careInfo.emergencyName?.trim() && bits.length < 2) {
    bits.push(careInfo.emergencyName.trim())
  }
  return bits.length > 0 ? bits.join(' · ') : 'Contacts saved'
}

function formFromDogAndAccount(careInfo, ownerAccount) {
  const account = ownerAccount ?? EMPTY_OWNER_ACCOUNT
  const care = careInfo ?? {}
  return {
    ...EMPTY_CARE_INFO,
    ...care,
    ownerName: care.ownerName?.trim() || account.name || '',
    ownerPhone: care.ownerPhone?.trim() || account.phone || '',
    ownerEmail: care.ownerEmail?.trim() || account.email || '',
  }
}

/** Emergency / vet details saved on the active dog */
export default function CareInfoForm() {
  const { activeDog, ownerAccount, dispatch } = useApp()
  const [form, setForm] = useState(() =>
    formFromDogAndAccount(activeDog?.careInfo, ownerAccount),
  )
  const [savedFlash, setSavedFlash] = useState(false)
  const [expanded, setExpanded] = useState(
    () => !careInfoHasContent(activeDog?.careInfo),
  )

  useEffect(() => {
    setForm(formFromDogAndAccount(activeDog?.careInfo, ownerAccount))
    setExpanded(!careInfoHasContent(activeDog?.careInfo))
  }, [
    activeDog?.id,
    activeDog?.careInfo,
    ownerAccount?.name,
    ownerAccount?.phone,
    ownerAccount?.email,
  ])

  if (!activeDog) return null

  const isComplete = careInfoHasContent(activeDog.careInfo)

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleSave(e) {
    e.preventDefault()
    dispatch({ type: 'UPDATE_CARE_INFO', payload: form })
    setSavedFlash(true)
    if (careInfoHasContent(form)) {
      setExpanded(false)
    }
    window.setTimeout(() => setSavedFlash(false), 1600)
  }

  if (isComplete && !expanded) {
    return (
      <Card className="print:hidden">
        <button
          type="button"
          className="flex w-full items-center gap-3 text-left"
          onClick={() => setExpanded(true)}
          aria-expanded={false}
        >
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Care contacts
            </p>
            <p className="truncate text-lg font-bold text-slate-800">
              {careSummary(activeDog.careInfo)}
            </p>
            <p className="mt-0.5 text-sm text-slate-500">
              For {activeDog.name}&apos;s dogsitter sheet
            </p>
          </div>
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-2xl font-light leading-none text-[#F59E0B]"
            aria-hidden
          >
            +
          </span>
          <span className="sr-only">Expand to edit</span>
        </button>
      </Card>
    )
  }

  return (
    <Card className="print:hidden">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-slate-800">Care contacts</h2>
          <p className="mt-1 text-sm text-slate-500">
            These print on the dogsitter sheet for {activeDog.name}.
          </p>
        </div>
        {isComplete ? (
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-2xl font-light leading-none text-slate-500 hover:bg-slate-200"
            onClick={() => setExpanded(false)}
            aria-expanded={true}
            aria-label="Collapse care contacts"
          >
            −
          </button>
        ) : null}
      </div>

      <form className="mt-4 space-y-3" onSubmit={handleSave}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Your name" htmlFor="owner-name">
            <input
              id="owner-name"
              className={fieldClassName}
              value={form.ownerName}
              onChange={(e) => update('ownerName', e.target.value)}
              placeholder="Alex"
            />
          </Field>
          <Field label="Your phone" htmlFor="owner-phone">
            <input
              id="owner-phone"
              className={fieldClassName}
              type="tel"
              value={form.ownerPhone}
              onChange={(e) => update('ownerPhone', e.target.value)}
              placeholder="555-0100"
            />
          </Field>
          <Field
            label="Your email"
            htmlFor="owner-email"
            className="sm:col-span-2"
          >
            <input
              id="owner-email"
              className={fieldClassName}
              type="email"
              value={form.ownerEmail}
              onChange={(e) => update('ownerEmail', e.target.value)}
              placeholder="alex@example.com"
            />
          </Field>
          <Field label="Emergency contact" htmlFor="emerg-name">
            <input
              id="emerg-name"
              className={fieldClassName}
              value={form.emergencyName}
              onChange={(e) => update('emergencyName', e.target.value)}
              placeholder="Sam"
            />
          </Field>
          <Field label="Emergency phone" htmlFor="emerg-phone">
            <input
              id="emerg-phone"
              className={fieldClassName}
              type="tel"
              value={form.emergencyPhone}
              onChange={(e) => update('emergencyPhone', e.target.value)}
              placeholder="555-0199"
            />
          </Field>
          <Field label="Vet / clinic" htmlFor="vet-name">
            <input
              id="vet-name"
              className={fieldClassName}
              value={form.vetName}
              onChange={(e) => update('vetName', e.target.value)}
              placeholder="Sunnyvale Animal Hospital"
            />
          </Field>
          <Field label="Vet phone" htmlFor="vet-phone">
            <input
              id="vet-phone"
              className={fieldClassName}
              type="tel"
              value={form.vetPhone}
              onChange={(e) => update('vetPhone', e.target.value)}
              placeholder="555-0142"
            />
          </Field>
        </div>

        <Field label="Notes for the sitter" htmlFor="care-notes">
          <textarea
            id="care-notes"
            className={`${fieldClassName} h-28 resize-none py-3`}
            value={form.notes}
            onChange={(e) => update('notes', e.target.value)}
            placeholder="Meds, walks, quirks, alarm codes…"
          />
        </Field>

        <Button type="submit" className="w-full">
          {savedFlash ? 'Contacts saved' : 'Save care contacts'}
        </Button>
      </form>
    </Card>
  )
}
