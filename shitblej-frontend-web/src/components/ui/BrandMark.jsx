import { cn } from "../../utils/cn";

// The wordmark, at the size it is actually drawn, downloaded exactly once.
//
// What this replaces, in both the header and the auth screens:
//
//   <img src={logoBlack} className="h-6 w-auto dark:hidden" />
//   <img src={logoWhite} className="hidden h-6 w-auto dark:block" />
//
// Two faults. The files were the 2400x312 design masters - 263 KiB and 67 KiB
// of PNG - rendered 24px tall. And `dark:hidden` does not stop a fetch:
// display:none hides an <img>, it does not prevent the browser downloading it,
// so every page load pulled BOTH, 330 KiB of logo above the fold, competing
// with the LCP image for the first connections.
//
// <picture> fixes the second fault properly: the browser takes the first
// <source> whose `media` AND `type` both match and downloads only that one.
// `prefers-color-scheme` is an exact behavioural match for the app's Tailwind
// `darkMode: "media"` setting, so the theme swap is unchanged.
//
// The masters stay in src/assets as the design source. Nothing imports them,
// so they are not bundled.
import logoWebp from "../../assets/shitblej-logo-560.webp";
import logoPng from "../../assets/shitblej-logo-560.png";
import logoWhiteWebp from "../../assets/shitblej-logo-white-560.webp";
import logoWhitePng from "../../assets/shitblej-logo-white-560.png";

// Intrinsic size of the derivatives: 560px wide, which stays crisp to 3x DPR
// for a mark drawn 24-28px tall. Declared on the <img> so the browser reserves
// the correct box before the file arrives - `h-* w-auto` still decides the
// drawn size, and the width follows from this ratio.
const WIDTH = 560;
const HEIGHT = 73;

/**
 * @param {object} props
 * @param {string} [props.className] Height utility for the drawn size, e.g. "h-6".
 */
export default function BrandMark({ className }) {
  return (
    <picture>
      <source
        media="(prefers-color-scheme: dark)"
        type="image/webp"
        srcSet={logoWhiteWebp}
      />
      <source media="(prefers-color-scheme: dark)" srcSet={logoWhitePng} />
      <source type="image/webp" srcSet={logoWebp} />
      {/* PNG fallback for anything without WebP. */}
      <img
        src={logoPng}
        alt="Shitblej"
        width={WIDTH}
        height={HEIGHT}
        decoding="async"
        className={cn("w-auto", className)}
      />
    </picture>
  );
}
