// Rendering components that read the shared view store.
import { render } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { useViewStore, ViewStoreProvider, type ViewStore } from '../ui/view/index.ts'

/**
 * `render` inside a `ViewStoreProvider`; `store` is the provided store (kept across `rerender`).
 * `strict` renders the whole tree in StrictMode.
 */
export function renderWithViewStore(ui: ReactElement, { strict = false } = {}) {
  let store: ViewStore | undefined
  function Capture({ children }: { children: ReactNode }) {
    store = useViewStore()
    return children
  }
  const result = render(ui, {
    reactStrictMode: strict,
    wrapper: ({ children }) => (
      <ViewStoreProvider>
        <Capture>{children}</Capture>
      </ViewStoreProvider>
    ),
  })
  if (!store) throw new Error('view store not captured')
  return { ...result, store }
}
