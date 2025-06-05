import GUI from "lil-gui";
import type { HexasphereMesh, HexasphereParams } from "./lib/HexasphereMesh";
import type { Mesh } from "three";

export interface GuiSphereState {
  radius: number;
  numDivisions: number;
  tileScale: number;
  coloringMode: "none" | "average" | "vertex";
  mapImageUrl: string;
  showWireframe: boolean;
}

export function createDemoGUI(
  initialState: GuiSphereState,
  hexasphereMesh: HexasphereMesh,
  wireframeMesh?: Mesh
): GUI {
  const gui = new GUI();

  function applyChanges() {
    const paramsToUpdate: Partial<HexasphereParams> = {
      radius: initialState.radius,
      numDivisions: initialState.numDivisions,
      tileScale: initialState.tileScale,
      coloringMode: initialState.coloringMode,
    };
    if (
      initialState.mapImageUrl &&
      (initialState.coloringMode === "average" ||
        initialState.coloringMode === "vertex")
    ) {
      paramsToUpdate.mapImageUrl = initialState.mapImageUrl;
    } else {
      paramsToUpdate.mapImageUrl = undefined;
    }
    hexasphereMesh.updateParameters(paramsToUpdate).catch(console.error);
  }

  gui
    .add(initialState, "radius", 0.5, 10, 0.1)
    .name("Sphere Radius")
    .onChange(applyChanges);
  gui
    .add(initialState, "numDivisions", 1, 30, 1)
    .name("Tile Divisions")
    .onChange(applyChanges);
  gui
    .add(initialState, "tileScale", 0.1, 1.0, 0.01)
    .name("Tile Scale Factor")
    .onChange(applyChanges);

  gui
    .add(initialState, "coloringMode", ["none", "average", "vertex"])
    .name("Coloring Mode")
    .onChange(applyChanges);

  gui
    .add(initialState, "mapImageUrl")
    .name("Map Image URL")
    .onFinishChange(applyChanges);

  if (wireframeMesh) {
    gui
      .add(initialState, "showWireframe")
      .name("Show Wireframe")
      .onChange((value: boolean) => {
        wireframeMesh.visible = value;
      });
  }

  gui.add({ regenerate: applyChanges }, "regenerate").name("Regenerate Sphere");

  return gui;
}
