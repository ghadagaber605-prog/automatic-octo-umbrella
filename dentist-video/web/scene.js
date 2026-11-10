// "Visiting the Dentist" – 3D animated story for Grade 1.
// Everything is a pure function of time: window.renderAt(t) draws the frame for second t.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OutlineEffect } from 'three/addons/effects/OutlineEffect.js';
// ?anime -> cel-shaded anime look (toon shading, ink outlines, big shiny eyes, speed lines)
const ANIME = new URLSearchParams(location.search).has('anime');

await document.fonts.load('600 40px Fredoka');
const W = 1280, H = 720;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H); renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
document.getElementById('stage').prepend(renderer.domElement);
const camera = new THREE.PerspectiveCamera(35, W / H, 0.05, 100);
const envTex = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;

// ---------- small helpers ----------
const PI = Math.PI;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const ease = k => k * k * (3 - 2 * k);
const matCache = {};
function M(color, o = {}) {
  const key = color + JSON.stringify(o);
  if (!matCache[key]) matCache[key] = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0, ...o });
  return matCache[key];
}
function mesh(geo, m) { const x = new THREE.Mesh(geo, m); x.castShadow = true; x.receiveShadow = true; return x; }
const sph = (r, m, s = 28) => mesh(new THREE.SphereGeometry(r, s, Math.round(s * 0.7)), m);
const rbox = (w, h, d, r, m) => mesh(new RoundedBoxGeometry(w, h, d, 4, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3)), m);
const cap = (r, len, m) => mesh(new THREE.CapsuleGeometry(r, len, 8, 18), m);
const cyl = (rt, rb, h, m, s = 28) => mesh(new THREE.CylinderGeometry(rt, rb, h, s), m);
const P = (o, x, y, z) => { o.position.set(x, y, z); return o; };
const G = (...kids) => { const g = new THREE.Group(); kids.forEach(k => g.add(k)); return g; };
const faceTo = (from, to) => Math.atan2(to[0] - from[0], to[2] - from[2]);
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function plane(w, h, tex, o = {}) {
  return mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, ...o }));
}
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

function lights(scene, o = {}) {
  scene.environment = envTex; scene.environmentIntensity = o.env ?? 0.45;
  scene.add(new THREE.HemisphereLight(0xfff4e8, 0xb8a8d8, o.hemi ?? 1.1));
  const key = new THREE.DirectionalLight(0xfff0da, o.key ?? 2.4);
  key.position.set(...(o.keyPos || [3.5, 7, 5])); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 5;
  const sc = key.shadow.camera; sc.left = -7; sc.right = 7; sc.top = 7; sc.bottom = -7; sc.far = 25;
  key.target.position.set(...(o.target || [0, 0, -1.5])); scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0xcfe4ff, o.rim ?? 1.2); rim.position.set(-4, 5, -6); scene.add(rim);
  return key;
}

// ---------- characters ----------
const SKIN = { light: 0xf6cfb0, tan: 0xe9b48e, brown: 0xa86a45, dark: 0x8a5232 };
function makeFace(head, o) {
  const skinM = M(o.skin, { roughness: 0.6 });
  const f = {};
  f.eyes = [];
  for (const s of [-1, 1]) {
    const eye = G(); P(eye, s * 0.074, 0.02, 0.158);
    const A = ANIME ? 1 : 0;
    const white = sph(0.052 + A * 0.006, M(0xffffff, { roughness: 0.25 })); white.scale.set(1, 1.15 + A * 0.35, 0.62);
    const iris = P(sph(0.033 + A * 0.01, M(o.eye || 0x5a3420, { roughness: 0.3 })), 0, -0.004 - A * 0.006, 0.027); iris.scale.set(1, 1.08 + A * 0.35, 0.5);
    const pupil = P(sph(0.018 + A * 0.004, M(0x120806, { roughness: 0.2 })), 0, -0.004 - A * 0.004, 0.039); pupil.scale.set(1, 1.08 + A * 0.4, 0.45);
    const hl = P(sph(0.009 + A * 0.007, M(0xffffff, { emissive: 0xffffff, emissiveIntensity: 1 })), 0.012 + A * 0.004, 0.014 + A * 0.014, 0.046);
    const hl2 = P(sph(0.005 + A * 0.003, M(0xffffff, { emissive: 0xffffff, emissiveIntensity: 1 })), -0.01, -0.016 - A * 0.012, 0.044);
    const look = G(iris, pupil, hl, hl2);
    eye.add(white, look);
    if (ANIME && !o.noLash) {
      // bold upper lash line + small outer flick
      const lash = mesh(new THREE.TorusGeometry(0.06, 0.009, 6, 24, PI * 0.86), M(0x1b1214));
      lash.rotation.z = PI * 0.07; lash.scale.set(1, 1.45, 1); lash.position.set(0, 0.0, 0.022); lash.userData.noOutline = true; eye.add(lash);
      const flick = P(cap(0.007, 0.03, M(0x1b1214)), s * 0.062, 0.05, 0.02); flick.rotation.z = s * -0.9; flick.userData.noOutline = true; eye.add(flick);
    }
    head.add(eye); f.eyes.push({ eye, look });
  }
  f.brows = [];
  for (const s of [-1, 1]) {
    const b = P(cap(0.011, 0.05, M(o.hair, { roughness: 0.8 })), s * 0.076, 0.105, 0.172);
    b.rotation.z = PI / 2 - s * 0.03; head.add(b); f.brows.push(b);
  }
  { const nose = P(sph(ANIME ? 0.014 : 0.026, M(o.skin, { roughness: 0.55 })), 0, -0.035, 0.192); if (ANIME) nose.userData.noOutline = true; head.add(nose); }
  for (const s of [-1, 1]) {
    const c = P(sph(0.034, M(0xff8f9a, { transparent: true, opacity: 0.45, roughness: 0.9 })), s * 0.118, -0.05, 0.142);
    c.scale.set(1, 0.7, 0.4); c.castShadow = false; head.add(c);
    const ear = P(sph(0.042, skinM), s * 0.196, -0.005, 0); ear.scale.set(0.45, 1, 0.8); head.add(ear);
  }
  // mouth
  const mouth = G(); P(mouth, 0, -0.098, 0.166); head.add(mouth);
  const inner = sph(0.04, M(0x6a1e2a, { roughness: 0.6 })); inner.scale.set(1.15, 0.6, 0.35);
  const teeth = P(rbox(0.058, 0.016, 0.02, 0.006, M(0xffffff, { roughness: 0.3 })), 0, 0.016, 0.006);
  const tongue = P(sph(0.026, M(0xe5576d)), 0, -0.018, 0.0); tongue.scale.set(1.2, 0.5, 0.5);
  const openG = G(inner, teeth, tongue); mouth.add(openG);
  const smile = mesh(new THREE.TorusGeometry(0.036, 0.0075, 8, 24, PI), M(0x7a2a2a));
  smile.rotation.z = PI; smile.position.set(0, 0.012, 0.004); mouth.add(smile);
  const frown = mesh(new THREE.TorusGeometry(0.03, 0.0075, 8, 24, PI), M(0x7a2a2a));
  frown.position.set(0, -0.012, 0.004); frown.visible = false; mouth.add(frown);
  f.mouth = { mouth, openG, inner, teeth, smile, frown };
  return f;
}
function setFace(f, { open = 0, blink = 0, lookX = 0, lookY = 0, sad = 0, brow = 0 }) {
  const m = f.mouth;
  if (open < 0.06 && !sad) { m.openG.visible = false; m.smile.visible = true; m.frown.visible = false; }
  else if (sad && open < 0.06) { m.openG.visible = false; m.smile.visible = false; m.frown.visible = true; }
  else { m.openG.visible = true; m.smile.visible = false; m.frown.visible = false;
    m.openG.scale.set(1 - open * 0.1, 0.35 + open * 1.25, 1); m.teeth.visible = open > 0.25; }
  for (const e of f.eyes) { e.eye.scale.y = 1 - 0.92 * blink; e.look.position.set(lookX * 0.012, lookY * 0.01, 0); }
  f.brows.forEach((b, i) => { b.position.y = 0.105 + brow * 0.015; b.rotation.z = PI / 2 + (i ? -1 : 1) * (sad * 0.4 + 0.03); });
}

function hair(head, style, color) {
  const hm = M(color, { roughness: 0.42 });
  const g = G(); head.add(g);
  const capG = new THREE.SphereGeometry(0.214, 32, 16, 0, 2 * PI, 0, PI * 0.5);
  const c = mesh(capG, hm); c.rotation.x = -0.62; c.scale.set(1.04, 1.08, 1.06); g.add(c);
  const add = (o, x, y, z) => { P(o, x, y, z); g.add(o); return o; };
  if (style === 'girl' || style === 'long') {
    const len = style === 'long' ? 0.52 : 0.38;
    add(rbox(0.43, len, 0.16, 0.07, hm), 0, 0.06 - len / 2, -0.1);
    for (const s of [-1, 1]) { const sd = add(rbox(0.07, len - 0.04, 0.15, 0.03, hm), s * 0.197, 0.04 - len / 2 + 0.02, 0.02); sd.rotation.z = s * 0.05; }
    const bang = add(sph(0.16, hm), 0, 0.138, 0.085); bang.scale.set(1.22, 0.42, 0.78);
    if (style === 'long') { const sw = add(sph(0.1, hm), 0.07, 0.15, 0.13); sw.scale.set(1.4, 0.4, 0.6); }
  } else if (style === 'bob') {
    add(rbox(0.46, 0.3, 0.17, 0.07, hm), 0, -0.04, -0.08);
    for (const s of [-1, 1]) add(rbox(0.08, 0.27, 0.15, 0.035, hm), s * 0.2, -0.05, 0.03);
    const bang = add(sph(0.15, hm), 0.04, 0.142, 0.09); bang.scale.set(1.3, 0.38, 0.75); bang.rotation.z = -0.25;
  } else if (style === 'puff') {
    const pts = [[0, 0.2, -0.02, 0.09], [0.1, 0.18, -0.06, 0.08], [-0.1, 0.18, -0.06, 0.08], [0.15, 0.1, -0.08, 0.075], [-0.15, 0.1, -0.08, 0.075],
      [0, 0.16, -0.14, 0.09], [0.08, 0.07, -0.17, 0.08], [-0.08, 0.07, -0.17, 0.08], [0.05, 0.22, 0.06, 0.07], [-0.06, 0.21, 0.07, 0.07],
      [0.13, 0.17, 0.04, 0.065], [-0.13, 0.17, 0.04, 0.065], [0, 0.29, -0.09, 0.1], [0.1, 0.28, -0.12, 0.08], [-0.1, 0.28, -0.12, 0.08]];
    for (const [x, y, z, r] of pts) add(sph(r, hm, 16), x, y, z);
  } else if (style === 'short') {
    const t = add(sph(0.11, hm), 0.04, 0.17, 0.1); t.scale.set(1.6, 0.55, 1); t.rotation.z = -0.2;
    const bk = add(sph(0.2, hm), 0, 0.05, -0.06); bk.scale.set(1.04, 0.9, 0.95);
  } else if (style === 'pony') {
    const bang = add(sph(0.14, hm), -0.05, 0.145, 0.09); bang.scale.set(1.3, 0.38, 0.75); bang.rotation.z = 0.25;
    add(sph(0.075, hm), 0, 0.1, -0.21);
    const tail = add(cap(0.065, 0.2, hm), 0, -0.07, -0.25); tail.rotation.x = 0.25;
    add(cyl(0.05, 0.05, 0.04, M(0xff5d8f)), 0, 0.06, -0.225).rotation.x = PI / 2.4;
  }
  return g;
}

