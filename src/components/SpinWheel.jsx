import { useEffect, useMemo, useRef, useState } from 'react'
import ConfettiBurst from './ConfettiBurst.jsx'

const WHEEL_COLORS = [
  '#facc15',
  '#22c55e',
  '#14b8a6',
  '#0ea5e9',
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#ef4444',
  '#f97316',
  '#f59e0b',
]
const SEGMENT_SEPARATOR_COLOR = 'rgba(15, 23, 42, 0.35)'
const LABEL_DISTANCE_RATIO = 0.45
const SPIN_DURATION = 4200
const CELEBRATION_DURATION = 2600
const OVERLAY_TRANSITION = 500

const queueNextFrame = (callback) => {
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(callback)
  } else {
    callback()
  }
}

const clearTimer = (ref) => {
  if (ref.current) {
    clearTimeout(ref.current)
    ref.current = null
  }
}

export default function SpinWheel({ picks, onResolve }) {
  const [spinning, setSpinning] = useState(false)
  const [winnerId, setWinnerId] = useState(null)
  const [rotation, setRotation] = useState(0)
  const [overlayActive, setOverlayActive] = useState(false)
  const [overlayExpanded, setOverlayExpanded] = useState(false)
  const [confettiActive, setConfettiActive] = useState(false)
  const [announcementVisible, setAnnouncementVisible] = useState(false)
  const [celebrationActive, setCelebrationActive] = useState(false)
  const [confettiSeed, setConfettiSeed] = useState(0)
  const [triggerHovered, setTriggerHovered] = useState(false)

  const spinTimeoutRef = useRef(null)
  const celebrationTimeoutRef = useRef(null)
  const collapseTimeoutRef = useRef(null)
  const triggerCtaRef = useRef(null)

  const options = useMemo(
    () =>
      picks.map((pick, index) => {
        const label =
          [pick.name, pick.yelp?.name]
            .map((value) => (typeof value === 'string' ? value.trim() : ''))
            .find((value) => value.length > 0) || 'Mystery pick'

        return {
          id: pick.id,
          label,
          votes: pick.votes,
          color: WHEEL_COLORS[index % WHEEL_COLORS.length],
        }
      }),
    [picks]
  )

  const optionsSignature = useMemo(
    () => options.map((option) => `${option.id}:${option.votes}`).join('|'),
    [options]
  )
  const optionsSignatureRef = useRef(optionsSignature)

  useEffect(() => {
    return () => {
      clearTimer(spinTimeoutRef)
      clearTimer(celebrationTimeoutRef)
      clearTimer(collapseTimeoutRef)
    }
  }, [])

  useEffect(() => {
    if (optionsSignatureRef.current === optionsSignature) return

    optionsSignatureRef.current = optionsSignature
    clearTimer(spinTimeoutRef)
    clearTimer(celebrationTimeoutRef)
    clearTimer(collapseTimeoutRef)
    setSpinning(false)
    setWinnerId(null)
    setRotation(0)
    setConfettiActive(false)
    setAnnouncementVisible(false)
    setCelebrationActive(false)
    setOverlayExpanded(false)
    setOverlayActive(false)
    setTriggerHovered(false)
  }, [optionsSignature])

  useEffect(() => {
    if (!overlayActive) return

    const handleKeydown = (event) => {
      if (event.key === 'Escape' && !spinning) {
        event.preventDefault()
        closeOverlay()
      }
    }

    window.addEventListener('keydown', handleKeydown)
    return () => {
      window.removeEventListener('keydown', handleKeydown)
    }
  }, [overlayActive, spinning])

  const closeOverlay = () => {
    clearTimer(celebrationTimeoutRef)
    setConfettiActive(false)
    setCelebrationActive(false)
    setOverlayExpanded(false)
    clearTimer(collapseTimeoutRef)
    collapseTimeoutRef.current = setTimeout(() => {
      setOverlayActive(false)
      setAnnouncementVisible(false)
      setTriggerHovered(false)
      collapseTimeoutRef.current = null
    }, OVERLAY_TRANSITION)
  }

  const scheduleOverlayClose = () => {
    clearTimer(celebrationTimeoutRef)
    celebrationTimeoutRef.current = setTimeout(() => {
      closeOverlay()
      celebrationTimeoutRef.current = null
    }, CELEBRATION_DURATION)
  }

  const startSpin = () => {
    if (options.length === 0) return

    const winnerIndex = Math.floor(Math.random() * options.length)
    const winner = options[winnerIndex]
    const segmentAngle = 360 / options.length
    const winnerCenter = winnerIndex * segmentAngle + segmentAngle / 2
    const currentRotation = rotation % 360
    const deltaToWinner = (360 - ((winnerCenter + currentRotation) % 360)) % 360
    const extraSpins = 360 * (4 + Math.floor(Math.random() * 2))
    const nextRotation = rotation + extraSpins + deltaToWinner

    setCelebrationActive(false)
    setSpinning(true)
    setRotation(nextRotation)

    clearTimer(spinTimeoutRef)
    spinTimeoutRef.current = setTimeout(() => {
      setSpinning(false)
      setWinnerId(winner.id)
      onResolve(winner.id)
      setConfettiSeed((seed) => seed + 1)
      setConfettiActive(true)
      setAnnouncementVisible(true)
      setCelebrationActive(true)
      scheduleOverlayClose()
      spinTimeoutRef.current = null
    }, SPIN_DURATION)
  }

  const handleTriggerConfirm = () => {
    if (options.length === 0) return

    setWinnerId(null)
    setAnnouncementVisible(false)
    setConfettiActive(false)
    setCelebrationActive(false)

    if (!overlayActive) {
      setOverlayActive(true)
      queueNextFrame(() => setOverlayExpanded(true))
    } else if (!overlayExpanded) {
      queueNextFrame(() => setOverlayExpanded(true))
    }
  }

  const handleTriggerBlur = (event) => {
    if (overlayActive) return
    const nextTarget = event.relatedTarget
    if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
      setTriggerHovered(false)
    }
  }

  const handleTriggerFocus = () => {
    setTriggerHovered(true)
  }

  const handleTriggerKeyDown = (event) => {
    if ((event.key === 'Enter' || event.key === ' ') && triggerCtaRef.current) {
      event.preventDefault()
      setTriggerHovered(true)
      triggerCtaRef.current.focus()
    }
  }

  const handleSpinClick = () => {
    if (spinning || options.length === 0) return

    if (!overlayActive) {
      setOverlayActive(true)
      queueNextFrame(() => setOverlayExpanded(true))
    }

    setWinnerId(null)
    setAnnouncementVisible(false)
    setConfettiActive(false)
    setCelebrationActive(false)
    startSpin()
  }

  const handleOverlayClick = (event) => {
    if (event.target !== event.currentTarget || spinning) return
    closeOverlay()
  }

  const wheelStyle = useMemo(() => {
    if (!options.length) {
      return { transform: `rotate(${rotation}deg)` }
    }
    const segmentAngle = 360 / options.length
    const gap = Math.min(2.2, segmentAngle * 0.18)
    const segments = options
      .flatMap((option, index) => {
        const start = index * segmentAngle
        const end = start + segmentAngle
        const innerStart = start + gap / 2
        const innerEnd = end - gap / 2
        if (innerEnd <= innerStart) {
          return [`${option.color} ${start}deg ${end}deg`]
        }
        return [
          `${SEGMENT_SEPARATOR_COLOR} ${start}deg ${innerStart}deg`,
          `${option.color} ${innerStart}deg ${innerEnd}deg`,
          `${SEGMENT_SEPARATOR_COLOR} ${innerEnd}deg ${end}deg`,
        ]
      })
      .join(', ')
    return {
      backgroundImage: `conic-gradient(${segments})`,
      transform: `rotate(${rotation}deg)`,
    }
  }, [options, rotation])

  const winnerLabel = winnerId ? options.find((option) => option.id === winnerId)?.label : null
  const isTriggerExpanded = triggerHovered || overlayExpanded || overlayActive

  const segmentAngle = options.length ? 360 / options.length : 0
  const wheelRotationOffset = useMemo(
    () => ((rotation % 360) + 360) % 360,
    [rotation]
  )

  const overlayClassName = [
    'spin-wheel__overlay',
    overlayExpanded ? 'is-expanded' : '',
    celebrationActive && winnerLabel ? 'is-celebrating' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const announcementClassName = [
    'spin-wheel__announcement',
    celebrationActive ? 'is-celebrating' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <>
      <div
        className={`spin-wheel__trigger${isTriggerExpanded ? ' is-expanded' : ''}`}
        role="group"
        aria-label="Tiebreaker wheel prompt"
        tabIndex={0}
        onMouseEnter={() => setTriggerHovered(true)}
        onMouseLeave={() => {
          if (!overlayActive) {
            setTriggerHovered(false)
          }
        }}
        onFocus={handleTriggerFocus}
        onBlur={handleTriggerBlur}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className="spin-wheel__trigger-icon" aria-hidden />
        <span className="spin-wheel__trigger-content" aria-hidden={!isTriggerExpanded}>
          <span className="spin-wheel__trigger-text">Need a tiebreaker?</span>
          <button
            type="button"
            className="spin-wheel__trigger-cta"
            aria-haspopup="dialog"
            aria-expanded={overlayActive}
            aria-label="Yes, open the tiebreaker wheel"
            onClick={handleTriggerConfirm}
            ref={triggerCtaRef}
          >
            YES
          </button>
        </span>
      </div>

      {overlayActive && (
        <div
          className={overlayClassName}
          role="dialog"
          aria-modal="true"
          aria-label="Tiebreaker wheel"
          onClick={handleOverlayClick}
        >
          <div className="spin-wheel__overlay-inner">
            <div className="spin-wheel__stage spin-wheel__stage--xl">
              <div className="spin-wheel__pointer" aria-hidden />
              <div className="spin-wheel__wheel" style={wheelStyle}>
                <div className="spin-wheel__labels" aria-hidden>
                  {options.map((option, index) => {
                    const rotationDeg = index * segmentAngle + segmentAngle / 2
                    const labelTransform = `rotate(${rotationDeg}deg) translate(calc(var(--wheel-size) * ${LABEL_DISTANCE_RATIO})) translateY(-50%)`
                    const textTransform = `rotate(-${rotationDeg + wheelRotationOffset}deg)`
                    return (
                      <span
                        key={option.id}
                        className="spin-wheel__label"
                        style={{
                          transform: labelTransform,
                          '--label-color': option.color,
                        }}
                      >
                        <span
                          style={{ transform: textTransform }}
                        >
                          {option.label}
                        </span>
                      </span>
                    )
                  })}
                </div>
                <div className="spin-wheel__hub">
                  <button
                    type="button"
                    className="spin-wheel__spin-button"
                    onClick={handleSpinClick}
                    disabled={spinning || options.length === 0}
                  >
                    {spinning ? 'Spinning…' : winnerLabel ? 'Spin again' : 'Spin'}
                  </button>
                </div>
              </div>
            </div>
            {options.length > 0 && (
              <div className="spin-wheel__legend">
                <p className="spin-wheel__legend-title">Wheel colors</p>
                <ul className="spin-wheel__legend-list">
                  {options.map((option) => (
                    <li key={option.id} className="spin-wheel__legend-item">
                      <span
                        className="spin-wheel__legend-swatch"
                        style={{ '--legend-color': option.color }}
                        aria-hidden
                      />
                      <span>{option.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {announcementVisible && winnerLabel && (
              <div className="spin-wheel__announcement-layer">
                <div className={announcementClassName} role="status" aria-live="assertive">
                  <strong>{winnerLabel}</strong>
                  <p>Winner</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {confettiActive && winnerLabel && <ConfettiBurst seed={confettiSeed} />}
    </>
  )
}
