export interface Velocity {
  (element: HTMLElement, properties: Record<string, number>, options: {duration: number; complete?: () => void}): unknown;
  (element: HTMLElement, action: 'stop', clearQueue: boolean): unknown;
  hook(element: HTMLElement, property: string, value: string | number): unknown;
}
/** Browser-only, lazy initialization of the recovered MIT-licensed Velocity 1.5.2. */
export function getOriginalVelocity(): Velocity;
