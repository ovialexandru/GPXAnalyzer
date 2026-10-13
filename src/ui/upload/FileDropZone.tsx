import { useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import styles from './FileDropZone.module.css'

interface FileDropZoneProps {
  onFiles: (files: FileList) => void
  disabled?: boolean
}

/** Drop target plus a "Choose file" button backed by a hidden file input. */
export function FileDropZone({ onFiles, disabled = false }: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

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
    if (files && files.length > 0) onFiles(files)
    // Reset so picking the same file again still fires a change event.
    e.currentTarget.value = ''
  }

  const className = [styles.zone, dragOver && styles.dragOver, disabled && styles.disabled]
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
      <p className={styles.text}>Drop a GPX file here or</p>
      <button
        type="button"
        className={styles.button}
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        Choose file
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".gpx"
        hidden
        tabIndex={-1}
        onChange={handleChange}
      />
    </div>
  )
}
