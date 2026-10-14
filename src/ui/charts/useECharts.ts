import { useCallback, useState } from 'react'
import { echarts, type ECharts } from './echarts.ts'

/**
 * Creates one chart when the returned `containerRef` is attached, resizes it with the container,
 * and disposes it on detach (a React 19 callback ref with cleanup, so StrictMode's double mount is safe).
 */
export function useECharts() {
  const [chart, setChart] = useState<ECharts | null>(null)

  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return
    const c = echarts.init(node, undefined, { renderer: 'canvas' })
    const observer = new ResizeObserver(() => c.resize())
    observer.observe(node)
    setChart(c)
    return () => {
      observer.disconnect()
      c.dispose()
      setChart(null)
    }
  }, [])

  return { containerRef, chart }
}
