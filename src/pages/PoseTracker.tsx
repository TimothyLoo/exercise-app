import React, { useRef, useEffect, useState } from "react";
import { Pose } from "@mediapipe/pose";
import { Camera } from "@mediapipe/camera_utils";
import type { Results, NormalizedLandmark } from "@mediapipe/pose";
import poseData from "../utils/poses.json";
import {
  MAJOR_KEYS,
  KEY_TO_INDEX,
  EXCLUDE_KEYS,
  createMappers,
  computeNormalizedDistance,
  drawCircle,
  drawLabel,
} from "../utils/poseHelpers";

interface PoseGuide {
  name: string;
  description: string;
  keypoints: Record<string, number[]>;
}

// Choose up to 4 major points to compare (ignore facial/minor points)
// (MAJOR_KEYS, KEY_TO_INDEX and EXCLUDE_KEYS are imported from helpers)

const PoseTracker: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [currentPose] = useState<PoseGuide>(poseData as unknown as PoseGuide);
  const [showGuide, setShowGuide] = useState(true);

  useEffect(() => {
    if (!videoRef.current || !canvasRef.current || !containerRef.current) return;

    // Calculate responsive dimensions
    const updateDimensions = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const width = Math.floor(rect.width);
      const height = Math.floor(rect.width * 0.75); // 4:3 aspect ratio

      if (canvasRef.current) {
        canvasRef.current.width = width;
        canvasRef.current.height = height;
      }
      if (videoRef.current) {
        videoRef.current.width = width;
        videoRef.current.height = height;
      }
    };

    const pose = new Pose({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/${file}`,
    });

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
    });

    pose.onResults((results: Results) => {
      const ctx = canvasRef.current!.getContext("2d");
      if (!ctx) return;
      const cw = canvasRef.current!.width;
      const ch = canvasRef.current!.height;
      ctx.clearRect(0, 0, cw, ch);

      // Build mappers once per frame (uses intrinsic video size + canvas)
      const videoEl = videoRef.current!;
      const { mapDetected, mapGuide } = createMappers(videoEl, cw, ch);

      // Threshold in normalized (0..1) coordinates
      const thresholdNormalized = 0.06;

      if (showGuide && currentPose) {
        const guideSize = Math.max(3, Math.min(cw, ch) * 0.006);

        // Draw subtle full-body guide (exclude face/fingers)
        Object.entries(currentPose.keypoints).forEach(([k, coords]) => {
          if (EXCLUDE_KEYS.has(k)) return;
          const { x: gx, y: gy } = mapGuide(coords[0], coords[1], true);
          drawCircle(ctx as unknown as CanvasRenderingContext2D, gx, gy, Math.max(2, guideSize * 0.8), "rgba(0,255,100,0.55)", "rgba(0,0,0,0.85)", 0.8);
        });

        // Draw majors with labels and alignment checks
        MAJOR_KEYS.forEach((key) => {
          const guideCoords = currentPose.keypoints[key];
          if (!guideCoords) return;
          const { x: gx, y: gy } = mapGuide(guideCoords[0], guideCoords[1], true);

          // guide point
          drawCircle(ctx as unknown as CanvasRenderingContext2D, gx, gy, guideSize, "rgba(0,255,100,0.95)", "rgba(0,0,0,0.95)", 2);

          const idx = KEY_TO_INDEX[key];
          if (typeof idx === "number") {
            drawLabel(ctx as unknown as CanvasRenderingContext2D, String(idx), gx + guideSize + 6, gy - guideSize - 6, `${Math.max(10, Math.round(guideSize * 1.2))}px sans-serif`);
          }

          // detected landmark mapping
          if (results.poseLandmarks && typeof idx === "number" && results.poseLandmarks[idx]) {
            const detected = results.poseLandmarks[idx];
            const { x: dx, y: dy } = mapDetected(detected.x, detected.y);

            // detected point
            drawCircle(ctx as unknown as CanvasRenderingContext2D, dx, dy, Math.max(3, guideSize * 0.9), "#FF6B6B", "rgba(0,0,0,0.9)", 1);

            // alignment
            const distNorm = computeNormalizedDistance(detected.x, detected.y, 1 - guideCoords[0], guideCoords[1]);
            const aligned = distNorm <= thresholdNormalized;

            // connecting line
            ctx.beginPath();
            ctx.moveTo(gx, gy);
            ctx.lineTo(dx, dy);
            ctx.strokeStyle = aligned ? "rgba(0,200,100,0.95)" : "rgba(255,80,80,0.95)";
            ctx.lineWidth = 2;
            ctx.stroke();

            // status icon
            drawLabel(ctx as unknown as CanvasRenderingContext2D, aligned ? "✓" : "✕", dx + guideSize + 6, dy + guideSize + 6, `${Math.max(12, Math.round(guideSize * 1.5))}px sans-serif`, aligned ? "rgba(0,200,100,0.95)" : "rgba(255,80,80,0.95)");
            if (typeof idx === "number") drawLabel(ctx as unknown as CanvasRenderingContext2D, String(idx), dx + guideSize + 6, dy - guideSize - 6);
          }
        });
      }

      // subtle detected landmarks overlay
      if (results.poseLandmarks) {
        const landmarkSize = Math.max(2, Math.min(cw, ch) * 0.006);
        results.poseLandmarks.forEach((kp: NormalizedLandmark) => {
          const { x, y } = mapDetected(kp.x, kp.y);
          drawCircle(ctx as unknown as CanvasRenderingContext2D, x, y, landmarkSize, "rgba(255,107,107,0.6)");
        });
      }
    });

    updateDimensions();
    window.addEventListener("resize", updateDimensions);

    const camera = new Camera(videoRef.current, {
      onFrame: async () => await pose.send({ image: videoRef.current! }),
      width: Math.floor(containerRef.current.getBoundingClientRect().width),
      height: Math.floor(containerRef.current.getBoundingClientRect().width * 0.75),
    });
    camera.start();

    return () => {
      window.removeEventListener("resize", updateDimensions);
      camera.stop();
      pose.close();
    };
  }, [currentPose, showGuide]);

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", gap: "1rem", padding: "1rem", overflow: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: "0 0 0.5rem 0", fontSize: "1.25rem" }}>{currentPose.name}</h2>
          <p style={{ margin: 0, fontSize: "0.875rem", opacity: 0.8 }}>{currentPose.description}</p>
        </div>
      </div>
      <div
        ref={containerRef}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "100%",
          aspectRatio: "4 / 3",
          backgroundColor: "#1a1a1a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        <video
          ref={videoRef}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            display: "block",
          }}
          autoPlay
          muted
          playsInline
        />
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
          }}
        />
      </div>
      <button onClick={() => setShowGuide(!showGuide)} style={{ alignSelf: "flex-start" }}>
        {showGuide ? "Hide" : "Show"} Guide
      </button>
    </div>
  );
};

export default PoseTracker;
