import { describe, it, expect } from 'vitest'
import { createMappers, computeNormalizedDistance } from './poseHelpers'

// Use a fake video element object with videoWidth/videoHeight
function makeVideoMock(w: number, h: number) {
  return {
    videoWidth: w,
    videoHeight: h,
  } as unknown as HTMLVideoElement
}

describe('poseHelpers mappers', () => {
  it('maps center (0.5,0.5) to center of canvas when aspect matches', () => {
    const video = makeVideoMock(640, 480)
    const canvasW = 640
    const canvasH = 480
    const { mapDetected } = createMappers(video, canvasW, canvasH)

    const p = mapDetected(0.5, 0.5)
    expect(Math.round(p.x)).toBe(Math.round(canvasW / 2))
    expect(Math.round(p.y)).toBe(Math.round(canvasH / 2))
  })

  it('accounts for letterboxing when aspect differs', () => {
    const video = makeVideoMock(1920, 1080) // wide video
    const canvasW = 640
    const canvasH = 640 // force square canvas
    const { mapDetected, mapGuide } = createMappers(video, canvasW, canvasH)

    // center should still map to center of visible video area (not necessarily canvas center)
    const center = mapDetected(0.5, 0.5)
    expect(center.x).toBeGreaterThanOrEqual(0)
    expect(center.x).toBeLessThanOrEqual(canvasW)
    expect(center.y).toBeGreaterThanOrEqual(0)
    expect(center.y).toBeLessThanOrEqual(canvasH)

    // guide mirror should place x different from non-mirrored
    const normal = mapDetected(0.2, 0.3)
    const mirrored = mapGuide(0.2, 0.3, true)
    expect(Math.round(normal.x)).not.toBe(Math.round(mirrored.x))
  })
})

describe('computeNormalizedDistance', () => {
  it('returns 0 for identical points and >0 otherwise', () => {
    expect(computeNormalizedDistance(0.1, 0.2, 0.1, 0.2)).toBe(0)
    const d = computeNormalizedDistance(0.1, 0.2, 0.2, 0.2)
    expect(d).toBeGreaterThan(0)
  })
})
