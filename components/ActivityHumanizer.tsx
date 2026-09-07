"use client";

import { useEffect } from "react";

const LABELS: Record<string, { title: string; detail: string }> = {
  "factory.version.approved": { title: "Versión aprobada", detail: "LINK Factory · Se aprobó una nueva versión" },
  "gesture.updated": { title: "Tarea actualizada", detail: "Control Central · Se modificó una tarea" },
  "twenty.webhook": { title: "CRM sincronizado", detail: "Twenty · Se recibió una actualización" },
  "factory.ai.edit_applied": { title: "Edición con IA aplicada", detail: "LINK Factory · Se aplicó una mejora al contenido" },
  "factory.product.created": { title: "Producto creado", detail: "LINK Factory · Se creó un nuevo producto" },
  "task.created": { title: "Tarea creada", detail: "Control Central · Nueva tarea registrada" },
  "task.updated": { title: "Tarea actualizada", detail: "Control Central · La tarea cambió" },
  "task.completed": { title: "Tarea cerrada", detail: "Control Central · Trabajo completado" },
  "timer.started": { title: "Cronómetro iniciado", detail: "Misión Personal · Sesión de foco iniciada" },
  "timer.paused": { title: "Cronómetro pausado", detail: "Misión Personal · Sesión de foco pausada" },
  "timer.completed": { title: "Bloque de foco cerrado", detail: "Misión Personal · Tiempo de trabajo registrado" },
};

function humanize(raw: string) {
  const known = LABELS[raw];
  if (known) return known;
  const words = raw
    .replace(/[._-]+/g, " ")
    .replace(/\b(ai)\b/gi, "IA")
    .trim();
  const title = words ? words.charAt(0).toUpperCase() + words.slice(1) : "Actividad registrada";
  return { title, detail: "Control Central · Evento registrado" };
}

export default function ActivityHumanizer() {
  useEffect(() => {
    const apply = () => {
      document.querySelectorAll<HTMLElement>(".cc-activity").forEach((row) => {
        if (row.dataset.humanized === "1") return;
        const title = row.querySelector<HTMLElement>("b");
        const meta = row.querySelector<HTMLElement>("small");
        if (!title || !meta) return;
        const raw = title.textContent?.trim() || "";
        const mapped = humanize(raw);
        const originalMeta = meta.textContent || "";
        const parts = originalMeta.split(" · ");
        const date = parts.length > 1 ? parts.slice(1).join(" · ") : originalMeta;
        title.textContent = mapped.title;
        meta.textContent = `${mapped.detail} · ${date}`;
        row.dataset.humanized = "1";
        row.title = `Evento técnico: ${raw}`;
      });

      const cards = Array.from(document.querySelectorAll<HTMLElement>(".cc-card"));
      cards.forEach((card) => {
        const heading = card.querySelector("h2");
        if (heading?.textContent?.trim() === "Event Bus") heading.textContent = "Actividad reciente";
      });

      document.querySelectorAll<HTMLElement>(".cc-hero p").forEach((p) => {
        if (p.textContent?.trim() === "Trazabilidad del sistema.") {
          p.textContent = "Qué cambió, dónde ocurrió y cuándo.";
        }
      });
    };

    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
