// Seed = camData do protótipo (linhas 959–968): CAM-01..08, CAM-08 offline.
import type { Camera } from "@/lib/domain/types";

export const CAMERAS_SEED: Camera[] = Array.from({ length: 8 }, (_, i) => {
  const n = String(i + 1).padStart(2, "0");
  return {
    id: `CAM-${n}`,
    endpoint: `rtsp://linha-1.trael/cam-${n}`,
    online: i !== 7,
  };
});
