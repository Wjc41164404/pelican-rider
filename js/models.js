import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);
const unitCylinder = new THREE.CylinderGeometry(1, 1, 1, 10);
const unitSphere = new THREE.SphereGeometry(1, 24, 16);
const unitCone = new THREE.ConeGeometry(1, 1, 8);
const unitBox = new THREE.BoxGeometry(1, 1, 1);

const _dir = new THREE.Vector3();
const _mid = new THREE.Vector3();

export function placeTube(mesh, a, b) {
  _dir.subVectors(b, a);
  const len = _dir.length();
  mesh.position.copy(_mid.addVectors(a, b).multiplyScalar(0.5));
  mesh.quaternion.setFromUnitVectors(UP, _dir.normalize());
  mesh.scale.y = len;
}

function tube(a, b, r, mat, parent) {
  const m = new THREE.Mesh(unitCylinder, mat);
  m.scale.set(r, 1, r);
  placeTube(m, a, b);
  m.castShadow = true;
  parent.add(m);
  return m;
}

function ball(sx, sy, sz, x, y, z, mat, parent) {
  const m = new THREE.Mesh(unitSphere, mat);
  m.scale.set(sx, sy, sz);
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}

const v = (x, y, z) => new THREE.Vector3(x, y, z);

export const WHEEL_R = 0.5;
export const BB_POS = v(-0.15, 0.35, 0);
export const CRANK_LEN = 0.14;
export const SADDLE_POS = v(-0.58, 1.24, 0);

