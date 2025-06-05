import {
  AmbientLight,
  AxesHelper,
  Color,
  DirectionalLight,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createDemoGUI, type GuiSphereState } from "./gui";
import { HexasphereMesh, type HexasphereParams } from "./lib/HexasphereMesh";

let scene: Scene;
let camera: PerspectiveCamera;
let renderer: WebGLRenderer;
let controls: OrbitControls;
let customSphere: HexasphereMesh;
let wireframeOverlay: Mesh | undefined;

async function init(): Promise<void> {
  scene = new Scene();
  scene.background = new Color(0x1a1a1a);

  const initialRadius = 3;
  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, initialRadius * 1.2, initialRadius * 2.5);
  camera.lookAt(0, 0, 0);

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.minDistance = initialRadius * 0.5;
  controls.maxDistance = initialRadius * 5;

  const ambientLight = new AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);
  const directionalLight = new DirectionalLight(0xffffff, 0.9);
  directionalLight.position.set(
    initialRadius * 1.5,
    initialRadius * 2,
    initialRadius * 1.5
  );
  scene.add(directionalLight);

  const sphereInitParams: HexasphereParams = {
    radius: initialRadius,
    numDivisions: 10,
    tileScale: 1.0,
    coloringMode: "average",
    mapImageUrl: "earth_equirectangular.png",
    defaultColor: new Color(0x777777),
  };

  customSphere = new HexasphereMesh(sphereInitParams);

  await customSphere.generateGeometry(true);
  scene.add(customSphere);

  if (customSphere.geometry) {
    const wireframeMaterial = new MeshBasicMaterial({
      color: 0xeeeeee,
      wireframe: true,
      transparent: true,
      opacity: 0.2,
    });
    wireframeOverlay = new Mesh(
      customSphere.geometry.clone(),
      wireframeMaterial
    );
    wireframeOverlay.visible = false;
    scene.add(wireframeOverlay);

    const originalGenerateGeometry =
      customSphere.generateGeometry.bind(customSphere);
    customSphere.generateGeometry = async (forceMapReload?: boolean) => {
      await originalGenerateGeometry(forceMapReload);
      if (wireframeOverlay && customSphere.geometry) {
        if (wireframeOverlay.geometry) wireframeOverlay.geometry.dispose();
        wireframeOverlay.geometry = customSphere.geometry.clone();
      }
    };
  }

  const guiState: GuiSphereState = {
    radius: sphereInitParams.radius,
    numDivisions: sphereInitParams.numDivisions,
    tileScale: sphereInitParams.tileScale!,
    coloringMode: sphereInitParams.coloringMode!,
    mapImageUrl: sphereInitParams.mapImageUrl!,
    showWireframe: false,
  };

  createDemoGUI(guiState, customSphere, wireframeOverlay);

  const axesHelper = new AxesHelper(initialRadius * 1.5);
  scene.add(axesHelper);

  window.addEventListener("resize", onWindowResize, false);
  animate();
}

function onWindowResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate(): void {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

init();
