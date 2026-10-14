import type { Track } from '../model/index.ts'
import { getSegmentRanges } from './segments.ts'

/** Length of a settle window after the GPS starts or reconnects, in seconds. */
export const SETTLE_SECONDS = 10
/** A time gap longer than this inside a segment starts a new settle window, in seconds. */
export const SETTLE_GAP_SECONDS = 10
/** Length of the reference window a settle speed is judged against, in seconds. */
export const SETTLE_REFERENCE_SECONDS = 60
/** A spike is more than this many robust standard deviations above the reference median. */
export const SPIKE_SIGMAS = 3
/** Floor for the robust standard deviation, in m/s, so a steady reference doesn't flag small variations. */
export const MIN_SPEED_SPREAD = 0.5

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b)
  const mid = s.length >> 1
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

/**
 * Point indices to leave out of max speed: whole settle windows (the first SETTLE_SECONDS after
 * a segment start or a recording gap) that contain a speed spike above the reference median.
 */
function getIgnoredSettlePoints(
  track: Track,
  elapsed: (number | null)[],
  speed: (number | null)[],
): Set<number> {
  const ignored = new Set<number>()
  for (const [start, end] of getSegmentRanges(track)) {
    const timed: number[] = []
    for (let i = start; i < end; i++) if (elapsed[i] !== null) timed.push(i)
    const t = (k: number) => elapsed[timed[k]] as number

    for (let s = 0; s < timed.length; s++) {
      if (s > 0 && t(s) - t(s - 1) <= SETTLE_GAP_SECONDS) continue
      const reference: number[] = []
      const settle: number[] = []
      for (let k = s; k < timed.length && t(k) <= t(s) + SETTLE_REFERENCE_SECONDS; k++) {
        const v = speed[timed[k]]
        if (v !== null) reference.push(v)
        if (t(k) <= t(s) + SETTLE_SECONDS) settle.push(timed[k])
      }
      if (reference.length === 0) continue
      const m = median(reference)
      const sigma = Math.max(
        1.4826 * median(reference.map((v) => Math.abs(v - m))),
        MIN_SPEED_SPREAD,
      )
      const isSpike = (i: number) => {
        const v = speed[i]
        return v !== null && v - m > SPIKE_SIGMAS * sigma
      }
      // The whole window goes: the spike's decaying tail is below the threshold but not real.
      if (settle.some(isSpike)) for (const i of settle) ignored.add(i)
    }
  }
  return ignored
}

/**
 * Largest smoothed speed in m/s, ignoring GPS settle spikes. Falls back to the plain max when
 * every speed is ignored; null when the speed series has no values.
 */
export function getMaxSpeed(
  track: Track,
  elapsed: (number | null)[],
  speed: (number | null)[],
): number | null {
  const ignored = getIgnoredSettlePoints(track, elapsed, speed)
  let plain: number | null = null
  let filtered: number | null = null
  speed.forEach((v, i) => {
    if (v === null) return
    if (plain === null || v > plain) plain = v
    if (!ignored.has(i) && (filtered === null || v > filtered)) filtered = v
  })
  return filtered ?? plain
}
