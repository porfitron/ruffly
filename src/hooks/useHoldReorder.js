import { useCallback, useEffect, useRef, useState } from 'react'

const HOLD_MS = 320
const CANCEL_PX = 8

function holdDelay(pointerType) {
  return pointerType === 'mouse' ? 0 : HOLD_MS
}

function moveId(ids, id, toIndex) {
  const next = ids.filter((itemId) => itemId !== id)
  const index = Math.max(0, Math.min(toIndex, next.length))
  next.splice(index, 0, id)
  return next
}

function sameIds(a, b) {
  return a.length === b.length && a.every((id, i) => id === b[i])
}

/**
 * Hold a handle, then drag to reorder a vertical list.
 * Page scroll still wins if the pointer moves before the hold completes.
 */
export function useHoldReorder({ ids, onCommit, onStart, enabled = true }) {
  const [draggingId, setDraggingId] = useState(null)
  const [currentIds, setCurrentIds] = useState(ids)

  const idsRef = useRef(ids)
  const currentIdsRef = useRef(currentIds)
  const draggingIdRef = useRef(null)
  const itemRefs = useRef(new Map())
  const sessionRef = useRef(null)
  const onCommitRef = useRef(onCommit)
  const onStartRef = useRef(onStart)

  const idsSignature = ids.join('\0')

  useEffect(() => {
    const nextIds = idsSignature ? idsSignature.split('\0') : []
    idsRef.current = nextIds
    if (!draggingIdRef.current && !sameIds(nextIds, currentIdsRef.current)) {
      setCurrentIds(nextIds)
    }
  }, [idsSignature])

  useEffect(() => {
    currentIdsRef.current = currentIds
  }, [currentIds])

  useEffect(() => {
    onCommitRef.current = onCommit
    onStartRef.current = onStart
  }, [onCommit, onStart])

  const setItemRef = useCallback((id, node) => {
    if (node) itemRefs.current.set(id, node)
    else itemRefs.current.delete(id)
  }, [])

  const lockScroll = useCallback(() => {
    const session = sessionRef.current
    if (!session || session.scrollLock) return
    const lock = (event) => event.preventDefault()
    document.addEventListener('touchmove', lock, { passive: false })
    session.scrollLock = lock
  }, [])

  const unlockScroll = useCallback(() => {
    const session = sessionRef.current
    if (!session?.scrollLock) return
    document.removeEventListener('touchmove', session.scrollLock)
    session.scrollLock = null
  }, [])

  const dropIndexForY = useCallback((y, draggingId) => {
    const others = currentIdsRef.current.filter((id) => id !== draggingId)
    for (let i = 0; i < others.length; i += 1) {
      const el = itemRefs.current.get(others[i])
      if (!el) continue
      const rect = el.getBoundingClientRect()
      if (y < rect.top + rect.height / 2) return i
    }
    return others.length
  }, [])

  const endDrag = useCallback(
    (commit) => {
      const session = sessionRef.current
      if (session?.timer) window.clearTimeout(session.timer)
      unlockScroll()
      if (session?.target?.hasPointerCapture?.(session.pointerId)) {
        session.target.releasePointerCapture(session.pointerId)
      }

      const wasActive = Boolean(draggingIdRef.current)
      const nextIds = currentIdsRef.current
      draggingIdRef.current = null
      sessionRef.current = null
      setDraggingId(null)

      if (commit && wasActive && !sameIds(nextIds, idsRef.current)) {
        onCommitRef.current?.(nextIds)
      } else if (
        !commit &&
        !sameIds(currentIdsRef.current, idsRef.current)
      ) {
        setCurrentIds(idsRef.current)
      }
    },
    [unlockScroll],
  )

  const activate = useCallback(() => {
    const session = sessionRef.current
    if (!session || session.active) return
    session.active = true
    draggingIdRef.current = session.id
    setDraggingId(session.id)
    try {
      session.target.setPointerCapture(session.pointerId)
    } catch {
      // Capture can fail if the pointer already ended.
    }
    lockScroll()
    onStartRef.current?.()
    navigator.vibrate?.(12)
  }, [lockScroll])

  const bindHandle = useCallback(
    (id) => {
      if (!enabled) return {}

      return {
        onPointerDown(event) {
          if (event.button != null && event.button !== 0) return
          if (event.pointerType === 'mouse' && event.ctrlKey) return
          event.stopPropagation()
          if (event.pointerType === 'mouse') event.preventDefault()
          endDrag(false)
          sessionRef.current = {
            id,
            pointerId: event.pointerId,
            target: event.currentTarget,
            startX: event.clientX,
            startY: event.clientY,
            active: false,
            timer: null,
            scrollLock: null,
          }
          const delay = holdDelay(event.pointerType)
          if (delay === 0) activate()
          else sessionRef.current.timer = window.setTimeout(activate, delay)
        },
        onPointerMove(event) {
          const session = sessionRef.current
          if (!session || session.pointerId !== event.pointerId) return
          if (!session.active) {
            const dx = event.clientX - session.startX
            const dy = event.clientY - session.startY
            if (dx * dx + dy * dy > CANCEL_PX * CANCEL_PX) endDrag(false)
            return
          }
          event.preventDefault()
          const next = moveId(
            currentIdsRef.current,
            session.id,
            dropIndexForY(event.clientY, session.id),
          )
          if (!sameIds(next, currentIdsRef.current)) {
            currentIdsRef.current = next
            setCurrentIds(next)
          }
        },
        onPointerUp(event) {
          const session = sessionRef.current
          if (!session || session.pointerId !== event.pointerId) return
          endDrag(session.active)
        },
        onPointerCancel(event) {
          const session = sessionRef.current
          if (!session || session.pointerId !== event.pointerId) return
          endDrag(false)
        },
        onContextMenu(event) {
          event.preventDefault()
        },
      }
    },
    [activate, dropIndexForY, enabled, endDrag],
  )

  useEffect(() => () => endDrag(false), [endDrag])

  return { currentIds, draggingId, setItemRef, bindHandle }
}
