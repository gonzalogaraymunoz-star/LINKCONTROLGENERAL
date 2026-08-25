"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Popover from "@radix-ui/react-popover";
import * as Tooltip from "@radix-ui/react-tooltip";
import { AnimatePresence, motion } from "motion/react";
import { FormEvent, KeyboardEvent, ReactNode, useEffect, useRef, useState } from "react";

export function InlineEdit({
  value,
  onSave,
  placeholder = "Sin contenido",
  multiline = false,
  className = "",
}: {
  value: string;
  onSave: (value: string) => Promise<void> | void;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    if (editing) requestAnimationFrame(() => ref.current?.focus());
  }, [editing]);

  async function commit() {
    const next = draft.trim();
    setEditing(false);
    if (next === value.trim()) return;
    setSaving(true);
    try {
      await onSave(next);
    } finally {
      setSaving(false);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setDraft(value);
      setEditing(false);
      return;
    }
    if (!multiline && event.key === "Enter") {
      event.preventDefault();
      void commit();
    }
  }

  if (editing) {
    const common = {
      value: draft,
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(event.target.value),
      onBlur: () => void commit(),
      onKeyDown,
      className: `inlineEditorInput ${className}`,
    };
    return multiline ? <textarea ref={ref as React.RefObject<HTMLTextAreaElement>} rows={3} {...common} /> : <input ref={ref as React.RefObject<HTMLInputElement>} {...common} />;
  }

  return (
    <button type="button" className={`inlineEditor ${className}`} onClick={() => setEditing(true)} disabled={saving}>
      <span>{value || placeholder}</span>
      <small>{saving ? "guardando…" : "editar"}</small>
    </button>
  );
}

export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay asChild>
          <motion.div className="sheetOverlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .18 }} />
        </Dialog.Overlay>
        <Dialog.Content asChild>
          <motion.aside className="sheet" initial={{ x: 28, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 28, opacity: 0 }} transition={{ duration: .22, ease: [0.22, 1, 0.36, 1] }}>
            <div className="sheetHead">
              <div>
                <Dialog.Title>{title}</Dialog.Title>
                {description ? <Dialog.Description>{description}</Dialog.Description> : null}
              </div>
              <Dialog.Close className="iconButton" aria-label="Cerrar">×</Dialog.Close>
            </div>
            <div className="sheetBody">{children}</div>
            {footer ? <div className="sheetFoot">{footer}</div> : null}
          </motion.aside>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function AddWorkPopover({
  label,
  kind,
  onCreate,
}: {
  label: string;
  kind: "action" | "task" | "gesture";
  onCreate: (input: { title: string; dueAt: string | null; priority: number }) => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [priority, setPriority] = useState(2);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onCreate({ title: title.trim(), dueAt: dueAt ? new Date(dueAt).toISOString() : null, priority });
      setTitle(""); setDueAt(""); setPriority(2); setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild><button className="quietAdd">＋ {label}</button></Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="popover" sideOffset={8} align="start">
          <form onSubmit={submit}>
            <div className="popoverEyebrow">Nuevo {kind === "gesture" ? "gesto" : kind === "task" ? "tarea" : "acción"}</div>
            <input autoFocus className="formControl" placeholder="Escribe el trabajo…" value={title} onChange={(event) => setTitle(event.target.value)} />
            <div className="formRow">
              <label><span>Fecha</span><input className="formControl" type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} /></label>
              <label><span>Prioridad</span><select className="formControl" value={priority} onChange={(event) => setPriority(Number(event.target.value))}><option value={1}>Alta</option><option value={2}>Normal</option><option value={3}>Baja</option></select></label>
            </div>
            <div className="popoverActions"><button type="button" className="btn" onClick={() => setOpen(false)}>Cancelar</button><button className="btn primary" disabled={saving}>{saving ? "Guardando…" : "Crear"}</button></div>
          </form>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function WorkMenu({
  onEdit,
  onSchedule,
  onConvert,
  onArchive,
}: {
  onEdit: () => void;
  onSchedule: () => void;
  onConvert: (kind: "action" | "task" | "gesture") => void;
  onArchive: () => void;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="moreButton" aria-label="Más acciones">···</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="menuContent" sideOffset={6} align="end">
          <DropdownMenu.Item className="menuItem" onSelect={onEdit}>Editar título</DropdownMenu.Item>
          <DropdownMenu.Item className="menuItem" onSelect={onSchedule}>Fecha y hora</DropdownMenu.Item>
          <DropdownMenu.Separator className="menuSeparator" />
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger className="menuItem">Convertir en <span>›</span></DropdownMenu.SubTrigger>
            <DropdownMenu.Portal>
              <DropdownMenu.SubContent className="menuContent" sideOffset={6}>
                <DropdownMenu.Item className="menuItem" onSelect={() => onConvert("action")}>Acción</DropdownMenu.Item>
                <DropdownMenu.Item className="menuItem" onSelect={() => onConvert("task")}>Tarea</DropdownMenu.Item>
                <DropdownMenu.Item className="menuItem" onSelect={() => onConvert("gesture")}>Gesto</DropdownMenu.Item>
              </DropdownMenu.SubContent>
            </DropdownMenu.Portal>
          </DropdownMenu.Sub>
          <DropdownMenu.Separator className="menuSeparator" />
          <DropdownMenu.Item className="menuItem danger" onSelect={onArchive}>Archivar</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function Tip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip.Provider delayDuration={450}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
        <Tooltip.Portal><Tooltip.Content className="tooltip" sideOffset={6}>{label}</Tooltip.Content></Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

export function Presence({ show, children }: { show: boolean; children: ReactNode }) {
  return <AnimatePresence>{show ? children : null}</AnimatePresence>;
}
