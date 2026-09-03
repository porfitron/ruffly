import { useState } from 'react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import { Field, fieldClassName } from '../ui/Field'
import { track } from '../../analytics'

const CONTACT_EMAIL = 'contact@ruffly.app'
const FORMSUBMIT_URL = `https://formsubmit.co/ajax/${CONTACT_EMAIL}`

function formSubmitMessage(result) {
  return typeof result?.message === 'string' ? result.message : ''
}

function needsActivation(message) {
  return /activat/i.test(message)
}

function missingReferer(message) {
  return /web server|html files/i.test(message)
}

/** Shared FormSubmit contact form for the marketing site and in-app menu. */
export default function ContactForm({
  defaultName = '',
  defaultEmail = '',
  source = 'Contact',
}) {
  const [status, setStatus] = useState('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    if (formData.get('_honey')) {
      setStatus('sent')
      return
    }

    const payload = {
      name: String(formData.get('name') ?? '').trim(),
      email: String(formData.get('email') ?? '').trim(),
      message: String(formData.get('message') ?? '').trim(),
      _subject: 'Ruffly contact form',
      _template: 'table',
      _captcha: 'false',
    }

    setStatus('sending')
    setErrorMessage('')

    try {
      const response = await fetch(FORMSUBMIT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        referrerPolicy: 'origin',
        body: JSON.stringify(payload),
      })
      const result = await response.json().catch(() => ({}))
      const message = formSubmitMessage(result)
      const ok = result.success === true || result.success === 'true'

      if (ok) {
        track('send_contact', { result: 'Sent', source })
        setStatus('sent')
        form.reset()
        return
      }

      if (needsActivation(message)) {
        track('send_contact', { result: 'Needs activation', source })
        setStatus('activate')
        return
      }

      if (missingReferer(message)) {
        form.submit()
        return
      }

      throw new Error(message || 'Could not send your message.')
    } catch {
      track('send_contact', { result: 'Failed', source })
      setStatus('error')
      setErrorMessage('Could not send your message. Please try again in a moment.')
    }
  }

  if (status === 'sent') {
    return (
      <Card>
        <p className="text-lg font-extrabold tracking-tight text-slate-800">
          Message sent
        </p>
        <p className="mt-2 text-pretty text-sm leading-relaxed text-slate-500">
          Thanks for writing. We&apos;ll get back to you at the email you left.
        </p>
        <Button
          className="mt-5"
          variant="secondary"
          onClick={() => setStatus('idle')}
        >
          Send another
        </Button>
      </Card>
    )
  }

  if (status === 'activate') {
    return (
      <Card>
        <p className="text-lg font-extrabold tracking-tight text-slate-800">
          One more step
        </p>
        <p className="mt-2 text-pretty text-sm leading-relaxed text-slate-500">
          FormSubmit sent a one-time Activate Form email to{' '}
          <span className="font-semibold text-slate-700">{CONTACT_EMAIL}</span>.
          Open that message (check spam if it isn&apos;t in the inbox), click
          the link, then send your note again.
        </p>
        <Button
          className="mt-5"
          variant="secondary"
          onClick={() => setStatus('idle')}
        >
          I activated it — send again
        </Button>
      </Card>
    )
  }

  return (
    <Card>
      <form
        action={`https://formsubmit.co/${CONTACT_EMAIL}`}
        method="POST"
        className="space-y-4"
        onSubmit={handleSubmit}
      >
        <input type="hidden" name="_subject" value="Ruffly contact form" />
        <input type="hidden" name="_template" value="table" />
        <input type="hidden" name="_captcha" value="false" />
        <input
          type="text"
          name="_honey"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
          className="hidden"
        />
        <Field label="Name" htmlFor="contact-name">
          <input
            id="contact-name"
            name="name"
            type="text"
            required
            autoComplete="name"
            defaultValue={defaultName}
            className={fieldClassName}
          />
        </Field>
        <Field label="Email" htmlFor="contact-email">
          <input
            id="contact-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            defaultValue={defaultEmail}
            className={fieldClassName}
          />
        </Field>
        <Field label="Message" htmlFor="contact-message">
          <textarea
            id="contact-message"
            name="message"
            required
            rows={5}
            className={`${fieldClassName} h-36 resize-none py-3`}
          />
        </Field>
        {status === 'error' ? (
          <p className="text-sm font-medium text-red-600" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={status === 'sending'}>
          {status === 'sending' ? 'Sending…' : 'Send message'}
        </Button>
      </form>
    </Card>
  )
}
