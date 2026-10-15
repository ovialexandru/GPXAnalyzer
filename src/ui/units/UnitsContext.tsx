/* eslint-disable react-refresh/only-export-components -- the provider and its hook belong together */
import { createContext, useContext, useState, type ReactNode } from 'react'
import { loadUnits, saveUnits, type Units } from './units.ts'

type UnitsState = [Units, (units: Units) => void]

const UnitsContext = createContext<UnitsState>(['metric', () => {}])

/** Holds the display units, starting from (and saving to) the remembered choice. */
export function UnitsProvider({ children }: { children: ReactNode }) {
  const [units, setUnits] = useState(loadUnits)
  const update = (next: Units) => {
    setUnits(next)
    saveUnits(next)
  }
  return <UnitsContext.Provider value={[units, update]}>{children}</UnitsContext.Provider>
}

/** The display units and their setter; Metric outside a provider. */
export function useUnits(): UnitsState {
  return useContext(UnitsContext)
}
