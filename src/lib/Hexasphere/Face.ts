import { Point } from "./Point";

let faceCount = 0;

export class Face {
  public readonly id: number;
  public readonly points: [Point, Point, Point];
  private centroid?: Point;

  constructor(
    point1: Point,
    point2: Point,
    point3: Point,
    register: boolean = true
  ) {
    this.id = faceCount++;
    this.points = [point1, point2, point3];

    if (register) {
      point1.registerFace(this);
      point2.registerFace(this);
      point3.registerFace(this);
    }
  }

  getOtherPoints(point1: Point): Point[] {
    return this.points.filter(
      (point) => point.toString() !== point1.toString()
    );
  }

  findThirdPoint(point1: Point, point2: Point): Point | undefined {
    return this.points.find(
      (point) =>
        point.toString() !== point1.toString() &&
        point.toString() !== point2.toString()
    );
  }

  isAdjacentTo(face2: Face): boolean {
    // Adjacent if 2 of the points are the same
    const sharedPoints = this.points.filter((thisPoint) =>
      face2.points.some(
        (otherPoint) => thisPoint.toString() === otherPoint.toString()
      )
    );
    return sharedPoints.length === 2;
  }

  getCentroid(clear: boolean = false): Point {
    if (this.centroid && !clear) {
      return this.centroid;
    }

    const x = (this.points[0].x + this.points[1].x + this.points[2].x) / 3;
    const y = (this.points[0].y + this.points[1].y + this.points[2].y) / 3;
    const z = (this.points[0].z + this.points[1].z + this.points[2].z) / 3;

    this.centroid = new Point(x, y, z);
    return this.centroid;
  }
}
