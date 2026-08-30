import Link from "next/link";
import LinkControlApp from "@/components/LinkControlApp";

export default function Home() {
  return (
    <>
      <Link href="/misiones" className="caracol-missions-link">
        MISIÓN CARACOL · 90 DÍAS →
      </Link>
      <LinkControlApp />
      <style>{`.caracol-missions-link{position:fixed;right:18px;bottom:18px;z-index:80;background:#1e1e1c;color:#fff;text-decoration:none;padding:11px 14px;border-radius:4px;font:600 10px/1 Arial,Helvetica,sans-serif;letter-spacing:.08em;box-shadow:0 8px 24px rgba(0,0,0,.14)}.caracol-missions-link:hover{opacity:.88}@media(max-width:600px){.caracol-missions-link{right:12px;bottom:12px;padding:10px 11px;font-size:9px}}`}</style>
    </>
  );
}
