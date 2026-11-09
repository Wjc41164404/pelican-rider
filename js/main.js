import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildBicycle, buildPelican, buildLegs, WHEEL_R, BB_POS, CRANK_LEN, SADDLE_POS } from './models.js';
import { buildWorld } from './world.js';
import { RiderAudio } from './audio.js';

const $ = (id) => document.getElementById(id);

const DEFAULTS = {
  speed: 1, flap: 1, theme: 'dusk', sun: 1, bloom: 0.45, fog: 0.0126,
  particles: 320, frameColor: '#ff6b4a', scarfColor: '#ffd166',
  headlight: true, wireframe: false, autorotate: true,
  paused: false, sound: true
};
let state = { ...DEFAULTS };

// ---------- 渲染器 ----------
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
} catch (e) {
  $('loader').style.display = 'none';
  $('webglError').hidden = false;
  throw e;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
$('stage').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 300);
camera.position.set(4.6, 2.4, 6.2);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.25, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 1.2;
controls.maxDistance = 20;
controls.maxPolarAngle = 1.53;
controls.autoRotateSpeed = 0.7;

const world = buildWorld(scene, renderer);
const bike = buildBicycle();
scene.add(bike.group);
const pelican = buildPelican(bike.frameMat);
scene.add(pelican.group);
const legs = buildLegs(scene);

const modelMats = new Set();
for (const root of [bike.group, pelican.group]) {
  root.traverse((o) => { if (o.isMesh) modelMats.add(o.material); });
}
scene.traverse((o) => {
  if (o.isMesh && o.material.isMeshStandardMaterial) o.material.envMapIntensity = 0.4;
});
bike.frameMat.envMapIntensity = 0.65;

// ---------- 后期 ----------
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight), 0.45, 0.4, 1.0
);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

// ---------- 音频 ----------
const audio = new RiderAudio();
window.addEventListener('pointerdown', () => audio.ensure(), { once: true });

// ---------- 相机机位 ----------
const CAMS = {
  orbit: { pos: [4.6, 2.4, 6.2], tg: [0, 1.25, 0] },
  close: { pos: [1.5, 2.2, 1.9], tg: [-0.1, 2.0, 0] },
  low: { pos: [3.4, 0.55, 3.8], tg: [0, 1.15, 0] },
  top: { pos: [0.8, 8.5, 2.6], tg: [0, 0.9, 0] }
};
let camTween = null;
function setCam(name) {
  const c = CAMS[name];
  camTween = {
    t: 0, dur: 1.2,
    fromPos: camera.position.clone(), toPos: new THREE.Vector3(...c.pos),
    fromTg: controls.target.clone(), toTg: new THREE.Vector3(...c.tg)
  };
  document.querySelectorAll('.cam-btn').forEach((b) => b.classList.toggle('active', b.dataset.cam === name));
}
controls.addEventListener('start', () => { camTween = null; });
document.querySelectorAll('.cam-btn').forEach((b) => b.addEventListener('click', () => setCam(b.dataset.cam)));

// ---------- 状态应用 ----------
function effSpeed() { return state.paused ? 0 : state.speed; }

function applyState() {
  world.setTheme(state.theme);
  world.setSunIntensity(state.sun);
  world.setFog(state.fog);
  world.setParticleCount(state.particles);
  bloomPass.strength = state.bloom;
  bike.frameMat.color.set(state.frameColor);
  pelican.scarfMat.color.set(state.scarfColor);
  bike.headlight.visible = state.headlight;
  bike.lensMat.emissiveIntensity = state.headlight ? 3 : 0.12;
  bike.tailMat.emissiveIntensity = state.headlight ? 2.4 : 0.3;
  for (const m of modelMats) m.wireframe = state.wireframe;
  audio.setEnabled(state.sound);
  audio.setSpeed(effSpeed());
  $('soundBtn').setAttribute('aria-pressed', String(state.sound));
  $('soundLabel').textContent = state.sound ? '音效开' : '音效关';
  $('pauseBtn').setAttribute('aria-pressed', String(state.paused));
  $('pauseLabel').textContent = state.paused ? '继续' : '暂停';
}

const fmt = {
  speed: (v) => v.toFixed(2) + '×',
  flap: (v) => v.toFixed(2) + '×',
  sun: (v) => v.toFixed(2) + '×',
  bloom: (v) => Math.round((v / 1.6) * 100) + '%',
  fog: (v) => Math.round((v / 0.045) * 100) + '%',
  particles: (v) => String(Math.round(v))
};