function makeChar(o) {
  const skinM = M(o.skin, { roughness: 0.6 });
  const shirtM = M(o.shirt, { roughness: 0.75 }), pantsM = M(o.pants, { roughness: 0.8 }), shoeM = M(o.shoes || 0x3a3a48, { roughness: 0.5 });
  const root = G(), body = G(); root.add(body);
  const legs = [];
  for (const s of [-1, 1]) {
    const hip = P(G(), s * 0.09, 0.82, 0); body.add(hip);
    hip.add(P(cap(0.078, 0.3, pantsM), 0, -0.2, 0));
    const knee = P(G(), 0, -0.4, 0); hip.add(knee);
    knee.add(P(cap(0.068, 0.3, o.dress ? skinM : pantsM), 0, -0.19, 0));
    knee.add(P(rbox(0.14, 0.09, 0.24, 0.04, shoeM), 0, -0.4, 0.045));
    legs.push({ hip, knee });
  }
  const torso = P(G(), 0, 0.82, 0); body.add(torso);
  const hips = P(sph(0.175, pantsM), 0, 0.04, 0); hips.scale.set(1.08, 0.62, 0.82); torso.add(hips);
  const chest = P(cap(0.172, 0.28, shirtM), 0, 0.3, 0); chest.scale.set(1.12, 1, 0.78); torso.add(chest);
  if (o.coat) { const ct = P(cap(0.18, 0.18, M(o.coat, { roughness: 0.7 })), 0, 0.36, 0); ct.scale.set(1.16, 1, 0.84); torso.add(ct); }
  torso.add(P(cyl(0.05, 0.056, 0.12, skinM), 0, 0.6, 0));
  if (o.collar) for (const s of [-1, 1]) { const c = P(rbox(0.1, 0.03, 0.08, 0.012, M(o.collar)), s * 0.06, 0.585, 0.08); c.rotation.set(0.4, 0, s * -0.5); torso.add(c); }
  if (o.vneck) { const v = P(sph(0.06, skinM), 0, 0.555, 0.11); v.scale.set(0.8, 0.6, 0.3); torso.add(v); }
  if (o.flower) {
    const fl = P(G(), 0, 0.34, 0.135); torso.add(fl);
    for (let i = 0; i < 6; i++) { const a = i / 6 * 2 * PI; const pt = P(sph(0.026, M(0xffffff)), Math.cos(a) * 0.035, Math.sin(a) * 0.035, 0); pt.scale.set(1, 1, 0.3); fl.add(pt); }
    const cc = sph(0.018, M(0xffd23f)); cc.scale.z = 0.4; fl.add(cc);
  }
  if (o.badge) { const b = P(rbox(0.07, 0.05, 0.02, 0.01, M(0xffffff)), 0.08, 0.42, 0.135); torso.add(b); }
  if (o.pocket) { const b = P(rbox(0.09, 0.018, 0.02, 0.006, M(o.pocket)), 0.09, 0.4, 0.135); torso.add(b); }
  // arms
  const arms = [];
  const sleeveM = o.coat ? M(o.coat, { roughness: 0.7 }) : shirtM;
  for (const s of [-1, 1]) {
    const sh = P(G(), s * 0.205, 0.5, 0); torso.add(sh);
    sh.add(P(cap(0.056, 0.17, sleeveM), 0, -0.13, 0));
    const el = P(G(), 0, -0.29, 0); sh.add(el);
    el.add(P(cap(0.048, 0.17, o.longSleeve ? sleeveM : skinM), 0, -0.12, 0));
    const hand = P(sph(0.058, skinM), 0, -0.27, 0.0); hand.scale.set(0.9, 1, 0.8); el.add(hand);
    const grip = P(G(), 0, -0.3, 0.02); el.add(grip);
    if (o.gloves) { hand.material = M(0xf4f4f4, { roughness: 0.5 }); }
    arms.push({ sh, el, grip });
  }
  // head
  const head = P(G(), 0, 0.62 + 0.19 * (o.headScale || 1.15), 0); head.scale.setScalar(o.headScale || 1.15); torso.add(head);
  const skull = sph(0.2, skinM, 40); skull.scale.set(1, 1.04, 0.98); head.add(skull);
  const face = makeFace(head, o);
  hair(head, o.hairStyle, o.hair);
  if (o.glasses) {
    const gm = M(0x4a2b2b, { roughness: 0.4 });
    for (const s of [-1, 1]) { const r = P(mesh(new THREE.TorusGeometry(0.058, 0.007, 8, 28), gm), s * 0.074, 0.02, 0.205); head.add(r); }
    { const br = P(cyl(0.006, 0.006, 0.03, gm), 0, 0.03, 0.21); br.rotation.z = PI / 2; head.add(br); }
  }
  if (o.mask) { const mk = P(sph(0.13, M(0x9fd2ec)), 0, -0.08, 0.13); mk.scale.set(1.2, 0.75, 0.5); head.add(mk); }
  // sunglasses (hidden by default)
  const sun = G(); sun.visible = false; head.add(sun);
  for (const s of [-1, 1]) { const l = P(rbox(0.11, 0.07, 0.02, 0.025, M(0x3b4250, { roughness: 0.15, metalness: 0.4 })), s * 0.075, 0.02, 0.215); sun.add(l); }
  sun.add(P(rbox(0.32, 0.018, 0.02, 0.008, M(0x9aa3b5, { metalness: 0.6, roughness: 0.3 })), 0, 0.055, 0.215));
  root.scale.setScalar(o.scale || 1);
  const ch = { root, body, torso, head, legs, arms, face, sun, o, seed: o.seed || 0 };
  ch.reset = () => {
    body.position.set(0, 0, 0); body.rotation.set(0, 0, 0); torso.rotation.set(0, 0, 0); head.rotation.set(0, 0, 0);
    legs.forEach(l => { l.hip.rotation.set(0, 0, 0); l.knee.rotation.set(0, 0, 0); });
    arms.forEach((a, i) => { a.sh.rotation.set(0.05, 0, (i ? 1 : -1) * 0.1); a.el.rotation.set(-0.15, 0, 0); });
  };
  return ch;
}
// pose helpers (side: 0 = left/-x, 1 = right/+x of the character)
function arm(ch, side, { x = 0, z = 0.1, e = 0.15, y = 0 } = {}) {
  const a = ch.arms[side], s = side ? 1 : -1;
  a.sh.rotation.set(-x, y, s * z); a.el.rotation.set(-e, 0, 0);
}
function sit(ch, seatY, { knee = PI / 2, thigh = PI / 2 } = {}) {
  const sc = ch.o.scale || 1;
  ch.body.position.y = seatY / sc - 0.82 + 0.075;
  ch.legs.forEach(l => { l.hip.rotation.x = -thigh; l.knee.rotation.x = knee; });
}
function walk(ch, phase, amt = 1) {
  const s = Math.sin(phase);
  ch.legs[0].hip.rotation.x = s * 0.45 * amt; ch.legs[1].hip.rotation.x = -s * 0.45 * amt;
  ch.legs[0].knee.rotation.x = Math.max(0, -Math.cos(phase)) * 0.6 * amt; ch.legs[1].knee.rotation.x = Math.max(0, Math.cos(phase)) * 0.6 * amt;
  arm(ch, 0, { x: -s * 0.4 * amt, z: 0.1, e: 0.25 }); arm(ch, 1, { x: s * 0.4 * amt, z: 0.1, e: 0.25 });
  ch.body.position.y = Math.abs(Math.cos(phase)) * 0.03 * amt;
}
function idle(ch, t) {
  const b = Math.sin(t * 1.6 + ch.seed) * 0.012;
  ch.torso.rotation.z = Math.sin(t * 0.7 + ch.seed) * 0.015;
  ch.head.rotation.z = Math.sin(t * 0.9 + ch.seed * 2) * 0.03;
  ch.head.rotation.x = b;
}
function blinkAt(t, seed) { const x = (t * 0.32 + seed * 0.37) % 1; return x < 0.035 ? Math.sin(x / 0.035 * PI) : 0; }
function look(ch, worldTarget, amount = 1) {
  // turn head toward a world point (yaw/pitch, clamped)
  const hp = new THREE.Vector3(); ch.head.getWorldPosition(hp);
  const q = new THREE.Quaternion(); ch.torso.getWorldQuaternion(q);
  const d = new THREE.Vector3(...worldTarget).sub(hp).applyQuaternion(q.invert());
  ch.head.rotation.y = clamp(Math.atan2(d.x, d.z), -1.0, 1.0) * amount;
  ch.head.rotation.x = clamp(-Math.atan2(d.y, Math.hypot(d.x, d.z)), -0.5, 0.5) * amount;
}

const cast = {
  mahino: o => makeChar({ skin: SKIN.light, hair: 0x231816, hairStyle: 'girl', shirt: 0xd99be0, pants: 0x2d2f7a, shoes: 0x2a2a35, flower: true, scale: 0.62, headScale: 1.5, lashes: true, seed: 1, ...o }),
  mom: o => makeChar({ skin: SKIN.light, hair: 0x231816, hairStyle: 'long', shirt: 0x8fcf55, pants: 0x2d2f7a, longSleeve: true, lashes: true, seed: 2, ...o }),
  recep: o => makeChar({ skin: SKIN.light, hair: 0x2a1b17, hairStyle: 'bob', shirt: 0xf8d8ea, collar: 0xe2457e, pants: 0xe9e3ee, glasses: true, lashes: true, pocket: 0xe2457e, seed: 3, ...o }),
  hala: o => makeChar({ skin: SKIN.brown, hair: 0x2e1d16, hairStyle: 'puff', shirt: 0x9fd2ec, pants: 0x9fd2ec, shoes: 0xf2f2f2, vneck: true, lashes: true, gloves: true, seed: 4, ...o }),
  mag: o => makeChar({ skin: SKIN.tan, hair: 0x7a3e1e, hairStyle: 'pony', shirt: 0xffffff, coat: 0xff8a3d, pants: 0x3c3f5c, longSleeve: true, lashes: true, badge: true, eye: 0x2d5a3a, seed: 5, ...o }),
  alfi: o => makeChar({ skin: SKIN.tan, hair: 0x241713, hairStyle: 'short', shirt: 0x8fc3ea, pants: 0x8fc3ea, shoes: 0x333333, vneck: true, gloves: true, seed: 6, ...o }),
};

