import LinkControlApp from "@/components/LinkControlApp";
import Ficha360QuickAccess from "@/components/Ficha360QuickAccess";
import DashboardPersonalMissionHero from "@/components/DashboardPersonalMissionHero";
import LinkThemeController from "@/components/LinkThemeController";

export default function Home() {
  return (
    <>
      <LinkControlApp />
      <LinkThemeController />
      <DashboardPersonalMissionHero />
      <Ficha360QuickAccess />
    </>
  );
}
