import { Tile } from "./Tile";
import { Face } from "./Face";
import { Point } from "./Point";
import type { HexasphereJson, CheckPointFunction } from "./types";

export class Hexasphere {
  public readonly radius: number;
  public readonly tiles: Tile[];
  public readonly tileLookup: Record<string, Tile>;

  constructor(radius: number, numDivisions: number, hexSize?: number) {
    this.radius = radius;
    const tao = 1.61803399;

    const corners = [
      new Point(1000, tao * 1000, 0),
      new Point(-1000, tao * 1000, 0),
      new Point(1000, -tao * 1000, 0),
      new Point(-1000, -tao * 1000, 0),
      new Point(0, 1000, tao * 1000),
      new Point(0, -1000, tao * 1000),
      new Point(0, 1000, -tao * 1000),
      new Point(0, -1000, -tao * 1000),
      new Point(tao * 1000, 0, 1000),
      new Point(-tao * 1000, 0, 1000),
      new Point(tao * 1000, 0, -1000),
      new Point(-tao * 1000, 0, -1000),
    ];

    let points: Record<string, Point> = {};

    for (const corner of corners) {
      points[corner.toString()] = corner;
    }

    const faces = [
      new Face(corners[0], corners[1], corners[4], false),
      new Face(corners[1], corners[9], corners[4], false),
      new Face(corners[4], corners[9], corners[5], false),
      new Face(corners[5], corners[9], corners[3], false),
      new Face(corners[2], corners[3], corners[7], false),
      new Face(corners[3], corners[2], corners[5], false),
      new Face(corners[7], corners[10], corners[2], false),
      new Face(corners[0], corners[8], corners[10], false),
      new Face(corners[0], corners[4], corners[8], false),
      new Face(corners[8], corners[2], corners[10], false),
      new Face(corners[8], corners[4], corners[5], false),
      new Face(corners[8], corners[5], corners[2], false),
      new Face(corners[1], corners[0], corners[6], false),
      new Face(corners[11], corners[1], corners[6], false),
      new Face(corners[3], corners[9], corners[11], false),
      new Face(corners[6], corners[10], corners[7], false),
      new Face(corners[3], corners[11], corners[7], false),
      new Face(corners[11], corners[6], corners[7], false),
      new Face(corners[6], corners[0], corners[10], false),
      new Face(corners[9], corners[1], corners[11], false),
    ];

    const getPointIfExists: CheckPointFunction = (point: Point): Point => {
      const key = point.toString();
      if (points[key]) {
        return points[key];
      } else {
        points[key] = point;
        return point;
      }
    };

    const newFaces: Face[] = [];

    for (const face of faces) {
      let prev: Point[] | null = null;
      let bottom = [face.points[0]];
      const left = face.points[0].subdivide(
        face.points[1],
        numDivisions,
        getPointIfExists
      );
      const right = face.points[0].subdivide(
        face.points[2],
        numDivisions,
        getPointIfExists
      );

      for (let i = 1; i <= numDivisions; i++) {
        prev = bottom;
        bottom = left[i].subdivide(right[i], i, getPointIfExists);

        for (let j = 0; j < i; j++) {
          const nf = new Face(prev[j], bottom[j], bottom[j + 1]);
          newFaces.push(nf);

          if (j > 0) {
            const nf2 = new Face(prev[j - 1], prev[j], bottom[j]);
            newFaces.push(nf2);
          }
        }
      }
    }

    // Project all points onto the sphere
    const newPoints: Record<string, Point> = {};
    for (const key in points) {
      const np = points[key].project(radius);
      newPoints[np.toString()] = np;
    }

    points = newPoints;

    this.tiles = [];
    this.tileLookup = {};

    // Create tiles and store in a lookup for references
    for (const key in points) {
      const newTile = new Tile(points[key], hexSize);
      this.tiles.push(newTile);
      this.tileLookup[newTile.toString()] = newTile;
    }

    // Resolve neighbor references now that all have been created
    for (const tile of this.tiles) {
      tile.neighbors = tile.neighborIds
        .map((id) => this.tileLookup[id])
        .filter((neighbor) => neighbor !== undefined);
    }
  }

  toJson(): string {
    const data: HexasphereJson = {
      radius: this.radius,
      tiles: this.tiles.map((tile) => tile.toJson()),
    };
    return JSON.stringify(data);
  }

  toObj(): string {
    const objV: Point[] = [];
    const objF: number[][] = [];
    let objText = "# vertices \n";
    const vertexIndexMap: Record<string, number> = {};

    for (const tile of this.tiles) {
      const F: number[] = [];

      for (const boundaryPoint of tile.boundary) {
        const key = boundaryPoint.toString();
        let index = vertexIndexMap[key];

        if (index === undefined) {
          objV.push(boundaryPoint);
          index = objV.length;
          vertexIndexMap[key] = index;
        }

        F.push(index);
      }

      objF.push(F);
    }

    for (const vertex of objV) {
      objText += `v ${vertex.x} ${vertex.y} ${vertex.z}\n`;
    }

    objText += "\n# faces\n";
    for (const face of objF) {
      const faceString = "f " + face.join(" ");
      objText += faceString + "\n";
    }

    return objText;
  }
}
