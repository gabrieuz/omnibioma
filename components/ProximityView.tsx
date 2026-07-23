"use client";

import { useMemo, useState } from "react";
import { Compass, Droplets, Flame, Layers3, MapPin, Trash2, type LucideIcon } from "lucide-react";
import type { Occurrence, ProgressState } from "@/lib/contracts";
import {
  closestSimilarDistance,
  eligibleProximityOccurrences,
  groupProximityOccurrences,
  projectCoordinates,
  type LocatedOccurrence,
  type ProximityCategory,
  type ProximityGroup
} from "@/lib/proximity";
import { categoryLabel } from "@/lib/rules";

type Filter = "all" | ProximityCategory;
type Selection = { kind: "individual" | "group"; id: string };

const WIDTH = 640;
const HEIGHT = 360;

const categoryVisuals: Record<ProximityCategory, { shortLabel: string; color: string; Icon: LucideIcon }> = {
  fire_smoke: { shortLabel: "Fogo/fumaça", color: "#bd4c2b", Icon: Flame },
  water_contamination: { shortLabel: "Água", color: "#2676a8", Icon: Droplets },
  waste_disposal: { shortLabel: "Resíduos", color: "#587846", Icon: Trash2 }
};

const progressLabels: Record<ProgressState, string> = {
  registered: "Registrado",
  reviewed: "Revisado",
  forwarded: "Encaminhado",
  in_progress: "Em andamento",
  resolved: "Resolvido"
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
}

function scaleDistance(kmPerPixel: number) {
  const targetKm = kmPerPixel * 76;
  const power = 10 ** Math.floor(Math.log10(Math.max(targetKm, 0.001)));
  const normalized = targetKm / power;
  const nice = normalized >= 5 ? 5 : normalized >= 2 ? 2 : 1;
  const km = nice * power;
  return { km, pixels: km / kmPerPixel };
}

function IndividualDetails({ item, all }: { item: LocatedOccurrence; all: LocatedOccurrence[] }) {
  const nearest = closestSimilarDistance(item, all);
  const occurrence = item.occurrence;
  return <article className="proximity-detail" aria-live="polite">
    <div className="proximity-detail-heading">
      <span className="proximity-swatch" style={{ backgroundColor: categoryVisuals[item.category].color }} />
      <div><p className="eyebrow">Registro selecionado</p><h3>{categoryLabel[item.category]}</h3></div>
    </div>
    <dl className="proximity-facts">
      <div><dt>Data</dt><dd>{formatDate(occurrence.observedAt)}</dd></div>
      <div><dt>Local</dt><dd>{occurrence.placeDescription || "Local não informado"}</dd></div>
      <div><dt>Atenção</dt><dd>{occurrence.attention ?? "Não calculada"}</dd></div>
      <div><dt>Andamento</dt><dd>{progressLabels[occurrence.progress]}</dd></div>
      <div><dt>Semelhante mais próximo</dt><dd>{nearest === undefined ? "Nenhum outro localizado" : `${nearest.toFixed(1)} km`}</dd></div>
    </dl>
  </article>;
}

function GroupDetails({ group }: { group: ProximityGroup }) {
  return <article className="proximity-detail proximity-detail-group" aria-live="polite">
    <div className="proximity-detail-heading">
      <span className="proximity-swatch proximity-swatch-halo" style={{ backgroundColor: categoryVisuals[group.category].color }} />
      <div><p className="eyebrow">Possível padrão recente</p><h3>{categoryLabel[group.category]}</h3></div>
    </div>
    <dl className="proximity-facts">
      <div><dt>Registros</dt><dd>{group.items.length}</dd></div>
      <div><dt>Período</dt><dd>{formatDate(group.startAt)} a {formatDate(group.endAt)} ({group.periodDays} dias)</dd></div>
      <div><dt>Menor distância</dt><dd>{group.minimumDistanceKm.toFixed(1)} km</dd></div>
    </dl>
    <div className="proximity-records"><h4>Registros envolvidos</h4><ul>{group.items.map(({ occurrence }) => <li key={occurrence.id}><MapPin size={15} aria-hidden="true" /><span>{formatDate(occurrence.observedAt)} · {occurrence.placeDescription || "Local não informado"}</span></li>)}</ul></div>
  </article>;
}

