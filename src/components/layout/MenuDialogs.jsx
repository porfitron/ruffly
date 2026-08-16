import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { Html5Qrcode } from 'html5-qrcode'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { useApp } from '../../context/AppContext'
import { DEFAULT_APP_DATA, clearAppData } from '../../utils/storage'
import {
  encodePlanFrames,
  createPlanChunkCollector,
  summarizePlan,
  QR_CYCLE_MS,
} from '../../utils/planTransfer'

function planStateFromApp(app) {
  return {
    dogs: app.dogs,
    catalog: app.catalog,
    pantry: app.pantry,
    mealPlansByDogId: app.mealPlansByDogId,
    menusByDogId: app.menusByDogId,
    logs: app.logs,
    tripSettings: app.tripSettings,
    activeDogId: app.activeDogId,
    ownerAccount: app.ownerAccount,
    proTeaser: app.proTeaser,
  }
}

const QR_RENDER_OPTIONS = {
  errorCorrectionLevel: 'M',
  margin: 2,
  width: 360,
  color: { dark: '#0f172a', light: '#ffffff' },
}

function SharePlanDialog({ open, onClose }) {
  const app = useApp()
  const [qrUrls, setQrUrls] = useState([])
  const [frameIndex, setFrameIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [error, setError] = useState('')
  const [omittedPhotos, setOmittedPhotos] = useState(false)

  useEffect(() => {
    if (!open) return undefined
    let cancelled = false
    setQrUrls([])
    setFrameIndex(0)
    setPaused(false)
    setError('')
    setOmittedPhotos(false)

    ;(async () => {
      try {
        const encoded = encodePlanFrames(planStateFromApp(app))
        const urls = await Promise.all(
          encoded.frames.map((payload) =>
            QRCode.toDataURL(payload, QR_RENDER_OPTIONS),
          ),
        )
        if (!cancelled) {
          setQrUrls(urls)
          setOmittedPhotos(Boolean(encoded.omittedPhotos))
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not create QR code.')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [
    open,
    app.dogs,
    app.catalog,
    app.pantry,
    app.mealPlansByDogId,
    app.menusByDogId,
    app.logs,
    app.tripSettings,
    app.activeDogId,
    app.ownerAccount,
    app.proTeaser,
  ])

  const cycling = qrUrls.length > 1 && !paused

  useEffect(() => {
    if (!open || !cycling) return undefined
    const timer = window.setInterval(() => {
      setFrameIndex((current) => (current + 1) % qrUrls.length)
    }, QR_CYCLE_MS)
    return () => window.clearInterval(timer)
  }, [open, cycling, qrUrls.length])

  const qrUrl = qrUrls[frameIndex] ?? ''
  const multi = qrUrls.length > 1

  return (
    <Modal open={open} title="Export Plan" onClose={onClose}>
      <p className="text-sm text-slate-500">
        {multi
          ? 'Codes cycle until the other phone has the full plan. Turn up brightness and hold steady. Pause if they need more time on one code.'
          : 'Have the other person open Receive Plan and scan this code. Turn up screen brightness and hold the phones steady.'}
      </p>
      {error ? (
        <p className="mt-4 text-sm text-red-600">{error}</p>
      ) : (
        <>
          <div className="mt-4 flex justify-center rounded-3xl bg-white p-3">
            {qrUrl ? (
              <img
                src={qrUrl}
                alt={
                  multi
                    ? `Ruffly plan QR code ${frameIndex + 1} of ${qrUrls.length}`
                    : 'Ruffly plan QR code'
                }
                className="h-72 w-72"
              />
            ) : (
              <div className="flex h-72 w-72 items-center justify-center text-sm text-slate-400">
                Generating…
              </div>
            )}
          </div>
          {multi ? (
            <>
              <p className="mt-3 text-center text-sm font-medium text-slate-700" aria-live="polite">
                Code {frameIndex + 1} of {qrUrls.length}
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  variant="secondary"
                  className="h-10 flex-1"
                  onClick={() => setPaused((value) => !value)}
                >
                  {paused ? 'Resume' : 'Pause'}
                </Button>
                <Button
                  variant="secondary"
                  className="h-10 flex-1"
                  onClick={() =>
                    setFrameIndex((current) => (current + 1) % qrUrls.length)
                  }
                >
                  Next
                </Button>
              </div>
            </>
          ) : null}
          {omittedPhotos ? (
            <p className="mt-3 text-sm text-slate-500">
              Dog photos are left off so the codes stay small. Add them again on
              the other phone.
            </p>
          ) : null}
        </>
      )}
    </Modal>
  )
}

function ReceivePlanDialog({ open, onClose }) {
  const { dispatch } = useApp()
  const [error, setError] = useState('')
  const [pendingPlan, setPendingPlan] = useState(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [progress, setProgress] = useState(null)
  const scannerRef = useRef(null)
  const collectorRef = useRef(null)
  const handledRef = useRef(false)
  const progressRef = useRef(null)

  useEffect(() => {
    if (!open || pendingPlan) return undefined

    handledRef.current = false
    collectorRef.current = createPlanChunkCollector()
    progressRef.current = null
    setError('')
    setCameraReady(false)
    setProgress(null)

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
            if (handledRef.current || cancelled || !collectorRef.current) return
            const result = collectorRef.current.add(decoded)
            if (result.status === 'complete') {
              handledRef.current = true
              setError('')
              setPendingPlan(result.plan)
              return
            }
            if (result.status === 'collecting') {
              setError('')
              const next = { got: result.got, total: result.total }
              const prev = progressRef.current
              if (!prev || prev.got !== next.got || prev.total !== next.total) {
                progressRef.current = next
                setProgress(next)
              }
              return
            }
            if (result.status === 'error') {
              setError(result.error)
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
    setProgress(null)
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
      <Modal open={open} title="Replace everything?" onClose={close}>
        <p className="text-sm text-slate-500">
          This will overwrite dogs, catalog, menus, care logs, and account
          details on this device.
        </p>
        <ul className="mt-4 space-y-2 rounded-2xl bg-[#FBF9F5] p-4 text-sm text-slate-700">
          <li>
            <span className="font-semibold">Dogs:</span> {dogLabel}
          </li>
          <li>
            <span className="font-semibold">Catalog:</span>{' '}
            {summary.catalogCount}{' '}
            {summary.catalogCount === 1 ? 'item' : 'items'}
          </li>
          <li>
            <span className="font-semibold">Menus:</span>{' '}
            {summary.menuItemCount}{' '}
            {summary.menuItemCount === 1 ? 'item' : 'items'}
          </li>
          <li>
            <span className="font-semibold">Care logs:</span> {summary.logCount}
          </li>
          {summary.hasOwner ? (
            <li>
              <span className="font-semibold">Owner account:</span> included
            </li>
          ) : null}
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
              setProgress(null)
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
        Point your camera at a Ruffly Export Plan QR code. Larger plans send
        several codes in a loop — keep scanning until this screen fills in.
      </p>
      <div className="mt-4 overflow-hidden rounded-3xl bg-slate-900">
        <div id="ruffly-qr-reader" className="min-h-56 w-full" />
      </div>
      {progress ? (
        <div className="mt-3">
          <p className="text-sm font-medium text-slate-700" aria-live="polite">
            {progress.got} of {progress.total} frames
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[#F59E0B] transition-all"
              style={{
                width: `${Math.round((progress.got / progress.total) * 100)}%`,
              }}
            />
          </div>
        </div>
      ) : null}
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
        This clears every dog, pantry item, meal plan, account, and care sheet
        on this device. This cannot be undone.
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
