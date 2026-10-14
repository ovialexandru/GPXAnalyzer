/* eslint-disable react-refresh/only-export-components -- the provider and its hooks belong together */
import { createContext, useContext, useState, useSyncExternalStore, type ReactNode } from 'react'
import { createViewStore, type ViewState, type ViewStore } from './viewStore.ts'

const ViewStoreContext = createContext<ViewStore | null>(null)

interface ViewStoreProviderProps {
  /** A new value starts a fresh store (e.g. the loaded track) without remounting the children. */
  resetKey?: unknown
  children: ReactNode
}

/** Provides one store per `resetKey`. The context value changes only then, so hovering re-renders nothing here. */
export function ViewStoreProvider({ resetKey, children }: ViewStoreProviderProps) {
  const [current, setCurrent] = useState(() => ({ resetKey, store: createViewStore() }))
  if (current.resetKey !== resetKey) setCurrent({ resetKey, store: createViewStore() })
  return <ViewStoreContext.Provider value={current.store}>{children}</ViewStoreContext.Provider>
}

export function useViewStore(): ViewStore {
  const store = useContext(ViewStoreContext)
  if (!store) throw new Error('useViewStore must be used inside a ViewStoreProvider')
  return store
}

/** Re-renders only when the selected slice changes (Object.is). */
export function useViewState<T>(selector: (s: ViewState) => T): T {
  const store = useViewStore()
  return useSyncExternalStore(store.subscribe, () => selector(store.getState()))
}
