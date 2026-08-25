"use client";

import LinkControlAppV4 from "./LinkControlAppV4";
import ComplementsDock from "./ComplementsDock";

export default function LinkControlApp(props: { initialScope?: string } = {}) {
  return (
    <>
      <LinkControlAppV4 {...props} />
      <ComplementsDock />
    </>
  );
}
