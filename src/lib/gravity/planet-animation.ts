import { GAME_STATES, planetLevelFor } from './constants';
import { getOriginalVelocity } from './vendor/velocity-original';

const DURATION = 500;
const ENTRY_DURATION = 200;
type Transform = {translateX: number; translateY: number; scaleX: number; scaleY: number};
type Scene = {level: number; width: number; height: number; gameState: string};
const splashStates: string[] = [GAME_STATES.INTRO, GAME_STATES.OPTIONS, GAME_STATES.DIRECTIONS, GAME_STATES.LOADING, GAME_STATES.GAME_OVER];
const isTransformTransition = (animation: Animation): animation is CSSTransition =>
  'transitionProperty' in animation && ['transform', '-webkit-transform'].includes((animation as CSSTransition).transitionProperty);

/** The approved original-timing transition, with a continuous third-planet entry. */
export class PlanetAnimation {
  private velocity = getOriginalVelocity();
  private scene: Scene | null = null;
  private epoch = 0;
  private entry: Animation | null = null;
  private frame: number | null = null;
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private targets = new Map<HTMLElement, Transform>();
  private compact = new Set<HTMLElement>();
  private textures = new Map<number, HTMLImageElement>();
  private entryTextures = new Map<number, {size: number; url: string}>();

  constructor(private planets: HTMLElement[]) {
    // Velocity's historical Android workaround forces the first scale below
    // one to one. Seed its cache in translate-then-scale order first.
    for (const el of planets) this.setTransform(el, {translateX: 0, translateY: 0, scaleX: 1, scaleY: 1});
  }

  async prepareTexture(level: number, image: HTMLImageElement, width: number) {
    await image.decode();
    this.textures.set(level, image);
    const url = this.entryTexture(level, width);
    if (url) { const small = new Image(); small.src = url; await small.decode(); }
  }

