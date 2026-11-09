/* Capa do friendring (1200x630, og:image) — desenho 100% em código, sem IA.
 * Gera com execute_js: o script usa OffscreenCanvas (2D) e salva o JPEG.
 * Para regenerar, rode este arquivo num scope com `fs` (execute_js) e
 * `g` = contexto 2D de um OffscreenCanvas 1200x630.
 * Saída: scratch/fring-cover/cover.jpg → subir como /cover.jpg no site
 * friendring + adicionar as tags og:image/twitter:image no index.html:
 * <meta property="og:image" content="https://friendring.neocities.org/cover.jpg">
 * <meta property="og:image:width" content="1200">
 * <meta property="og:image:height" content="630">
 * <meta property="og:image:alt" content="FRIENDRING — tiny webring for personal and old-web-style sites">
 * <meta name="twitter:card" content="summary_large_image">
 * <meta name="twitter:image" content="https://friendring.neocities.org/cover.jpg">
 * (trocar o twitter:card atual "summary" por "summary_large_image")
 */
const W = 1200, H = 630;
const cv = new OffscreenCanvas(W, H);
const g = cv.getContext("2d");
const bg = g.createLinearGradient(0, 0, 0, H);
bg.addColorStop(0, "#FFDAED"); bg.addColorStop(1, "#F896C8");
g.fillStyle = bg; g.fillRect(0, 0, W, H);
g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = 3;
function web(cx, cy, R) {
  for (let k = 1; k <= 4; k++) { g.beginPath(); g.arc(cx, cy, R * k / 4, 0, 7); g.stroke(); }
  for (let a = 0; a < 12; a++) {
    g.beginPath(); g.moveTo(cx, cy);
    g.lineTo(cx + R * Math.cos(a * Math.PI / 6), cy + R * Math.sin(a * Math.PI / 6)); g.stroke();
  }
}
web(1080, 80, 260); web(90, 560, 220);
g.strokeStyle = "#7A1F4D"; g.lineWidth = 10; g.strokeRect(14, 14, W - 28, H - 28);
g.strokeStyle = "#FFDD00"; g.lineWidth = 4; g.strokeRect(30, 30, W - 60, H - 60);
function bee(x, y, s, flip) {
  g.save(); g.translate(x, y); g.scale(flip ? -s : s, s);
  g.fillStyle = "rgba(255,255,255,.85)";
  g.beginPath(); g.ellipse(-14, -26, 16, 22, -.5, 0, 7); g.fill();
  g.beginPath(); g.ellipse(14, -26, 16, 22, .5, 0, 7); g.fill();
  g.fillStyle = "#FFDD00";
  g.beginPath(); g.ellipse(0, 0, 34, 28, 0, 0, 7); g.fill();
  g.fillStyle = "#111";
  g.fillRect(-14, -26, 10, 52); g.fillRect(4, -26, 10, 52);
  g.strokeStyle = "#111"; g.lineWidth = 4;
  g.beginPath(); g.moveTo(-12, -26); g.quadraticCurveTo(-18, -44, -28, -46); g.stroke();
  g.beginPath(); g.moveTo(12, -26); g.quadraticCurveTo(18, -44, 28, -46); g.stroke();
  g.fillStyle = "#fff";
  g.beginPath(); g.arc(-10, -4, 7, 0, 7); g.fill();
  g.beginPath(); g.arc(12, -4, 7, 0, 7); g.fill();
  g.fillStyle = "#111";
  g.beginPath(); g.arc(-10, -3, 3.4, 0, 7); g.fill();
  g.beginPath(); g.arc(12, -3, 3.4, 0, 7); g.fill();
  g.restore();
}
bee(180, 470, 1.5, false); bee(1010, 470, 1.5, true); bee(1010, 150, 1, true);
g.textAlign = "center";
g.font = "900 150px Verdana, sans-serif";
g.lineWidth = 14; g.strokeStyle = "#111";
g.strokeText("FRIENDRING", W / 2, 290);
g.fillStyle = "#FFDD00"; g.fillText("FRIENDRING", W / 2, 290);
g.font = "bold 33px Verdana, sans-serif";
g.lineWidth = 7; g.strokeStyle = "#111";
const sub = "a tiny webring for personal & old-web-style sites";
g.strokeText(sub, W / 2, 365);
g.fillStyle = "#fff"; g.fillText(sub, W / 2, 365);
const blob = await cv.convertToBlob({type: "image/jpeg", quality: 0.9});
await fs.writeFile("scratch/fring-cover/cover.jpg", new Uint8Array(await blob.arrayBuffer()));
return "ok";
