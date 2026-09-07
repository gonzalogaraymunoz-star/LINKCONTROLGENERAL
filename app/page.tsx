import LinkControlApp from "@/components/LinkControlApp";
import Ficha360QuickAccess from "@/components/Ficha360QuickAccess";
import DashboardPersonalMissionHero from "@/components/DashboardPersonalMissionHero";
import LinkThemeController from "@/components/LinkThemeController";
import UnifiedWorkBoard from "@/components/UnifiedWorkBoard";
import ControlCentralUXBridge from "@/components/ControlCentralUXBridge";
import ActivityHumanizer from "@/components/ActivityHumanizer";
import TaskActionBridge from "@/components/TaskActionBridge";

export default function Home() {
  return (
    <>
      <LinkControlApp />
      <LinkThemeController />
      <ControlCentralUXBridge />
      <ActivityHumanizer />
      <TaskActionBridge />
      <DashboardPersonalMissionHero />
      <UnifiedWorkBoard />
      <Ficha360QuickAccess />
    </>
  );
}
