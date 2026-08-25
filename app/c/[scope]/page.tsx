import LinkControlApp from "@/components/LinkControlApp";

type Props = { params: Promise<{ scope: string }> };

export default async function ControlPage({ params }: Props) {
  await params;
  // Regla No Fake UI: hasta que el aislamiento de scope esté conectado al backend real,
  // esta ruta usa el mismo núcleo operacional y no finge una vista de cliente aislada.
  return <LinkControlApp />;
}
