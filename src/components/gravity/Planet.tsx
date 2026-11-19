'use client';

import { memo, useEffect, useLayoutEffect, useRef } from 'react';
import { PLANET_COUNT } from '@/lib/gravity/constants';
import { PlanetAnimation } from '@/lib/gravity/planet-animation';

interface Props {
  currentLevel: number;
  gameState: string;
  windowHeight: number;
  windowWidth: number;
  planetAssetPaths: Record<number, string>;
  onLoaded: (level: number) => void;
}

function PlanetsBase({currentLevel, gameState, windowHeight, windowWidth, planetAssetPaths, onLoaded}: Props) {
  const elements = useRef<(HTMLDivElement | null)[]>([]);
  const images = useRef<(HTMLImageElement | null)[]>([]);
  const animation = useRef<PlanetAnimation | null>(null);

  useLayoutEffect(() => {
    const controller = new PlanetAnimation(elements.current.filter((el): el is HTMLDivElement => el !== null));
    animation.current = controller;
    return () => { controller.destroy(); animation.current = null; };
  }, []);

  useLayoutEffect(() => {
    animation.current?.update({level: currentLevel, gameState, width: windowWidth, height: windowHeight});
  }, [currentLevel, gameState, windowWidth, windowHeight]);

  useEffect(() => {
    let cancelled = false;
    const controller = animation.current;
    if (!controller) return;
    for (const [index, image] of images.current.entries()) {
      if (!image) continue;
      void controller.prepareTexture(index + 1, image, windowWidth).then(() => {
        if (!cancelled) onLoaded(index + 1);
      }).catch(() => {});
    }
    return () => { cancelled = true; };
  }, [planetAssetPaths, windowWidth, onLoaded]);

  return <>{Array.from({length: PLANET_COUNT}, (_, index) => (
    <div key={index + 1} ref={el => { elements.current[index] = el; }}
      className="GravityPlanet is-hidden" data-planet={index + 1} style={{left: 0}}>
      <img ref={el => { images.current[index] = el; }} src={planetAssetPaths[index + 1]}
        alt="" className="GravityPlanet--preload" loading="eager" decoding="async" />
    </div>
  ))}</>;
}

export const Planets = memo(PlanetsBase);
