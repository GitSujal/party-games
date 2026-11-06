export const SHAPES: number[];
export const CROP_TOLERANCE: number;
export const MAX_EDGE: number;
export function probeSize(path: string): [number, number] | null;
export function nearestShape(w: number, h: number): { shape: number; off: number };
export function planSnap(w: number, h: number): { shape: number; action: 'keep' | 'crop' | 'pad'; resize: boolean; change: boolean };
export function snapBytes(bytes: Buffer, ext: string, work: string): { bytes: Buffer; ext: string };
export function syncShapes(): number;
