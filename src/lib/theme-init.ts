/**
 * The pre-paint theme script.
 *
 * Runs before first paint so a reader who chose dark never sees a white flash.
 * Only `"light"` and `"dark"` are honoured: choosing system *removes* the key,
 * and writing `"system"` into `data-theme` would break the CSS fallback to
 * `prefers-color-scheme` — see the token blocks in globals.css.
 *
 * Shared because `global-error.tsx` replaces the root layout entirely and has
 * to re-establish this itself. Two copies would drift, and the copy that
 * drifted would be the one nobody looks at until something has already broken.
 */
export const THEME_INIT = `try{var t=localStorage.getItem("theme");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}`;