function syncUI() {
  for (const key of Object.keys(fmt)) {
    $(key).value = state[key];
    $(key + 'Val').textContent = fmt[key](state[key]);
  }
  $('theme').value = state.theme;
  $('frameColor').value = state.frameColor;
  $('scarfColor').value = state.scarfColor;
  $('headlight').checked = state.headlight;
  $('wireframe').checked = state.wireframe;
  $('autorotate').checked = state.autorotate;
}

for (const key of Object.keys(fmt)) {
  $(key).addEventListener('input', (e) => {
    state[key] = parseFloat(e.target.value);
    $(key + 'Val').textContent = fmt[key](state[key]);
    applyState();
  });
}
$('theme').addEventListener('change', (e) => { state.theme = e.target.value; applyState(); });
$('frameColor').addEventListener('input', (e) => { state.frameColor = e.target.value; applyState(); });
$('scarfColor').addEventListener('input', (e) => { state.scarfColor = e.target.value; applyState(); });
for (const key of ['headlight', 'wireframe', 'autorotate']) {
  $(key).addEventListener('change', (e) => { state[key] = e.target.checked; applyState(); });
}

// ---------- 按钮 ----------
let toastTimer = null;
function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

let bellPulse = 0, bellTurn = 0;
function ringBell() {
  audio.ensure();
  audio.bell();
  bellPulse = 1;
  bellTurn = 1;
  const btn = $('bellBtn');
  btn.classList.remove('ringing');
  void btn.offsetWidth;
  btn.classList.add('ringing');
}
$('bellBtn').addEventListener('click', ringBell);

function togglePause() {
  state.paused = !state.paused;
  applyState();
}
$('pauseBtn').addEventListener('click', togglePause);

$('soundBtn').addEventListener('click', () => {
  state.sound = !state.sound;
  audio.ensure();
  applyState();
});

$('resetBtn').addEventListener('click', () => {
  state = { ...DEFAULTS };
  applyState();
  syncUI();
  setCam('orbit');
  toast('已重置为默认状态');
});

$('randomBtn').addEventListener('click', () => {
  const rnd = new THREE.Color();
  state.theme = ['dusk', 'night', 'day'][Math.floor(Math.random() * 3)];
  state.speed = THREE.MathUtils.randFloat(0.4, 1.8);
  state.flap = THREE.MathUtils.randFloat(0.5, 1.8);
  state.sun = THREE.MathUtils.randFloat(0.7, 1.6);
  state.bloom = THREE.MathUtils.randFloat(0.3, 1.2);
  state.fog = THREE.MathUtils.randFloat(0.004, 0.03);
  state.particles = Math.round(THREE.MathUtils.randFloat(150, 550) / 10) * 10;
  state.frameColor = '#' + rnd.setHSL(Math.random(), 0.68, 0.55).getHexString();
  state.scarfColor = '#' + rnd.setHSL((rnd.getHSL({}).h + 0.5) % 1, 0.75, 0.62).getHexString();
  applyState();
  syncUI();
  toast('随机灵感已注入');
});

