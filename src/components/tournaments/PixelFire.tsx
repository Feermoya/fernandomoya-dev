import { useEffect, useState } from 'react';

const FRAMES = [
  ['....R...R...','...RR..RR...','..RRR.RRR...','.RRRRRRRR...','.RRROOORRR..','RRROOOOORRR.','RROOOOOOORRR','RROOOYYOOORR','RROOYYYYOORR','.ROYYYYYYOR.','.ROYYYYYYOR.','..OOYYYYOO..','...OOYYOO...','....OOOO....'],
  ['......R.....','..R..RR.....','..RRRRR.R...','..RRRRRRRR..','.RRROOORRR..','.RROOOOORRR.','RRROOOOOORR.','RROOOYYOOORR','RROOYYYYOORR','.ROYYYYYYOR.','.ROYYYYYYOR.','..OOYYYYOO..','...OOYYOO...','....OOOO....'],
  ['...R........','...RR...R...','..RRR..RR...','..RRRRRRRR..','.RRROOORRR..','RRROOOOORRR.','RRROOOOOOORR','RROOOYYOOORR','RROOYYYYOORR','.ROYYYYYYOR.','.ROYYYYYYOR.','..OOYYYYOO..','...OOYYOO...','....OOOO....'],
  ['.......R....','....R.RRR...','...RRRRRRR..','..RRRRRRRR..','.RRROOORRR..','RRROOOOORRR.','RRROOOOOOORR','RROOOYYOOORR','RROOYYYYOORR','.ROYYYYYYOR.','.ROYYYYYYOR.','..OOYYYYOO..','...OOYYOO...','....OOOO....'],
  ['....R.......','...RR..R....','..RRRRRR....','..RRRRRRRR..','.RRROOORRR..','RRROOOOORRR.','RROOOOOOORR.','RROOOYYOOORR','RROOYYYYOORR','.ROYYYYYYOR.','.ROYYYYYYOR.','..OOYYYYOO..','...OOYYOO...','....OOOO....'],
  ['......R.....','....RRR.R...','..RRRRRRR...','.RRRRRRRR...','.RRROOORRR..','RRROOOOORRR.','RROOOOOOORR.','RROOOYYOOORR','RROOYYYYOORR','.ROYYYYYYOR.','.ROYYYYYYOR.','..OOYYYYOO..','...OOYYOO...','....OOOO....'],
] as const;
const COLORS: Record<string,string> = { R:'#ff461c',O:'#ff9a24',Y:'#ffe76c' };
const PIXELS = FRAMES.map((rows) => rows.flatMap((line,y) => [...line].flatMap((symbol,x) => COLORS[symbol] ? [{x,y,color:COLORS[symbol]}] : [])));

export default function PixelFire() {
  const [frame,setFrame] = useState(0);
  useEffect(() => {
    // The user explicitly requested a continuously animated flame, including on iOS
    // devices configured to reduce interface motion. Keep the sprite small and cheap.
    const timer = window.setInterval(() => setFrame((previous) => (previous + 1) % PIXELS.length), 110);
    return () => window.clearInterval(timer);
  },[]);
  return <span className="streak-fire-scene" aria-hidden="true">
    <svg className="streak-flame-sprite" viewBox="0 0 12 14" shapeRendering="crispEdges" xmlns="http://www.w3.org/2000/svg">
      {PIXELS[frame].map((pixel,index) => <rect key={index} x={pixel.x} y={pixel.y} width="1" height="1" fill={pixel.color}/>)}
    </svg>
    <i className="streak-ember streak-ember-one"/><i className="streak-ember streak-ember-two"/><i className="streak-ember streak-ember-three"/>
  </span>;
}
