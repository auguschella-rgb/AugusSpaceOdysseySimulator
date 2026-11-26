import { useEffect, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { useMobileUiStore } from '../../store/useMobileUiStore'

type Props = {
  kicker: string
  title: string
  accent?: string
  /** 2-3 key stats shown while compact */
  stats: { label: string; value: string }[]
  onClose: () => void
  /** Full details, shown after tapping to expand */
  children: ReactNode
}

/**
 * Mobile-only compact bottom card. Tap the header/stats to expand to the full
 * details (max 60vh, scrollable); X closes. Reports its mode so the Controls
 * FAB can move out of the way.
 */
export function MobileBottomCard({ kicker, title, accent, stats, onClose, children }: Props) {
  const [expanded, setExpanded] = useState(false)
  const setCardMode = useMobileUiStore((s) => s.setCardMode)

  useEffect(() => {
    setCardMode(expanded ? 'expanded' : 'compact')
  }, [expanded, setCardMode])
  useEffect(() => () => setCardMode('none'), [setCardMode])

  return (
    <motion.aside
      data-asos-ui
      className="glass-panel fixed left-3 right-3 z-30 rounded-2xl overflow-hidden flex flex-col"
      style={{
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)',
        maxHeight: '60dvh',
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex items-start justify-between gap-3 px-4 pt-3 pb-2 shrink-0">
        <button
          type="button"
          className="flex-1 text-left min-w-0"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          <p className="text-[9px] tracking-[0.3em] uppercase text-space-muted">{kicker}</p>
          <h2 className="font-display text-lg tracking-wide text-white text-glow-soft truncate">
            {title}
          </h2>
          <div
            className="h-0.5 w-12 rounded-full mt-1"
            style={{ background: `linear-gradient(90deg, ${accent ?? '#7eb6ff'}, transparent)` }}
          />
        </button>
        <button
          type="button"
          className="glass-button w-9 h-9 rounded-lg text-base flex items-center justify-center shrink-0"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {!expanded && (
        <button
          type="button"
          className="px-4 pb-3 text-left shrink-0"
          onClick={() => setExpanded(true)}
        >
          <div className="grid grid-cols-3 gap-2">
            {stats.map((s) => (
              <div key={s.label} className="min-w-0">
                <p className="text-[8px] tracking-[0.18em] uppercase text-space-muted">{s.label}</p>
                <p className="text-[11px] text-white/90 leading-snug line-clamp-2">{s.value}</p>
              </div>
            ))}
          </div>
          <p className="text-[9px] tracking-[0.2em] uppercase text-space-accent/70 mt-2">
            Tap for details ▴
          </p>
        </button>
      )}

      {expanded && (
        <div className="panel-scroll overflow-y-auto px-4 pb-4 pt-1 space-y-4 border-t border-white/5">
          {children}
          <button
            type="button"
            className="text-[9px] tracking-[0.2em] uppercase text-space-accent/70"
            onClick={() => setExpanded(false)}
          >
            Collapse ▾
          </button>
        </div>
      )}
    </motion.aside>
  )
}
