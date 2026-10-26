import { useEffect, useRef } from "react";
import { Application, Container, Graphics, Text } from "pixi.js";
import type { GameState, Territory } from "../game/types";
type Props = { state: GameState; onSelectTerritory: (id:string)=>void };
function drawPolygon(g: Graphics,t:Territory,color:number,selected:boolean) {
 const first=t.points[0]; if(!first)return; g.moveTo(first[0],first[1]);
 t.points.slice(1).forEach(p=>g.lineTo(p[0],p[1])); g.closePath();
 g.fill({color,alpha:selected?1:0.84}); g.stroke({color:selected?0xffd18a:0x18212c,width:selected?4:3});
}
export default function WorldMap({state,onSelectTerritory}:Props) {
 const host=useRef<HTMLDivElement>(null); const callback=useRef(onSelectTerritory); const current=useRef(state); const redraw=useRef<(()=>void)|null>(null);
 callback.current=onSelectTerritory; current.current=state;
 useEffect(()=>{
  let dead=false; let app:Application|null=null; let observer:ResizeObserver|undefined;
  async function init(){
   if(!host.current)return;
   const pixi=new Application(); app=pixi;
   await pixi.init({background:0x101923,antialias:true,resizeTo:host.current,autoDensity:true,resolution:Math.min(window.devicePixelRatio||1,2)});
   if(dead||!host.current){pixi.destroy(true);return;}
   host.current.replaceChildren(pixi.canvas); pixi.canvas.style.width="100%"; pixi.canvas.style.height="100%"; pixi.canvas.style.display="block";
   const world=new Container(); pixi.stage.addChild(world);
   function render(){
    world.removeChildren();
    const bg=new Graphics(); bg.rect(0,0,760,470).fill(0x101923);
    for(let x=20;x<760;x+=40)bg.moveTo(x,0).lineTo(x,470).stroke({color:0x1b2835,width:1});
    for(let y=20;y<470;y+=40)bg.moveTo(0,y).lineTo(760,y).stroke({color:0x1b2835,width:1});
    world.addChild(bg);
    const s=current.current;
    for(const t of s.territories){
      const country=s.countries.find(c=>c.id===t.countryId);
      const selected=t.id===s.selectedTerritoryId;
      const shape=new Graphics(); drawPolygon(shape,t,country?.color??0x778899,selected);
      shape.eventMode="static"; shape.cursor="pointer"; shape.on("pointertap",()=>callback.current(t.id)); world.addChild(shape);
      const label=new Text({text:t.name,style:{fontFamily:"Arial, sans-serif",fontSize:12,fontWeight:selected?"bold":"normal",fill:0xffffff,stroke:{color:0x101923,width:3},align:"center",wordWrap:true,wordWrapWidth:120}});
      label.anchor.set(.5); label.position.set(t.center[0],t.center[1]); label.eventMode="none"; world.addChild(label);
    }
    const scale=Math.min(pixi.screen.width/760,pixi.screen.height/470);
    world.scale.set(scale); world.position.set((pixi.screen.width-760*scale)/2,(pixi.screen.height-470*scale)/2);
   }
   redraw.current=render; render();
   observer=new ResizeObserver(render); observer.observe(host.current);
  }
  void init();
  return ()=>{dead=true;observer?.disconnect();redraw.current=null;app?.destroy(true,{children:true});};
 },[]);
 useEffect(()=>{redraw.current?.();},[state]);
 return <div className="map-canvas" ref={host} aria-label="Mapa político interativo"/>;
}
