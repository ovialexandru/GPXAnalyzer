import { useMemo } from 'react'
import { getAvailableFields } from '../../metrics/index.ts'
import { useUnits } from '../units/index.ts'
import { fieldBadges, STAT_LABELS, statRows } from '../upload/statRows.ts'
import { useViewStore } from '../view/index.ts'
import type { Comparison } from './comparison.ts'
import styles from './CompareStats.module.css'
import { useComparison } from './ComparisonContext.tsx'
import { TrackChips } from './TrackChips.tsx'
import { TRACK_LETTERS, type TrackId } from './trackIds.ts'
import { useCompareStats } from './useCompareStats.ts'

const MISSING = '–'

interface CompareStatsProps {
  onRemove: (id: TrackId) => void
}

/**
 * The compared tracks (chips) and their stats side by side, for the selection or the whole
 * tracks. Each track's column covers its own part of the selection. Renders nothing without a comparison.
 */
export function CompareStats({ onRemove }: CompareStatsProps) {
  const comparison = useComparison()
  if (!comparison) return null
  return <CompareTable comparison={comparison} onRemove={onRemove} />
}

function CompareTable({ comparison, onRemove }: CompareStatsProps & { comparison: Comparison }) {
  const store = useViewStore()
  const [units] = useUnits()
  const { entries } = comparison
  const { totals, selectionText } = useCompareStats(comparison)
  const selected = selectionText !== null
  const badges = useMemo(
    () => entries.map((e) => fieldBadges(getAvailableFields(e.track)).join(', ')),
    [entries],
  )

  // Per row, each track's text; a row no track has a value for is left out.
  const columns = entries.map((e) => {
    const t = totals[e.id]
    return t ? Object.fromEntries(statRows(t, units)) : null
  })
  const rows = STAT_LABELS.map((label) => ({
    label,
    values: columns.map((c) => c?.[label] ?? null),
  })).filter((row) => row.values.some((v) => v !== null))

  return (
    <section className={styles.summary} aria-label="Compared tracks">
      <TrackChips entries={entries} onRemove={onRemove} />
      {selected && (
        <div className={styles.selection}>
          <p className={styles.selectionText}>Selection · {selectionText}</p>
          <button
            type="button"
            className={styles.wholeTrack}
            onClick={() => store.setSelection(null)}
          >
            Show whole track
          </button>
        </div>
      )}
      {/* Scrolls sideways inside the card on narrow screens; the page never does. */}
      <div className={styles.scroll}>
        {/* Not aria-live: a brush drag would flood screen readers. */}
        <table
          className={styles.table}
          aria-label={selected ? 'Selection comparison' : 'Track comparison'}
        >
          <thead>
            <tr>
              <td />
              {entries.map((e) => (
                <th key={e.id} scope="col" aria-label={`${TRACK_LETTERS[e.id]} · ${e.name}`}>
                  <span className={styles.column}>
                    <span
                      className={styles.swatch}
                      style={{ background: e.color }}
                      aria-hidden="true"
                    />
                    {TRACK_LETTERS[e.id]}
                  </span>
                  {selected && !totals[e.id] && (
                    <span className={styles.note}>Not in selection</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ label, values }) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                {values.map((v, i) => (
                  <td key={entries[i].id}>{v ?? MISSING}</td>
                ))}
              </tr>
            ))}
            <tr>
              <th scope="row">Available data</th>
              {badges.map((text, i) => (
                <td key={entries[i].id} className={styles.badges}>
                  {text || MISSING}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}
