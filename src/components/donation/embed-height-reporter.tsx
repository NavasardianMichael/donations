"use client";

import { useEffect } from "react";

/**
 * Tells the parent page how tall this iframe's content actually is, so the
 * companion listener script (shipped alongside the embed snippet — see the
 * Widget Export screen) can resize the `<iframe>` to fit without scrollbars.
 *
 * `postMessage` with `targetOrigin: "*"` is deliberate: the whole point of an
 * embed is that we do not know the host's origin ahead of time. The message
 * carries only a height in pixels — nothing sensitive — so an unrestricted
 * target is the correct trade, not a shortcut.
 */
export function EmbedHeightReporter() {
  useEffect(() => {
    if (typeof window === "undefined" || window.parent === window) return;

    function report() {
      window.parent.postMessage(
        { type: "donation-embed-height", height: document.body.scrollHeight },
        "*",
      );
    }

    report();

    const observer = new ResizeObserver(report);
    observer.observe(document.body);

    window.addEventListener("resize", report);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", report);
    };
  }, []);

  return null;
}
