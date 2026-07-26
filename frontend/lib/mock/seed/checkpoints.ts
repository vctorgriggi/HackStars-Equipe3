// Seed = chkData do protótipo (linhas 970–977): 6 checkpoints com vínculos de
// câmera, campos validados e limiares 90/92/90/97/88/95.
import type { Checkpoint } from "@/lib/domain/types";

export const CHECKPOINTS_SEED: Checkpoint[] = [
  { id: "cp-1", ordem: 1, nome: "Bobinagem", cameraIds: ["CAM-01"], campos: ["Serigrafia"], limiar: 90, ativo: true },
  { id: "cp-2", ordem: 2, nome: "Núcleo", cameraIds: ["CAM-02"], campos: ["Chassi"], limiar: 92, ativo: true },
  { id: "cp-3", ordem: 3, nome: "Tanque", cameraIds: ["CAM-03", "CAM-04"], campos: ["Chassi", "Serigrafia"], limiar: 90, ativo: true },
  { id: "cp-4", ordem: 4, nome: "Ensaios", cameraIds: ["CAM-05"], campos: ["Plaqueta", "Etiqueta"], limiar: 97, ativo: true },
  { id: "cp-5", ordem: 5, nome: "Pintura", cameraIds: ["CAM-06"], campos: ["Serigrafia"], limiar: 88, ativo: true },
  { id: "cp-6", ordem: 6, nome: "Expedição", cameraIds: ["CAM-07"], campos: ["Plaqueta", "Etiqueta", "Chassi"], limiar: 95, ativo: true },
];
