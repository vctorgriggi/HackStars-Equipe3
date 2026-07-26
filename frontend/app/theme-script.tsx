// Anti-FOUC de tema (receita oficial do Next 16:
// guides/preventing-flash-before-hydration.md): script inline no <head>
// corrige data-theme ANTES do primeiro paint. O default servido é "dark"
// (o :root do DS), então sem preferência salva o script é no-op.
// Exige suppressHydrationWarning no <html> — sem ele o React trata o
// atributo alterado como mismatch e DESCARTA a correção do script.
const SRC = `(function(){try{var t=localStorage.getItem("trael-theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: SRC }} />;
}
