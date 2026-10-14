import { fireEvent, render, screen } from '@testing-library/react'
import { SegmentedControl, type SegmentedOption } from './SegmentedControl.tsx'

type Fruit = 'apple' | 'pear' | 'plum'

const OPTIONS: SegmentedOption<Fruit>[] = [
  { value: 'apple', label: 'Apple' },
  { value: 'pear', label: 'Pear' },
  { value: 'plum', label: 'Plum', disabled: true, hint: 'Out of season' },
]

function renderControl(value: Fruit = 'apple') {
  const onChange = vi.fn()
  render(<SegmentedControl legend="Fruit" value={value} options={OPTIONS} onChange={onChange} />)
  return onChange
}

describe('SegmentedControl', () => {
  it('renders a fieldset with a legend and one radio per option', () => {
    renderControl()
    const group = screen.getByRole('group', { name: 'Fruit' })
    expect(group.tagName).toBe('FIELDSET')
    expect(screen.getAllByRole('radio')).toHaveLength(3)
    expect(screen.getByRole('radio', { name: 'Apple' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Pear' })).not.toBeChecked()
  })

  it('reflects the value prop', () => {
    renderControl('pear')
    expect(screen.getByRole('radio', { name: 'Pear' })).toBeChecked()
  })

  it('calls onChange when an option is clicked', () => {
    const onChange = renderControl()
    fireEvent.click(screen.getByRole('radio', { name: 'Pear' }))
    expect(onChange).toHaveBeenCalledWith('pear')
  })

  it('clicking a label selects its option', () => {
    const onChange = renderControl()
    fireEvent.click(screen.getByText('Pear'))
    expect(onChange).toHaveBeenCalledWith('pear')
  })

  it('a disabled option is disabled, shows its hint and cannot be chosen', () => {
    const onChange = renderControl()
    const plum = screen.getByRole('radio', { name: 'Plum' })
    expect(plum).toBeDisabled()
    expect(plum.closest('label')).toHaveAttribute('title', 'Out of season')
    fireEvent.click(plum)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('options share one radio group, so the browser handles arrow keys', () => {
    renderControl()
    const names = screen.getAllByRole('radio').map((r) => r.getAttribute('name'))
    expect(names[0]).toBeTruthy()
    expect(new Set(names).size).toBe(1)
  })
})
