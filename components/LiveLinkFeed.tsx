"use client";

import { useEffect, useMemo, useState } from "react";

type ActorState = {
  slug: string;
  dotSlug: string;
  name: string;
  area: string;
  state: string;
  stateLabel: string;
  focus?: string | null;
  lastWakeAt?: string | null;
  pendingApprovals: number;
  href: string;
};

type Story = {
  id: string;
  at?: string | null;
  actor: string;
  actorSlug: string;
  tone: string;
  headline: string;
  detail: string;
  href: string;
};

type Feed = {
  ok: boolean;
  generatedAt: string;
  refreshMs: number;
  engine: {
    cadence: string;
    activeAgents: number;
    workingNow: number;
    pendingApprovals: number;
    activeQueue: number;
    blocked: number;
    lastWakeAt?: string | null;
  };
  actors: ActorState[];
  stories: Story[];
};

function relativeTime(value?: string | null) {
  if (!value) return "sin hora";
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  if (!Number.isFinite(diff)) return "sin hora";
  const sec = Math.max(0, Math.floor(diff / 1000));
  if (sec < 15) return "ahora";
  if (sec < 60) return `hace ${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `hace ${min} min`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `hace ${hours} h`;
  return new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short" }).format(date);
}

function stateTone(state: string) {
  if (state === "blocked") return " is-danger";
  if (state === "waiting_approval" || state === "retry_wait") return " is-warn";
  if (state === "processing" || state === "working" || state === "queued") return " is-live";
  return "";
}

export default function LiveLinkFeed() {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [error, setError] = useState("");
  const [storyIndex, setStoryIndex] = useState(0);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    async function load() {
      try {
        const response = await fetch("/api/live-feed", { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok || !payload?.ok) throw new Error(payload?.error || "live_feed_unavailable");
        if (!active) return;
        setFeed(payload);
        setError("");
      } catch (err: any) {
        if (!active) return;
        setError(err?.message || "No pudimos leer el movimiento de LINK");
      }
    }

    void load();
    timer = setInterval(() => void load(), 5000);

    return () => {
      active = false;
      if (timer) clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!feed?.stories?.length) return;
    if (storyIndex >= feed.stories.length) setStoryIndex(0);
    const timer = setInterval(() => {
      setStoryIndex((current) => (current + 1) % Math.min(feed.stories.length, 8));
    }, 6500);
    return () => clearInterval(timer);
  }, [feed?.stories?.length, storyIndex]);

  const featured = feed?.stories?.[storyIndex] || feed?.stories?.[0] || null;
  const recent = useMemo(() => (feed?.stories || []).slice(0, 6), [feed?.stories]);

  if (!feed && !error) {
    return (
      <section className="cc-live-panel">
        <div className="cc-live-loading">
          <span className="cc-live-dot is-live" />
          <b>Abriendo LINK en vivo…</b>
        </div>
      </section>
    );
  }

  if (error && !feed) {
    return (
      <section className="cc-live-panel">
        <div className="cc-live-loading is-error">
          <span className="cc-live-dot is-danger" />
          <div><b>No pudimos leer el movimiento en vivo.</b><small>{error}</small></div>
        </div>
      </section>
    );
  }

  return (
    <section className="cc-live-panel" aria-live="polite">
      <header className="cc-live-head">
        <div>
          <span className="cc-live-dot is-live" />
          <div>
            <span className="cc-eyebrow">LINK EN VIVO</span>
            <h2>Qué está pasando ahora</h2>
          </div>
        </div>
        <small>Actualiza cada 5 segundos · motor {feed?.engine.cadence}</small>
      </header>

      <div className="cc-live-actor-strip">
        {feed?.actors.map((actor) => (
          <a key={actor.slug} href={actor.href} title={actor.focus || actor.stateLabel}>
            <span className={"cc-live-dot" + stateTone(actor.state)} />
            <div>
              <b>{actor.name}</b>
              <small>{actor.stateLabel}</small>
            </div>
            {actor.pendingApprovals ? <em>{actor.pendingApprovals}</em> : null}
          </a>
        ))}
      </div>

      <div className="cc-live-main">
        <article className={"cc-live-featured tone-" + (featured?.tone || "quiet")} key={featured?.id || "empty"}>
          {featured ? (
            <>
              <div className="cc-live-story-meta">
                <span>{featured.actor}</span>
                <small>{relativeTime(featured.at)}</small>
              </div>
              <h3>{featured.headline}</h3>
              <p>{featured.detail}</p>
              <footer>
                <a href={featured.href}>Ver actor →</a>
                <div className="cc-live-story-dots">
                  {recent.map((story, index) => (
                    <button
                      key={story.id}
                      className={index === storyIndex ? " is-current" : ""}
                      onClick={() => setStoryIndex(index)}
                      aria-label={`Ver noticia ${index + 1}`}
                    />
                  ))}
                </div>
              </footer>
            </>
          ) : (
            <div className="cc-live-empty-copy">
              <h3>No hay señales recientes.</h3>
              <p>El motor sigue disponible; aparecerán noticias cuando un actor despierte o reciba trabajo.</p>
            </div>
          )}
        </article>

        <aside className="cc-live-engine">
          <span className="cc-eyebrow">MOTOR DE TRABAJO</span>
          <div className="cc-live-engine-grid">
            <div><strong>{feed?.engine.workingNow || 0}</strong><span>en movimiento</span></div>
            <div className={(feed?.engine.pendingApprovals || 0) ? " is-warn" : ""}><strong>{feed?.engine.pendingApprovals || 0}</strong><span>esperan aprobación</span></div>
            <div><strong>{feed?.engine.activeQueue || 0}</strong><span>trabajos abiertos</span></div>
            <div className={(feed?.engine.blocked || 0) ? " is-danger" : ""}><strong>{feed?.engine.blocked || 0}</strong><span>actores bloqueados</span></div>
          </div>
          <small className="cc-live-last">Último despertar: {relativeTime(feed?.engine.lastWakeAt)}</small>
        </aside>
      </div>

      <div className="cc-live-ticker">
        {recent.map((story) => (
          <button key={story.id} onClick={() => {
            const index = recent.findIndex((item) => item.id === story.id);
            if (index >= 0) setStoryIndex(index);
          }}>
            <small>{relativeTime(story.at)}</small>
            <b>{story.headline}</b>
          </button>
        ))}
      </div>
    </section>
  );
}
