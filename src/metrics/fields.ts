import type { Track } from '../model/index.ts'

/** Which optional point fields appear in a track. */
export interface AvailableFields {
  ele: boolean
  time: boolean
  hr: boolean
  cad: boolean
}

/** A field counts as available if any point has it. */
export function getAvailableFields(track: Track): AvailableFields {
  const fields: AvailableFields = { ele: false, time: false, hr: false, cad: false }
  for (const p of track.points) {
    if (p.ele !== undefined) fields.ele = true
    if (p.time !== undefined) fields.time = true
    if (p.hr !== undefined) fields.hr = true
    if (p.cad !== undefined) fields.cad = true
    if (fields.ele && fields.time && fields.hr && fields.cad) break
  }
  return fields
}
