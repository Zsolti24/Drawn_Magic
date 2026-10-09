// Témánkénti hangulat a pálya fölött (képernyő-koordinátában): köd, éjszaka,
// barlangi sötétség, hamueső. Csak olcsó elemek, hogy ne lassítson.

export function drawAtmosphere(
  ctx: CanvasRenderingContext2D,
  terrain: string,
  width: number,
  height: number,
  unit: number,
  now: number,
  /** A mágus helye a képernyőn (a barlang fénye ehhez igazodik) */
  focus: { x: number; y: number },
) {
  const t = now / 1000;
  ctx.save();
  switch (terrain) {
    case "forest": {
      vignette(ctx, width, height, "rgba(5,20,8,0.55)");
      // Lassan sodródó ködpaszták
      for (let i = 0; i < 5; i++) {
        const x = ((i * 0.31 + t * 0.012 * (1 + i * 0.2)) % 1.4) * width - width * 0.2;
        const y = height * (0.15 + ((i * 0.37) % 1) * 0.7);
        const r = unit * (0.6 + (i % 3) * 0.2);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, "rgba(220,235,225,0.12)");
        g.addColorStop(1, "rgba(220,235,225,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      break;
    }
    case "swamp": {
      ctx.fillStyle = "rgba(15,25,70,0.28)";
      ctx.fillRect(0, 0, width, height);
      vignette(ctx, width, height, "rgba(2,8,20,0.6)");
      // Szentjánosbogarak
      for (let i = 0; i < 14; i++) {
        const x = (((i * 0.137 + 0.05) % 1) + Math.sin(t * 0.4 + i) * 0.03) * width;
        const y = (((i * 0.271 + 0.1) % 1) + Math.cos(t * 0.5 + i * 2) * 0.03) * height;
        const blink = 0.4 + 0.6 * Math.max(0, Math.sin(t * 2 + i * 1.7));
        const r = unit * 0.035;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(217,249,157,${0.9 * blink})`);
        g.addColorStop(1, "rgba(217,249,157,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      break;
    }
    case "cave": {
      // Sötétség, a mágus körül fény
      const r = Math.max(width, height) * 0.7;
      const g = ctx.createRadialGradient(focus.x, focus.y, unit * 0.35, focus.x, focus.y, r);
      g.addColorStop(0, "rgba(5,4,12,0)");
      g.addColorStop(0.5, "rgba(5,4,12,0.45)");
      g.addColorStop(1, "rgba(5,4,12,0.85)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);
      break;
    }
    case "ash": {
      // Vöröses izzás alulról, hamueső és felszálló parázs
      const glow = ctx.createLinearGradient(0, height, 0, 0);
      glow.addColorStop(0, "rgba(249,115,22,0.18)");
      glow.addColorStop(0.5, "rgba(120,30,10,0.08)");
      glow.addColorStop(1, "rgba(20,5,5,0.2)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);
      vignette(ctx, width, height, "rgba(20,4,2,0.5)");
      const flake = Math.max(1.5, unit * 0.006);
      for (let i = 0; i < 50; i++) {
        const x = (((i * 0.173) % 1) + Math.sin(t * 0.7 + i) * 0.02 + t * 0.01) % 1;
        const y = (((i * 0.311) % 1) + t * (0.04 + (i % 5) * 0.01)) % 1;
        ctx.fillStyle = "rgba(200,190,185,0.55)";
        ctx.fillRect(x * width, y * height, flake, flake);
      }
      for (let i = 0; i < 14; i++) {
        const x = (((i * 0.233) % 1) + Math.sin(t + i) * 0.015) * width;
        const y = (1 - ((((i * 0.41) % 1) + t * 0.06) % 1)) * height;
        ctx.fillStyle = `rgba(253,186,116,${0.5 + 0.5 * Math.sin(t * 6 + i)})`;
        ctx.fillRect(x, y, flake * 1.3, flake * 1.3);
      }
      break;
    }
  }
  ctx.restore();
}

function vignette(ctx: CanvasRenderingContext2D, width: number, height: number, color: string) {
  const g = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.35, width / 2, height / 2, Math.hypot(width, height) / 2);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);
}
