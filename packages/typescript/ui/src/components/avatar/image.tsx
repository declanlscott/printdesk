import * as stylex from "@stylexjs/stylex";
import * as Match from "effect/Match";
import { useState } from "react";

import { avatarImageStyles } from "../../styles/avatar/image";
import { avatarImageMarker } from "../../styles/avatar/markers.stylex";

import type { AvatarImageState, AvatarImageStyleProps } from "../../styles/avatar/image";

export type AvatarProps = AvatarImageStyleProps;

export function AvatarImage({ sx, ...props }: AvatarProps) {
  const [state, setState] = useState<AvatarImageState>(props.src ? "loading" : "error");

  return (
    <img
      {...stylex.props(avatarImageStyles[state], avatarImageMarker, sx)}
      data-slot="avatar-image"
      alt={props.alt || ""}
      data-state={state}
      ref={Match.type<globalThis.HTMLImageElement | null>().pipe(
        Match.when(Match.is(null), () => undefined),
        Match.when({ complete: Match.is(false) }, () => setState(() => "loading")),
        Match.when({ complete: Match.is(true) }, (img) =>
          setState(() => (img.naturalWidth > 0 ? "loaded" : "error")),
        ),
        Match.orElseAbsurd,
      )}
      onLoad={() => setState(() => "loaded")}
      onError={() => setState(() => "error")}
      {...props}
    />
  );
}
