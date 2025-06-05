import type { Face } from "./Face";
import type { CheckPointFunction, PointJson } from "./types";

export class Point {
  public x: number;
  public y: number;
  public z: number;
  public faces: Face[] = [];

  constructor(x?: number, y?: number, z?: number) {
    if (x !== undefined && y !== undefined && z !== undefined) {
      this.x = Number(x.toFixed(3));
      this.y = Number(y.toFixed(3));
      this.z = Number(z.toFixed(3));
    } else {
      this.x = 0;
      this.y = 0;
      this.z = 0;
    }
  }

  subdivide(
    point: Point,
    count: number,
    checkPoint: CheckPointFunction
  ): Point[] {
    const segments: Point[] = [this];

    for (let i = 1; i < count; i++) {
      const ratio = i / count;
      const np = new Point(
        this.x * (1 - ratio) + point.x * ratio,
        this.y * (1 - ratio) + point.y * ratio,
        this.z * (1 - ratio) + point.z * ratio
      );
      segments.push(checkPoint(np));
    }

    segments.push(point);
    return segments;
  }

  segment(point: Point, percent: number): Point {
    const clampedPercent = Math.max(0.01, Math.min(1, percent));

    const x = point.x * (1 - clampedPercent) + this.x * clampedPercent;
    const y = point.y * (1 - clampedPercent) + this.y * clampedPercent;
    const z = point.z * (1 - clampedPercent) + this.z * clampedPercent;

    return new Point(x, y, z);
  }

  midpoint(point: Point): Point {
    return this.segment(point, 0.5);
  }

  project(radius: number, percent: number = 1.0): Point {
    const clampedPercent = Math.max(0, Math.min(1, percent));

    const magnitude = Math.sqrt(
      Math.pow(this.x, 2) + Math.pow(this.y, 2) + Math.pow(this.z, 2)
    );
    const ratio = radius / magnitude;

    this.x = this.x * ratio * clampedPercent;
    this.y = this.y * ratio * clampedPercent;
    this.z = this.z * ratio * clampedPercent;

    return this;
  }

  registerFace(face: Face): void {
    this.faces.push(face);
  }

  getOrderedFaces(): Face[] {
    const workingArray = [...this.faces];
    const result: Face[] = [];

    let i = 0;
    while (i < this.faces.length) {
      if (i === 0) {
        result.push(workingArray[i]);
        workingArray.splice(i, 1);
      } else {
        let hit = false;
        let j = 0;
        while (j < workingArray.length && !hit) {
          if (workingArray[j].isAdjacentTo(result[i - 1])) {
            hit = true;
            result.push(workingArray[j]);
            workingArray.splice(j, 1);
          }
          j++;
        }
      }
      i++;
    }

    return result;
  }

  findCommonFace(other: Point, notThisFace: Face): Face | null {
    for (const thisFace of this.faces) {
      for (const otherFace of other.faces) {
        if (thisFace.id === otherFace.id && thisFace.id !== notThisFace.id) {
          return thisFace;
        }
      }
    }
    return null;
  }

  toJson(): PointJson {
    return {
      x: this.x,
      y: this.y,
      z: this.z,
    };
  }

  toString(): string {
    return `${this.x},${this.y},${this.z}`;
  }
}
