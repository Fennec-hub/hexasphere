// types.ts - Common types and interfaces

import type { Point } from "./Point";

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface LatLon {
  lat: number;
  lon: number;
}

export interface PointJson {
  x: number;
  y: number;
  z: number;
}

export interface TileJson {
  centerPoint: PointJson;
  boundary: PointJson[];
}

export interface HexasphereJson {
  radius: number;
  tiles: TileJson[];
}

export type CheckPointFunction = (point: Point) => Point;