// ---------- props ----------
const MIC_TEX = () => canvasTex(256, 128, (c, w, h) => { c.fillStyle = '#6b4ce6'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = '600 54px Fredoka'; c.textAlign = 'center'; c.fillText('KIDS', w / 2, 58); c.fillStyle = '#ffd84a'; c.fillText('MAG', w / 2, 112); });
function microphone() {
  const g = G();
  g.add(P(cyl(0.022, 0.016, 0.2, M(0x2b2b33, { roughness: 0.35 })), 0, -0.04, 0));
  g.add(P(sph(0.045, M(0x9097a8, { metalness: 0.6, roughness: 0.35 })), 0, 0.09, 0));
  const cube = P(new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.06, 0.075), new THREE.MeshStandardMaterial({ map: MIC_TEX() })), 0, 0.035, 0);
  g.add(cube); return g;
}
function xrayTex() {
  return canvasTex(512, 320, (c, w, h) => {
    c.fillStyle = '#0d0f14'; c.fillRect(0, 0, w, h);
    const grd = c.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, 300); grd.addColorStop(0, '#2a3040'); grd.addColorStop(1, '#0a0b10');
    c.fillStyle = grd; c.fillRect(0, 0, w, h);
    const toothPath = (x, y, flip) => {
      c.save(); c.translate(x, y); if (flip) c.scale(1, -1);
      c.beginPath(); c.moveTo(-22, 0);
      c.bezierCurveTo(-24, -30, -14, -40, 0, -36); c.bezierCurveTo(14, -40, 24, -30, 22, 0);   // crown
      c.bezierCurveTo(20, 20, 14, 30, 12, 70); c.lineTo(5, 70); c.lineTo(2, 22);                 // right root
      c.lineTo(-2, 22); c.lineTo(-5, 70); c.lineTo(-12, 70); c.bezierCurveTo(-14, 30, -20, 20, -22, 0); // left root
      c.closePath(); c.fill(); c.restore();
    };
    c.fillStyle = 'rgba(120,130,150,0.35)'; rr(c, 16, 40, w - 32, 110, 40); c.fill(); rr(c, 16, 170, w - 32, 110, 40); c.fill();
    c.fillStyle = 'rgba(238,242,252,0.95)';
    for (let i = 0; i < 8; i++) { const x = 52 + i * 58; toothPath(x, 130, true); toothPath(x, 190, false); }
    c.fillStyle = 'rgba(255,255,255,0.45)'; c.font = '600 22px Fredoka'; c.fillText('X-RAY', 14, 30);
  });
}
function tooth(o = {}) {
  // cute tooth mascot
  const g = G(); const wm = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.15 });
  const crown = P(sph(0.5, wm, 40), 0, 0.15, 0); crown.scale.set(1, 0.85, 0.85); g.add(crown);
  for (const s of [-1, 1]) {
    g.add(P(sph(0.3, wm), s * 0.24, 0.5, 0));
    const root = P(cap(0.17, 0.35, wm), s * 0.2, -0.38, 0); root.rotation.z = s * 0.18; g.add(root);
  }
  const head = P(G(), 0, 0.1, 0.0); g.add(head); head.scale.setScalar(1.9);
  const f = makeFace(head, { skin: 0xffffff, hair: 0x4a3a6a, eye: 0x3a6bd6, noLash: true });
  head.children.forEach(c => { if (c.geometry && c.geometry.type === 'SphereGeometry' && Math.abs(c.position.x) > 0.19) c.visible = false; }); // hide ears
  head.position.z = 0.06;
  const arms = [];
  for (const s of [-1, 1]) {
    const sh = P(G(), s * 0.46, 0.05, 0); g.add(sh);
    sh.add(P(cap(0.06, 0.2, wm), 0, -0.15, 0)); sh.add(P(sph(0.08, wm), 0, -0.3, 0));
    sh.rotation.z = s * 0.5; arms.push(sh);
  }
  const hole = P(sph(0.09, M(0x3b2a20, { roughness: 0.9 })), 0.25, 0.42, 0.33); hole.scale.set(1, 0.8, 0.35); hole.visible = false; g.add(hole);
  return { g, face: f, arms, hole, wm };
}
function germ(color) {
  const g = G(); const m = M(color, { roughness: 0.6 });
  const b = sph(0.16, m); g.add(b);
  for (let i = 0; i < 12; i++) {
    const a = i * 2.39996, y = 1 - (i / 11) * 2, r = Math.sqrt(1 - y * y);
    const d = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
    const c = mesh(new THREE.ConeGeometry(0.035, 0.09, 10), m); c.position.copy(d.clone().multiplyScalar(0.17));
    c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d); g.add(c);
  }
  for (const s of [-1, 1]) {
    g.add(P(sph(0.045, M(0xffffff)), s * 0.055, 0.04, 0.13));
    g.add(P(sph(0.022, M(0x111111)), s * 0.055, 0.035, 0.17));
    const br = P(cap(0.01, 0.05, M(0x1a3a10)), s * 0.055, 0.1, 0.14); br.rotation.z = PI / 2 - s * 0.5; g.add(br);
  }
  const mo = P(mesh(new THREE.TorusGeometry(0.035, 0.009, 8, 20, PI), M(0x2a0d0d)), 0, -0.06, 0.15); mo.rotation.z = PI; g.add(mo);
  return g;
}
function poster(w, h, draw) { const t = canvasTex(256, Math.round(256 * h / w), draw); const g = G(); g.add(rbox(w + 0.08, h + 0.08, 0.04, 0.02, M(0xffffff))); g.add(P(plane(w, h, t), 0, 0, 0.025)); return g; }
const drawToothbrush = (c, w, h) => {
  c.fillStyle = '#bfe8ff'; c.fillRect(0, 0, w, h);
  c.save(); c.translate(w / 2, h / 2); c.rotate(-0.6);
  c.fillStyle = '#ff6b9a'; rr(c, -90, -10, 180, 22, 11); c.fill();
  c.fillStyle = '#fff'; for (let i = 0; i < 6; i++) { rr(c, 40 + i * 9, -42, 6, 32, 3); c.fill(); }
  c.restore();
  c.fillStyle = '#4a2fb8'; c.font = '600 30px Fredoka'; c.textAlign = 'center'; c.fillText('Brush 2x a day!', w / 2, h - 18);
};
const drawSmile = (c, w, h) => {
  c.fillStyle = '#fff2b8'; c.fillRect(0, 0, w, h);
  c.fillStyle = '#fff'; c.strokeStyle = '#4a2fb8'; c.lineWidth = 8;
  c.beginPath(); c.moveTo(70, 70); c.bezierCurveTo(70, 20, 128, 40, 128, 50); c.bezierCurveTo(128, 40, 186, 20, 186, 70);
  c.bezierCurveTo(186, 120, 170, 170, 155, 190); c.lineTo(140, 140); c.lineTo(116, 140); c.lineTo(101, 190); c.bezierCurveTo(86, 170, 70, 120, 70, 70); c.fill(); c.stroke();
  c.fillStyle = '#4a2fb8'; c.beginPath(); c.arc(108, 90, 9, 0, 7); c.arc(148, 90, 9, 0, 7); c.fill();
  c.beginPath(); c.lineWidth = 6; c.arc(128, 105, 18, 0.2, PI - 0.2); c.stroke();
};

// ================= WAITING ROOM =================
const SW = new THREE.Scene(); SW.background = new THREE.Color(0xe7def8);
lights(SW, { target: [0, 0, -1.5] });
{
  const floorTex = canvasTex(512, 512, (c, w, h) => { c.fillStyle = '#e7c9a3'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(150,100,60,0.25)'; c.lineWidth = 3; for (let i = 0; i < 8; i++) { c.beginPath(); c.moveTo(0, i * 64); c.lineTo(w, i * 64); c.stroke(); for (let j = 0; j < 3; j++) { const x = ((i * 97 + j * 170) % 512); c.beginPath(); c.moveTo(x, i * 64); c.lineTo(x, i * 64 + 64); c.stroke(); } } });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(3, 2);
  const floor = mesh(new THREE.PlaneGeometry(16, 12), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.6 })); floor.rotation.x = -PI / 2; SW.add(floor);
  const back = P(rbox(16, 5, 0.2, 0.02, M(0xd9cdf4, { roughness: 0.9 })), 0, 2.5, -4.1); SW.add(back);
  SW.add(P(rbox(16, 0.18, 0.06, 0.02, M(0xffffff)), 0, 0.09, -3.98));
  const left = P(rbox(0.2, 5, 12, 0.02, M(0xbfe8d9, { roughness: 0.9 })), -6.1, 2.5, 0); SW.add(left);
  const right = P(rbox(0.2, 5, 12, 0.02, M(0xffd8c4, { roughness: 0.9 })), 6.1, 2.5, 0); SW.add(right);
  // door
  SW.add(P(rbox(1.3, 2.5, 0.12, 0.03, M(0xb98a55, { roughness: 0.5 })), -4.3, 1.25, -3.98));
  SW.add(P(rbox(0.7, 1.2, 0.04, 0.02, M(0xffffff, { emissive: 0xdff2ff, emissiveIntensity: 0.6 })), -4.3, 1.6, -3.9));
  SW.add(P(sph(0.06, M(0xffd36b, { metalness: 0.6, roughness: 0.3 })), -3.8, 1.2, -3.88));
  // window
  SW.add(P(rbox(2.2, 1.6, 0.1, 0.05, M(0xffffff)), 1.2, 2.5, -3.98));
  SW.add(P(rbox(2.0, 1.4, 0.05, 0.02, M(0xbfe6ff, { emissive: 0xbfe6ff, emissiveIntensity: 0.7 })), 1.2, 2.5, -3.92));
  SW.add(P(rbox(0.06, 1.4, 0.07, 0.02, M(0xffffff)), 1.2, 2.5, -3.9));
  // posters + tooth logo
  const p1 = P(poster(0.9, 1.1, drawToothbrush), -1.6, 2.55, -3.97); SW.add(p1);
  const p2 = P(poster(0.9, 0.9, drawSmile), 3.4, 2.6, -3.97); SW.add(p2);
  // bench of yellow chairs
  const yel = M(0xffc928, { roughness: 0.35 });
  for (let i = 0; i < 4; i++) {
    const x = -1.9 + i * 0.78;
    SW.add(P(rbox(0.72, 0.12, 0.6, 0.05, yel), x, 0.46, -3.1));
    const bk = P(rbox(0.72, 0.75, 0.1, 0.05, yel), x, 0.9, -3.42); bk.rotation.x = -0.08; SW.add(bk);
    for (let k = 0; k < 3; k++) { const hole = P(cyl(0.045, 0.045, 0.02, M(0xffffff)), x, 1.1 - k * 0.17, -3.36); hole.rotation.x = PI / 2 - 0.08; SW.add(hole); }
  }
  const metal = M(0xb8bcc8, { metalness: 0.6, roughness: 0.35 });
  SW.add(P(rbox(3.2, 0.06, 0.06, 0.02, metal), -0.73, 0.36, -3.1));
  for (const x of [-2.2, 0.75]) SW.add(P(cyl(0.03, 0.03, 0.36, metal), x, 0.18, -3.1));
  // reception desk
  const desk = G(); P(desk, 3.4, 0, -2.2); desk.rotation.y = -0.35; SW.add(desk);
  desk.add(P(rbox(2.6, 1.1, 0.8, 0.08, M(0xffffff, { roughness: 0.4 })), 0, 0.55, 0));
  desk.add(P(rbox(2.62, 0.14, 0.82, 0.05, M(0xff8fb8, { roughness: 0.4 })), 0, 0.75, 0));
  desk.add(P(rbox(2.8, 0.06, 1.0, 0.03, M(0xf2ecf7)), 0, 1.12, -0.05));
  const phone = P(G(), 0.6, 1.15, -0.1); desk.add(phone);
  phone.add(P(rbox(0.26, 0.08, 0.2, 0.03, M(0x3a3d4a)), 0, 0.04, 0));
  desk.add(P(rbox(0.5, 0.34, 0.04, 0.02, M(0x2c2f3a)), -0.6, 1.35, -0.25));
  desk.add(P(rbox(0.46, 0.3, 0.02, 0.01, M(0x9ad7ff, { emissive: 0x6bbcf2, emissiveIntensity: 0.6 })), -0.6, 1.35, -0.225));
  // tooth logo sign on right wall area
  const logo = P(tooth().g, 4.6, 2.9, -3.9); logo.scale.setScalar(0.45); SW.add(logo);
  // plant
  const plant = P(G(), -5.2, 0, -3.3); SW.add(plant);
  plant.add(P(cyl(0.3, 0.24, 0.5, M(0xff7a59)), 0, 0.25, 0));
  for (let i = 0; i < 7; i++) { const a = i * 2.4; plant.add(P(sph(0.22, M(0x4cb86a, { roughness: 0.7 }), 16), Math.cos(a) * 0.2, 0.75 + (i % 3) * 0.2, Math.sin(a) * 0.2)); }
  // toy blocks
  const bc = [0xff6b6b, 0x4ecdc4, 0xffd93d, 0x6b4ce6];
  bc.forEach((c, i) => SW.add(P(rbox(0.22, 0.22, 0.22, 0.03, M(c)), -4.8 + (i % 2) * 0.25, 0.11 + Math.floor(i / 2) * 0.22, -1.6 + (i % 2) * 0.05)));
  // rug
  const rug = mesh(new THREE.CircleGeometry(1.6, 48), M(0xa7e0f5, { roughness: 0.95 })); rug.rotation.x = -PI / 2; rug.position.set(-1, 0.005, -1.0); SW.add(rug);
}
const W_ = {
  mahino: cast.mahino(), mom: cast.mom(), recep: cast.recep(), hala: cast.hala(), mag: cast.mag(),
};
Object.values(W_).forEach(c => SW.add(c.root));
const micW = microphone(); W_.mag.arms[1].grip.add(micW);

