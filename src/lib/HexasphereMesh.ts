import {
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Material,
  Mesh,
  MeshStandardMaterial,
  Spherical,
  Vector3,
} from "three";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Hexasphere } from "./Hexasphere";
import { Tile as HexasphereTileInternal } from "./Hexasphere/Tile";
import { Point as HexaspherePointInternal } from "./Hexasphere/Point";

export interface HexasphereParams {
  radius: number;
  numDivisions: number;
  tileScale?: number;
  coloringMode?: "none" | "average" | "vertex";
  mapImageUrl?: string;
  defaultColor?: Color;
}

interface InternalHexasphereParams extends HexasphereParams {
  mapImageData?: ImageData | null;
}

export class HexasphereMesh extends Mesh {
  private internalParams: InternalHexasphereParams;
  private _isGenerating: boolean = false;

  constructor(params: HexasphereParams, initialMaterial?: Material) {
    super();

    this.internalParams = {
      radius: params.radius,
      numDivisions: params.numDivisions,
      tileScale: params.tileScale !== undefined ? params.tileScale : 1.0,
      coloringMode: params.coloringMode || "none",
      mapImageUrl: params.mapImageUrl,
      defaultColor: params.defaultColor || new Color(0xcccccc),
      mapImageData: null,
    };

    this.material =
      initialMaterial ||
      new MeshStandardMaterial({
        side: DoubleSide,
        vertexColors: this.internalParams.coloringMode !== "none",
        color:
          this.internalParams.coloringMode === "none"
            ? this.internalParams.defaultColor
            : 0xffffff,
        roughness: 0.8,
        metalness: 0.2,
      });

    this.generateGeometry();
  }

  public async updateParameters(
    newParams: Partial<HexasphereParams>
  ): Promise<void> {
    if (this._isGenerating) {
      console.warn("Generation already in progress. Please wait.");
      return;
    }

    let needsRegeneration = false;
    let needsMapReload = false;

    if (
      newParams.radius !== undefined &&
      newParams.radius !== this.internalParams.radius
    ) {
      this.internalParams.radius = newParams.radius;
      needsRegeneration = true;
    }
    if (
      newParams.numDivisions !== undefined &&
      newParams.numDivisions !== this.internalParams.numDivisions
    ) {
      this.internalParams.numDivisions = newParams.numDivisions;
      needsRegeneration = true;
    }
    if (
      newParams.tileScale !== undefined &&
      newParams.tileScale !== this.internalParams.tileScale
    ) {
      this.internalParams.tileScale = newParams.tileScale;
      needsRegeneration = true;
    }
    if (
      newParams.coloringMode !== undefined &&
      newParams.coloringMode !== this.internalParams.coloringMode
    ) {
      this.internalParams.coloringMode = newParams.coloringMode;
      (this.material as MeshStandardMaterial).vertexColors =
        newParams.coloringMode !== "none";
      if (this.internalParams.coloringMode === "none") {
        (this.material as MeshStandardMaterial).color.set(
          this.internalParams.defaultColor!
        );
      } else {
        (this.material as MeshStandardMaterial).color.set(0xffffff);
      }
      (this.material as MeshStandardMaterial).needsUpdate = true;
      needsRegeneration = true;
    }
    if (
      newParams.mapImageUrl !== undefined &&
      newParams.mapImageUrl !== this.internalParams.mapImageUrl
    ) {
      this.internalParams.mapImageUrl = newParams.mapImageUrl;
      needsMapReload = true;
      needsRegeneration = true;
    }
    if (
      newParams.defaultColor !== undefined &&
      !newParams.defaultColor.equals(this.internalParams.defaultColor!)
    ) {
      this.internalParams.defaultColor = newParams.defaultColor;
      if (this.internalParams.coloringMode === "none") {
        (this.material as MeshStandardMaterial).color.set(
          this.internalParams.defaultColor!
        );
        (this.material as MeshStandardMaterial).needsUpdate = true;
      }
    }

    if (needsRegeneration) {
      await this.generateGeometry(needsMapReload);
    }
  }

  public async generateGeometry(
    forceMapReload: boolean = false
  ): Promise<void> {
    if (this._isGenerating) return;
    this._isGenerating = true;
    console.log("Generating Hexasphere geometry...");

    if (
      (this.internalParams.coloringMode === "average" ||
        this.internalParams.coloringMode === "vertex") &&
      this.internalParams.mapImageUrl &&
      (!this.internalParams.mapImageData || forceMapReload)
    ) {
      console.log("Loading map image data for coloring...");
      this.internalParams.mapImageData = await this._loadImageData(
        this.internalParams.mapImageUrl
      );
      if (!this.internalParams.mapImageData) {
        console.warn(
          "Failed to load map image. Falling back to default coloring."
        );
        this.internalParams.coloringMode = "none";
        (this.material as MeshStandardMaterial).vertexColors = false;
        (this.material as MeshStandardMaterial).color.set(
          this.internalParams.defaultColor!
        );
        (this.material as MeshStandardMaterial).needsUpdate = true;
      }
    }

    const hexasphere = new Hexasphere(
      this.internalParams.radius,
      this.internalParams.numDivisions,
      this.internalParams.tileScale
    );

    const newGeometry = this._createMergedGeometry(hexasphere.tiles);

    if (this.geometry) {
      this.geometry.dispose();
    }
    this.geometry = newGeometry;
    this.geometry.computeBoundingSphere();

    this._isGenerating = false;
    console.log("Hexasphere geometry generation complete.");
  }