$('exportBtn').addEventListener('click', () => {
  composer.render();
  renderer.domElement.toBlob((blob) => {
    if (!blob) { toast('导出失败,请重试'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `pelican-rider-${Date.now()}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast('已导出当前画面 PNG');
  }, 'image/png');
});

window.addEventListener('keydown', (e) => {
  if (e.target.closest('input, select, textarea, button')) return;
  if (e.code === 'Space') { e.preventDefault(); togglePause(); }
  else if (e.code === 'KeyB') ringBell();
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- 动画循环 ----------
const clock = new THREE.Clock();
let simTime = 0;
let crankAngle = 0;
let lastTickHalf = 0;
let distance = 0;
let frames = 0, fpsWindowStart = performance.now(), fps = 60;
let statWindowStart = performance.now();
let loaderHidden = false;

const _hipL = new THREE.Vector3(), _hipR = new THREE.Vector3();
const _footL = new THREE.Vector3(), _footR = new THREE.Vector3();
const pelicanBaseY = SADDLE_POS.y - 0.02;

function easeInOutCubic(x) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function animate() {
  requestAnimationFrame(animate);
  const rawDt = clock.getDelta();
  const dt = Math.min(rawDt, 0.05);
  const sp = effSpeed();
  const v = sp * 6;

  if (!state.paused) {
    simTime += dt;
    distance += v * dt;
    crankAngle += sp * 4.2 * dt;

    const wheelW = (v / WHEEL_R) * dt;
    bike.rearWheel.rotation.z -= wheelW;
    bike.frontWheel.rotation.z -= wheelW;
    bike.crank.rotation.z = -crankAngle;
    bike.pedalL.rotation.z = crankAngle;
    bike.pedalR.rotation.z = crankAngle;

    const half = Math.floor(crankAngle / Math.PI);
    if (half !== lastTickHalf) {
      lastTickHalf = half;
      if (sp > 0.05) audio.chainTick();
    }

    // 鹈鹕姿态
    const t = simTime;
    pelican.group.position.y = pelicanBaseY + Math.sin(crankAngle * 2) * 0.02 * Math.min(sp, 1) + Math.sin(t * 1.8) * 0.008;
    pelican.head.rotation.y = Math.sin(t * 0.45) * 0.22 + bellTurn * 0.6;
    pelican.head.rotation.z = Math.sin(t * 0.7) * 0.05 - 0.03;
    const flapAmp = state.flap * (0.10 + Math.min(sp, 1.5) * 0.12);
    const flapW = Math.sin(t * (2.2 + sp * 3.5));
    pelican.wingL.rotation.x = -(0.1 + flapAmp * flapW);
    pelican.wingR.rotation.x = 0.1 + flapAmp * flapW;
    pelican.pouch.scale.y = pelican.pouchBaseY * (1 + 0.16 * Math.sin(t * 5.5) * Math.min(sp + 0.3, 1.2));
    bike.fish.rotation.z = 0.35 + Math.sin(t * 7) * 0.05 * sp;

    for (const r of pelican.ribbons) {
      const pos = r.mesh.geometry.attributes.position;
      const wave = t * (5 + sp * 4) + r.phase;
      for (let i = 0; i < pos.count; i++) {
        const bx = r.base[i * 3], by = r.base[i * 3 + 1];
        const k = -bx / 0.55;
        pos.setY(i, by + Math.sin(bx * 5 - wave) * 0.06 * k * (0.4 + sp * 0.6) + k * 0.12);
        pos.setZ(i, Math.cos(bx * 4 - wave * 0.8) * 0.05 * k * (0.4 + sp * 0.6));
      }
      pos.needsUpdate = true;
      r.mesh.geometry.computeVertexNormals();
    }

    // 腿部 IK 跟随脚踏
    const ca = crankAngle;
    _footL.set(BB_POS.x + CRANK_LEN * Math.cos(ca) - 0.02, BB_POS.y - CRANK_LEN * Math.sin(ca) + 0.02, 0.115);
    _footR.set(BB_POS.x - CRANK_LEN * Math.cos(ca) - 0.02, BB_POS.y + CRANK_LEN * Math.sin(ca) + 0.02, -0.115);
    _hipL.copy(pelican.hipL).add(pelican.group.position);
    _hipR.copy(pelican.hipR).add(pelican.group.position);
    legs.update(_hipL, _footL, _hipR, _footR);

    bellPulse *= Math.exp(-rawDt * 5);
    bellTurn *= Math.exp(-rawDt * 2.2);
    bike.bell.scale.setScalar(1 + bellPulse * 0.35);
  }
  world.update(dt, simTime, sp, rawDt);

  if (camTween) {
    camTween.t += rawDt / camTween.dur;
    const k = easeInOutCubic(Math.min(camTween.t, 1));
    camera.position.lerpVectors(camTween.fromPos, camTween.toPos, k);
    controls.target.lerpVectors(camTween.fromTg, camTween.toTg, k);
    if (camTween.t >= 1) camTween = null;
  }
  controls.autoRotate = state.autorotate && !camTween && !state.paused;
  controls.update();
  composer.render();

  if (!loaderHidden) {
    loaderHidden = true;
    $('loader').classList.add('done');
    setTimeout(() => $('loader').remove(), 900);
  }

  frames++;
  const now = performance.now();
  if (now - fpsWindowStart >= 500) {
    fps = Math.round((frames * 1000) / (now - fpsWindowStart));
    frames = 0;
    fpsWindowStart = now;
  }
  if (now - statWindowStart >= 300) {
    statWindowStart = now;
    $('statSpeed').textContent = (sp * 24).toFixed(1);
    $('statDist').textContent = Math.round(distance).toLocaleString();
    $('statFps').textContent = fps;
  }
}

syncUI();
applyState();
animate();