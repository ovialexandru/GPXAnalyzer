import { buildDataZoom } from './zoomOption.ts'

/* eslint-disable @typescript-eslint/no-explicit-any -- reading back loosely typed option objects */

function zooms(...args: Parameters<typeof buildDataZoom>): any[] {
  return buildDataZoom(...args) as any[]
}

describe('buildDataZoom', () => {
  it('the inside zoom: wheel and pinch zoom, a plain drag or wheel never pans', () => {
    const [inside] = zooms('distance', false)
    expect(inside).toMatchObject({
      type: 'inside',
      xAxisIndex: 0,
      zoomOnMouseWheel: true,
      moveOnMouseMove: false,
      moveOnMouseWheel: false,
      filterMode: 'filter',
    })
  })

  it('minimum window: 50 m on the distance axis (km), 30 s on the time axis', () => {
    expect(zooms('distance', true).map((z) => z.minValueSpan)).toEqual([0.05, 0.05])
    expect(zooms('time', true).map((z) => z.minValueSpan)).toEqual([30, 30])
  })

  it('the slider only when asked, filtering like the inside zoom', () => {
    expect(zooms('distance', false)).toHaveLength(1)
    const [inside, slider] = zooms('time', true)
    expect(inside.type).toBe('inside')
    expect(slider).toMatchObject({ type: 'slider', xAxisIndex: 0, filterMode: 'filter' })
  })

  it('the slider lines up with the plot area', () => {
    const [, slider] = zooms('distance', true)
    expect(slider).toMatchObject({ left: 64, right: 24 })
  })
})