// ================= DENTAL ROOM =================
const SD = new THREE.Scene(); SD.background = new THREE.Color(0xe3f1fb);
lights(SD, { target: [0, 0, -1], keyPos: [3, 7, 5] });
const D = {};
{
  const floorTex = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#e6eef7'; c.fillRect(0, 0, w, h); c.strokeStyle = '#cfdbe8'; c.lineWidth = 4; c.strokeRect(0, 0, w, h); });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(12, 9);
  const floor = mesh(new THREE.PlaneGeometry(16, 12), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.5 })); floor.rotation.x = -PI / 2; SD.add(floor);
  SD.add(P(rbox(16, 5, 0.2, 0.02, M(0xf3f8fd, { roughness: 0.9 })), 0, 2.5, -3.6));
  SD.add(P(rbox(16, 1.1, 0.06, 0.02, M(0xcfe9f7, { roughness: 0.8 })), 0, 0.55, -3.48));
  SD.add(P(rbox(0.2, 5, 12, 0.02, M(0xd6f0e6, { roughness: 0.9 })), -5.5, 2.5, 0));
  SD.add(P(rbox(0.2, 5, 12, 0.02, M(0xf9e7f1, { roughness: 0.9 })), 5.5, 2.5, 0));
  // windows
  for (let i = 0; i < 3; i++) {
    SD.add(P(rbox(1.0, 1.5, 0.08, 0.03, M(0x6f7480)), -1.9 + i * 1.08, 2.55, -3.48));
    SD.add(P(rbox(0.9, 1.4, 0.04, 0.02, M(0xffffff, { emissive: 0xf7fbff, emissiveIntensity: 0.85 })), -1.9 + i * 1.08, 2.55, -3.43));
  }
  // x-ray light box on wall
  D.xtex = xrayTex();
  const lb = P(G(), 1.9, 2.55, -3.45); SD.add(lb);
  lb.add(rbox(1.25, 0.85, 0.08, 0.03, M(0xf0f0f0)));
  D.xpanel = P(plane(1.12, 0.72, D.xtex, { emissive: 0xffffff, emissiveMap: D.xtex, emissiveIntensity: 0.9 }), 0, 0, 0.045); lb.add(D.xpanel);
  // cabinets
  const cab = P(G(), 3.6, 0, -3.1); SD.add(cab);
  cab.add(P(rbox(2.2, 0.95, 0.7, 0.04, M(0xffffff, { roughness: 0.4 })), 0, 0.48, 0));
  cab.add(P(rbox(2.24, 0.06, 0.74, 0.02, M(0x9fd2ec)), 0, 0.97, 0));
  for (let i = 0; i < 3; i++) cab.add(P(rbox(0.3, 0.04, 0.03, 0.015, M(0xb8bcc8, { metalness: 0.6 })), -0.7 + i * 0.7, 0.75, 0.36));
  cab.add(P(cyl(0.12, 0.1, 0.25, M(0x6bc5ff, { transparent: true, opacity: 0.8 })), -0.6, 1.12, 0));
  for (let i = 0; i < 3; i++) { const tb = P(cap(0.012, 0.18, M([0xff6b9a, 0x4ecdc4, 0xffd93d][i])), -0.62 + i * 0.02, 1.32, 0); tb.rotation.z = (i - 1) * 0.25; cab.add(tb); }
  // dental chair
  const chair = P(G(), 0, 0, -1.3); chair.rotation.y = 0.55; SD.add(chair); D.chair = chair;
  const yel = M(0xffc928, { roughness: 0.35 }), gray = M(0xc3c7d1, { roughness: 0.35, metalness: 0.3 });
  chair.add(P(rbox(0.75, 0.12, 1.3, 0.05, gray), 0, 0.06, 0));
  const ped = P(rbox(0.3, 0.45, 0.4, 0.06, gray), 0, 0.3, 0); ped.rotation.x = -0.3; chair.add(ped);
  chair.add(P(rbox(0.7, 0.16, 0.65, 0.07, yel), 0, 0.58, 0.05));
  const backrest = P(G(), 0, 0.62, -0.26); chair.add(backrest); D.backrest = backrest;
  backrest.add(P(rbox(0.66, 0.95, 0.16, 0.08, yel), 0, 0.47, -0.04));
  backrest.add(P(rbox(0.42, 0.24, 0.16, 0.07, yel), 0, 1.04, -0.04));
  const legrest = P(G(), 0, 0.6, 0.36); chair.add(legrest);
  const lr = P(rbox(0.6, 0.14, 0.75, 0.07, yel), 0, -0.1, 0.32); lr.rotation.x = 0.35; legrest.add(lr);
  // armrest + side table
  chair.add(P(rbox(0.1, 0.08, 0.5, 0.03, gray), 0.42, 0.78, 0.0));
  // overhead lamp
  const lampPost = P(cyl(0.04, 0.04, 2.6, gray), -1.1, 1.3, -2.6); SD.add(lampPost);
  SD.add(P(cyl(0.25, 0.3, 0.06, gray), -1.1, 0.03, -2.6));
  const lampArm = P(G(), -1.1, 2.55, -2.6); SD.add(lampArm); D.lampArm = lampArm;
  const armBar = P(rbox(2.1, 0.06, 0.06, 0.02, gray), 1.05, 0, 0); lampArm.add(armBar);
  const lampHead = P(G(), 2.1, -0.32, 0); lampArm.add(lampHead); D.lampHead = lampHead;
  lampHead.add(P(cyl(0.02, 0.02, 0.25, gray), 0, 0.12, 0));
  lampHead.add(rbox(0.42, 0.14, 0.24, 0.05, M(0xf5f5f5)));
  D.lampGlow = P(rbox(0.36, 0.02, 0.18, 0.01, M(0xffffff, { emissive: 0xfff6cc, emissiveIntensity: 0 })), 0, -0.07, 0); lampHead.add(D.lampGlow);
  D.spot = new THREE.SpotLight(0xfff3d0, 0, 6, 0.45, 0.6, 1.2); D.spot.castShadow = false; lampHead.add(D.spot); D.spot.position.set(0, -0.1, 0);
  SD.add(D.spot.target);
  const coneM = new THREE.MeshBasicMaterial({ color: 0xfff6cc, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  D.cone = P(new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.8, 32, 1, true), coneM), 0, -0.47, 0); lampHead.add(D.cone);
  // x-ray machine (wall arm)
  const xArm = P(G(), -1.6, 1.75, -1.9); SD.add(xArm); D.xArm = xArm;
  xArm.add(P(rbox(0.2, 0.3, 0.12, 0.04, M(0xffffff)), 0, 0, 0));
  const xBar = P(rbox(0.07, 0.07, 0.8, 0.03, gray), 0, 0, 0.42); xArm.add(xBar);
  const xHead = P(G(), 0, -0.05, 0.85); xArm.add(xHead); D.xHead = xHead;
  const xc = cyl(0.11, 0.09, 0.32, M(0xffffff, { roughness: 0.35 })); xc.rotation.x = PI / 2; xHead.add(xc);
  const xr = P(cyl(0.08, 0.08, 0.03, M(0x6b4ce6)), 0, 0, 0.17); xr.rotation.x = PI / 2; xHead.add(xr);
  // tray with tools
  const tray = P(G(), 0.85, 0.98, -1.75); SD.add(tray); D.tray = tray;
  tray.add(P(cyl(0.03, 0.03, 0.98, gray), 0, -0.49, 0));
  tray.add(rbox(0.6, 0.04, 0.38, 0.02, M(0xffffff)));
  for (let i = 0; i < 5; i++) { const tl = P(cap(0.008, 0.16, gray), -0.2 + i * 0.09, 0.035, 0); tl.rotation.x = PI / 2; tray.add(tl); }
  // stool
  const stool = P(G(), -0.85, 0, -0.55); SD.add(stool); D.stool = stool;
  stool.add(P(cyl(0.25, 0.25, 0.1, yel), 0, 0.55, 0)); stool.add(P(cyl(0.03, 0.03, 0.5, gray), 0, 0.28, 0)); stool.add(P(cyl(0.25, 0.28, 0.04, gray), 0, 0.03, 0));
  // tooth poster
  SD.add(P(poster(0.8, 0.8, drawSmile), -4.2, 2.4, -3.47));
  SD.add(P(poster(0.8, 1.0, drawToothbrush), 4.3, 2.4, -3.47));
  // door
  SD.add(P(rbox(0.12, 2.4, 1.2, 0.03, M(0xb98a55)), 5.35, 1.2, 0.8));
}
const D_ = { mahino: cast.mahino(), hala: cast.hala(), mag: cast.mag(), alfi: cast.alfi() };
Object.values(D_).forEach(c => SD.add(c.root));
D_.mag.arms[1].grip.add(microphone());
// hand props for Hala / Dr. Alfi
const mirrorTool = G(); { mirrorTool.add(P(cyl(0.008, 0.008, 0.2, M(0xc3c7d1, { metalness: 0.7, roughness: 0.25 })), 0, 0.1, 0)); const d = P(cyl(0.03, 0.03, 0.006, M(0xe8f4ff, { metalness: 1, roughness: 0.05 })), 0, 0.21, 0); d.rotation.x = 0.8; mirrorTool.add(d); }
const scaler = G(); { scaler.add(P(cyl(0.01, 0.01, 0.2, M(0xc3c7d1, { metalness: 0.7, roughness: 0.25 })), 0, 0.1, 0)); const tip = P(cyl(0.004, 0.002, 0.06, M(0xc3c7d1, { metalness: 0.7 })), 0, 0.22, 0.01); tip.rotation.x = 0.5; scaler.add(tip); }
const brush = G(); { brush.add(P(cyl(0.012, 0.012, 0.2, M(0x6b4ce6)), 0, 0.1, 0)); brush.add(P(sph(0.025, M(0xff6fae, { roughness: 0.3 })), 0, 0.22, 0)); }
D_.hala.arms[1].grip.add(mirrorTool, scaler, brush);
const tablet = G(); { tablet.add(rbox(0.36, 0.25, 0.025, 0.02, M(0x2c2f3a))); const scr = P(plane(0.32, 0.21, null, {}), 0, 0, 0.014); scr.material = new THREE.MeshStandardMaterial({ map: D.xtex, emissive: 0xffffff, emissiveMap: D.xtex, emissiveIntensity: 0.8 }); tablet.add(scr); }
D_.alfi.torso.add(tablet);
// flavour jars (floating) + baby teeth
const jars = [];
[['Bubble gum', 0xff8fc8], ['Strawberry', 0xff5b5b], ['Mint', 0x6fe0a8], ['Orange', 0xffa53d]].forEach(([name, col], i) => {
  const g = G();
  g.add(P(cyl(0.12, 0.12, 0.2, new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.2, clearcoat: 1 })), 0, 0, 0));
  g.add(P(cyl(0.125, 0.125, 0.05, M(0xffffff)), 0, 0.12, 0));
  const lab = canvasTex(256, 96, (c, w, h) => { c.fillStyle = '#fff'; rr(c, 4, 4, w - 8, h - 8, 30); c.fill(); c.fillStyle = '#4a2fb8'; c.font = '600 40px Fredoka'; c.textAlign = 'center'; c.fillText(name, w / 2, 62); });
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: lab, depthTest: false })); sp.scale.set(0.36, 0.135, 1); sp.position.y = -0.23; sp.renderOrder = 5; g.add(sp);
  SD.add(g); jars.push(g);
});
const babyTeeth = [];
for (let i = 0; i < 6; i++) { const tt = tooth(); tt.g.scale.setScalar(0.09); SD.add(tt.g); babyTeeth.push(tt); }
const sparkles = [];
const starTex = canvasTex(64, 64, (c, w, h) => { const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,250,200,0.8)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(32, 0); c.lineTo(36, 28); c.lineTo(64, 32); c.lineTo(36, 36); c.lineTo(32, 64); c.lineTo(28, 36); c.lineTo(0, 32); c.lineTo(28, 28); c.fill(); });
function makeSparkles(scene, n) { const arr = []; for (let i = 0; i < n; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); s.visible = false; scene.add(s); arr.push(s); } return arr; }
const sparkD = makeSparkles(SD, 10);

