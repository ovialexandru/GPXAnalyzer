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

describe('FileDropZone: Compare with…', () => {
  function setupCompare(disabled = false) {
    const onFiles = vi.fn()
    const onCompare = vi.fn()
    const { container } = render(
      <FileDropZone onFiles={onFiles} onCompare={onCompare} disabled={disabled} compact />,
    )
    const inputs = container.querySelectorAll<HTMLInputElement>('input[type="file"]')
    return { onFiles, onCompare, inputs, input: inputs[0] }
  }

  it('is shown only with onCompare; the page keeps one file input, which takes several files', () => {
    expect(setup().input).toHaveAttribute('multiple')
    expect(screen.queryByRole('button', { name: 'Compare with…' })).not.toBeInTheDocument()
    const { inputs } = setupCompare()
    expect(inputs).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Compare with…' })).toBeInTheDocument()
  })

  it('opens the same input; the pick goes to onCompare (first file only), the next to onFiles', () => {
    const { onFiles, onCompare, input } = setupCompare()
    const click = vi.spyOn(input, 'click')
    const other = new File(['<gpx/>'], 'b.gpx')
    fireEvent.click(screen.getByRole('button', { name: 'Compare with…' }))
    expect(click).toHaveBeenCalledOnce()
    fireEvent.change(input, { target: { files: [other, file] } })
    expect(onCompare).toHaveBeenCalledWith(other)
    expect(onFiles).not.toHaveBeenCalled()

    fireEvent.change(input, { target: { files: [file] } })
    expect(onFiles).toHaveBeenCalledWith([file])
    expect(onCompare).toHaveBeenCalledOnce()
  })

  it('a cancelled compare pick leaves the next pick to onFiles', () => {
    const { onFiles, onCompare, input } = setupCompare()
    fireEvent.click(screen.getByRole('button', { name: 'Compare with…' }))
    fireEvent(input, new Event('cancel'))
    fireEvent.change(input, { target: { files: [file] } })
    expect(onFiles).toHaveBeenCalledWith([file])
    expect(onCompare).not.toHaveBeenCalled()
  })

  it('"Choose file" after "Compare with…" starts over', () => {
    const { onFiles, onCompare, input } = setupCompare()
    fireEvent.click(screen.getByRole('button', { name: 'Compare with…' }))
    fireEvent.click(screen.getByRole('button', { name: 'Choose file' }))
    fireEvent.change(input, { target: { files: [file] } })
    expect(onFiles).toHaveBeenCalledWith([file])
    expect(onCompare).not.toHaveBeenCalled()
  })

  it('disabled with the drop zone', () => {
    setupCompare(true)
    expect(screen.getByRole('button', { name: 'Compare with…' })).toBeDisabled()
  })
})
