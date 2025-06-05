import type { Face } from "./Face";
import { Point } from "./Point";
import type { Vector3D, LatLon, TileJson } from "./types";

function vector(p1: Point, p2: Point): Vector3D {
  return {
    x: p2.x - p1.x,
    y: p2.y - p1.y,
    z: p2.z - p1.z,
  };
}

// https://www.khronos.org/opengl/wiki/Calculating_a_Surface_Normal
// Set Vector U to (Triangle.p2 minus Triangle.p1)
// Set Vector V to (Triangle.p3 minus Triangle.p1)
// Set Normal.x to (multiply U.y by V.z) minus (multiply U.z by V.y)
// Set Normal.y to (multiply U.z by V.x) minus (multiply U.x by V.z)
// Set Normal.z to (multiply U.x by V.y) minus (multiply U.y by V.x)
function calculateSurfaceNormal(p1: Point, p2: Point, p3: Point): Vector3D {
  const U = vector(p1, p2);
  const V = vector(p1, p3);

  return {
    x: U.y * V.z - U.z * V.y,
    y: U.z * V.x - U.x * V.z,
    z: U.x * V.y - U.y * V.x,
  };
}

function pointingAwayFromOrigin(p: Point, v: Vector3D): boolean {
  return p.x * v.x >= 0 && p.y * v.y >= 0 && p.z * v.z >= 0;
}

export class Tile {
  public readonly centerPoint: Point;
  public readonly faces: Face[];
  public readonly boundary: Point[];
  public readonly neighborIds: string[];
  public neighbors: Tile[] = [];

  constructor(centerPoint: Point, hexSize: number = 1) {
    const clampedHexSize = Math.max(0.01, Math.min(1.0, hexSize));

    this.centerPoint = centerPoint;
    this.faces = centerPoint.getOrderedFaces();
    this.boundary = [];
    this.neighborIds = [];

    const neighborHash: Record<string, number> = {};

    for (const face of this.faces) {
      // Build boundary
      this.boundary.push(
        face.getCentroid().segment(this.centerPoint, clampedHexSize)
      );

      // Get neighboring tiles
      const otherPoints = face.getOtherPoints(this.centerPoint);
      for (const otherPoint of otherPoints) {
        neighborHash[otherPoint.toString()] = 1;
      }
    }

    this.neighborIds = Object.keys(neighborHash);

    // Some of the faces are pointing in the wrong direction
    // Fix this. Should be a better way of handling it
    // than flipping them around afterwards
    if (this.boundary.length >= 3) {
      const normal = calculateSurfaceNormal(
        this.boundary[1],
        this.boundary[2],
        this.boundary[3] || this.boundary[0]
      );

      if (!pointingAwayFromOrigin(this.centerPoint, normal)) {
        this.boundary.reverse();
      }
    }
  }

  getLatLon(radius: number, boundaryNum?: number): LatLon {
    let point = this.centerPoint;
    if (typeof boundaryNum === "number" && boundaryNum < this.boundary.length) {
      point = this.boundary[boundaryNum];
    }

    const phi = Math.acos(point.y / radius); // lat
    const theta =
      ((Math.atan2(point.x, point.z) + Math.PI + Math.PI / 2) % (Math.PI * 2)) -
      Math.PI; // lon

    // theta is a hack, since I want to rotate by Math.PI/2 to start.
    return {
      lat: (180 * phi) / Math.PI - 90,
      lon: (180 * theta) / Math.PI,
    };
  }

  scaledBoundary(scale: number): Point[] {
    const clampedScale = Math.max(0, Math.min(1, scale));

    return this.boundary.map((point) =>
      this.centerPoint.segment(point, 1 - clampedScale)
    );
  }

  toJson(): TileJson {
    return {
      centerPoint: this.centerPoint.toJson(),
      boundary: this.boundary.map((point) => point.toJson()),
    };
  }

  toString(): string {
    return this.centerPoint.toString();
  }
}
