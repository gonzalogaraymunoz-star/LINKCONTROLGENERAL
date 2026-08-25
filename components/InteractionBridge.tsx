"use client";

import { useEffect } from "react";

type DemoState = Record<string, boolean>;

const STORAGE_KEY = "link-control-demo-checks-v1";

function readState(): DemoState {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}") as DemoState;
  } catch {
    return {};
  }
}

function writeState(state: DemoState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function notify(message: string) {
  let toast = document.getElementById("lc-demo-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "lc-demo-toast";
    Object.assign(toast.style, {
      position: "fixed",
      left: "50%",
      bottom: "26px",
      transform: "translateX(-50%) translateY(12px)",
      padding: "10px 14px",
      borderRadius: "999px",
      background: "#1d1d1f",
      color: "#fff",
      fontSize: "11px",
      zIndex: "9999",
      opacity: "0",
      transition: "180ms ease",
      boxShadow: "0 16px 50px rgba(0,0,0,.18)",
      pointerEvents: "none",
    });
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.opacity = "1";
  toast.style.transform = "translateX(-50%) translateY(0)";
  window.setTimeout(() => {
    if (!toast) return;
    toast.style.opacity = "0";
    toast.style.transform = "translateX(-50%) translateY(12px)";
  }, 1900);
}

function activeClientName() {
  return document.querySelector<HTMLElement>(".crmTitle h2")?.textContent?.trim() || "cliente";
}

function itemKey(item: Element) {
  const title = item.querySelector<HTMLElement>("strong")?.textContent?.trim() || "item";
  const kind = item.classList.contains("gesture") ? "gesture" : "action";
  return `${activeClientName()}::${kind}::${title}`;
}

function updateCheckVisual(item: Element, done: boolean) {
  const check = item.querySelector<HTMLElement>(".check");
  const status = item.querySelector<HTMLElement>("small");
  if (!check) return;
  check.classList.toggle("done", done);
  check.textContent = done ? "✓" : "";
  check.setAttribute("role", "checkbox");
  check.setAttribute("aria-checked", done ? "true" : "false");
  check.setAttribute("tabindex", "0");
  check.setAttribute("title", done ? "Marcar como pendiente" : "Marcar como completada");
  check.style.cursor = "pointer";
  if (status) status.textContent = done ? "Completada" : "Pendiente";
}

function updateClientProgress() {
  const items = Array.from(document.querySelectorAll(".crmMain .actionItem"));
  if (!items.length) return;
  const completed = items.filter((item) => item.querySelector(".check.done")).length;
  const completion = Math.round((completed / items.length) * 100);

  const titleMeta = document.querySelector<HTMLElement>(".crmTitle p");
  if (titleMeta) {
    titleMeta.textContent = titleMeta.textContent?.replace(/·\s*\d+%\s*·/, `· ${completion}% ·`) || `${completion}%`;
  }

  const activeRow = document.querySelector<HTMLElement>(".clientRow.active small");
  if (activeRow) activeRow.textContent = activeRow.textContent?.replace(/·\s*\d+%/, `· ${completion}%`) || `${completion}%`;
}

function hydrateChecks() {
  const state = readState();
  document.querySelectorAll(".crmMain .actionItem").forEach((item) => {
    const key = itemKey(item);
    const serverDone = item.querySelector(".check")?.classList.contains("done") ?? false;
    const done = Object.prototype.hasOwnProperty.call(state, key) ? state[key] : serverDone;
    updateCheckVisual(item, done);
  });
  updateClientProgress();
}

function addSimpleClient() {
  const name = window.prompt("Nombre del nuevo cliente");
  if (!name?.trim()) return;
  const list = document.querySelector<HTMLElement>(".crmList");
  if (!list) return;
  const row = document.createElement("button");
  row.className = "clientRow";
  row.innerHTML = `<i style="background:#8c8c88"></i><span><strong>${name.replace(/[<>]/g, "")}</strong><small>① Entender · 0%</small></span>`;
  row.addEventListener("click", () => notify(`${name}: ficha demo creada. Se persistirá en Supabase al conectar el CRM.`));
  list.appendChild(row);
  notify(`Cliente creado en modo demo: ${name}`);
}

function addSimpleWork() {
  const title = window.prompt("Nombre del trabajo o tarea");
  if (!title?.trim()) return;
  const col = document.querySelector<HTMLElement>(".kcol");
  if (!col) return;
  const card = document.createElement("button");
  card.className = "kcard";
  card.innerHTML = `<div class="kname"><i style="background:#8c8c88"></i>${title.replace(/[<>]/g, "")}</div><p>Trabajo agregado manualmente en modo demo.</p><div class="kfoot"><span>0 gestos · 1 acción</span><b>0%</b></div>`;
  col.appendChild(card);
  notify(`Trabajo agregado: ${title}`);
}

function addArtifact() {
  const name = window.prompt("Nombre del artifact o producto");
  if (!name?.trim()) return;
  const grid = document.querySelector<HTMLElement>(".artifactGrid");
  if (!grid) return;
  const item = document.createElement("div");
  item.className = "artifact";
  item.innerHTML = `<div class="thumb"><span>NUEVO</span></div><div class="artifactInfo"><strong>${name.replace(/[<>]/g, "")}</strong><small>v1 · Demo · Manual</small></div>`;
  grid.prepend(item);
  notify(`Artifact registrado: ${name}`);
}

function addGateway() {
  const name = window.prompt("Nombre del nuevo Gateway");
  if (!name?.trim()) return;
  const grid = document.querySelector<HTMLElement>(".gatewayGrid");
  if (!grid) return;
  const item = document.createElement("div");
  item.className = "gateway";
  item.innerHTML = `<div class="gatewayTitle"><strong>${name.replace(/[<>]/g, "")}</strong><span class="status warn"></span></div><p>Gateway creado en modo demo. Falta configurar credenciales y políticas.</p><div class="permList"><span>SCOPED</span><span>PENDING</span></div>`;
  grid.appendChild(item);
  notify(`Gateway creado: ${name}`);
}

function addControl() {
  const name = window.prompt("Nombre del nuevo Control");
  if (!name?.trim()) return;
  const grid = document.querySelector<HTMLElement>(".controlGrid");
  if (!grid) return;
  const scope = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  const item = document.createElement("div");
  item.className = "controlCard";
  item.innerHTML = `<h3>${name.replace(/[<>]/g, "")}</h3><p>scope: ${scope} · ChatGPT pendiente</p><div class="healthGrid"><span>Supabase <i class="status warn"></i></span><span>GitHub <i class="status warn"></i></span><span>Vercel <i class="status warn"></i></span><span>MCP <i class="status warn"></i></span></div><small>Control creado en modo demo</small>`;
  grid.appendChild(item);
  notify(`Control creado: ${name}`);
}

export default function InteractionBridge() {
  useEffect(() => {
    hydrateChecks();

    const observer = new MutationObserver(() => hydrateChecks());
    observer.observe(document.body, { childList: true, subtree: true });

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const check = target.closest<HTMLElement>(".check");
      if (check) {
        event.preventDefault();
        event.stopPropagation();
        const item = check.closest(".actionItem");
        if (!item) return;
        const key = itemKey(item);
        const state = readState();
        const current = Object.prototype.hasOwnProperty.call(state, key) ? state[key] : check.classList.contains("done");
        state[key] = !current;
        writeState(state);
        updateCheckVisual(item, !current);
        updateClientProgress();
        notify(!current ? "Marcado como completado" : "Marcado como pendiente");
        return;
      }

      const button = target.closest<HTMLButtonElement>("button");
      if (!button) return;
      const label = button.textContent?.replace(/\s+/g, " ").trim() || "";

      if (label.includes("＋ Cliente")) { event.preventDefault(); addSimpleClient(); return; }
      if (label.includes("＋ Trabajo")) { event.preventDefault(); addSimpleWork(); return; }
      if (label.includes("＋ Registrar artifact")) { event.preventDefault(); addArtifact(); return; }
      if (label.includes("＋ Gateway")) { event.preventDefault(); addGateway(); return; }
      if (label.includes("＋ Crear Control")) { event.preventDefault(); addControl(); return; }
      if (label === "Abrir con ChatGPT") { event.preventDefault(); document.querySelector<HTMLButtonElement>(".chatFab")?.click(); return; }
      if (label === "Renombrar") {
        event.preventDefault();
        const active = document.querySelector<HTMLButtonElement>(".folders button.active");
        if (!active) return;
        const next = window.prompt("Nuevo nombre", active.textContent?.replace(/^[⌄▸]\s*/, "") || "");
        if (next?.trim()) { active.textContent = `▸ ${next}`; notify("Carpeta renombrada en modo demo"); }
        return;
      }
      if (label === "Archivar") {
        event.preventDefault();
        const active = document.querySelector<HTMLButtonElement>(".folders button.active");
        if (!active) return;
        if ((active.textContent || "").includes("LINK CONTROL CENTRAL")) { notify("El núcleo central no puede archivarse"); return; }
        active.remove();
        notify("Carpeta archivada en modo demo");
        return;
      }
      if (label === "Versions" || label === "Versiones") { event.preventDefault(); notify("Historial de versiones preparado; se conectará a artifacts/versiones de Supabase"); return; }
      if (label === "Candidatos") { event.preventDefault(); notify("Mostrando candidatos a memoria central"); return; }
      if (label === "Mantener local") { event.preventDefault(); button.closest(".intelCard")?.setAttribute("data-state", "local"); notify("Inteligencia mantenida como memoria local"); return; }
      if (label === "Promover") { event.preventDefault(); button.closest(".intelCard")?.setAttribute("data-state", "promoted"); button.textContent = "Promovida ✓"; notify("Promovida como candidata central en modo demo"); return; }
      if (label.includes("Google Calendar")) { event.preventDefault(); notify("Google Calendar requiere autorización del Gateway; la conexión aún no está configurada"); return; }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if ((event.key === "Enter" || event.key === " ") && target.classList.contains("check")) {
        event.preventDefault();
        target.click();
      }
    };

    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      observer.disconnect();
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, []);

  return null;
}
