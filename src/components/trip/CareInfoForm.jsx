import { useEffect, useState } from 'react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import { Field, fieldClassName } from '../ui/Field'
import { useApp } from '../../context/AppContext'
import { EMPTY_CARE_INFO } from '../../utils/storage'

/** Emergency / vet details saved on the active dog */
export default function CareInfoForm() {
  const { activeDog, dispatch } = useApp()
  const [form, setForm] = useState(EMPTY_CARE_INFO)
  const [savedFlash, setSavedFlash] = useState(false)

  useEffect(() => {
    setForm({ ...EMPTY_CARE_INFO, ...(activeDog?.careInfo ?? {}) })
  }, [activeDog?.id])

  if (!activeDog) return null

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleSave(e) {
    e.preventDefault()
    dispatch({ type: 'UPDATE_CARE_INFO', payload: form })
    setSavedFlash(true)
    window.setTimeout(() => setSavedFlash(false), 1600)
  }

  return (
    <Card className="print:hidden">
      <h2 className="text-lg font-bold text-slate-800">Care contacts</h2>
      <p className="mt-1 text-sm text-slate-500">
        These print on the dogsitter sheet for {activeDog.name}.
      </p>

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
