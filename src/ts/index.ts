import {
    Color3,
    DirectionalLight,
    Engine,
    HavokPlugin,
    HemisphericLight,
    MeshBuilder, 
    PBRMetallicRoughnessMaterial,
    PhysicsAggregate,
    PhysicsShapeType,
    PhysicsViewer,
    ReflectionProbe,
    Scene,
    ShadowGenerator, 
    Tools,
    Vector3,
    SceneLoader,
    PBRMaterial
} from "@babylonjs/core";
import HavokPhysics from "@babylonjs/havok";
import loom from "../assets/loom.glb"

import "../styles/index.scss";
import { CharacterController } from "./character";
import { SkyMaterial } from "@babylonjs/materials";

// Set up canvas and engine
const canvas = document.getElementById("renderer") as HTMLCanvasElement;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const engine = new Engine(canvas);
engine.displayLoadingUI();

// Initialize physics engine (Havok)
const havokInstance = await HavokPhysics();
const havokPlugin = new HavokPlugin(true, havokInstance);

const scene = new Scene(engine);
scene.enablePhysics(new Vector3(0, -9.81, 0), havokPlugin);

// Directional light (sun)
const sun = new DirectionalLight("light", new Vector3(-5, -10, 5).normalize(), scene);
sun.position = sun.direction.negate().scaleInPlace(40);

// Shadows
const shadowGenerator = new ShadowGenerator(1024, sun);
shadowGenerator.useExponentialShadowMap = true;

// Hemispheric light for ambient lighting
const hemiLight = new HemisphericLight("hemi", Vector3.Up(), scene);
hemiLight.intensity = 0.4;

// Skybox and sky material
const skyMaterial = new SkyMaterial("skyMaterial", scene);
skyMaterial.backFaceCulling = false;
skyMaterial.useSunPosition = true;
skyMaterial.sunPosition = sun.direction.negate();

const skybox = MeshBuilder.CreateBox("skyBox", { size: 1000.0 }, scene);
skybox.material = skyMaterial;

// Reflection probe for environment reflection
const rp = new ReflectionProbe("ref", 512, scene);
rp.renderList?.push(skybox);
scene.environmentTexture = rp.cubeTexture;

// Ground setup with physics
const groundMaterial = new PBRMetallicRoughnessMaterial("groundMaterial", scene);
groundMaterial.alpha = 0;
groundMaterial.transparencyMode = PBRMaterial.PBRMATERIAL_ALPHATESTANDBLEND;
const ground = MeshBuilder.CreateGround("ground", { width: 1000, height: 1000 });
ground.material = groundMaterial;
ground.receiveShadows = true;
new PhysicsAggregate(ground, PhysicsShapeType.BOX, { mass: 0 }, scene);

// Load the LoomCity.glb scene and scale it by 1.5x
const result = await SceneLoader.ImportMeshAsync("", "", loom, scene);
result.meshes.forEach(mesh => {
    mesh.scaling.scaleInPlace(0.7);  // Scale the entire LoomCity by 1.5x
    mesh.position.y += 0.31;  // Move the mesh up by 1 unit
});

// Character controller setup
const characterController = await CharacterController.CreateAsync(scene);
characterController.getTransform().position.y = 3;
shadowGenerator.addShadowCaster(characterController.model);

// // Create random boxes with physics and shadows
// for (let i = 0; i < 4; i++) {
//     const boxMaterial = new PBRMetallicRoughnessMaterial("boxMaterial", scene);
//     boxMaterial.baseColor = Color3.Random();

//     const box = MeshBuilder.CreateBox("Box", { size: 1 }, scene);
//     box.material = boxMaterial;
//     shadowGenerator.addShadowCaster(box);
//     box.position.copyFromFloats((Math.random() - 0.5) * 6, 4 + Math.random() * 2, 5 + Math.random() * 2);

//     const boxAggregate = new PhysicsAggregate(box, PhysicsShapeType.BOX, { mass: 10 }, scene);
//     boxAggregate.body.applyAngularImpulse(new Vector3(Math.random(), Math.random(), Math.random()));
// }

// Function to update the scene
function updateScene() {
    const deltaSeconds = engine.getDeltaTime() / 1000;
    characterController.update(deltaSeconds);
}

// Start rendering the scene
scene.executeWhenReady(() => {
    engine.loadingScreen.hideLoadingUI();
    scene.onBeforeRenderObservable.add(() => updateScene());
    engine.runRenderLoop(() => scene.render());
});

// Handle window resizing
window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    engine.resize();
});

// Physics viewer setup for debugging
const physicsViewer = new PhysicsViewer(scene);
let bodyShown = false;

document.addEventListener("keydown", async e => {
    if (e.key === "p") {
        Tools.CreateScreenshot(engine, characterController.thirdPersonCamera, { width: canvas.width, height: canvas.height });
    }
    if (e.key === "v") {
        bodyShown = !bodyShown;

        if(bodyShown) {
            scene.transformNodes.forEach(transform => { if (transform.physicsBody) physicsViewer.showBody(transform.physicsBody) });
            scene.meshes.forEach(mesh => { if (mesh.physicsBody) physicsViewer.showBody(mesh.physicsBody) });
        } else {
            scene.transformNodes.forEach(transform => { if (transform.physicsBody) physicsViewer.hideBody(transform.physicsBody) });
            scene.meshes.forEach(mesh => { if (mesh.physicsBody) physicsViewer.hideBody(mesh.physicsBody) });
        }
    }
});
