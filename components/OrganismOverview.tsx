"use client";

import { useCallback, useEffect, useState } from "react";
import "./OrganismOverview.css";

type Organelle = {
  key: string;
  name: string;
  biologicalName: string;
  required: boolean;
  status: "active" | "ready" | "degraded" | "planned" | "disabled" | "unbound";
};
type PublicCell = {
  name: string;
  slug: string;
  summary: string | null;
  globalId: string | null;
  entityStatus: string;
  lifecycleStage: string | null;
  declaredHealth: string;
  autonomyLevel: number | null;
  constitutionVersion: string | null;
  organelles: Organelle[];
  counts: { active: number; ready: number; required: number; requiredActive: number };
};
type OrganismResponse = {
  ok: boolean;
  observedAt: string;
  businesses: PublicCell[];
  mode: string;
  barrio: { state: string };
  error?: string;
};

const STATUS: Record<Organelle["status"], string> = {
  active: "Marcado activo",
  ready: "Preparado",
  degraded: "Degradado",
  planned: "Planificado",
  disabled: "Desactivado",
  unbound: "Sin vínculo",
};

export default function OrganismOverview() {
  const [snapshot, setSnapshot] = useState<OrganismResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const response = await fetch("/api/organism", { cache: "no-store", signal });
      const value: OrganismResponse = await response.json();
      if (!response.ok || !value.ok) {
        throw new Error(value.error || "No se pudo consultar el organismo.");
      }
      if (!signal?.aborted) {
        setSnapshot(value);
        setError("");
      }
    } catch (caught) {
      if (!signal?.aborted) {
        setError(caught instanceof Error ? caught.message : "No se pudo consultar el organismo.");
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  return (
    <section className="organism-observatory" aria-label="Observatorio del organismo LINK">
      <div className="organism-head">
        <div>
          <span className="organism-eyebrow">CONTROL CENTRAL · ORGANISMO</span>
          <h2>Las células de LINK</h2>
          <p>Una lectura del núcleo real. Cada negocio conserva su ficha y su verdad en LINK WORLD.</p>
        </div>
        <button type="button" disabled={loading} onClick={() => void refresh()}>
          {loading ? "Consultando…" : "↻ Actualizar"}
        </button>
      </div>
      {error && <p className="organism-error" role="alert">No se pudo actualizar el observatorio: {error}. No se muestran cifras inventadas.</p>}
      {loading && !snapshot && <p className="organism-placeholder">Consultando el núcleo celular en Supabase…</p>}
      {!loading && !error && snapshot?.businesses.length === 0 &&
        <p className="organism-placeholder">No hay negocios marcados para la lectura pública.</p>}
      {snapshot?.businesses.map((cell) => (
        <article className="organism-cell" key={cell.globalId || cell.slug}>
          <div className="organism-cell-top">
            <div>
              <span className="organism-eyebrow">CÉLULA · {cell.slug}</span>
              <h3>{cell.name}</h3>
              <p>{cell.summary || "Sin resumen público."}</p>
            </div>
            <a href="https://link-world-delta.vercel.app/" target="_blank" rel="noopener noreferrer">
              Abrir LINK WORLD ↗
            </a>
          </div>
          <div className="organism-facts">
            <div><small>Identidad global</small><strong className="organism-id">{cell.globalId || "Sin registrar"}</strong></div>
            <div><small>Ciclo vital</small><strong>{cell.lifecycleStage || "Sin registrar"}</strong></div>
            <div><small>Salud declarada</small><strong>{cell.declaredHealth === "unknown" ? "Por verificar" : cell.declaredHealth}</strong></div>
            <div><small>Autonomía</small><strong>{cell.autonomyLevel === null ? "—" : cell.autonomyLevel + " / 5"}</strong></div>
          </div>
          <div className="organism-statusline">
            <span><b>{cell.counts.active}</b> organelos marcados activos</span>
            <span><b>{cell.counts.ready}</b> preparados</span>
            <span><b>{cell.counts.requiredActive} / {cell.counts.required}</b> indispensables activos</span>
          </div>
          <div className="organism-organelles">
            {cell.organelles.map((organelle) => (
              <div className={`organism-organelle is-${organelle.status}`} key={organelle.key}>
                <span>{organelle.name}</span>
                <small>{organelle.required ? "Indispensable · " : ""}{STATUS[organelle.status]}</small>
              </div>
            ))}
          </div>
          <p className="organism-footnote">
            Constitución: {cell.constitutionVersion || "pendiente"}.
            “Preparado” no acredita una integración activa. El estado de salud no se deduce de la cantidad de vínculos.
          </p>
        </article>
      ))}
      {snapshot && <div className="organism-meta">
        <span>Lectura pública acotada · {new Date(snapshot.observedAt).toLocaleString("es-CL")}</span>
        <span>Barrio LINK: información privada; aún no incluida en esta vista.</span>
      </div>}
    </section>
  );
}
