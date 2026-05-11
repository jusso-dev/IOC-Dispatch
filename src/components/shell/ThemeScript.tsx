/**
 * Inline script that runs before paint to set the initial `data-theme`
 * attribute from localStorage, avoiding a flash on first load. The script
 * itself runs no React; it's serialized into the HTML.
 */
export function ThemeScript() {
  const code = `(function(){
  try {
    var saved = localStorage.getItem("intelrelay.theme");
    var t = saved === "light" || saved === "dark" ? saved : "dark";
    document.documentElement.setAttribute("data-theme", t);
  } catch (_) {
    document.documentElement.setAttribute("data-theme", "dark");
  }
})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