// ================= TOOTH WORLD (title, enamel, plaque, quiz) =================
const ST = new THREE.Scene();
ST.background = canvasTex(4, 256, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#8fd3ff'); g.addColorStop(0.6, '#c9b8ff'); g.addColorStop(1, '#ffd1ec'); c.fillStyle = g; c.fillRect(0, 0, w, h); });
lights(ST, { target: [0, 0, 0], keyPos: [3, 6, 6], env: 0.6 });
const T = {};
{
  const ground = mesh(new THREE.CylinderGeometry(3.2, 3.4, 0.3, 64), M(0xfff1fa, { roughness: 0.7 })); ground.position.y = -0.15; ST.add(ground);
  { const ring = P(mesh(new THREE.TorusGeometry(3.25, 0.07, 12, 80), M(0xff8fc8)), 0, 0, 0); ring.rotation.x = PI / 2; ST.add(ring); }
  T.tooth = tooth(); P(T.tooth.g, 0, 0.75, 0); ST.add(T.tooth.g);
  T.shield = new THREE.Mesh(new THREE.SphereGeometry(1.0, 48, 32), new THREE.MeshStandardMaterial({ color: 0x7fd8ff, emissive: 0x58c7ff, emissiveIntensity: 0.5, transparent: true, opacity: 0, roughness: 0.1, depthWrite: false }));
  T.shield.position.set(0, 0.85, 0); ST.add(T.shield);
  T.drops = []; for (let i = 0; i < 8; i++) { const d = sph(0.07, new THREE.MeshPhysicalMaterial({ color: 0x48b7ff, roughness: 0.1, clearcoat: 1, transparent: true, opacity: 0.9 })); d.scale.set(1, 1.3, 1); ST.add(d); T.drops.push(d); }
  T.germs = [0x7ed957, 0xb5e655, 0x5fcf8a, 0x9be15d, 0x6cd36e].map(c => { const g = germ(c); ST.add(g); return g; });
  T.plaque = []; for (let i = 0; i < 9; i++) { const b = sph(0.09, M(0xd6d34a, { roughness: 0.85 })); b.scale.set(1, 0.7, 0.5); T.tooth.g.add(b); T.plaque.push(b); }
  const bm = M(0xf3e6c8, { roughness: 0.6 });
  T.bone = G(); T.bone.add(P(cap(0.08, 0.6, bm), 0, 0, 0)); for (const sx of [-1, 1]) for (const sy of [-1, 1]) T.bone.add(P(sph(0.1, bm), sx * 0.07, sy * 0.4, 0));
  T.bone.rotation.z = 0.3; ST.add(T.bone);
  T.bubbles = []; for (let i = 0; i < 14; i++) { const b = sph(0.08 + (i % 4) * 0.05, new THREE.MeshPhysicalMaterial({ color: [0xffffff, 0xffd84a, 0xff8fc8, 0x8fe3ff][i % 4], roughness: 0.15, clearcoat: 1, transparent: true, opacity: 0.85 })); ST.add(b); T.bubbles.push(b); }
  T.brush = G(); T.brush.add(P(rbox(0.12, 1.3, 0.12, 0.05, M(0x6b4ce6)), 0, 0, 0)); T.brush.add(P(rbox(0.16, 0.35, 0.14, 0.05, M(0x6b4ce6)), 0, 0.75, 0));
  for (let i = 0; i < 4; i++) T.brush.add(P(rbox(0.12, 0.06, 0.16, 0.02, M(0xffffff)), 0, 0.62 + i * 0.08, 0.13));
  ST.add(T.brush);
  T.mini = cast.mahino(); ST.add(T.mini.root);
}
const sparkT = makeSparkles(ST, 12);

// ================= TIMELINE =================
let outline = null;
if (ANIME) {
  const grad = new THREE.DataTexture(new Uint8Array([110, 110, 110, 255, 190, 190, 190, 255, 255, 255, 255, 255]), 3, 1);
  grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true;
  const conv = new Map();
  const toon = m => {
    if (!(m.isMeshStandardMaterial)) return m;
    if (!conv.has(m)) {
      const t = new THREE.MeshToonMaterial({ color: m.color, map: m.map, gradientMap: grad, emissive: m.emissive, emissiveMap: m.emissiveMap,
        emissiveIntensity: m.emissiveIntensity, transparent: m.transparent, opacity: m.opacity, side: m.side, depthWrite: m.depthWrite, blending: m.blending });
      if (m.transparent) t.userData.outlineParameters = { visible: false };
      conv.set(m, t);
    }
    return conv.get(m);
  };
  for (const sc of [SW, SD, ST]) {
    sc.environment = null;
    sc.traverse(o => {
      if (!o.isMesh) return;
      if (o.userData.noOutline) { o.material = toon(o.material).clone(); o.material.userData.outlineParameters = { visible: false }; return; }
      o.material = toon(o.material);
    });
  }
  // big flat surfaces (floor/walls) get no ink line
  for (const m of conv.values()) if (m.map && !m.transparent) m.userData.outlineParameters = { thickness: 0.002, color: [0.25, 0.2, 0.3] };
  renderer.toneMapping = THREE.NoToneMapping;
  outline = new OutlineEffect(renderer, { defaultThickness: 0.0042, defaultColor: [0.12, 0.08, 0.12], defaultAlpha: 1 });
  document.body.classList.add('anime');
}
const TL = await (await fetch('timeline.json')).json();
const lines = TL.lines;
// scene spans
const spans = [];
lines.forEach((l, i) => {
  const prev = lines[i - 1];
  if (!prev || prev.scene !== l.scene) spans.push({ name: l.scene, start: i === 0 ? 0 : l.start - 0.35, lines: [] });
  spans[spans.length - 1].lines.push(l);
});
spans.forEach((s, i) => s.end = i + 1 < spans.length ? spans[i + 1].start : TL.duration);
window.TL_DURATION = TL.duration;

const $ = id => document.getElementById(id);
const COLORS = { M: '#ff5fa2', K: '#6b4ce6', N: '#20a6c9' };
const NAMES = { M: 'Mahino', K: 'Kids Mag', N: 'Narrator' };
const VOCAB = { reception: 'receptionist', hala: 'hygienist', xray: 'x-ray', light: 'sunglasses', clean: 'tools', fluoride: 'fluoride', enamel: 'enamel', plaque: 'plaque', touch: 'enamel', alfi: 'dentist' };

function speakingEnv(t, who) {
  for (const l of lines) if (l.who === who && t >= l.start && t < l.end) {
    const i = Math.floor((t - l.start) * TL.fps); const a = l.env[i] || 0, b = l.env[i + 1] || 0;
    return lerp(a, b, ((t - l.start) * TL.fps) % 1);
  }
  return 0;
}
function lineAt(span, t) { let cur = span.lines[0]; for (const l of span.lines) if (t >= l.start - 0.05) cur = l; return cur; }
const lp = (l, t) => l ? clamp((t - l.start) / (l.end - l.start)) : 0;

function face(ch, t, who, extra = {}) {
  const env = who ? speakingEnv(t, who) : 0;
  setFace(ch.face, { open: Math.max(env * 0.85, extra.open || 0), blink: blinkAt(t, ch.seed), brow: env * 0.6 + (extra.brow || 0), ...extra, open: Math.max(env * 0.85, extra.open || 0) });
}
function shot(pos, look, t0, t1, t, drift = [0.15, 0.03, -0.1]) {
  const k = clamp((t - t0) / Math.max(0.01, t1 - t0));
  camera.position.set(pos[0] + drift[0] * k, pos[1] + drift[1] * k, pos[2] + drift[2] * k);
  camera.lookAt(...look);
}
function sparkleAt(arr, center, t, t0, spread = 0.3, size = 0.12) {
  arr.forEach((s, i) => {
    const k = (t - t0 - i * 0.07);
    s.visible = k > 0 && k < 1.2;
    if (!s.visible) return;
    const a = i * 2.4, r = spread * (0.5 + 0.5 * ((i * 37) % 10) / 10);
    s.position.set(center[0] + Math.cos(a) * r, center[1] + Math.sin(a) * r * 0.8 + k * 0.1, center[2] + 0.1);
    const sc = size * Math.sin(clamp(k / 1.2) * PI); s.scale.set(sc, sc, 1); s.material.rotation = k * 2;
  });
}

// ---------- per-scene staging ----------
const MAH_SEAT = [-1.12, 0, -3.0], MOM_SEAT = [-0.34, 0, -3.0];
function stageWaiting(t, span, mode) {
  const c = W_; Object.values(c).forEach(ch => { ch.reset(); ch.root.visible = true; ch.sun.visible = false; });
  // receptionist behind desk
  P(c.recep.root, 3.55, 0, -2.75); c.recep.root.rotation.y = -0.35;
  idle(c.recep, t); face(c.recep, t, null);
  arm(c.recep, 0, { x: 0.5, z: 0.15, e: 0.9 });
  // mag interviewer
  P(c.mag.root, -2.75, 0, -1.75); c.mag.root.rotation.y = faceTo([-2.75, 0, -1.75], [-0.9, 0, -2.6]) - 0.75;
  arm(c.mag, 1, { x: 1.0, z: 0.05, e: 1.0 }); arm(c.mag, 0, { x: 0.1, z: 0.12, e: 0.3 }); idle(c.mag, t);
  face(c.mag, t, 'K'); look(c.mag, [-1.1, 0.95, -2.9], 0.55);
  // mom + mahino seated
  P(c.mom.root, ...MOM_SEAT); sit(c.mom, 0.52); arm(c.mom, 0, { x: 0.5, z: 0.25, e: 0.6 }); arm(c.mom, 1, { x: 0.45, z: 0.1, e: 0.55 }); idle(c.mom, t); face(c.mom, t, null);
  P(c.mahino.root, ...MAH_SEAT); sit(c.mahino, 0.52, { knee: 1.25 }); arm(c.mahino, 0, { x: 0.45, z: 0.15, e: 0.4 }); arm(c.mahino, 1, { x: 0.45, z: 0.15, e: 0.4 }); idle(c.mahino, t);
  c.mahino.legs.forEach((l, i) => l.knee.rotation.x = 1.25 + Math.sin(t * 3 + i * 1.5) * 0.18);
  face(c.mahino, t, 'M');
  c.hala.root.visible = false;
  const L = lineAt(span, t);
  const who = L ? L.who : 'N';
  if (who === 'K') look(c.mahino, c.mag.root.position.toArray().map((v, i) => i === 1 ? 1.5 : v), 0.9);
  else look(c.mahino, [camera.position.x, camera.position.y, camera.position.z], 0.5);
  look(c.mom, [-1.1, 0.95, -2.9], 0.7);
  look(c.recep, [0, 1, 0], 0.4);
  if (mode === 'bye') {
    // everyone stands and waves
    P(c.mahino.root, -1.2, 0, -1.6); c.mahino.root.rotation.y = 0; c.mahino.reset(); idle(c.mahino, t);
    P(c.mom.root, -0.45, 0, -1.9); c.mom.root.rotation.y = -0.15; c.mom.reset(); idle(c.mom, t);
    P(c.mag.root, -2.15, 0, -1.6); c.mag.root.rotation.y = 0.35;
    const wv = Math.sin(t * 7) * 0.35;
    arm(c.mahino, 1, { z: 2.6 + wv * 0.4, e: 0.3 }); arm(c.mom, 1, { z: 2.4 + wv * 0.3, e: 0.4 });
    arm(c.mag, 0, { z: 2.4 - wv * 0.3, e: 0.4 });
    face(c.mahino, t, 'M', { open: 0.15 }); face(c.mom, t, null);
    look(c.mahino, camera.position.toArray(), 0.8); look(c.mom, camera.position.toArray(), 0.6); look(c.mag, camera.position.toArray(), 0.6);
    shot([-1.1, 1.35, 2.6], [-1.2, 0.95, -1.7], span.start, span.end, t, [0.1, 0, -0.5]);
    return;
  }
  // cameras
  if (span.name === 'waiting') {
    const first = span.lines[0];
    if (t < first.end + 0.2) shot([0.9, 1.9, 4.3], [-0.6, 0.95, -2.4], span.start, first.end, t, [-0.3, -0.1, -0.8]);
    else if (who === 'K') shot([-0.75, 1.55, -0.95], [-2.6, 1.4, -1.85], L.start, L.end + 0.5, t, [0.08, 0, -0.1]);
    else shot([-0.55, 1.05, -0.35], [-1.0, 0.9, -2.95], L.start, L.end + 0.5, t, [0.06, 0.01, -0.12]);
  }
}
function stageReception(t, span) {
  const c = W_; Object.values(c).forEach(ch => { ch.reset(); ch.root.visible = true; ch.sun.visible = false; });
  c.hala.root.visible = false;
  const k = lp(span.lines[0], t);
  P(c.recep.root, 3.55, 0, -2.75); c.recep.root.rotation.y = -0.35; idle(c.recep, t);
  const wv = Math.sin(t * 6) * 0.3;
  if (k < 0.45) arm(c.recep, 1, { z: 2.3 + wv, e: 0.4 }); else arm(c.recep, 1, { x: 0.6, z: 0.2, e: 1.1 });
  arm(c.recep, 0, { x: 0.7, z: 0.1, e: 1.0 });
  face(c.recep, t, null, { open: k < 0.45 ? 0.35 : 0.12 });
  P(c.mom.root, 1.95, 0, -1.55); c.mom.root.rotation.y = faceTo([1.95, 0, -1.55], [3.5, 0, -2.6]); idle(c.mom, t); face(c.mom, t, null);
  P(c.mahino.root, 2.05, 0, -0.95); c.mahino.root.rotation.y = faceTo([2.05, 0, -0.95], [3.5, 0, -2.6]); idle(c.mahino, t); face(c.mahino, t, 'M');
  arm(c.mom, 1, { x: 0.3, z: 0.4, e: 0.3 }); arm(c.mahino, 0, { x: 0.3, z: 0.45, e: 0.3 });
  look(c.recep, [1.9, 1.2, -0.8]); look(c.mom, [3.5, 1.6, -2.7]); look(c.mahino, [3.5, 1.6, -2.7]);
  P(c.mag.root, -2.75, 0, -1.75);
  shot([4.9, 1.5, 0.9], [2.75, 1.1, -1.75], span.start, span.end, t, [-0.25, 0, -0.3]);
}
function stageHala(t, span) {
  const c = W_; Object.values(c).forEach(ch => { ch.reset(); ch.root.visible = true; ch.sun.visible = false; });
  stageWaiting(t, span, 'base');
  c.hala.root.visible = true; c.hala.reset();
  const k = (t - span.start) / (span.end - span.start);
  const door = [-4.3, 0, -3.5], meet = [-1.85, 0, -2.2], exitP = [-4.3, 0, -3.9];
  const a1 = smooth(0.0, 0.42, k);
  if (k < 0.42) {
    const p = [lerp(door[0], meet[0], a1), 0, lerp(door[2], meet[2], a1)];
    P(c.hala.root, ...p); c.hala.root.rotation.y = faceTo(door, meet); walk(c.hala, t * 7);
  } else if (k < 0.62) {
    P(c.hala.root, ...meet); c.hala.root.rotation.y = faceTo(meet, MAH_SEAT); idle(c.hala, t);
    arm(c.hala, 1, { z: 2.3 + Math.sin(t * 7) * 0.3, e: 0.4 });
    if (k > 0.5) { // mahino stands up
      const s = smooth(0.5, 0.62, k); c.mahino.reset(); sit(c.mahino, lerp(0.52, 0.82 * 0.62 - 0.05, s), { knee: lerp(1.25, 0, s), thigh: lerp(PI / 2, 0, s) });
      if (s >= 1) c.mahino.body.position.y = 0;
    }
  } else {
    const a2 = smooth(0.62, 1.0, k);
    const hp = [lerp(meet[0], exitP[0], a2), 0, lerp(meet[2], exitP[2], a2)];
    P(c.hala.root, ...hp); c.hala.root.rotation.y = faceTo(meet, exitP); walk(c.hala, t * 7);
    const start = [MAH_SEAT[0], 0, MAH_SEAT[2] + 0.35];
    const mp = [lerp(start[0], exitP[0] + 0.5, a2), 0, lerp(start[2], exitP[2] + 0.4, a2)];
    c.mahino.reset(); P(c.mahino.root, ...mp); c.mahino.root.rotation.y = faceTo(start, exitP); walk(c.mahino, t * 8);
    arm(c.hala, 0, { x: 0.3, z: 0.4, e: 0.2 });
    c.hala.root.visible = a2 < 0.97; c.mahino.root.visible = a2 < 0.99;
  }
  face(c.hala, t, null, { open: k > 0.42 && k < 0.62 ? 0.3 : 0 }); look(c.hala, [-1.1, 0.9, -3.0], 0.6);
  shot([0.7, 1.75, 2.6], [-2.2, 0.95, -2.7], span.start, span.end, t, [-0.3, 0, -0.3]);
}

// dental room helpers
const chairWorld = (x, y, z) => { const v = new THREE.Vector3(x, y, z); D.chair.updateMatrixWorld(); return D.chair.localToWorld(v).toArray(); };
function patient(ch, recline) {
  // seat Mahino in the chair (chair local coords), recline 0..1
  ch.reset(); D.chair.updateMatrixWorld();
  const p = chairWorld(0, 0, 0.0); P(ch.root, p[0], 0, p[2]); ch.root.rotation.y = D.chair.rotation.y;
  sit(ch, 0.66, { knee: 0.55, thigh: PI / 2 - 0.1 });
  ch.torso.rotation.x = -recline * 0.75; ch.torso.position.z = -0.05;
  D.backrest.rotation.x = -recline * 0.75 - 0.08;
  arm(ch, 0, { x: 0.35, z: 0.25, e: 0.6 }); arm(ch, 1, { x: 0.35, z: 0.25, e: 0.6 });
}
function headWorld(ch) { const v = new THREE.Vector3(); ch.head.getWorldPosition(v); return v.toArray(); }
function mouthWorld(ch) { const v = new THREE.Vector3(); ch.face.mouth.mouth.getWorldPosition(v); return v.toArray(); }
function reachHand(ch, side, target) {
  ch.root.updateMatrixWorld(true);
  const a = ch.arms[side];
  const T = ch.torso.worldToLocal(new THREE.Vector3(...target));
  const S = a.sh.position.clone();
  const L1 = 0.29, L2 = 0.3;
  const v = T.clone().sub(S); let d = Math.min(v.length(), L1 + L2 - 0.01); const dir = v.clone().normalize();
  const ang = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
  const e = PI - Math.acos(clamp((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2), -1, 1));
  // bend plane: elbow drops downward/outward
  let pole = new THREE.Vector3(side ? 0.6 : -0.6, -1, -0.3).normalize();
  const n = new THREE.Vector3().crossVectors(dir, pole).normalize();
  const upper = dir.clone().applyAxisAngle(n, ang);
  const yA = upper.clone().negate();
  const zA = dir.clone().sub(upper.clone().multiplyScalar(dir.dot(upper))).normalize();
  const xA = new THREE.Vector3().crossVectors(yA, zA).normalize();
  const m = new THREE.Matrix4().makeBasis(xA, yA, zA);
  a.sh.quaternion.setFromRotationMatrix(m);
  a.el.rotation.set(-e, 0, 0);
}

function stageDental(t, span) {
  const c = D_; Object.values(c).forEach(ch => { ch.reset(); ch.root.visible = true; ch.sun.visible = false; });
  [mirrorTool, scaler, brush, tablet].forEach(x => x.visible = false); tablet.visible = true;
  jars.forEach(j => j.visible = false); babyTeeth.forEach(b => b.g.visible = false); sparkD.forEach(s => s.visible = false);
  D.lampGlow.material.emissiveIntensity = 0; D.spot.intensity = 0; D.cone.material.opacity = 0;
  D.xHead.parent.rotation.y = 0.0; D.xArm.rotation.y = 0;
  $('flash').style.opacity = 0;
  const name = span.name, L = lineAt(span, t), k = lp(L, t), who = L ? L.who : 'N';
  const sk = (t - span.start) / (span.end - span.start);
  const recline = { chair: 0.25, xray: 0.3, light: 0.8, clean: 0.85, help: 0.8, fluoride: 0.75, alfi: 0.2 }[name] ?? 0.5;
  patient(c.mahino, recline);
  idle(c.mahino, t); c.mahino.torso.rotation.z = 0;
  const sunOn = ['light', 'clean', 'help', 'fluoride'].includes(name) && !(name === 'light' && k < 0.32 && span.lines.indexOf(L) === 1) && !(name === 'light' && span.lines.indexOf(L) === 0);
  c.mahino.sun.visible = sunOn;
  // hala at side of chair
  const hpos = chairWorld(-0.62, 0, -0.15);
  P(c.hala.root, hpos[0], 0, hpos[2]); idle(c.hala, t);
  // mag interviewer near door
  P(c.mag.root, 2.4, 0, 0.5); c.mag.root.rotation.y = faceTo([2.4, 0, 0.5], [0, 0, -1.2]) + 0.25;
  arm(c.mag, 1, { x: 1.0, z: 0.05, e: 1.0 }); idle(c.mag, t); face(c.mag, t, 'K');
  c.mag.root.updateMatrixWorld(true);
  look(c.mag, headWorld(c.mahino), 0.8);
  c.alfi.root.visible = name === 'alfi';
  c.hala.root.visible = name !== 'alfi';
  c.mahino.root.updateMatrixWorld(true);
  const mw = mouthWorld(c.mahino), hw = headWorld(c.mahino);
  c.hala.root.rotation.y = faceTo(hpos, hw) - 0.6;
  c.hala.root.updateMatrixWorld(true);
  look(c.hala, hw, 0.9);
  let mOpen = 0;
  // lamp default position
  D.lampArm.rotation.y = -0.85;
  const cshot = (p, l, a, b, dr = [0, 0, -0.15]) => { const P1 = chairWorld(...p), L1 = chairWorld(...l); const d = chairWorld(p[0] + dr[0], p[1] + dr[1], p[2] + dr[2]); shot(P1, L1, a, b, t, [d[0] - P1[0], d[1] - P1[1], d[2] - P1[2]]); };
  const magShot = () => shot([0.9, 1.6, 2.3], [2.3, 1.4, 0.4], L.start, L.end + 0.4, t, [0.05, 0, -0.1]);
  if (name === 'chair') {
    if (who === 'K') magShot();
    else cshot([0.75, 1.55, 2.3], [-0.25, 1.2, -0.15], L.start, L.end);
    arm(c.hala, 1, { x: 0.8, z: 0.3, e: 0.8 + Math.sin(t * 2) * 0.1 });
    face(c.hala, t, null, { open: 0.2 });
    // x-ray head swings in near the end of the line
    const s = who === 'M' ? smooth(0.65, 0.95, k) : 0; D.xArm.rotation.y = s * 0.9;
    c.mahino.face && look(c.mahino, who === 'K' ? headWorld(c.mag) : camera.position.toArray(), 0.6);
  } else if (name === 'xray') {
    D.xArm.rotation.y = 0.9 * (1 - smooth(0.12, 0.25, sk));
    const fl = sk < 0.12 ? Math.max(0, 1 - Math.abs(sk - 0.04) / 0.03) : 0;
    $('flash').style.opacity = fl * 0.9;
    if (sk < 0.18) shot([0.9, 1.3, 0.6], [-0.3, 1.0, -1.4], span.start, span.start + 2, t, [0, 0, -0.1]);
    else shot([1.9, 2.4, -1.6], [1.9, 2.5, -3.45], span.start + 2, span.end, t, [0, 0, 0.45]);
    arm(c.hala, 1, { x: 0.6, z: 0.3, e: 0.7 });
    face(c.hala, t, null, { open: 0.15 });
    look(c.mahino, [1.9, 2.5, -3.4], 0.7);
  } else if (name === 'light') {
    const idx = span.lines.indexOf(L);
    if (who === 'K') magShot();
    const on = idx === 1 ? smooth(0.48, 0.55, k) : 0;
    D.lampGlow.material.emissiveIntensity = on * 2.5; D.spot.intensity = on * 8; D.cone.material.opacity = on * 0.05;
    D.spot.target.position.set(...hw);
    if (idx === 1) {
      cshot([0.75, 1.8, 2.6], [-0.3, 1.38, -0.25], L.start, L.end, [0, -0.05, -0.35]);
      if (k < 0.4) { reachHand(c.hala, 1, [hw[0] + 0.12, hw[1] + 0.05, hw[2] + 0.25]); }
      else if (k > 0.66) { mirrorTool.visible = true; reachHand(c.hala, 1, [mw[0] + 0.02, mw[1] + 0.02, mw[2] + 0.18]); mOpen = 0.8; }
      else arm(c.hala, 1, { x: 0.8, z: 0.3, e: 0.9 });
    }
    face(c.hala, t, null, { open: 0.15 });
  } else if (name === 'clean') {
    cshot([0.55, 1.75, 2.1], [-0.28, 1.36, -0.25], span.start, span.end, [0, 0, -0.25]);
    D.lampGlow.material.emissiveIntensity = 2.5; D.spot.intensity = 8; D.cone.material.opacity = 0.05; D.spot.target.position.set(...hw);
    if (k < 0.72) {
      (k < 0.36 ? scaler : brush).visible = true;
      reachHand(c.hala, 1, [mw[0] + Math.sin(t * 9) * 0.02, mw[1] + 0.02, mw[2] + 0.17 + Math.cos(t * 9) * 0.01]); mOpen = 0.85;
    } else { arm(c.hala, 1, { x: 0.6, z: 0.3, e: 0.8 }); sparkleAt(sparkD, [mw[0], mw[1], mw[2] + 0.05], t, L.start + (L.end - L.start) * 0.74, 0.12, 0.08); }
    face(c.hala, t, null, { open: 0.1 });
  } else if (name === 'help') {
    D.lampGlow.material.emissiveIntensity = 2.5; D.spot.intensity = 8; D.cone.material.opacity = 0.05; D.spot.target.position.set(...hw);
    if (who === 'K') magShot();
    else cshot([0.75, 1.8, 2.5], [-0.3, 1.36, -0.25], L.start, L.end);
    if (L.act === 'mouth') { if (k > 0.45 && k < 0.68) mOpen = 1.0; }
    if (L.act === 'hand') {
      const up = smooth(0.05, 0.2, k) * (1 - smooth(0.8, 0.95, k));
      c.mahino.arms[1].sh.rotation.set(-up * 2.2, 0, 0.25 * (1 - up) + up * 0.3); c.mahino.arms[1].el.rotation.set(-0.6 * (1 - up) - up * 0.3 + Math.sin(t * 8) * 0.12 * up, 0, 0);
    }
    arm(c.hala, 1, { x: 0.7, z: 0.3, e: 0.9 }); face(c.hala, t, null, { open: 0.25 });
  } else if (name === 'fluoride') {
    D.lampGlow.material.emissiveIntensity = 2.0; D.spot.intensity = 6; D.cone.material.opacity = 0.04; D.spot.target.position.set(...hw);
    if (who === 'K') magShot();
    else if (L.act !== 'flavor') {
      cshot([0.55, 1.75, 2.1], [-0.28, 1.36, -0.25], L.start, L.end, [0, 0, -0.2]);
      if (k > 0.3) { brush.visible = true; reachHand(c.hala, 1, [mw[0] + Math.sin(t * 7) * 0.03, mw[1] + 0.02, mw[2] + 0.17]); mOpen = 0.85; }
      else arm(c.hala, 1, { x: 0.7, z: 0.3, e: 0.9 });
    } else {
      // flavour picker floating in front of Mahino
      const base = chairWorld(0.05, 1.45, 0.75);
      shot([base[0] + 0.2, base[1] + 0.1, base[2] + 2.3], [base[0], base[1] - 0.05, base[2]], L.start, L.end, t, [0, 0, -0.3]);
      jars.forEach((j, i) => {
        j.visible = true; const app = smooth(0.0 + i * 0.04, 0.15 + i * 0.04, k);
        const pick = i === 0 ? smooth(0.42, 0.55, k) : 0;
        P(j, base[0] - 0.57 + i * 0.38, base[1] + Math.sin(t * 2 + i) * 0.02 + pick * 0.12, base[2] + pick * 0.15);
        j.scale.setScalar(app * (1 + pick * 0.35) * (i && k > 0.55 ? 1 - smooth(0.55, 0.7, k) * 0.4 : 1)); j.rotation.y = Math.sin(t + i) * 0.3 + pick * t * 1.5;
      });
      if (k > 0.5) sparkleAt(sparkD, P(new THREE.Object3D(), base[0] - 0.57, base[1] + 0.15, base[2] + 0.15).position.toArray(), t, L.start + (L.end - L.start) * 0.5, 0.25, 0.12);
      arm(c.hala, 1, { x: 0.7, z: 0.3, e: 0.9 });
    }
    face(c.hala, t, null, { open: 0.2 });
  } else if (name === 'alfi') {
    D.lampArm.rotation.y = -0.4;
    const ap = chairWorld(-0.85, 0, 0.45);
    c.alfi.reset(); P(c.alfi.root, ap[0], 0, ap[2]); c.alfi.root.rotation.y = faceTo(ap, hw) - 0.9;
    P(D.stool, ap[0], 0, ap[2]); sit(c.alfi, 0.6); idle(c.alfi, t);
    tablet.position.set(0.05, 0.42, 0.34); tablet.rotation.set(-0.5, 0.35, 0);
    c.alfi.root.updateMatrixWorld(true);
    const tw = new THREE.Vector3(); tablet.getWorldPosition(tw);
    reachHand(c.alfi, 0, [tw.x - 0.0, tw.y - 0.05, tw.z]); reachHand(c.alfi, 1, [tw.x, tw.y - 0.05, tw.z]);
    { const q = new THREE.Vector3(); c.alfi.arms[0].grip.getWorldPosition(q); }
    c.alfi.root.updateMatrixWorld(true);
    face(c.alfi, t, null, { open: L && L.who === 'M' && k > 0.2 && k < 0.55 ? 0.35 + Math.abs(Math.sin(t * 9)) * 0.3 : 0 });
    look(c.alfi, hw, 0.8);
    if (who === 'K') magShot();
    else cshot([0.35, 1.45, 2.6], [-0.45, 1.05, 0.0], L.start, L.end, [0, 0, -0.3]);
    if (L && L.act === 'six') {
      const top = chairWorld(-0.35, 1.55, 0.55);
      let n = 0;
      babyTeeth.forEach((b, i) => {
        const app = smooth(0.58 + i * 0.045, 0.62 + i * 0.045, k); if (app > 0) n = i + 1;
        b.g.visible = app > 0; const off = chairWorld(0.55 + (i - 2.5) * 0.17, 1.38, 0.75); P(b.g, off[0], off[1] + Math.sin(t * 4 + i) * 0.02, off[2]); b.g.scale.setScalar(0.1 * app); b.g.rotation.y = Math.sin(t * 3 + i) * 0.3;
        setFace(b.face, { open: 0.3, blink: blinkAt(t, i) });
      });
      $('counter').style.opacity = n ? 1 : 0; $('counter').textContent = n ? `${n} baby teeth!`.replace('1 baby teeth', '1 baby tooth') : '';
    }
    D.stool.visible = true;
    look(c.mahino, who === 'K' ? headWorld(c.mag) : headWorld(c.alfi), 0.7);
  }
  if (name !== 'alfi') { P(D.stool, -0.85, 0, -0.55); }
  if (['chair', 'xray', 'help'].includes(name) && name !== 'help') look(c.mahino, who === 'K' ? headWorld(c.mag) : camera.position.toArray(), 0.5);
  face(c.mahino, t, 'M', { open: mOpen });
}

function stageTooth(t, span) {
  const name = span.name, L = lineAt(span, t), k = lp(L, t), sk = (t - span.start) / (span.end - span.start);
  const th = T.tooth;
  th.g.visible = true; th.g.position.set(0, 0.75 + Math.abs(Math.sin(t * 2.2)) * 0.06, 0); th.g.rotation.set(0, Math.sin(t * 0.8) * 0.25, 0); th.g.scale.setScalar(1);
  th.hole.visible = false; T.shield.material.opacity = 0; T.drops.forEach(d => d.visible = false); T.germs.forEach(g => g.visible = false); T.plaque.forEach(p => p.visible = false);
  T.bone.visible = false; T.brush.visible = false; T.mini.root.visible = false; sparkT.forEach(s => s.visible = false);
  th.arms[0].rotation.z = -0.5; th.arms[1].rotation.z = 0.5;
  T.bubbles.forEach((b, i) => { const a = i * 2.4; const r = 2.2 + (i % 3) * 0.5; b.position.set(Math.cos(a) * r, 0.4 + ((t * 0.15 + i * 0.37) % 1) * 3.2, Math.sin(a) * r - 1.0); });
  let open = speakingEnv(t, 'N') * 0.6, sad = 0;
  if (name === 'title') {
    shot([0, 1.25, 5.6], [0, 0.85, 0], span.start, span.end, t, [0, 0, -0.6]);
    th.arms[1].rotation.z = 2.4 + Math.sin(t * 7) * 0.4; open = 0.35;
    T.brush.visible = true; P(T.brush, -1.35, 1.0, 0.3); T.brush.rotation.z = 0.4 + Math.sin(t * 3) * 0.08;
    th.g.position.x = 0.25;
  } else if (name === 'enamel') {
    shot([0, 1.3, 4.6], [0, 0.9, 0], span.start, span.end, t, [0, 0, -0.4]);
    if (L.who === 'M') {
      T.drops.forEach((d, i) => { const ph = (t - L.start) * 0.9 - i * 0.18; d.visible = ph > 0 && ph < 1 && k < 0.85; const a = i * 0.8; P(d, Math.cos(a) * 0.9, 3 - ph * 2.2, Math.sin(a) * 0.6 + 0.2); });
      T.shield.material.opacity = smooth(0.2, 0.7, k) * 0.32;
      th.arms[0].rotation.z = -2.2 - Math.sin(t * 5) * 0.15 * smooth(0.5, 0.7, k); th.arms[1].rotation.z = 2.2 + Math.sin(t * 5) * 0.15 * smooth(0.5, 0.7, k);
      open = 0.3;
    } else { th.arms[1].rotation.z = 1.4; open = 0.2; }
    T.mini.root.visible = true; T.mini.reset(); P(T.mini.root, 1.45, 0, 0.6); T.mini.root.rotation.y = -0.6; idle(T.mini, t);
    face(T.mini, t, 'M'); arm(T.mini, 0, { z: 0.6, x: 0.6, e: 0.6 });
  } else if (name === 'plaque') {
    shot([0.3, 1.35, 4.4], [0, 0.85, 0], span.start, span.end, t, [-0.2, 0, -0.3]);
    T.germs.forEach((g, i) => {
      g.visible = k > 0.03 + i * 0.03; const a = i * 1.25 + 0.5; const r = lerp(2.4, 0.95, smooth(0.08, 0.6, k));
      P(g, Math.cos(a + t * 0.4) * r, 0.9 + Math.sin(a * 2 + t * 2) * 0.25 + (i % 2) * 0.35, Math.sin(a + t * 0.4) * r * 0.6 + 0.3); g.rotation.y = -g.position.x * 0.4; g.lookAt(camera.position);
    });
    T.plaque.forEach((p, i) => { p.visible = k > 0.35 + i * 0.03; const a = -0.9 + i * 0.22; P(p, Math.sin(a) * 0.45, -0.05 + Math.cos(i * 1.7) * 0.15, 0.42); });
    th.hole.visible = k > 0.78;
    sad = smooth(0.45, 0.6, k); open = k > 0.78 ? 0.4 : 0;
    th.arms[0].rotation.z = -0.3 - sad * 0.6; th.arms[1].rotation.z = 0.3 + sad * 0.6;
    T.mini.root.visible = true; T.mini.reset(); P(T.mini.root, 1.7, 0, 0.9); T.mini.root.rotation.y = -0.7; idle(T.mini, t); face(T.mini, t, 'M');
    th.g.position.y = 0.75;
  } else if (name === 'touch') {
    shot([0, 1.25, 4.8], [0.3, 0.85, 0], span.start, span.end, t, [0, 0, -0.5]);
    th.arms[1].rotation.z = 2.5; th.arms[0].rotation.z = -2.5 + Math.sin(t * 6) * 0.1; open = Math.max(open, 0.3);
    th.wm.clearcoat = 1;
    sparkleAt(sparkT, [0, 1.2, 0.45], t, span.start + 0.6, 0.6, 0.35);
    if (k > 0.55) {
      T.bone.visible = true; const a = smooth(0.55, 0.65, k); T.bone.scale.setScalar(a); P(T.bone, 1.6, 0.8 + Math.sin(t * 2) * 0.05, 0.2);
      th.g.position.x = -0.5 * a;
    }
  } else if (name.startsWith('quiz') || name === 'end') {
    shot([0, 1.35, 4.8], [0, 1.45, 0], span.start, span.end, t, [0, 0, -0.2]);
    th.g.position.set(0, 0.45 + Math.abs(Math.sin(t * 2.2)) * 0.06, 0); th.g.scale.setScalar(0.62);
    const ans = L && L.a;
    if (ans) { th.arms[1].rotation.z = 2.4 + Math.sin(t * 7) * 0.4; open = 0.4; }
    else { th.arms[1].rotation.z = 2.0; th.arms[0].rotation.z = -0.6; open = 0.1; }
    if (name === 'end') { th.g.position.set(0, 0.6 + Math.abs(Math.sin(t * 4)) * 0.35, 0); th.g.scale.setScalar(0.9); th.arms[0].rotation.z = -2.4; th.arms[1].rotation.z = 2.4; open = 0.5; shot([0, 1.4, 5.4], [0, 1.1, 0], span.start, span.end, t, [0, 0, -0.3]); sparkleAt(sparkT, [0, 1.6, 0.3], t, span.start + 0.2, 1.4, 0.6); }
  }
  setFace(th.face, { open, sad, blink: blinkAt(t, 9), lookX: 0, brow: sad ? 0 : 0.3 });
}

// ---------- overlay ----------
function overlay(t, span) {
  const L = lineAt(span, t);
  const show = (id, on) => { $(id).style.display = on ? '' : 'none'; };
  const name = span.name;
  show('title', name === 'title'); show('end', name === 'end'); show('quiz', name.startsWith('quiz'));
  show('mag', !['title', 'end', 'enamel', 'plaque', 'touch'].includes(name) && !name.startsWith('quiz'));
  show('counter', name === 'alfi');
  if (!(name === 'alfi' && L && L.act === 'six')) $('counter').style.opacity = 0;
  if (name === 'title') { const k = smooth(span.start + 0.1, span.start + 0.8, t); $('title').style.transform = `scale(${0.6 + 0.4 * k})`; $('title').style.opacity = k; }
  if (name === 'end') { const k = smooth(span.start + 0.2, span.start + 0.8, t); $('end').style.transform = `scale(${0.5 + 0.5 * k}) rotate(${Math.sin(t * 3) * 3}deg)`; $('end').style.opacity = k; }
  if (name.startsWith('quiz')) {
    const q = span.lines.find(l => l.q), a = span.lines.find(l => l.a);
    $('quiz').querySelector('.q').textContent = q.text.replace("Let's think! ", '');
    const showA = t >= a.start - 0.1;
    $('quiz').querySelector('.a').style.display = showA ? '' : 'none'; $('quiz').querySelector('.a').textContent = '✔ ' + a.text;
    $('quiz').querySelector('.think').style.display = !showA && t > q.end ? '' : 'none';
    $('quiz').querySelector('.think').textContent = 'Think' + '.'.repeat(1 + Math.floor(Math.max(0, t - q.end) * 2) % 3);
    const k = smooth(span.start, span.start + 0.5, t); $('quiz').style.transform = `translateX(-50%) scale(${0.8 + 0.2 * k})`; $('quiz').style.opacity = k;
  }
  // subtitles
  const subOn = L && !name.startsWith('quiz') && name !== 'title' && name !== 'end' && t < L.end + 1.5;
  show('sub', subOn);
  if (subOn) {
    $('subtext').textContent = L.text;
    $('who').textContent = NAMES[L.who]; $('who').style.background = COLORS[L.who];
    $('subbox').style.borderColor = COLORS[L.who];
  }
  // vocabulary chip
  const v = VOCAB[name]; show('vocab', !!v);
  if (v) { $('vocab').querySelector('b').textContent = v; const k = smooth(span.start + 0.3, span.start + 0.8, t); $('vocab').style.transform = `scale(${k})`; }
  // scene fades
  const fin = 1 - smooth(span.start, span.start + 0.35, t), fout = smooth(span.end - 0.25, span.end, t);
  $('fade').style.opacity = Math.max(span.start === 0 ? 1 - smooth(0, 0.6, t) : fin, fout) * 0.9;
}

function spanAt(t) { for (const s of spans) if (t < s.end) return s; return spans[spans.length - 1]; }
window.renderAt = function (t) {
  const span = spanAt(t);
  let scene;
  if (['title', 'enamel', 'plaque', 'touch', 'quiz1', 'quiz2', 'quiz3', 'end'].includes(span.name)) { scene = ST; stageTooth(t, span); }
  else if (['waiting', 'bye'].includes(span.name)) { scene = SW; stageWaiting(t, span, span.name === 'bye' ? 'bye' : ''); }
  else if (span.name === 'reception') { scene = SW; stageReception(t, span); }
  else if (span.name === 'hala') { scene = SW; stageHala(t, span); }
  else { scene = SD; stageDental(t, span); }
  if (scene !== SD) $('flash').style.opacity = 0;
  overlay(t, span);
  if (ANIME) {
    const L = lineAt(span, t); const sk = (t - span.start) / (span.end - span.start);
    let sl = 0;
    if (span.name === 'xray') sl = sk < 0.14 ? 1 : 0;
    if (span.name === 'plaque' && L) sl = lp(L, t) > 0.78 ? 1 : 0;
    if (span.name === 'fluoride' && L && L.act === 'flavor') { const k = lp(L, t); sl = k > 0.45 && k < 0.65 ? 1 : 0; }
    if (span.name === 'title' || span.name === 'end') sl = 0.55;
    if (span.name === 'alfi' && L && L.act === 'six') { const k = lp(L, t); sl = k > 0.58 && k < 0.85 ? 0.8 : 0; }
    const el = document.getElementById('speed'); el.style.opacity = sl * 0.7; el.style.transform = `rotate(${Math.floor(t * 12) * 7}deg) scale(1.6)`;
    outline.render(scene, camera);
  } else renderer.render(scene, camera);
  return span.name;
};
await document.fonts.ready;
window.READY = true;