  private entryTexture(level: number, width: number) {
    const image = this.textures.get(level);
    if (!image || width <= 0) return null;
    const size = Math.max(1, Math.ceil(.04 * width * window.devicePixelRatio));
    const cached = this.entryTextures.get(level);
    if (cached?.size === size) return cached.url;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) return null;
    const ratio = Math.max(size / image.naturalWidth, size / image.naturalHeight);
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, (size - image.naturalWidth * ratio) / 2, 0, image.naturalWidth * ratio, image.naturalHeight * ratio);
    const url = canvas.toDataURL();
    this.entryTextures.set(level, {size, url});
    return url;
  }

  private setTransform(el: HTMLElement, transform: Transform) {
    for (const [name, value] of Object.entries(transform)) {
      this.velocity.hook(el, name, name.startsWith('translate') ? value + 'px' : value);
    }
  }

  private target(planet: number, {level, width: w, height: h}: Scene): Transform {
    let x = 0, y = 9999, scale = 1;
    if (planet === planetLevelFor(level)) { x = -.5 * w; y = h - 300; }
    else if (planet === planetLevelFor(level + 1)) { x = .7 * w; y = .1 * h; scale = .05; }
    else if (planet === planetLevelFor(level + 2)) { x = .9 * w; y = .08 * h; scale = .02; }
    else if (planet === planetLevelFor(level + 3)) { x = w + 8; y = .08 * h; scale = .02; }
    return {translateX: x, translateY: y, scaleX: scale, scaleY: scale};
  }

  private cancel() {
    ++this.epoch;
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
    this.entry?.cancel();
    this.entry = null;
    for (const el of this.planets) this.velocity(el, 'stop', true);
  }

  update(next: Scene) {
    if (next.width <= 0 || next.height <= 0) return;
    const previous = this.scene;
    const visible = !splashStates.includes(next.gameState);
    const wasVisible = previous && !splashStates.includes(previous.gameState);
    if (previous?.level === next.level && previous.width === next.width && previous.height === next.height && visible === wasVisible) return;
    const animate = Boolean(previous && visible && wasVisible && next.level === previous.level + 1 && next.width === previous.width && next.height === previous.height);
    this.cancel();
    this.scene = next;
    const epoch = this.epoch;
    const incoming = this.planets[planetLevelFor(next.level + 2) - 1];
    const leaders = [this.planets[planetLevelFor(next.level) - 1], this.planets[planetLevelFor(next.level + 1) - 1]];
    let completed = 0;
    const onLeaderComplete = () => { if (++completed === 2 && epoch === this.epoch) this.enter(incoming, leaders, next, epoch); };

    for (const [index, el] of this.planets.entries()) {
      const planet = index + 1, target = this.target(planet, next);
      const previousTarget = this.targets.get(el);
      const entering = el === incoming;
      if (this.compact.has(el)) {
        el.style.transition = 'none';
        el.style.width = el.style.height = 2 * next.width + 'px';
        el.style.backgroundImage = '';
        this.setTransform(el, previousTarget!);
        getComputedStyle(el).transform;
        this.compact.delete(el);
      }
      el.style.width = el.style.height = 2 * next.width + 'px';
      el.style.transition = animate && !entering ? `all ${DURATION}ms ease-in` : 'none';
      const show = visible && [planetLevelFor(next.level), planetLevelFor(next.level + 1), planetLevelFor(next.level + 2)].includes(planet) && !(animate && entering);
      const placeholder = (next.level === 1 || next.level === 2) && planet === 1;
      el.className = `GravityPlanet${show ? '' : ' is-hidden'} GravityPlanet--${placeholder ? 'level1Placeholder' : 'level' + planet}`;
      this.targets.set(el, target);
      if (!animate) this.velocity(el, target, {duration: 0});
      else if (JSON.stringify(previousTarget) !== JSON.stringify(target) && !entering) {
        // Same stop + per-element next-task scheduling as original velocity-react.
        const timer = setTimeout(() => {
          this.timers.delete(timer);
          if (epoch === this.epoch) this.velocity(el, target, {duration: DURATION, complete: leaders.includes(el) ? onLeaderComplete : undefined});
        }, 0);
        this.timers.add(timer);
      }
    }
  }

  private enter(incoming: HTMLElement, leaders: HTMLElement[], scene: Scene, epoch: number) {
    if (epoch !== this.epoch) return;
    for (const el of leaders) getComputedStyle(el).transform;
    const transitions = leaders.flatMap(el => el.getAnimations()).filter(isTransformTransition);
    if (transitions.some(animation => animation.startTime === null)) {
      this.frame = requestAnimationFrame(() => this.enter(incoming, leaders, scene, epoch));
      return;
    }
    const end = Math.max(Number(document.timeline.currentTime), ...transitions.map(animation => Number(animation.startTime) + Number(animation.effect!.getComputedTiming().endTime)));
    const target = this.targets.get(incoming)!;
    const startX = scene.width + 8;
    let frames: Keyframe[] = Array.from({length: 61}, (_, i) => {
      const progress = i / 60, eased = .5 - Math.cos(Math.PI * progress) / 2;
      return {offset: progress, transform: `translate(${startX + (target.translateX - startX) * eased}px, ${target.translateY}px) scale(1, 1)`};
    });
    let timing: KeyframeAnimationOptions = {duration: ENTRY_DURATION, easing: 'linear', fill: 'both'};
    let start = end - ENTRY_DURATION;
    const second = leaders[1].getAnimations().find(isTransformTransition);
    if (scene.width <= 620 && second?.effect) {
      // Keep both visible centres moving together on phones, including easing.
      frames = (second.effect as KeyframeEffect).getKeyframes().map(frame => {
        const matrix = new DOMMatrixReadOnly(String(frame.transform));
        const x = matrix.m41 + scene.width * matrix.m11 + .15 * scene.width;
        return {offset: frame.computedOffset, easing: frame.easing, transform: `translate(${x}px, ${target.translateY}px) scale(1, 1)`};
      });
      timing = {...second.effect.getTiming(), fill: 'both'};
      start = Number(second.startTime);
    }
    // Rasterize at visible resolution before entry: Safari otherwise skips
    // frames uploading a playfield-sized texture for a tiny incoming planet.
    incoming.style.width = incoming.style.height = 2 * scene.width * target.scaleX + 'px';
    const texture = this.entryTexture(planetLevelFor(scene.level + 2), scene.width);
    if (texture) incoming.style.backgroundImage = `url("${texture}")`;
    this.setTransform(incoming, {translateX: startX, translateY: target.translateY, scaleX: 1, scaleY: 1});
    this.compact.add(incoming);
    incoming.classList.remove('is-hidden');
    const animation = incoming.animate(frames, timing);
    this.entry = animation;
    animation.startTime = start;
    animation.onfinish = () => {
      if (epoch !== this.epoch) return;
      this.setTransform(incoming, {...target, scaleX: 1, scaleY: 1});
      animation.cancel();
      this.entry = null;
    };
  }

  destroy() { this.cancel(); this.textures.clear(); this.entryTextures.clear(); }
}
