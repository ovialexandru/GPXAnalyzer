import { fireEvent, render, screen } from '@testing-library/react'
import { FileDropZone } from './index.ts'

function setup(disabled = false) {
  const onFiles = vi.fn()
  const { container } = render(<FileDropZone onFiles={onFiles} disabled={disabled} />)
  const input = container.querySelector<HTMLInputElement>('input[type="file"]')
  if (!input) throw new Error('file input not found')
  return { onFiles, input, zone: screen.getByTestId('drop-zone') }
}

const file = new File(['<gpx/>'], 'a.gpx')

describe('FileDropZone', () => {
  it('opens the hidden file input from the "Choose file" button', () => {
    const { input } = setup()
    const click = vi.spyOn(input, 'click')
    fireEvent.click(screen.getByRole('button', { name: 'Choose file' }))
    expect(click).toHaveBeenCalledOnce()
  })

  it('accepts only .gpx in the picker', () => {
    expect(setup().input).toHaveAttribute('accept', '.gpx')
  })

  it('passes picked files and resets the input so the same file can be picked again', () => {
    const { onFiles, input } = setup()
    fireEvent.change(input, { target: { files: [file] } })
    expect(onFiles).toHaveBeenCalledWith([file])
    expect(input.value).toBe('')
  })

  it('passes dropped files', () => {
    const { onFiles, zone } = setup()
    fireEvent.drop(zone, { dataTransfer: { files: [file] } })
    expect(onFiles).toHaveBeenCalledWith([file])
  })

  it('ignores a drop without files', () => {
    const { onFiles, zone } = setup()
    fireEvent.drop(zone, { dataTransfer: { files: [] } })
    expect(onFiles).not.toHaveBeenCalled()
  })

  it('prevents the default drag-over and drop handling', () => {
    const { zone } = setup()
    expect(fireEvent.dragOver(zone, { dataTransfer: { files: [] } })).toBe(false)
    expect(fireEvent.drop(zone, { dataTransfer: { files: [] } })).toBe(false)
  })

  it('ignores drops and disables the button when disabled', () => {
    const { onFiles, zone } = setup(true)
    fireEvent.drop(zone, { dataTransfer: { files: [file] } })
    expect(onFiles).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Choose file' })).toBeDisabled()
  })
})
