# v0.2 — Primer commit recomendado

## Cambio principal
Se abandona la hipótesis de crear un Supabase Central nuevo.

La arquitectura ahora reutiliza:
- **LINK PREVIEW** como Central Data Plane;
- el **Supabase operacional existente** como Operational Data Plane vía Gateway.

## Cambios técnicos
- migration 0001 ahora es aditiva sobre LINK PREVIEW;
- `clients`, `projects`, `agent_memories`, Preview Studio y sus datos se conservan;
- `control_id` se incorpora a las entidades principales;
- `agent_memories` se convierte en memoria local/proyecto canónica;
- se agregan Controls, Actors, Memberships, Need/Product/Cycles, Work Items, Folders, Artifacts, Intelligence, Gateways y Events;
- se agrega migration 0002 para hardening RLS después de Auth;
- se impide provisionar Controls directamente desde cliente;
- root_admin puede gobernar scopes hijos;
- nuevos negocios ya no requieren otro proyecto Supabase;
- health/API y documentación reflejan dos data planes Free.

## No cambia
- UI general;
- método LINK de 6 etapas;
- Acción / Tarea / Gesto;
- rutas web y MCP por scope;
- Constitución del núcleo.
