/* ============================================================
   Hero model
   Loads the bust and renders it beside the type. Everything here is
   additive: if WebGL is missing, the file fails to load, or the visitor
   asks for reduced motion, the hero keeps the flat treatment it had
   before and nothing below is affected.
   ============================================================ */

import * as THREE from "./assets/vendor/three/three.module.min.js";
import { GLTFLoader } from "./assets/vendor/three/GLTFLoader.js";

const canvas = document.getElementById("heroModel");
const hero = document.querySelector(".hero");
if (!canvas || !hero) throw new Error("no hero canvas");

const root = document.documentElement;
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, .05, 60);

const hemi = new THREE.HemisphereLight(0xffffff, 0x6f6047, 1.9);
const key = new THREE.DirectionalLight(0xffffff, 2.5);
key.position.set(2.2, 3, 2.6);
const fill = new THREE.DirectionalLight(0xffe6c8, .7);
fill.position.set(-3, .6, 1.4);
const rim = new THREE.DirectionalLight(0xd95d3f, 1.15);
rim.position.set(-2.4, 1.6, -2.6);
scene.add(hemi, key, fill, rim);

let bust = null;
let material = null;

// He sits greyed back until you put the pointer on him.
const TONE = {
  dim:   { color: new THREE.Color(0x57534b), key: 1.15, hemi: .85, rim: .45 },
  lit:   { color: new THREE.Color(0xc9bda6), key: 2.7,  hemi: 2.0, rim: 1.7 }
};
let warmth = 0;        // 0 dim, 1 lit
let warmthTarget = 0;

function isDark() { return root.classList.contains("dark"); }

function applyTheme() {
  if (!material) return;
  if (!isDark()) {
    // Light keeps the plain plaster treatment.
    material.color.set(0x9a8f78);
    hemi.intensity = 1.9;
    key.intensity = 2.5;
    rim.intensity = 1.15;
    return;
  }
  applyWarmth();
}

function applyWarmth() {
  if (!material) return;
  material.color.copy(TONE.dim.color).lerp(TONE.lit.color, warmth);
  key.intensity = TONE.dim.key + (TONE.lit.key - TONE.dim.key) * warmth;
  hemi.intensity = TONE.dim.hemi + (TONE.lit.hemi - TONE.dim.hemi) * warmth;
  rim.intensity = TONE.dim.rim + (TONE.lit.rim - TONE.dim.rim) * warmth;
}

const size = new THREE.Vector3();

function resize() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (!width || !height) return;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;

  // Frame the bust so it holds the same share of the panel at any size.
  // He sits centred, sized against the name standing behind him.
  if (bust) {
    const wide = isDark() ? Math.max(size.x, size.z) * 2.6 : size.x;
    const fit = Math.max(size.y, wide / camera.aspect);
    camera.position.set(0, size.y * .06, fit * (isDark() ? 1.62 : 1.55));
    camera.lookAt(0, 0, 0);
  }
  camera.updateProjectionMatrix();
}

const pointer = { x: 0, y: 0 };
const eased = { x: 0, y: 0 };

hero.addEventListener("pointermove", (event) => {
  const box = hero.getBoundingClientRect();
  pointer.x = (event.clientX - box.left) / box.width - .5;
  pointer.y = (event.clientY - box.top) / box.height - .5;
}, { passive: true });

hero.addEventListener("pointerleave", () => { pointer.x = 0; pointer.y = 0; });

// Hovering him brings the light up. The canvas takes the pointer only in
// the dark treatment, and only above the foot band, so nothing below it
// stops being clickable.
canvas.addEventListener("pointerenter", () => { warmthTarget = 1; });
canvas.addEventListener("pointerleave", () => { warmthTarget = 0; });

let running = false;
let visible = true;

let clock = 0;

function frame() {
  if (!running) return;

  // The bust holds still. What moves is the key light, raking slowly across
  // him, which reads as a room rather than as a turntable.
  if (isDark() && Math.abs(warmth - warmthTarget) > .001) {
    warmth += (warmthTarget - warmth) * .07;
    applyWarmth();
  }

  clock += .004;
  key.position.set(Math.sin(clock) * 2.6 + .6, 2.6 + Math.sin(clock * .7) * .5, 2.4);
  rim.position.set(Math.sin(clock + 2.2) * -2.8, 1.5, -2.6);

  // The bust turns toward the pointer rather than spinning on its own,
  // so at rest it settles and the work per frame stays trivial.
  eased.x += (pointer.x - eased.x) * .045;
  eased.y += (pointer.y - eased.y) * .045;

  if (bust) {
    bust.rotation.y = eased.x * .7;
    bust.rotation.x = eased.y * .28;
  }

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

function start() {
  if (running || !visible || document.hidden) return;
  running = true;
  requestAnimationFrame(frame);
}

function stop() { running = false; }

new GLTFLoader().load("assets/model/bust.glb", (gltf) => {
  const object = gltf.scene;

  material = new THREE.MeshStandardMaterial({ roughness: .82, metalness: .04 });
  object.traverse((node) => {
    if (!node.isMesh) return;
    node.geometry.computeVertexNormals();   // the file ships positions only
    node.material = material;
  });

  const box = new THREE.Box3().setFromObject(object);
  box.getSize(size);
  object.position.sub(box.getCenter(new THREE.Vector3()));
  bust = object;
  scene.add(bust);

  applyTheme();
  resize();
  root.classList.add("has-model");

  if (reduceMotion.matches) {
    renderer.render(scene, camera);      // one frame, then never again
    return;
  }
  start();
}, undefined, (error) => {
  // The hero falls back to its flat treatment, but say why.
  console.warn("hero model failed to load, keeping the flat hero", error);
});

addEventListener("resize", resize, { passive: true });

new MutationObserver(() => {
  applyTheme();
  resize();
  if (!running) renderer.render(scene, camera);
}).observe(root, { attributes: true, attributeFilter: ["class"] });

// Same discipline as everything else on the page: no frames for a hero
// nobody is looking at.
new IntersectionObserver(([entry]) => {
  visible = entry.isIntersecting && entry.intersectionRatio > .08;
  if (visible && !reduceMotion.matches) start();
  else stop();
}, { threshold: [0, .08, .3] }).observe(canvas);

document.addEventListener("visibilitychange", () => {
  if (document.hidden) stop();
  else if (!reduceMotion.matches) start();
});