export function buildBicycle() {
  const group = new THREE.Group();

  const frameMat = new THREE.MeshStandardMaterial({ color: 0xff6b4a, metalness: 0.55, roughness: 0.32 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0xc8ccd4, metalness: 0.9, roughness: 0.28 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x2a2d34, metalness: 0.3, roughness: 0.7 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x1c1e24, roughness: 0.95 });
  const leatherMat = new THREE.MeshStandardMaterial({ color: 0x6a4a32, roughness: 0.75 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xd8a845, metalness: 0.85, roughness: 0.3 });
  const wickerMat = new THREE.MeshStandardMaterial({ color: 0xb08a5a, roughness: 0.9, side: THREE.DoubleSide });
  const chainMat = new THREE.MeshStandardMaterial({ color: 0x4a4d55, metalness: 0.8, roughness: 0.45 });

  const rearHub = v(-0.95, WHEEL_R, 0);
  const frontHub = v(0.95, WHEEL_R, 0);
  const seatTop = v(-0.55, 1.12, 0);
  const headTop = v(0.60, 1.08, 0);
  const headBot = v(0.70, 0.82, 0);

  // ---- 车轮 ----
  const tireGeo = new THREE.TorusGeometry(WHEEL_R, 0.05, 12, 44);
  const rimGeo = new THREE.TorusGeometry(0.44, 0.018, 8, 40);
  const fenderGeo = new THREE.TorusGeometry(0.565, 0.024, 8, 26, Math.PI * 0.75);
  const reflectorMat = new THREE.MeshStandardMaterial({ color: 0xffb347, emissive: 0xffb347, emissiveIntensity: 1.6 });

  function makeWheel(hub) {
    const wheel = new THREE.Group();
    wheel.position.copy(hub);
    const tire = new THREE.Mesh(tireGeo, tireMat);
    tire.castShadow = true;
    wheel.add(tire);
    wheel.add(new THREE.Mesh(rimGeo, metalMat));
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const z = i % 2 === 0 ? 0.025 : -0.025;
      tube(v(0, 0, z), v(Math.cos(a) * 0.43, Math.sin(a) * 0.43, -z), 0.005, metalMat, wheel);
    }
    tube(v(0, 0, -0.07), v(0, 0, 0.07), 0.028, metalMat, wheel);
    ball(0.02, 0.02, 0.012, 0.30, 0.30, 0.03, reflectorMat, wheel);
    ball(0.02, 0.02, 0.012, -0.30, -0.30, -0.03, reflectorMat, wheel);
    const fender = new THREE.Mesh(fenderGeo, frameMat);
    fender.rotation.z = Math.PI * 0.125;
    fender.position.copy(hub);
    fender.castShadow = true;
    group.add(fender);
    group.add(wheel);
    return wheel;
  }
  const rearWheel = makeWheel(rearHub);
  const frontWheel = makeWheel(frontHub);

  // ---- 车架 ----
  tube(BB_POS, seatTop, 0.034, frameMat, group);
  tube(seatTop, headTop, 0.031, frameMat, group);
  tube(BB_POS, headBot, 0.038, frameMat, group);
  tube(headBot, headTop, 0.04, frameMat, group);
  for (const z of [0.055, -0.055]) {
    tube(v(BB_POS.x, BB_POS.y, z), v(rearHub.x, rearHub.y, z), 0.017, frameMat, group);
    tube(v(seatTop.x, seatTop.y, z * 0.6), v(rearHub.x, rearHub.y, z), 0.013, frameMat, group);
    tube(v(headBot.x, headBot.y, z * 0.9), v(frontHub.x, frontHub.y, z), 0.021, frameMat, group);
  }
  tube(seatTop, v(-0.58, 1.22, 0), 0.019, metalMat, group);
  ball(0.17, 0.05, 0.095, -0.58, 1.245, 0, leatherMat, group);
  ball(0.08, 0.035, 0.05, -0.44, 1.235, 0, leatherMat, group);

  // ---- 车把 ----
  tube(headTop, v(0.52, 1.30, 0), 0.02, metalMat, group);
  tube(v(0.52, 1.30, -0.25), v(0.52, 1.30, 0.25), 0.017, metalMat, group);
  tube(v(0.52, 1.30, -0.27), v(0.52, 1.30, -0.16), 0.026, leatherMat, group);
  tube(v(0.52, 1.30, 0.16), v(0.52, 1.30, 0.27), 0.026, leatherMat, group);

  // ---- 牙盘 / 曲柄 / 脚踏 ----
  const crank = new THREE.Group();
  crank.position.copy(BB_POS);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.014, 8, 28), metalMat);
  ring.position.z = 0.06;
  crank.add(ring);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    tube(v(0, 0, 0.06), v(Math.cos(a) * 0.10, Math.sin(a) * 0.10, 0.06), 0.008, metalMat, crank);
  }
  tube(v(0, 0, -0.09), v(0, 0, 0.09), 0.022, metalMat, crank);
  tube(v(0, 0, 0.09), v(CRANK_LEN, 0, 0.09), 0.02, metalMat, crank);
  tube(v(0, 0, -0.09), v(-CRANK_LEN, 0, -0.09), 0.02, metalMat, crank);
  const pedalGeo = new THREE.BoxGeometry(0.11, 0.025, 0.075);
  const pedalL = new THREE.Mesh(pedalGeo, darkMat);
  pedalL.position.set(CRANK_LEN, 0, 0.115);
  pedalL.castShadow = true;
  const pedalR = new THREE.Mesh(pedalGeo, darkMat);
  pedalR.position.set(-CRANK_LEN, 0, -0.115);
  pedalR.castShadow = true;
  crank.add(pedalL, pedalR);
  group.add(crank);

  const cog = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 8, 20), metalMat);
  cog.position.z = 0.06;
  rearWheel.add(cog);
  tube(v(-0.95, 0.55, 0.06), v(-0.15, 0.46, 0.06), 0.009, chainMat, group);
  tube(v(-0.95, 0.45, 0.06), v(-0.15, 0.24, 0.06), 0.009, chainMat, group);

  // ---- 车铃 ----
  const bell = new THREE.Group();
  bell.position.set(0.50, 1.325, 0.14);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.036, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), brassMat);
  dome.castShadow = true;
  bell.add(dome);
  ball(0.012, 0.008, 0.012, 0, 0.038, 0, brassMat, bell);
  group.add(bell);

  // ---- 车灯 ----
  tube(v(0.62, 1.22, 0), v(0.72, 1.22, 0), 0.045, darkMat, group);
  const lensMat = new THREE.MeshStandardMaterial({ color: 0xffe9b0, emissive: 0xffe9b0, emissiveIntensity: 3 });
  const lens = ball(0.012, 0.038, 0.038, 0.725, 1.22, 0, lensMat, group);
  const headlight = new THREE.SpotLight(0xffe0a0, 30, 20, 0.52, 0.65, 1.6);
  headlight.position.set(0.73, 1.22, 0);
  const lightTarget = new THREE.Object3D();
  lightTarget.position.set(5, 0.1, 0);
  group.add(lightTarget);
  headlight.target = lightTarget;
  group.add(headlight);
  const tailMat = new THREE.MeshStandardMaterial({ color: 0xff3b30, emissive: 0xff3b30, emissiveIntensity: 2.4 });
  const taillight = ball(0.025, 0.02, 0.03, -0.745, 1.09, 0, tailMat, group);
  tube(v(-0.72, 1.12, 0), v(seatTop.x, seatTop.y, 0), 0.008, metalMat, group);

  // ---- 车篮与鱼 ----
  const basket = new THREE.Group();
  basket.position.set(0.82, 1.0, 0);
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.11, 0.17, 12, 1, true), wickerMat);
  wall.position.y = 0.085;
  wall.castShadow = true;
  basket.add(wall);
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.11, 12), wickerMat);
  bottom.rotation.x = -Math.PI / 2;
  basket.add(bottom);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.012, 6, 16), wickerMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.17;
  basket.add(rim);
  tube(v(-0.10, 0.05, 0), v(-0.20, -0.05, 0), 0.01, metalMat, basket);
  const fishMat = new THREE.MeshStandardMaterial({ color: 0x7fb8d8, metalness: 0.65, roughness: 0.35 });
  const fish = new THREE.Group();
  fish.position.set(0, 0.175, 0);
  fish.rotation.z = 0.35;
  ball(0.095, 0.035, 0.03, 0, 0, 0, fishMat, fish);
  const tail = new THREE.Mesh(unitCone, fishMat);
  tail.scale.set(0.045, 0.06, 0.015);
  tail.position.set(-0.115, 0.01, 0);
  tail.rotation.z = Math.PI / 2;
  fish.add(tail);
  ball(0.008, 0.008, 0.008, 0.06, 0.012, 0.026, darkMat, fish);
  basket.add(fish);
  group.add(basket);

  return {
    group, rearWheel, frontWheel, crank, pedalL, pedalR, bell,
    headlight, lens, lensMat, taillight, tailMat, frameMat,
    fish
  };
}

