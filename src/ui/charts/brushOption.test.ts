import { BRUSH_CURSOR, buildBrush } from './brushOption.ts'

describe('buildBrush', () => {
  it('a single lineX band on the x axis', () => {
    expect(buildBrush()).toMatchObject({ brushType: 'lineX', brushMode: 'single', xAxisIndex: 0 })
    expect(BRUSH_CURSOR).toEqual({ brushType: 'lineX', brushMode: 'single' })
  })

  it('a new drag replaces the band, a click removes it', () => {
    expect(buildBrush()).toMatchObject({ transformable: false, removeOnClick: true })
  })

  it('no toolbox buttons and no effect on the series', () => {
    expect(buildBrush()).toMatchObject({ toolbox: [], seriesIndex: [] })
  })

  it('a translucent amber band', () => {
    expect(buildBrush()).toMatchObject({
      brushStyle: { color: 'rgba(245, 158, 11, 0.2)', borderWidth: 1 },
    })
  })
})
