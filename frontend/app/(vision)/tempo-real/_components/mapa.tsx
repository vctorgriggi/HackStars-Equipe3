"use client";

// Mapa da esteira: canvas lógico 760×448 (ou 320×824 compacto) com
// transform: scale(). O ninho de 3 divs é necessário: scale() não afeta
// layout, então o clipper em px reais reserva o espaço que o canvas escalado
// ocupa (sem ele o card guardaria 760×448 sempre).

import { useRef } from "react";
import { useRealtime } from "@/lib/stores/realtime";
import { CANVAS } from "./geometria";
import { Belt } from "./belt";
import { CheckpointBox } from "./checkpoint-box";
import { Sprite } from "./sprite";
import { useMapaLayout } from "./use-mapa-layout";

export function MapaEsteira({
  nomes,
  onSelect,
}: {
  nomes: readonly string[];
  onSelect: (index: number) => void;
}) {
  const medidorRef = useRef<HTMLDivElement>(null);
  const { compact, scale } = useMapaLayout(medidorRef);
  const { w, h, pos, belts } = compact ? CANVAS.compact : CANVAS.desktop;
  const movimento = useRealtime((s) => s.movimento);

  return (
    <div className="min-w-0 flex-1 overflow-hidden rounded-lg border border-line bg-surface-1 p-3 shadow-1">
      {/* medidor fluido com altura reservada; o canvas de 760px é ABSOLUTO
          para a largura fixa não propagar como min-content e estourar o
          grid/flex da página (o clipper em fluxo fazia o painel lateral
          sair da tela). */}
      <div
        ref={medidorRef}
        className="relative w-full overflow-hidden"
        style={{ height: Math.round(h * scale) }}
      >
        <div
          className="absolute top-0"
          style={{
            left: "50%",
            marginLeft: -Math.round((w * scale) / 2),
          }}
        >
          <div
            className="relative overflow-hidden"
            style={{
              width: w,
              height: h,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            {belts.map((seg, i) => (
              <Belt key={`${compact}-${i}`} seg={seg} />
            ))}
            <Sprite movimento={movimento} compact={compact} />
            {nomes.map((nome, i) => (
              <CheckpointBox
                key={i}
                index={i}
                nome={nome}
                x={pos[i][0]}
                y={pos[i][1]}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
