// Major keys used for alignment feedback (up to 4)
export const MAJOR_KEYS = ["left_shoulder", "right_shoulder", "left_hip", "right_hip"] as const;

// Map key names to MediaPipe Pose landmark indices
export const KEY_TO_INDEX: Record<string, number> = {
  nose: 0,
  left_eye_inner: 1,
  left_eye: 2,
  left_eye_outer: 3,
  right_eye_inner: 4,
  right_eye: 5,
  right_eye_outer: 6,
  left_ear: 7,
  right_ear: 8,
  mouth_left: 9,
  mouth_right: 10,
  left_shoulder: 11,
  right_shoulder: 12,
  left_elbow: 13,
  right_elbow: 14,
  left_wrist: 15,
  right_wrist: 16,
  left_pinky: 17,
  right_pinky: 18,
  left_index: 19,
  right_index: 20,
  left_thumb: 21,
  right_thumb: 22,
  left_hip: 23,
  right_hip: 24,
  left_knee: 25,
  right_knee: 26,
  left_ankle: 27,
  right_ankle: 28,
  left_heel: 29,
  right_heel: 30,
  left_foot_index: 31,
  right_foot_index: 32,
};

// Keys to exclude from the subtle full-body guide (face, fingers, nose)
export const EXCLUDE_KEYS = new Set([
  "nose",
  "left_eye_inner",
  "left_eye",
  "left_eye_outer",
  "right_eye_inner",
  "right_eye",
  "right_eye_outer",
  "left_ear",
  "right_ear",
  "mouth_left",
  "mouth_right",
  "left_pinky",
  "right_pinky",
  "left_index",
  "right_index",
  "left_thumb",
  "right_thumb",
]);

/**
 * Create mappers to convert normalized coordinates into canvas pixels.
 * Accounts for the video's intrinsic resolution and letterboxing when using
 * `object-fit: contain` so positions line up with what's visible to the user.
 */
export function createMappers(videoEl: HTMLVideoElement, canvasW: number, canvasH: number) {
  const videoW = videoEl.videoWidth || canvasW;
  const videoH = videoEl.videoHeight || canvasH;
  const scale = Math.min(canvasW / videoW, canvasH / videoH);
  const offsetX = (canvasW - videoW * scale) / 2;
  const offsetY = (canvasH - videoH * scale) / 2;

  const mapDetected = (normX: number, normY: number) => {
    const x = normX * videoW * scale + offsetX;
    const y = normY * videoH * scale + offsetY;
    return { x, y };
  };

  const mapGuide = (normX: number, normY: number, mirror = true) => {
    const gxNorm = mirror ? 1 - normX : normX;
    return mapDetected(gxNorm, normY);
  };

  return { mapDetected, mapGuide, videoW, videoH, scale, offsetX, offsetY };
}

/** Compute normalized Euclidean distance between two normalized landmark points. */
export function computeNormalizedDistance(x1: number, y1: number, x2: number, y2: number) {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Draw a filled circle with optional stroke. */
export function drawCircle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, stroke?: string, lineWidth = 1) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

/** Draw small text label with a solid background for legibility. */
export function drawLabel(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, font = "12px sans-serif", color = "#000") {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

export default {};