export function buildPelican(frameMat) {
  const group = new THREE.Group();
  group.position.copy(SADDLE_POS).add(v(0, -0.02, 0));

  const creamMat = new THREE.MeshStandardMaterial({ color: 0xf5efe0, roughness: 0.85 });
  const creamDarkMat = new THREE.MeshStandardMaterial({ color: 0xe3d9c2, roughness: 0.9 });
  const beakMat = new THREE.MeshStandardMaterial({ color: 0xff9e2c, roughness: 0.45 });
  const pouchMat = new THREE.MeshStandardMaterial({ color: 0xffb35c, roughness: 0.55, emissive: 0x7a4a10, emissiveIntensity: 0.18 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x14161c, roughness: 0.15 });
  const glintMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.6 });
  const scarfMat = new THREE.MeshStandardMaterial({ color: 0xffd166, roughness: 0.8, side: THREE.DoubleSide });

  const body = ball(0.40, 0.31, 0.28, 0.06, 0.34, 0, creamMat, group);
  body.rotation.z = -0.15;
  ball(0.22, 0.24, 0.21, 0.28, 0.30, 0, creamMat, group);
  const tailFeather = ball(0.20, 0.07, 0.11, -0.30, 0.40, 0, creamDarkMat, group);
  tailFeather.rotation.z = 0.45;
  for (const z of [-0.045, 0.045]) {
    const f = ball(0.13, 0.03, 0.04, -0.42, 0.46, z, creamDarkMat, group);
    f.rotation.z = 0.6;
  }

  const neckCurve = new THREE.CatmullRomCurve3([v(0.30, 0.42, 0), v(0.40, 0.58, 0), v(0.38, 0.74, 0), v(0.44, 0.86, 0)]);
  const neck = new THREE.Mesh(new THREE.TubeGeometry(neckCurve, 12, 0.085, 10), creamMat);
  neck.castShadow = true;
  group.add(neck);

  // ---- 头 ----
  const head = new THREE.Group();
  head.position.set(0.46, 0.92, 0);
  ball(0.155, 0.145, 0.135, 0, 0, 0, creamMat, head);
  for (const s of [1, -1]) {
    ball(0.027, 0.027, 0.027, 0.07, 0.035, s * 0.105, eyeMat, head);
    ball(0.008, 0.008, 0.008, 0.083, 0.048, s * 0.122, glintMat, head);
  }
  ball(0.30, 0.032, 0.052, 0.40, -0.015, 0, beakMat, head);
  const hook = new THREE.Mesh(unitCone, beakMat);
  hook.scale.set(0.018, 0.045, 0.018);
  hook.position.set(0.695, -0.04, 0);
  hook.rotation.z = Math.PI;
  head.add(hook);
  const pouch = ball(0.26, 0.075, 0.062, 0.36, -0.085, 0, pouchMat, head);

  const helmet = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), frameMat);
  helmet.scale.set(0.165, 0.125, 0.15);
  helmet.position.set(0, 0.055, 0);
  helmet.castShadow = true;
  head.add(helmet);
  ball(0.09, 0.014, 0.10, 0.145, 0.062, 0, frameMat, head);
  for (const x of [-0.05, 0, 0.05]) {
    ball(0.018, 0.010, 0.032, x, 0.172, 0, darkVentMat(), head);
  }
  group.add(head);

  function darkVentMat() {
    return new THREE.MeshStandardMaterial({ color: 0x2a2d34, roughness: 0.7 });
  }

  // ---- 翅膀 ----
  function makeWing(side) {
    const wing = new THREE.Group();
    wing.position.set(0.02, 0.40, side * 0.24);
    ball(0.30, 0.13, 0.055, -0.06, 0, side * 0.045, creamMat, wing);
    for (let i = 0; i < 3; i++) {
      const f = ball(0.11, 0.025, 0.035, -0.28 - i * 0.02, -0.02 - i * 0.012, side * (0.03 + i * 0.035), creamDarkMat, wing);
      f.rotation.y = side * 0.2;
    }
    group.add(wing);
    return wing;
  }
  const wingL = makeWing(1);
  const wingR = makeWing(-1);

  // ---- 围巾 ----
  const scarfRing = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.032, 8, 20), scarfMat);
  scarfRing.position.set(0.335, 0.50, 0);
  scarfRing.rotation.x = Math.PI / 2;
  scarfRing.rotation.y = 0.25;
  scarfRing.castShadow = true;
  group.add(scarfRing);
  const ribbons = [];
  for (const s of [1, -1]) {
    const geo = new THREE.PlaneGeometry(0.55, 0.085, 10, 1);
    geo.translate(-0.275, 0, 0);
    const base = geo.attributes.position.array.slice();
    const ribbon = new THREE.Mesh(geo, scarfMat);
    ribbon.position.set(0.30, 0.60, s * 0.07);
    ribbon.castShadow = true;
    group.add(ribbon);
    ribbons.push({ mesh: ribbon, base, phase: s * 1.7 });
  }

  return {
    group, head, wingL, wingR, pouch, ribbons, scarfMat,
    hipL: v(0.16, 0.10, 0.13), hipR: v(0.16, 0.10, -0.13),
    pouchBaseY: 0.075
  };
}

