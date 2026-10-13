import L from 'leaflet'
import styles from './TrackMap.module.css'

// Four corner brackets: "fit to extent".
const ICON =
  '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
  '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/></svg>'

/** Map control with a "Fit to track" button that calls `onFit`. */
export function createFitControl(onFit: () => void): L.Control {
  const FitControl = L.Control.extend({
    onAdd() {
      const container = document.createElement('div')
      container.className = 'leaflet-bar'
      const button = document.createElement('button')
      button.type = 'button'
      button.className = styles.fitButton
      button.title = 'Fit to track'
      button.setAttribute('aria-label', 'Fit to track')
      button.innerHTML = ICON
      button.addEventListener('click', onFit)
      container.append(button)
      // Clicks on the button must not reach the map (e.g. double-click zoom).
      L.DomEvent.disableClickPropagation(container)
      return container
    },
  })
  return new FitControl({ position: 'topleft' })
}