  private async _loadImageData(imageUrl: string): Promise<ImageData | null> {
    return new Promise((resolve) => {
      const image = new Image();
      image.crossOrigin = "Anonymous";
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext("2d");
        if (context) {
          context.drawImage(image, 0, 0);
          resolve(context.getImageData(0, 0, image.width, image.height));
        } else {
          console.error(
            "Could not get 2D context from image for data extraction."
          );
          resolve(null);
        }
      };
      image.onerror = (err) => {
        console.error(`Error loading image at ${imageUrl}:`, err);
        resolve(null);
      };
      image.src = imageUrl;
    });
  }

  private _sampleColorFromMap(pointOnSphere: Vector3): Color {
    if (!this.internalParams.mapImageData) {
      return this.internalParams.defaultColor!.clone();
    }
    const imgData = this.internalParams.mapImageData;
    const pNormalized = pointOnSphere.clone().normalize();
    const spherical = new Spherical().setFromVector3(pNormalized);
    const latitude = Math.PI / 2 - spherical.phi;
    const longitude = spherical.theta;
    const u = (longitude + Math.PI) / (2 * Math.PI);
    const v = 1.0 - (latitude + Math.PI / 2) / Math.PI;

    const x = Math.max(
      0,
      Math.min(imgData.width - 1, Math.floor(u * imgData.width))
    );
    const y = Math.max(
      0,
      Math.min(imgData.height - 1, Math.floor(v * imgData.height))
    );

    const pixelIndex = (y * imgData.width + x) * 4;
    const r = imgData.data[pixelIndex] / 255;
    const g = imgData.data[pixelIndex + 1] / 255;
    const b = imgData.data[pixelIndex + 2] / 255;

    return new Color(r, g, b);
  }

  private _createTileGeometry(
    boundaryPoints: Vector3[],

    tileColor?: Color,
    vertexColorFn?: (vertex: Vector3) => Color
  ): BufferGeometry {
    const geometry = new BufferGeometry();
    if (boundaryPoints.length < 3) return geometry;

    const planarCenter = new Vector3();
    boundaryPoints.forEach((p) => planarCenter.add(p));
    planarCenter.divideScalar(boundaryPoints.length);

    const vertices: number[] = [];
    const indices: number[] = [];
    const colorsAttribute: number[] = [];

    vertices.push(planarCenter.x, planarCenter.y, planarCenter.z);
    if (this.internalParams.coloringMode !== "none") {
      const color = vertexColorFn ? vertexColorFn(planarCenter) : tileColor!;
      colorsAttribute.push(color.r, color.g, color.b);
    }

    boundaryPoints.forEach((p) => {
      vertices.push(p.x, p.y, p.z);
      if (this.internalParams.coloringMode !== "none") {
        const color = vertexColorFn ? vertexColorFn(p) : tileColor!;
        colorsAttribute.push(color.r, color.g, color.b);
      }
    });

    for (let i = 0; i < boundaryPoints.length; i++) {
      const next = (i + 1) % boundaryPoints.length;
      indices.push(0, i + 1, next + 1);
    }

    geometry.setIndex(indices);
    geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
    if (
      this.internalParams.coloringMode !== "none" &&
      colorsAttribute.length > 0
    ) {
      geometry.setAttribute(
        "color",
        new Float32BufferAttribute(colorsAttribute, 3)
      );
    }
    geometry.computeVertexNormals();
    return geometry;
  }

  private _createMergedGeometry(
    allTiles: HexasphereTileInternal[]
  ): BufferGeometry {
    const tileGeometries: BufferGeometry[] = [];

    allTiles.forEach((tile) => {
      if (!tile.boundary || tile.boundary.length < 3) return;

      const boundaryVec3 = tile.boundary.map(
        (p: HexaspherePointInternal) => new Vector3(p.x, p.y, p.z)
      );

      let tileGeometry: BufferGeometry;

      if (this.internalParams.coloringMode === "average") {
        const tileCenter3D = new Vector3(
          tile.centerPoint.x,
          tile.centerPoint.y,
          tile.centerPoint.z
        );

        const sampledAvgColor = this._sampleColorFromMap(tileCenter3D);
        tileGeometry = this._createTileGeometry(boundaryVec3, sampledAvgColor);
      } else if (this.internalParams.coloringMode === "vertex") {
        tileGeometry = this._createTileGeometry(
          boundaryVec3,
          undefined,
          (vertex: Vector3) => this._sampleColorFromMap(vertex)
        );
      } else {
        tileGeometry = this._createTileGeometry(boundaryVec3);
      }

      if (
        tileGeometry.attributes.position &&
        tileGeometry.attributes.position.count > 0
      ) {
        tileGeometries.push(tileGeometry);
      }
    });

    if (tileGeometries.length === 0) return new BufferGeometry();
    return BufferGeometryUtils.mergeGeometries(tileGeometries, false);
  }

  public get currentParams(): Readonly<InternalHexasphereParams> {
    return this.internalParams;
  }
}
