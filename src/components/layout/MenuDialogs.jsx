import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { Html5Qrcode } from 'html5-qrcode'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { useApp } from '../../context/AppContext'
import { DEFAULT_APP_DATA, clearAppData } from '../../utils/storage'
import {
  encodePlanForQr,
  decodePlan,
  summarizePlan,
} from '../../utils/planTransfer'

function planStateFromApp(app) {
  return {
    dogs: app.dogs,
    pantry: app.pantry,
    currentMealPlan: app.currentMealPlan,
    tripSettings: app.tripSettings,
    activeDogId: app.activeDogId,
  }
}

function SharePlanDialog({ open, onClose }) {
  const app = useApp()
  const [qrUrl, setQrUrl] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return undefined
    let cancelled = false
    setQrUrl('')
    setError('')

    ;(async () => {
      try {
        const payload = encodePlanForQr(planStateFromApp(app))
        const url = await QRCode.toDataURL(payload, {
          errorCorrectionLevel: 'M',
          margin: 2,
          width: 360,
          color: { dark: '#0f172a', light: '#ffffff' },
        })
        if (!cancelled) setQrUrl(url)
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not create QR code.')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open, app.dogs, app.pantry, app.currentMealPlan, app.tripSettings, app.activeDogId])

  return (
    <Modal open={open} title="Share Plan" onClose={onClose}>
      <p className="text-sm text-slate-500">
        Have the other person open Receive Plan and scan this code. Turn up
        screen brightness and hold the phones steady.
      </p>
      {error ? (
        <p className="mt-4 text-sm text-red-600">{error}</p>
      ) : (
        <div className="mt-4 flex justify-center rounded-3xl bg-white p-3">
          {qrUrl ? (
            <img
              src={qrUrl}
              alt="Ruffly plan QR code"
              className="h-72 w-72"
            />
          ) : (
            <div className="flex h-72 w-72 items-center justify-center text-sm text-slate-400">
              Generating…
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

function ReceivePlanDialog({ open, onClose }) {
  const { dispatch } = useApp()
  const [error, setError] = useState('')
  const [pendingPlan, setPendingPlan] = useState(null)
  const [cameraReady, setCameraReady] = useState(false)
  const scannerRef = useRef(null)
  const handledRef = useRef(false)

  useEffect(() => {
    if (!open || pendingPlan) return undefined

    handledRef.current = false
    setError('')
    setCameraReady(false)

    const scanner = new Html5Qrcode('ruffly-qr-reader')
    scannerRef.current = scanner
    let cancelled = false

    ;(async () => {
      try {
        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 12,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const edge = Math.floor(
                Math.min(viewfinderWidth, viewfinderHeight) * 0.85,
              )
              return { width: edge, height: edge }
            },
            aspectRatio: 1,
            disableFlip: false,
          },
          (decoded) => {
            if (handledRef.current || cancelled) return
            try {
              const plan = decodePlan(decoded)
              handledRef.current = true
              setPendingPlan(plan)
            } catch (err) {
              setError(err.message || 'That QR code is not a Ruffly plan.')
            }
          },
          () => {},
        )
        if (cancelled) {
          await scanner.stop().catch(() => {})
          await scanner.clear().catch(() => {})
          return
        }
        setCameraReady(true)
      } catch {
        if (!cancelled) {
          setError(
            'Could not open the camera. Allow camera access and try again.',
          )
        }
      }
    })()

    return () => {
      cancelled = true
      scannerRef.current = null
      scanner
        .stop()
        .then(() => scanner.clear())
        .catch(() => {})
    }
  }, [open, pendingPlan])

  function close() {
    setPendingPlan(null)
    setError('')
    setCameraReady(false)
    onClose()
  }

  function confirmImport() {
    if (!pendingPlan) return
    dispatch({ type: 'REPLACE_ALL', payload: pendingPlan })
    close()
  }

  if (pendingPlan) {
    const summary = summarizePlan(pendingPlan)
    const dogLabel =
      summary.dogNames.length === 0
        ? 'No dogs'
        : summary.dogNames.length === 1
          ? summary.dogNames[0]
          : `${summary.dogNames[0]} + ${summary.dogNames.length - 1} more`

    return (
      <Modal open={open} title="Replace current plan?" onClose={close}>
        <p className="text-sm text-slate-500">
          This will overwrite the dogs, pantry, and meal plan on this device.
        </p>
        <ul className="mt-4 space-y-2 rounded-2xl bg-[#FBF9F5] p-4 text-sm text-slate-700">
          <li>
            <span className="font-semibold">Dogs:</span> {dogLabel}
          </li>
          <li>
            <span className="font-semibold">Pantry:</span> {summary.pantryCount}{' '}
            {summary.pantryCount === 1 ? 'item' : 'items'}
          </li>
          <li>
            <span className="font-semibold">Meal plan:</span>{' '}
            {summary.mealItemCount}{' '}
            {summary.mealItemCount === 1 ? 'food' : 'foods'}
          </li>
        </ul>
        <div className="mt-4 flex flex-col gap-2">
          <Button className="w-full" onClick={confirmImport}>
            Replace my plan
          </Button>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => {
              handledRef.current = false
              setPendingPlan(null)
              setError('')
            }}
          >
            Scan again
          </Button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open={open} title="Receive Plan" onClose={close}>
      <p className="text-sm text-slate-500">
        Point your camera at a Ruffly Share Plan QR code.
      </p>
      <div className="mt-4 overflow-hidden rounded-3xl bg-slate-900">
        <div id="ruffly-qr-reader" className="min-h-56 w-full" />
      </div>
      {!cameraReady && !error ? (
        <p className="mt-3 text-sm text-slate-400">Starting camera…</p>
      ) : null}
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </Modal>
  )
}

function ResetAppDialog({ open, onClose }) {
  const { dispatch } = useApp()

  function resetApp() {
    clearAppData()
    dispatch({
      type: 'REPLACE_ALL',
      payload: structuredClone(DEFAULT_APP_DATA),
    })
    onClose()
  }

  return (
    <Modal open={open} title="Reset App" onClose={onClose}>
      <p className="text-sm text-slate-500">
        This clears every dog, pantry item, meal plan, and care sheet on this
        device. This cannot be undone.
      </p>
      <div className="mt-4 flex flex-col gap-2">
        <Button
          className="w-full !bg-red-500 hover:!bg-red-600"
          onClick={resetApp}
        >
          Reset everything
        </Button>
        <Button variant="secondary" className="w-full" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Modal>
  )
}

export default function MenuDialogs({ dialog, onClose }) {
  return (
    <>
      <SharePlanDialog open={dialog === 'share'} onClose={onClose} />
      <ReceivePlanDialog open={dialog === 'receive'} onClose={onClose} />
      <ResetAppDialog open={dialog === 'reset'} onClose={onClose} />
    </>
  )
}