export function ProximityView({ items }: { items: Occurrence[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [selection, setSelection] = useState<Selection>();
  const located = useMemo(() => eligibleProximityOccurrences(items), [items]);
  const grouped = useMemo(() => groupProximityOccurrences(items), [items]);
  const counts = useMemo(() => ({
    all: located.length,
    fire_smoke: located.filter((item) => item.category === "fire_smoke").length,
    water_contamination: located.filter((item) => item.category === "water_contamination").length,
    waste_disposal: located.filter((item) => item.category === "waste_disposal").length
  }), [located]);

  const visibleGroups = grouped.groups.filter((group) => filter === "all" || group.category === filter);
  const visibleIndividuals = grouped.individuals.filter((item) => filter === "all" || item.category === filter);
  const markers = [
    ...visibleGroups.map((group) => ({ id: group.id, coordinates: group.coordinates })),
    ...visibleIndividuals.map((item) => ({ id: item.occurrence.id, coordinates: item.coordinates }))
  ];
  const projection = projectCoordinates(markers, {
    width: WIDTH,
    height: HEIGHT,
    padding: { top: 96, right: 46, bottom: 86, left: 46 }
  });
  const positions = new Map(projection.points.map((point) => [point.id, point]));
  const scale = scaleDistance(projection.kmPerPixel);
  const selectedIndividual = selection?.kind === "individual" ? located.find((item) => item.occurrence.id === selection.id) : undefined;
  const selectedGroup = selection?.kind === "group" ? grouped.groups.find((group) => group.id === selection.id) : undefined;

  const selectFilter = (next: Filter) => {
    setFilter(next);
    setSelection(undefined);
  };
  const selectMarker = (next: Selection) => setSelection(next);
  const markerKeyDown = (event: React.KeyboardEvent<SVGGElement>, next: Selection) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectMarker(next);
    }
  };

  return <section className="map-card proximity-card" aria-labelledby="proximity-title">
    <div className="proximity-head"><div><p className="eyebrow">Memória espacial local</p><h2 id="proximity-title">Visão de proximidade</h2><p className="map-caption">{located.length} {located.length === 1 ? "registro localizado" : "registros localizados"} · visualização esquemática, não é mapa de navegação</p></div><Compass size={25} aria-hidden="true" /></div>

    {!located.length ? <div className="proximity-empty"><MapPin size={28} aria-hidden="true" /><h3>Nenhum registro elegível</h3><p>Registros analisados com localização aparecerão aqui. Situações incertas ou fora do escopo não entram nesta visão.</p></div> : <>
      {grouped.groups.length > 0 ? <div className="pattern-notice"><span className="pattern-count">{grouped.groups.length}</span><span><strong>{grouped.groups.length === 1 ? "Possível padrão recente" : "Possíveis padrões recentes"}</strong><small>Concentração histórica da mesma categoria em até 2 km e 14 dias; não indica causa nem previsão.</small></span></div> : <p className="pattern-quiet">Nenhum padrão recente com pelo menos três registros foi identificado.</p>}

      <div className="proximity-filters" role="group" aria-label="Filtrar registros por categoria">
        <button type="button" className={filter === "all" ? "active" : ""} aria-pressed={filter === "all"} onClick={() => selectFilter("all")}><Layers3 size={17} aria-hidden="true" /><span>Todos</span><strong>{counts.all}</strong></button>
        {(Object.keys(categoryVisuals) as ProximityCategory[]).map((category) => {
          const { Icon, shortLabel, color } = categoryVisuals[category];
          return <button type="button" key={category} className={filter === category ? "active" : ""} style={{ "--marker-color": color } as React.CSSProperties} aria-pressed={filter === category} onClick={() => selectFilter(category)}><Icon size={17} aria-hidden="true" /><span>{shortLabel}</span><strong>{counts[category]}</strong></button>;
        })}
      </div>

      {markers.length ? <div className="proximity-map-wrap">
        <svg className="proximity-map" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-label={`${markers.length} marcadores esquemáticos; selecione um para ver detalhes`}>
          <title>Distribuição esquemática dos registros por proximidade</title>
          <rect width={WIDTH} height={HEIGHT} rx="18" className="map-background" />
          <g className="map-grid" aria-hidden="true">{[1, 2, 3, 4, 5, 6, 7].map((step) => <line key={`v-${step}`} x1={step * WIDTH / 8} y1="0" x2={step * WIDTH / 8} y2={HEIGHT} />)}{[1, 2, 3, 4].map((step) => <line key={`h-${step}`} x1="0" y1={step * HEIGHT / 5} x2={WIDTH} y2={step * HEIGHT / 5} />)}</g>
          <g className="north-indicator" aria-hidden="true"><path d="M600 46 L608 66 L600 61 L592 66 Z" /><text x="600" y="35">N</text></g>
          {visibleGroups.map((group) => {
            const point = positions.get(group.id);
            if (!point) return null;
            const selected = selection?.kind === "group" && selection.id === group.id;
            const color = categoryVisuals[group.category].color;
            const label = `${categoryLabel[group.category]}, grupo com ${group.items.length} registros`;
            return <g key={group.id} className={`map-marker group-marker ${selected ? "selected" : ""}`} role="button" tabIndex={0} aria-label={label} onClick={() => selectMarker({ kind: "group", id: group.id })} onKeyDown={(event) => markerKeyDown(event, { kind: "group", id: group.id })}>
              <circle cx={point.x} cy={point.y} r="25" fill={color} className="marker-halo" />
              <circle cx={point.x} cy={point.y} r="16" fill={color} className="marker-core" />
              <text x={point.x} y={point.y + 5}>{group.items.length}</text>
            </g>;
          })}
          {visibleIndividuals.map((item) => {
            const point = positions.get(item.occurrence.id);
            if (!point) return null;
            const selected = selection?.kind === "individual" && selection.id === item.occurrence.id;
            const color = categoryVisuals[item.category].color;
            const label = `${categoryLabel[item.category]}, ${formatDate(item.occurrence.observedAt)}`;
            return <g key={item.occurrence.id} className={`map-marker individual-marker ${selected ? "selected" : ""}`} role="button" tabIndex={0} aria-label={label} onClick={() => selectMarker({ kind: "individual", id: item.occurrence.id })} onKeyDown={(event) => markerKeyDown(event, { kind: "individual", id: item.occurrence.id })}>
              <circle cx={point.x} cy={point.y} r="10" fill={color} className="marker-core" />
              <circle cx={point.x} cy={point.y} r="2.5" className="marker-dot" />
            </g>;
          })}
          <g className="map-scale" aria-hidden="true"><line x1="28" y1="326" x2={28 + scale.pixels} y2="326" /><line x1="28" y1="320" x2="28" y2="332" /><line x1={28 + scale.pixels} y1="320" x2={28 + scale.pixels} y2="332" /><text x="28" y="313">{scale.km < 1 ? `${Math.round(scale.km * 1000)} m` : `${scale.km} km`} aprox.</text></g>
        </svg>
        <p className="map-instruction">Toque ou use o teclado para selecionar um marcador. A grade indica distância relativa; coordenadas exatas não são exibidas.</p>
      </div> : <div className="proximity-empty proximity-filter-empty"><h3>Nenhum registro neste filtro</h3><p>Escolha outra categoria para voltar à visão espacial.</p></div>}

      {selectedIndividual && <IndividualDetails item={selectedIndividual} all={located} />}
      {selectedGroup && <GroupDetails group={selectedGroup} />}
    </>}
  </section>;
}
