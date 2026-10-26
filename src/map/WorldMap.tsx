import { useEffect, useRef } from "react";
import { Application, Container, Graphics, Text } from "pixi.js";
import type { GameState, Territory } from "../game/types";

type Props = { state: GameState; onSelectTerritory: (id: string) => void };

function drawPolygon(g: Graphics, t: Territory, color: number, selected: boolean) {
  const first = t.points[0];
  if (!first) return;
  g.moveTo(first[0], first[1]);
  t.points.slice(1).forEach((p) => g.lineTo(p[0], p[1]));
  g.closePath();
  g.fill({ color, alpha: selected ? 1 : 0.84 });
  g.stroke({ color: selected ? 0xffd18a : 0x18212c, width: selected ? 4 : 3 });
}

export default function WorldMap({ state, onSelectTerritory }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const callback = useRef(onSelectTerritory);
  const current = useRef(state);
  const redraw = useRef<(() => void) | null>(null);

  callback.current = onSelectTerritory;
  current.current = state;

  useEffect(() => {
    let disposed = false;
    let initialized = false;
    let destroyed = false;
    let app: Application | null = null;
    let observer: ResizeObserver | undefined;

    const destroyApp = () => {
      if (!app || !initialized || destroyed) return;
      destroyed = true;
      app.destroy(true, { children: true });
      app = null;
    };

    async function init() {
      const element = host.current;
      if (!element) return;

      const pixi = new Application();
      app = pixi;

      try {
        await pixi.init({
          background: 0x101923,
          antialias: true,
          resizeTo: element,
          autoDensity: true,
          resolution: Math.min(window.devicePixelRatio || 1, 2),
        });
        initialized = true;

        // React StrictMode may unmount this effect while Pixi is still initializing.
        // Only destroy the Application after init() has completed.
        if (disposed || !host.current) {
          destroyApp();
          return;
        }

        element.replaceChildren(pixi.canvas);
        pixi.canvas.style.width = "100%";
        pixi.canvas.style.height = "100%";
        pixi.canvas.style.display = "block";

        const world = new Container();
        pixi.stage.addChild(world);

        function render() {
          // Release old graphics/text when state changes to avoid accumulating GPU resources.
          for (const child of world.removeChildren()) child.destroy();

          const bg = new Graphics();
          bg.rect(0, 0, 760, 470).fill(0x101923);
          for (let x = 20; x < 760; x += 40) {
            bg.moveTo(x, 0).lineTo(x, 470).stroke({ color: 0x1b2835, width: 1 });
          }
          for (let y = 20; y < 470; y += 40) {
            bg.moveTo(0, y).lineTo(760, y).stroke({ color: 0x1b2835, width: 1 });
          }
          world.addChild(bg);

          const s = current.current;
          for (const territory of s.territories) {
            const country = s.countries.find((c) => c.id === territory.countryId);
            const selected = territory.id === s.selectedTerritoryId;
            const shape = new Graphics();
            drawPolygon(shape, territory, country?.color ?? 0x778899, selected);
            shape.eventMode = "static";
            shape.cursor = "pointer";
            shape.on("pointertap", () => callback.current(territory.id));
            world.addChild(shape);

            const label = new Text({
              text: territory.name,
              style: {
                fontFamily: "Arial, sans-serif",
                fontSize: 12,
                fontWeight: selected ? "bold" : "normal",
                fill: 0xffffff,
                stroke: { color: 0x101923, width: 3 },
                align: "center",
                wordWrap: true,
                wordWrapWidth: 120,
              },
            });
            label.anchor.set(0.5);
            label.position.set(territory.center[0], territory.center[1]);
            label.eventMode = "none";
            world.addChild(label);
          }

          const scale = Math.min(pixi.screen.width / 760, pixi.screen.height / 470);
          world.scale.set(scale);
          world.position.set(
            (pixi.screen.width - 760 * scale) / 2,
            (pixi.screen.height - 470 * scale) / 2,
          );
        }

        redraw.current = render;
        render();
        observer = new ResizeObserver(render);
        observer.observe(element);
      } catch (error) {
        // Avoid leaving a half-initialized Pixi Application behind.
        if (initialized) destroyApp();
        if (!disposed) console.error("Não foi possível inicializar o mapa:", error);
      }
    }

    void init();

    return () => {
      disposed = true;
      observer?.disconnect();
      redraw.current = null;
      // If init() is still pending, init() itself performs cleanup when it resolves.
      destroyApp();
      host.current?.replaceChildren();
    };
  }, []);

  useEffect(() => {
    redraw.current?.();
  }, [state]);

  return <div className="map-canvas" ref={host} aria-label="Mapa político interativo" />;
}
