import { render, screen } from '@testing-library/react'
import { flushFrame, stubAnimationFrames } from '../../test/animationFrames.ts'
import { useViewState, useViewStore, ViewStoreProvider, type ViewStore } from './index.ts'

beforeEach(() => {
  stubAnimationFrames()
})

interface HoveredProps {
  onRender: (store: ViewStore) => void
}

/** Renders whether anything is hovered, reporting each render with its store. */
function Hovered({ onRender }: HoveredProps) {
  const store = useViewStore()
  const hovered = useViewState((s) => s.hover !== null)
  onRender(store)
  return <p>{hovered ? 'hovered' : 'idle'}</p>
}

function setup(resetKey?: unknown) {
  const onRender = vi.fn<(store: ViewStore) => void>()
  const tree = (key: unknown) => (
    <ViewStoreProvider resetKey={key}>
      <Hovered onRender={onRender} />
    </ViewStoreProvider>
  )
  const { rerender } = render(tree(resetKey))
  return {
    onRender,
    store: () => onRender.mock.lastCall![0],
    rerender: (key: unknown) => rerender(tree(key)),
  }
}

describe('useViewState', () => {
  it('re-renders only when its slice changes', () => {
    const { onRender, store } = setup()
    expect(onRender).toHaveBeenCalledTimes(1)

    store().setHover({ index: 1, source: 'map' })
    flushFrame()
    expect(screen.getByText('hovered')).toBeInTheDocument()
    expect(onRender).toHaveBeenCalledTimes(2)

    for (const index of [2, 3, 4]) {
      store().setHover({ index, source: 'map' })
      flushFrame()
    }
    expect(onRender).toHaveBeenCalledTimes(2)

    store().setHover(null)
    flushFrame()
    expect(screen.getByText('idle')).toBeInTheDocument()
    expect(onRender).toHaveBeenCalledTimes(3)
  })

  it('a hover-only subscriber does not re-render on zoom', () => {
    const { onRender, store } = setup()
    store().setZoom([10, 20])
    flushFrame()
    store().setZoom(null)
    flushFrame()
    expect(onRender).toHaveBeenCalledTimes(1)
  })
})

describe('ViewStoreProvider', () => {
  it('a new resetKey gives a fresh store without remounting the children', () => {
    const { store, rerender } = setup('first')
    const first = store()
    first.setHover({ index: 1, source: 'map' })
    flushFrame()
    const node = screen.getByText('hovered')

    rerender('second')
    expect(store()).not.toBe(first)
    expect(store().getState().hover).toBeNull()
    expect(screen.getByText('idle')).toBe(node)
  })

  it('pointCount lets the store recognise a whole-track zoom', () => {
    const onRender = vi.fn<(store: ViewStore) => void>()
    render(
      <ViewStoreProvider pointCount={50}>
        <Hovered onRender={onRender} />
      </ViewStoreProvider>,
    )
    const store = onRender.mock.lastCall![0]
    store.setZoom([0, 49])
    expect(store.getState().zoom).toBeNull()
  })

  it('the same resetKey keeps the store', () => {
    const { store, rerender } = setup('same')
    const first = store()
    rerender('same')
    expect(store()).toBe(first)
  })

  it('useViewStore throws outside a provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Hovered onRender={() => {}} />)).toThrow(/ViewStoreProvider/)
  })
})
