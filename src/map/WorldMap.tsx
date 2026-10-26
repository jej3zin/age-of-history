import { useEffect, useRef } from "react";
import { Application, Container, Graphics, Text } from "pixi.js";
import type { GameState, MapPosition, Territory } from "../game/types";

type Props = { state: GameState; onSelectTerritory: (id: string) => void };

const MAP_WIDTH = 760;
const MAP_HEIGHT = 470;

function drawPolygon(g: Graphics, points: MapPosition[], color: number, selected: boolean) {
  const first = points[0];
  if (!first) return;
  g.moveTo(first[0], first[1]);
  points.slice(1).forEach((p) => g.lineTo(p[0], p[1]));
  g.closePath();
  g.fill({ color, alpha: selected ? 1 : 0.84 });
  g.stroke({ color: selected ? 0xffd18a : 0x18212c, width: selected ? 4 : 3 });
}

function territoryPolygons(territory: Territory): MapPosition[][] {
  return territory.polygons?.length ? territory.polygons : [territory.points];
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
    let cleanupInteractions: (() => void) | undefined;

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
        if (disposed || !host.current) {
          destroyApp();
          return;
        }

        element.replaceChildren(pixi.canvas);
        const canvas = pixi.canvas;
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.style.display = "block";
        canvas.style.touchAction = "none";

        const world = new Container();
        pixi.stage.addChild(world);

        let zoom = 1;
        let panX = 0;
        let panY = 0;
        let pointerStart: { x: number; y: number; panX: number; panY: number } | null = null;
        let dragged = false;

        function applyTransform() {
          const fitScale = Math.min(pixi.screen.width / MAP_WIDTH, pixi.screen.height / MAP_HEIGHT);
          const scale = fitScale * zoom;
          world.scale.set(scale);
          world.position.set(
            (pixi.screen.width - MAP_WIDTH * scale) / 2 + panX,
            (pixi.screen.height - MAP_HEIGHT * scale) / 2 + panY,
          );
        }

        function render() {
          for (const child of world.removeChildren()) child.destroy();

          const bg = new Graphics();
          bg.rect(0, 0, MAP_WIDTH, MAP_HEIGHT).fill(0x101923);
          for (let x = 20; x < MAP_WIDTH; x += 40) {
            bg.moveTo(x, 0).lineTo(x, MAP_HEIGHT).stroke({ color: 0x1b2835, width: 1 });
          }
          for (let y = 20; y < MAP_HEIGHT; y += 40) {
            bg.moveTo(0, y).lineTo(MAP_WIDTH, y).stroke({ color: 0x1b2835, width: 1 });
          }
          world.addChild(bg);

          const s = current.current;
          for (const territory of s.territories) {
            const country = s.countries.find((c) => c.id === territory.countryId);
            const selected = territory.id === s.selectedTerritoryId;
            for (const points of territoryPolygons(territory)) {
              const shape = new Graphics();
              drawPolygon(shape, points, country?.color ?? 0x778899, selected);
              shape.eventMode = "static";
              shape.cursor = "pointer";
              shape.on("pointertap", () => {
                if (dragged) {
                  dragged = false;
                  return;
                }
                callback.current(territory.id);
              });
              world.addChild(shape);
            }

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
          applyTransform();
        }

        const onPointerDown = (event: PointerEvent) => {
          if (event.button !== 0) return;
          pointerStart = { x: event.clientX, y: event.clientY, panX, panY };
          dragged = false;
          canvas.setPointerCapture(event.pointerId);
        };
        const onPointerMove = (event: PointerEvent) => {
          if (!pointerStart) return;
          const dx = event.clientX - pointerStart.x;
          const dy = event.clientY - pointerStart.y;
          if (Math.abs(dx) + Math.abs(dy) > 4) dragged = true;
          if (dragged) {
            panX = pointerStart.panX + dx;
            panY = pointerStart.panY + dy;
            applyTransform();
          }
        };
        const onPointerUp = () => {
          pointerStart = null;
        };
        const onWheel = (event: WheelEvent) => {
          event.preventDefault();
          const oldZoom = zoom;
          zoom = Math.max(1, Math.min(5, zoom * (event.deltaY < 0 ? 1.12 : 1 / 1.12)));
          if (zoom === oldZoom) return;
          applyTransform();
        };

        canvas.addEventListener("pointerdown", onPointerDown);
        canvas.addEventListener("pointermove", onPointerMove);
        canvas.addEventListener("pointerup", onPointerUp);
        canvas.addEventListener("pointercancel", onPointerUp);
        canvas.addEventListener("wheel", onWheel, { passive: false });
        cleanupInteractions = () => {
          canvas.removeEventListener("pointerdown", onPointerDown);
          canvas.removeEventListener("pointermove", onPointerMove);
          canvas.removeEventListener("pointerup", onPointerUp);
          canvas.removeEventListener("pointercancel", onPointerUp);
          canvas.removeEventListener("wheel", onWheel);
        };

        redraw.current = render;
        render();
        observer = new ResizeObserver(() => {
          applyTransform();
        });
        observer.observe(element);
      } catch (error) {
        if (initialized) destroyApp();
        if (!disposed) console.error("Não foi possível inicializar o mapa:", error);
      }
    }

    void init();

    return () => {
      disposed = true;
      observer?.disconnect();
      cleanupInteractions?.();
      redraw.current = null;
      destroyApp();
      host.current?.replaceChildren();
    };
  }, []);

  useEffect(() => {
    redraw.current?.();
  }, [state]);

  return <div className="map-canvas" ref={host} aria-label="Mapa político interativo. Use a roda do mouse para zoom e arraste para mover." />;
}
