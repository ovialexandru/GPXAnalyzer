// Rendering components that read the shared view store.
import { render } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { useViewStore, ViewStoreProvider, type ViewStore } from '../ui/view/index.ts'

interface Options {
  /** Render the whole tree in StrictMode. */
  strict?: boolean
  /** Passed to the provider, so a whole-track zoom is stored as null. */
  pointCount?: number
}

/** `render` inside a `ViewStoreProvider`; `store` is the provided store (kept across `rerender`). */
export function renderWithViewStore(
  ui: ReactElement,
  { strict = false, pointCount }: Options = {},
) {
  let store: ViewStore | undefined
  function Capture({ children }: { children: ReactNode }) {
    store = useViewStore()
    return children
  }
  const result = render(ui, {
    reactStrictMode: strict,
    wrapper: ({ children }) => (
      <ViewStoreProvider pointCount={pointCount}>
        <Capture>{children}</Capture>
      </ViewStoreProvider>
    ),
  })
  if (!store) throw new Error('view store not captured')
  return { ...result, store }
}
