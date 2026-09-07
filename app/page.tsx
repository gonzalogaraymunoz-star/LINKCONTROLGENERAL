import LinkControlApp from "@/components/LinkControlApp";
import Ficha360QuickAccess from "@/components/Ficha360QuickAccess";
import DashboardPersonalMissionHero from "@/components/DashboardPersonalMissionHero";

export default function Home() {
  return (
    <>
      <LinkControlApp />
      <DashboardPersonalMissionHero />
      <Ficha360QuickAccess />
    </>
  );
}