// ---- 双腿 (2  bone IK, 场景坐标系) ----
export function buildLegs(scene) {
  const thighMat = new THREE.MeshStandardMaterial({ color: 0xf5efe0, roughness: 0.85 });
  const shinMat = new THREE.MeshStandardMaterial({ color: 0xff9e2c, roughness: 0.5 });
  const L1 = 0.58, L2 = 0.62;

  function makeLeg() {
    const thigh = new THREE.Mesh(unitCylinder, thighMat);
    thigh.scale.set(0.045, 1, 0.045);
    thigh.castShadow = true;
    const shin = new THREE.Mesh(unitCylinder, shinMat);
    shin.scale.set(0.024, 1, 0.024);
    shin.castShadow = true;
    const foot = new THREE.Group();
    ball(0.11, 0.03, 0.075, 0.02, 0.01, 0, shinMat, foot);
    for (const z of [-0.032, 0, 0.032]) {
      ball(0.05, 0.018, 0.022, 0.115, 0.005, z, shinMat, foot);
    }
    scene.add(thigh, shin, foot);
    return { thigh, shin, foot };
  }
  const legL = makeLeg();
  const legR = makeLeg();

  const _d = new THREE.Vector3();
  const _knee = new THREE.Vector3();
  const _perp = new THREE.Vector3();
  const _ankle = new THREE.Vector3();

  function solve(leg, hip, target) {
    _d.subVectors(target, hip);
    let d = _d.length();
    d = Math.min(Math.max(d, Math.abs(L1 - L2) + 0.01), L1 + L2 - 0.005);
    _d.normalize();
    _ankle.copy(hip).addScaledVector(_d, d);
    const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(L1 * L1 - a * a, 0));
    _perp.set(-_d.y, _d.x, 0);
    if (_perp.x < 0) _perp.negate();
    _knee.copy(hip).addScaledVector(_d, a).addScaledVector(_perp, h);
    placeTube(leg.thigh, hip, _knee);
    placeTube(leg.shin, _knee, _ankle);
    leg.foot.position.copy(_ankle);
    leg.foot.position.y += 0.028;
  }

  return {
    update(hipL, targetL, hipR, targetR) {
      solve(legL, hipL, targetL);
      solve(legR, hipR, targetR);
    }
  };
}