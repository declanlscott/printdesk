// oxlint-disable react/jsx-key typescript/no-explicit-any
/**
 * The UI that's displayed when loading the root page of the OpenAuth server. You can configure
 * which providers should be displayed in the select UI.
 *
 * ```ts
 * import { Select } from "@openauthjs/openauth/ui/select"
 *
 * export default issuer({
 *   select: Select({
 *     providers: {
 *       github: {
 *         hide: true
 *       },
 *       google: {
 *         display: "Google"
 *       }
 *     }
 *   })
 *   // ...
 * })
 * ```
 *
 * @packageDocumentation
 */
/** @jsxImportSource hono/jsx */

import { Layout } from "./base.js";
import { ICON_GOOGLE } from "./icon.js";

export interface SelectProps {
  /**
   * An object with all the providers and their config; where the key is the provider name.
   *
   * @example
   * ```ts
   * {
   *   github: {
   *     hide: true
   *   },
   *   google: {
   *     display: "Google"
   *   }
   * }
   * ```
   */
  providers?: Record<
    string,
    {
      /**
       * Whether to hide the provider from the select UI.
       * @default false
       */
      hide?: boolean;
      /**
       * The display name of the provider.
       */
      display?: string;
    }
  >;
}

export function Select(props?: SelectProps) {
  return async (providers: Record<string, string>, _req: Request): Promise<Response> => {
    const jsx = (
      <Layout>
        <div data-component="form">
          {Object.entries(providers).map(([key, type]) => {
            const match = props?.providers?.[key];
            if (match?.hide) return;
            const icon = ICON[key];
            return (
              <a href={`/${key}/authorize`} data-component="button" data-color="ghost">
                {icon && <i data-slot="icon">{icon}</i>}
                Continue with {match?.display || DISPLAY[type] || type}
              </a>
            );
          })}
        </div>
      </Layout>
    );

    // oxlint-disable-next-line typescript/no-base-to-string
    return new Response(jsx.toString(), {
      headers: {
        "Content-Type": "text/html",
      },
    });
  };
}

const DISPLAY: Record<string, string> = {
  twitch: "Twitch",
  google: "Google",
  github: "GitHub",
  apple: "Apple",
  x: "X",
  facebook: "Facebook",
  microsoft: "Microsoft",
  slack: "Slack",
};

const ICON: Record<string, any> = {
  google: ICON_GOOGLE,
  microsoft: (
    <svg
      role="img"
      viewBox="0 0 256 256"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid"
    >
      <path fill="#F1511B" d="M121.666 121.666H0V0h121.666z" />
      <path fill="#80CC28" d="M256 121.666H134.335V0H256z" />
      <path fill="#00ADEF" d="M121.663 256.002H0V134.336h121.663z" />
      <path fill="#FBBC09" d="M256 256.002H134.335V134.336H256z" />
    </svg>
  ),
};
