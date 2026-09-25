import LinkControlApp from "@/components/LinkControlApp";
import Ficha360QuickAccess from "@/components/Ficha360QuickAccess";
import LinkThemeController from "@/components/LinkThemeController";
import ControlCentralUXBridge from "@/components/ControlCentralUXBridge";
import ActivityHumanizer from "@/components/ActivityHumanizer";
import TaskActionBridge from "@/components/TaskActionBridge";

export default function OperationHome() {
  return (
    <>
      <LinkControlApp />
      <LinkThemeController />
      <ControlCentralUXBridge />
      <ActivityHumanizer />
      <TaskActionBridge />
      <Ficha360QuickAccess />
    </>
  );
}
