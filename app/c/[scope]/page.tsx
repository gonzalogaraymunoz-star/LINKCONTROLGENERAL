import LinkControlApp from "@/components/LinkControlApp";

type Props = { params: Promise<{ scope: string }> };

export default async function ControlPage({ params }: Props) {
  const { scope } = await params;
  return <LinkControlApp initialScope={scope} />;
}
