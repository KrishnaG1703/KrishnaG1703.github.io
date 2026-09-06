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
let ring = null;
let ringSpin = 0;

/* The name is painted into a texture and wrapped onto an open cylinder set
   around the bust, so it reads in front, wraps away, and passes behind his
   shoulders with real depth.

   Two shells share the texture: the outer face at full strength, the inner
   face faint. Without that split the far side of the ring came back at you
   mirrored and read as garble rather than as type behind him. */
function makeNameRing(radius, height) {
  const text = "KRISHNA GANGA \u00B7 ";
  const canvas = document.createElement("canvas");
  canvas.width = 4096;
  canvas.height = 200;
  const ctx = canvas.getContext("2d");

  const FONT = "500 96px 'Playfair Display', Georgia, serif";
  ctx.font = FONT;
  if ("letterSpacing" in ctx) ctx.letterSpacing = "0.34em";
  ctx.font = FONT;

  // Fit a whole number of repeats and let the type keep its proportions:
  // the previous version squeezed it horizontally to force the tiling.
  const natural = ctx.measureText(text).width;
  const repeats = Math.max(1, Math.round(canvas.width / natural));
  const unit = canvas.width / repeats;

  ctx.textBaseline = "middle";
  ctx.fillStyle = "#f2ece0";
  for (let i = 0; i < repeats; i++) {
    // at most a couple of percent of tracking adjustment, not a stretch
    ctx.save();
    ctx.translate(i * unit, canvas.height / 2);
    ctx.scale(unit / natural, 1);
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const geometry = new THREE.CylinderGeometry(radius, radius, height, 128, 1, true);
  const shell = (side, opacity) => new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity,
    side,
    depthWrite: false,
    toneMapped: false
  }));

  const group = new THREE.Group();
  const front = shell(THREE.FrontSide, 1);
  const back = shell(THREE.BackSide, .16);
  back.renderOrder = 1;
  front.renderOrder = 2;
  group.add(back, front);

  // A slight tilt reads as an orbit rather than a sash across the chest.
  group.rotation.x = .13;
  group.rotation.z = -.05;
  return group;
}

function isDark() { return root.classList.contains("dark"); }

function applyTheme() {
  if (!material) return;
  const dark = isDark();
  material.color.set(dark ? 0xb4a893 : 0x9a8f78);
  rim.intensity = dark ? 1.6 : 1.15;
  // The orbiting name belongs to the dark treatment only for now.
  if (ring) ring.visible = dark;
}

const size = new THREE.Vector3();

function resize() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (!width || !height) return;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;

  // Frame the bust so it holds the same share of the panel at any size.
  // With the ring around him he needs more room, and he sits centred.
  if (bust) {
    const wide = isDark() ? Math.max(size.x, size.z) * 3.1 : size.x;
    const fit = Math.max(size.y, wide / camera.aspect);
    camera.position.set(0, size.y * .02, fit * (isDark() ? 1.5 : 1.55));
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

let running = false;
let visible = true;

function frame() {
  if (!running) return;

  // The bust turns toward the pointer rather than spinning on its own,
  // so at rest it settles and the work per frame stays trivial.
  eased.x += (pointer.x - eased.x) * .045;
  eased.y += (pointer.y - eased.y) * .045;

  if (bust) {
    bust.rotation.y = eased.x * .7;
    bust.rotation.x = eased.y * .28;
  }

  if (ring && ring.visible) {
    ringSpin += .0011;
    ring.rotation.y = ringSpin + eased.x * .5;   // the pointer nudges it too
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

  // Sits across the chest rather than the face, so he stays readable.
  ring = makeNameRing(Math.max(size.x, size.z) * 1.02, size.y * .17);
  ring.position.y = -size.y * .14;
  scene.add(ring);

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
