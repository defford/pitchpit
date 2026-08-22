"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

type Pt = { x: number; y: number };
type Seg = [Pt, Pt];

type Bolt = {
  segs: Seg[];
  shown: number;
  speed: number;
  alpha: number;
  fade: number;
};

type Cell = {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  red: number;
  blue: number;
};

function splitBolt(a: Pt, b: Pt, displace: number, detail: number, out: Seg[]) {
  if (displace < detail) {
    out.push([a, b]);
    return;
  }
  const mid: Pt = {
    x: (a.x + b.x) / 2 + (Math.random() - 0.5) * displace,
    y: (a.y + b.y) / 2 + (Math.random() - 0.5) * displace * 0.38,
  };
  splitBolt(a, mid, displace / 2, detail, out);
  splitBolt(mid, b, displace / 2, detail, out);
}

function makeBolt(width: number, height: number): Bolt {
  const sheet = Math.random() < 0.28;
  const start: Pt = sheet
    ? {
        x: Math.random() * width * 0.35,
        y: height * (0.08 + Math.random() * 0.28),
      }
    : { x: width * (0.12 + Math.random() * 0.76), y: -height * 0.04 };
  const end: Pt = sheet
    ? {
        x: width * (0.55 + Math.random() * 0.4),
        y: start.y + (Math.random() - 0.5) * height * 0.18,
      }
    : {
        x: start.x + (Math.random() - 0.5) * width * 0.45,
        y: height * (0.55 + Math.random() * 0.48),
      };

  const trunk: Seg[] = [];
  splitBolt(
    start,
    end,
    (sheet ? 0.18 : 0.28) * Math.min(width, height),
    7,
    trunk,
  );

  const segs = [...trunk];
  for (let i = 5; i < trunk.length; i += 4 + Math.floor(Math.random() * 5)) {
    if (Math.random() > 0.55) continue;
    const origin = trunk[i][1];
    const tip: Pt = {
      x: origin.x + (Math.random() - 0.5) * width * 0.22,
      y: origin.y + Math.random() * height * 0.22,
    };
    splitBolt(origin, tip, 36 + Math.random() * 48, 7, segs);
  }

  return {
    segs,
    shown: 0,
    speed: 5 + Math.floor(Math.random() * 8),
    alpha: 1,
    fade: 0.055 + Math.random() * 0.04,
  };
}

function paintBolt(ctx: CanvasRenderingContext2D, bolt: Bolt) {
  const last = Math.min(bolt.shown, bolt.segs.length);
  if (last === 0) return;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const draw = (color: string, width: number) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    for (let i = 0; i < last; i += 1) {
      const [a, b] = bolt.segs[i];
      if (i === 0) ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();
  };

  const a = bolt.alpha;
  draw(`rgba(18, 28, 90, ${0.28 * a})`, 18);
  draw(`rgba(70, 20, 36, ${0.16 * a})`, 11);
  draw(`rgba(90, 140, 220, ${0.4 * a})`, 6);
  draw(`rgba(186, 214, 255, ${0.75 * a})`, 2.1);
  draw(`rgba(236, 244, 255, ${a})`, 0.75);
  ctx.restore();
}

function seedCells(): Cell[] {
  return Array.from({ length: 11 }, (_, i) => ({
    x: Math.random(),
    y: Math.random(),
    r: 0.28 + Math.random() * 0.34,
    vx: (Math.random() - 0.5) * 0.0007,
    vy: (Math.random() - 0.5) * 0.00045,
    red: i % 3 === 0 ? 0.22 + Math.random() * 0.28 : 0.04 + Math.random() * 0.1,
    blue: 0.35 + Math.random() * 0.55,
  }));
}

function paintStatic(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  ctx.fillStyle = "#03050c";
  ctx.fillRect(0, 0, width, height);
  const bolt = makeBolt(width, height);
  bolt.shown = bolt.segs.length;
  bolt.alpha = 0.22;
  paintBolt(ctx, bolt);
}

type StormFieldProps = {
  className?: string;
};

export function StormField({ className }: StormFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const cells = seedCells();
    const bolts: Bolt[] = [];
    let flash = 0;
    let raf = 0;
    let running = true;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { clientWidth, clientHeight } = canvas;
      canvas.width = Math.max(1, Math.floor(clientWidth * dpr));
      canvas.height = Math.max(1, Math.floor(clientHeight * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const strike = () => {
      bolts.push(makeBolt(canvas.clientWidth, canvas.clientHeight));
      if (Math.random() < 0.12) {
        bolts.push(makeBolt(canvas.clientWidth, canvas.clientHeight));
      }
      flash = Math.max(flash, 0.12 + Math.random() * 0.18);
    };

    const tick = () => {
      if (!running) return;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      ctx.fillStyle = "rgba(3, 6, 14, 0.42)";
      ctx.fillRect(0, 0, width, height);

      for (const cell of cells) {
        cell.x += cell.vx;
        cell.y += cell.vy;
        if (cell.x < -0.2 || cell.x > 1.2) cell.vx *= -1;
        if (cell.y < -0.2 || cell.y > 1.2) cell.vy *= -1;
        const cx = cell.x * width;
        const cy = cell.y * height;
        const radius = cell.r * Math.max(width, height);
        const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        glow.addColorStop(
          0,
          `rgba(${18 + cell.red * 70}, ${24 + cell.blue * 40}, ${70 + cell.blue * 90}, 0.14)`,
        );
        glow.addColorStop(
          0.4,
          `rgba(${50 + cell.red * 90}, 8, ${28 + cell.blue * 50}, ${0.1 + cell.red * 0.08})`,
        );
        glow.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = glow;
        ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
      }

      if (document.visibilityState === "visible" && Math.random() < 0.01) {
        strike();
      }

      for (let i = bolts.length - 1; i >= 0; i -= 1) {
        const bolt = bolts[i];
        if (bolt.shown < bolt.segs.length) {
          bolt.shown += bolt.speed;
        } else {
          bolt.alpha -= bolt.fade;
        }
        if (bolt.alpha <= 0) {
          bolts.splice(i, 1);
          continue;
        }
        paintBolt(ctx, bolt);
      }

      if (flash > 0) {
        ctx.fillStyle = `rgba(120, 150, 210, ${flash * 0.12})`;
        ctx.fillRect(0, 0, width, height);
        flash *= 0.72;
        if (flash < 0.015) flash = 0;
      }

      raf = window.requestAnimationFrame(tick);
    };

    resize();
    ctx.fillStyle = "#03050c";
    ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);

    const onResize = () => resize();
    window.addEventListener("resize", onResize);

    if (media.matches) {
      paintStatic(ctx, canvas.clientWidth, canvas.clientHeight);
    } else {
      raf = window.requestAnimationFrame(tick);
    }

    return () => {
      running = false;
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div className={cn("pitch-pit-storm", className)} aria-hidden>
      <canvas ref={canvasRef} className="absolute inset-0 size-full" />
      <div className="pitch-pit-storm__read" />
    </div>
  );
}
