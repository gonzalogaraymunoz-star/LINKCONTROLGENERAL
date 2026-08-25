"use client";

import ControlActionsButton from "./ControlActionsButton";
import LinkControlAppV4 from "./LinkControlAppV4";
import OperationalDock from "./OperationalDock";

export default function LinkControlApp(props: { initialScope?: string } = {}) {
  return (
    <>
      <LinkControlAppV4 {...props} />
      <OperationalDock />
      <div className="controlActionStandalone"><ControlActionsButton /></div>
    </>
  );
}
