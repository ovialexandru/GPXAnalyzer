import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import styles from './FileDropZone.module.css'

interface FileDropZoneProps {
  /** Dropped or chosen files (up to two are loaded). */
  onFiles: (files: FileList) => void
  /** Shows "Compare with…", which picks one file for this instead. */
  onCompare?: (file: File) => void
  disabled?: boolean
  /** A single slim row, once a track is shown. */
  compact?: boolean
}

/**
 * Drop target plus a "Choose file" button, and "Compare with…" when `onCompare` is set. Both buttons
 * open the same hidden file input, so the page has one; it remembers which button opened it.
 */
export function FileDropZone({
  onFiles,
  onCompare,
  disabled = false,
  compact = false,
}: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  // What the next pick is for; back to 'open' after every pick or cancel.
  const purpose = useRef<'open' | 'compare'>('open')
  const [dragOver, setDragOver] = useState(false)

  // A closed picker fires the native `cancel` event (React has no handler for it on inputs).
  useEffect(() => {
    const input = inputRef.current
    const reset = () => (purpose.current = 'open')
    input?.addEventListener('cancel', reset)
    return () => input?.removeEventListener('cancel', reset)
  }, [])

  function openPicker(next: 'open' | 'compare') {
    purpose.current = next
    inputRef.current?.click()
  }

  function handleDragEnter(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    if (!disabled) setDragOver(true)
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.dataTransfer.dropEffect = disabled ? 'none' : 'copy'
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    // Moving onto a child element also fires dragleave; only clear when leaving the zone itself.
    if (e.relatedTarget instanceof Node && e.currentTarget.contains(e.relatedTarget)) return
    setDragOver(false)
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    if (!disabled && e.dataTransfer.files.length > 0) onFiles(e.dataTransfer.files)
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const { files } = e.currentTarget
    const compare = purpose.current === 'compare' && onCompare
    purpose.current = 'open'
    if (files && files.length > 0) {
      if (compare) compare(files[0])
      else onFiles(files)
    }
    // Reset so picking the same file again still fires a change event.
    e.currentTarget.value = ''
  }

  const className = [
    styles.zone,
    compact && styles.compact,
    dragOver && styles.dragOver,
    disabled && styles.disabled,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={className}
      data-testid="drop-zone"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <p className={styles.text}>
        {compact ? 'Drop another GPX file here or' : 'Drop a GPX file here or'}
      </p>
      <button
        type="button"
        className={styles.button}
        disabled={disabled}
        onClick={() => openPicker('open')}
      >
        Choose file
      </button>
      {onCompare && (
        <button
          type="button"
          className={`${styles.button} ${styles.secondary}`}
          disabled={disabled}
          onClick={() => openPicker('compare')}
        >
          Compare with…
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".gpx"
        multiple
        hidden
        tabIndex={-1}
        onChange={handleChange}
      />
    </div>
  )
}
