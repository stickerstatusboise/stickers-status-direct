"use client";

import { useId } from "react";
import { stickerSvg, type StickerSvgOptions } from "@/lib/sticker-svg";

/** Renders a sticker mockup. Client component only so each instance gets a unique SVG id. */
export function StickerPreview(props: Omit<StickerSvgOptions, "id">) {
  const id = "s" + useId();
  return <span className="contents" dangerouslySetInnerHTML={{ __html: stickerSvg({ ...props, id }) }} />;
}
