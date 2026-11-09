import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const THEMES = {
  dusk: {
    skyTop: 0x1b2a4a, skyHor: 0xff8c42, skyBot: 0x2b1e3a,
    sun: 0xffb347, sunI: 2.0, sunPos: [-22, 11, -48],
    hemiSky: 0x8a7a9a, hemiGnd: 0x3a2e2a, hemiI: 0.5,
    rim: 0x4ecdc4, rimI: 1.0,
    fog: 0x4a3a5a, ground: 0xc9b18a, ocean: 0x2a4a5a,
    cloud: 0xffd9b0, particle: 0xffd9a0, stars: 0.0, rays: 0.07, envI: 0.5
  },
  night: {
    skyTop: 0x050914, skyHor: 0x12233a, skyBot: 0x04060c,
    sun: 0xcfe8ff, sunI: 0.9, sunPos: [-14, 26, -46],
    hemiSky: 0x24344a, hemiGnd: 0x0c0e14, hemiI: 0.35,
    rim: 0x39d0d8, rimI: 0.9,
    fog: 0x0a1220, ground: 0x3a3a42, ocean: 0x0a1a2a,
    cloud: 0x3a4a6a, particle: 0xa0ffd8, stars: 0.9, rays: 0.0, envI: 0.08
  },
  day: {
    skyTop: 0x2a6ac8, skyHor: 0x9ac8e8, skyBot: 0x8ab8c8,
    sun: 0xfff2d0, sunI: 2.2, sunPos: [-18, 34, -38],
    hemiSky: 0xbcd8ff, hemiGnd: 0x7a8a6a, hemiI: 0.55,
    rim: 0xa0d8ff, rimI: 0.7,
    fog: 0xa8c8e0, ground: 0xd8c49a, ocean: 0x2a7a9a,
    cloud: 0xffffff, particle: 0xfff0d0, stars: 0.0, rays: 0.04, envI: 0.9
  }
};

function makeGlowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function makeRoadTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#262a32';
  ctx.fillRect(0, 0, 512, 64);
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(${180 + Math.random() * 60},${180 + Math.random() * 60},${190 + Math.random() * 60},${Math.random() * 0.07})`;
    ctx.fillRect(Math.random() * 512, Math.random() * 64, 1.5, 1.5);
  }
  ctx.fillStyle = 'rgba(240,244,248,0.75)';
  ctx.fillRect(0, 3, 512, 3);
  ctx.fillRect(0, 58, 512, 3);
  ctx.fillStyle = '#ffb347';
  for (let x = 0; x < 512; x += 44) ctx.fillRect(x, 30, 24, 4);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.repeat.set(16, 1);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeRayTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 256);
  return new THREE.CanvasTexture(c);
}

export function buildWorld(scene, renderer, camera) {
  scene.fog = new THREE.FogExp2(0x4a3a5a, 0.0126);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  // ---- 天空 ----
  const skyUniforms = {
    topColor: { value: new THREE.Color(0x1b2a4a) },
    horColor: { value: new THREE.Color(0xff8c42) },
    botColor: { value: new THREE.Color(0x2b1e3a) },
    sunColor: { value: new THREE.Color(0xffb347) },
    sunDir: { value: new THREE.Vector3(-22, 11, -48).normalize() },
    sunI: { value: 1.2 },
    stars: { value: 0 },
    uTime: { value: 0 }
  };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(90, 32, 16),
    new THREE.ShaderMaterial({
      uniforms: skyUniforms,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        varying vec3 vDir;
        uniform vec3 topColor, horColor, botColor, sunColor, sunDir;
        uniform float sunI, stars, uTime;
        float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }
        void main() {
          vec3 d = normalize(vDir);
          float h = d.y;
          vec3 col = h > 0.0 ? mix(horColor, topColor, pow(h, 0.55)) : mix(horColor, botColor, pow(-h, 0.6));
          float s = max(dot(d, sunDir), 0.0);
          col += sunColor * (pow(s, 700.0) * 1.6 + pow(s, 24.0) * 0.30) * sunI;
          if (stars > 0.001 && h > 0.03) {
            vec3 cell = floor(d * 160.0);
            vec3 f = fract(d * 160.0) - 0.5;
            float r = hash(cell);
            float tw = 0.6 + 0.4 * sin(uTime * 2.0 + r * 40.0);
            float dot_ = smoothstep(0.997, 1.0, r) * smoothstep(0.22, 0.04, length(f));
            col += vec3(0.9, 0.95, 1.0) * dot_ * stars * tw * smoothstep(0.03, 0.2, h);
          }
          gl_FragColor = vec4(col, 1.0);
        }`
    })
  );
  scene.add(sky);

  // ---- 灯光 ----
  const hemi = new THREE.HemisphereLight(0x8a7a9a, 0x3a2e2a, 0.55);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffb347, 2.4);
  sun.position.set(-22, 11, -48);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -12; sun.shadow.camera.right = 12;
  sun.shadow.camera.top = 12; sun.shadow.camera.bottom = -12;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 120;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);
  const rim = new THREE.DirectionalLight(0x4ecdc4, 1.1);
  rim.position.set(14, 9, 18);
  scene.add(rim);

  // ---- 太阳光晕 ----
  const glowTex = makeGlowTexture();
  const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, color: 0xffb347, blending: THREE.AdditiveBlending,
    transparent: true, opacity: 0.85, depthWrite: false, fog: false
  }));
  sunSprite.scale.set(9, 9, 1);
  sunSprite.material.opacity = 0.55;
  scene.add(sunSprite);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, color: 0xff8c42, blending: THREE.AdditiveBlending,
    transparent: true, opacity: 0.22, depthWrite: false, fog: false
  }));
  halo.scale.set(22, 22, 1);
  halo.material.opacity = 0.12;
  scene.add(halo);

  // ---- 地面 / 公路 / 海 ----
  const groundMat = new THREE.MeshStandardMaterial({ color: 0xc9b18a, roughness: 0.95 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(240, 126), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, 57);
  ground.receiveShadow = true;
  scene.add(ground);

  const roadTex = makeRoadTexture();
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(240, 3.4),
    new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.9 })
  );
  road.rotation.x = -Math.PI / 2;
  road.position.y = 0.02;
  road.receiveShadow = true;
  scene.add(road);

  const oceanMat = new THREE.MeshStandardMaterial({ color: 0x2a4a5a, metalness: 0.55, roughness: 0.42, envMapIntensity: 0.5 });
  const oceanGeo = new THREE.PlaneGeometry(240, 72, 48, 12);
  oceanGeo.rotateX(-Math.PI / 2);
  const oceanBase = oceanGeo.attributes.position.array.slice();
  const ocean = new THREE.Mesh(oceanGeo, oceanMat);
  ocean.position.set(0, -0.04, -42);
  scene.add(ocean);
  const foam = new THREE.Mesh(
    new THREE.PlaneGeometry(240, 1.4),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, depthWrite: false })
  );
  foam.rotation.x = -Math.PI / 2;
  foam.position.set(0, 0.015, -6.4);
  scene.add(foam);

  // ---- 远山 ----
  const mountainMat = new THREE.MeshBasicMaterial({ color: 0x2a2438 });
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(new THREE.ConeGeometry(11 + Math.random() * 9, 8 + Math.random() * 7, 5), mountainMat);
    m.position.set(-55 + i * 20 + Math.random() * 6, 0, -58 - Math.random() * 10);
    scene.add(m);
  }

  // ---- 棕榈树 ----
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 0.9 });
  const frondMat = new THREE.MeshStandardMaterial({ color: 0x4a9a5a, roughness: 0.8, side: THREE.DoubleSide, emissive: 0x1a3a2a, emissiveIntensity: 0.35 });
  const cocoMat = new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.8 });
  const palmTemplate = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.075 - i * 0.008, 0.085 - i * 0.008, 0.52, 7), trunkMat);
    seg.position.set(0.05 * i * i * 0.3, 0.26 + i * 0.5, 0);
    seg.rotation.z = -0.06 * i;
    seg.castShadow = true;
    palmTemplate.add(seg);
  }
  const frondGeo = new THREE.PlaneGeometry(1.5, 0.5, 6, 1);
  frondGeo.translate(0.75, 0, 0);
  {
    const pos = frondGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      pos.setY(i, pos.getY(i) * (1 - x * 0.35) - x * x * 0.2);
    }
    frondGeo.computeVertexNormals();
  }
  for (let i = 0; i < 7; i++) {
    const f = new THREE.Mesh(frondGeo, frondMat);
    f.position.set(0.18, 2.06, 0);
    f.rotation.order = 'YXZ';
    f.rotation.y = (i / 7) * Math.PI * 2;
    f.rotation.x = -1.05;
    palmTemplate.add(f);
  }
  const cocoGeo = new THREE.SphereGeometry(0.07, 8, 6);
  for (const [x, z] of [[0.12, 0.06], [0.22, -0.05], [0.1, -0.09]]) {
    const c = new THREE.Mesh(cocoGeo, cocoMat);
    c.position.set(x, 1.98, z);
    palmTemplate.add(c);
  }

  const movers = [];
  for (let i = 0; i < 12; i++) {
    const p = palmTemplate.clone();
    const fadeMats = [];
    const matCache = new Map();
    p.traverse((o) => {
      if (!o.isMesh) return;
      let mm = matCache.get(o.material);
      if (!mm) { mm = o.material.clone(); mm.transparent = true; matCache.set(o.material, mm); fadeMats.push(mm); }
      o.material = mm;
    });
    p.userData.fadeMats = fadeMats;
    const side = i % 2 === 0 ? 1 : -1;
    p.position.set(-70 + Math.random() * 140, 0, side > 0 ? 7.5 + Math.random() * 7 : -(3.6 + Math.random() * 2.0));
    const s = 0.9 + Math.random() * 0.8;
    p.scale.set(s, s, s);
    p.rotation.y = Math.random() * Math.PI * 2;
    scene.add(p);
    movers.push(p);
  }
  const bushGeo = new THREE.IcosahedronGeometry(0.4, 0);
  const bushMat = new THREE.MeshStandardMaterial({ color: 0x4a6a3a, roughness: 1 });
  const rockGeo = new THREE.DodecahedronGeometry(0.3, 0);
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x8a8578, roughness: 1 });
  for (let i = 0; i < 14; i++) {
    const isBush = i % 2 === 0;
    const fm = (isBush ? bushMat : rockMat).clone();
    fm.transparent = true;
    const m = new THREE.Mesh(isBush ? bushGeo : rockGeo, fm);
    m.userData.fadeMats = [fm];
    const side = i % 4 < 2 ? 1 : -1;
    m.position.set(-70 + Math.random() * 140, isBush ? 0.18 : 0.1, side > 0 ? 6.5 + Math.random() * 6 : -(3.0 + Math.random() * 2.5));
    const s = 0.5 + Math.random() * 0.9;
    m.scale.set(s * (0.8 + Math.random() * 0.6), s * 0.7, s);
    m.rotation.y = Math.random() * Math.PI;
    m.castShadow = true;
    scene.add(m);
    movers.push(m);
  }

  // ---- 云 ----
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffd9b0, roughness: 1, transparent: true, opacity: 0.88, emissive: 0xffd9b0, emissiveIntensity: 0.12 });
  const clouds = [];
  const cloudGeo = new THREE.SphereGeometry(1, 12, 8);
  for (let i = 0; i < 7; i++) {
    const cl = new THREE.Group();
    for (let j = 0; j < 3; j++) {
      const b = new THREE.Mesh(cloudGeo, cloudMat);
      b.position.set(j * 1.6 - 1.6, Math.random() * 0.4, Math.random() * 0.8);
      b.scale.set(1.4 + Math.random(), 0.5 + Math.random() * 0.25, 0.9 + Math.random() * 0.5);
      cl.add(b);
    }
    cl.position.set(-70 + Math.random() * 140, 10 + Math.random() * 8, -20 - Math.random() * 30);
    scene.add(cl);
    clouds.push(cl);
  }

  // ---- 体积光(近似) ----
  const rayTex = makeRayTexture();
  const rayMat = new THREE.MeshBasicMaterial({
    map: rayTex, color: 0xffc890, transparent: true, opacity: 0.09,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false
  });
  const rays = [];
  for (let i = 0; i < 3; i++) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(5 + i * 2, 34), rayMat);
    r.position.set(-14 - i * 7, 12, -22 - i * 4);
    r.rotation.z = -0.42;
    r.rotation.y = 0.35;
    scene.add(r);
    rays.push(r);
  }

  // ---- 漂浮微粒 ----
  const MAX_PARTICLES = 600;
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(MAX_PARTICLES * 3);
  const pSeed = new Float32Array(MAX_PARTICLES);
  for (let i = 0; i < MAX_PARTICLES; i++) {
    pPos[i * 3] = -30 + Math.random() * 60;
    pPos[i * 3 + 1] = 0.2 + Math.random() * 7;
    pPos[i * 3 + 2] = -16 + Math.random() * 32;
    pSeed[i] = Math.random() * 100;
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const pMat = new THREE.PointsMaterial({
    size: 0.06, map: glowTex, color: 0xffd9a0, transparent: true, opacity: 0.7,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
  });
  const particles = new THREE.Points(pGeo, pMat);
  particles.frustumCulled = false;
  scene.add(particles);
  pGeo.setDrawRange(0, 320);

  // ---- 主题渐变 ----
  const cur = {
    skyTop: new THREE.Color(0x1b2a4a), skyHor: new THREE.Color(0xff8c42), skyBot: new THREE.Color(0x2b1e3a),
    sun: new THREE.Color(0xffb347), hemiSky: new THREE.Color(0x8a7a9a), hemiGnd: new THREE.Color(0x3a2e2a),
    rim: new THREE.Color(0x4ecdc4), fog: new THREE.Color(0x4a3a5a), ground: new THREE.Color(0xc9b18a),
    ocean: new THREE.Color(0x2a4a5a), cloud: new THREE.Color(0xffd9b0), particle: new THREE.Color(0xffd9a0),
    sunI: 2.0, hemiI: 0.5, rimI: 1.0, stars: 0, rays: 0.07, envI: 0.5,
    sunPos: new THREE.Vector3(-22, 11, -48)
  };
  let target = THEMES.dusk;
  let userSun = 1;
  const _c = new THREE.Color();
  const _v = new THREE.Vector3();

  function lerpTheme(dt) {
    const k = 1 - Math.exp(-dt * 2.6);
    for (const key of ['skyTop', 'skyHor', 'skyBot', 'sun', 'hemiSky', 'hemiGnd', 'rim', 'fog', 'ground', 'ocean', 'cloud', 'particle']) {
      cur[key].lerp(_c.setHex(target[key]), k);
    }
    for (const key of ['sunI', 'hemiI', 'rimI', 'stars', 'rays', 'envI']) {
      cur[key] += (target[key] - cur[key]) * k;
    }
    cur.sunPos.lerp(_v.set(...target.sunPos), k);

    skyUniforms.topColor.value.copy(cur.skyTop);
    skyUniforms.horColor.value.copy(cur.skyHor);
    skyUniforms.botColor.value.copy(cur.skyBot);
    skyUniforms.sunColor.value.copy(cur.sun);
    skyUniforms.sunDir.value.copy(cur.sunPos).normalize();
    skyUniforms.sunI.value = cur.sunI * userSun * 0.55;
    skyUniforms.stars.value = cur.stars;
    sun.color.copy(cur.sun);
    sun.intensity = cur.sunI * userSun;
    sun.position.copy(cur.sunPos);
    hemi.color.copy(cur.hemiSky);
    hemi.groundColor.copy(cur.hemiGnd);
    hemi.intensity = cur.hemiI * (0.5 + userSun * 0.5);
    rim.color.copy(cur.rim);
    rim.intensity = cur.rimI;
    scene.fog.color.copy(cur.fog);
    groundMat.color.copy(cur.ground);
    oceanMat.color.copy(cur.ocean);
    oceanMat.envMapIntensity = cur.envI;
    mountainMat.color.copy(cur.fog).multiplyScalar(0.55);
    cloudMat.color.copy(cur.cloud);
    cloudMat.emissive.copy(cur.cloud);
    pMat.color.copy(cur.particle);
    sunSprite.material.color.copy(cur.sun);
    sunSprite.position.copy(cur.sunPos).normalize().multiplyScalar(78);
    halo.material.color.copy(cur.skyHor);
    halo.position.copy(sunSprite.position);
    rayMat.opacity = cur.rays * (0.85 + 0.15 * Math.sin(perfTime * 0.7));
    rayMat.color.copy(cur.sun);
  }

  let perfTime = 0;

  return {
    sunLight: sun,
    setTheme(name) { target = THEMES[name] || THEMES.dusk; },
    setSunIntensity(x) { userSun = x; },
    setFog(d) { scene.fog.density = d; },
    setParticleCount(n) { pGeo.setDrawRange(0, Math.min(n, MAX_PARTICLES)); },

    update(dt, t, speed, rawDt) {
      perfTime = t;
      lerpTheme(rawDt || dt);
      skyUniforms.uTime.value = t;

      const v = speed * 6;
      roadTex.offset.x -= (v * dt) / 15;
      const camX = camera.position.x, camZ = camera.position.z;
      const camDepth = Math.hypot(camX, camZ) || 0.001;
      const fadeEnd = camDepth - 3.0, fadeSpan = 3.5;
      const dirX = -camX / camDepth, dirZ = -camZ / camDepth;
      for (const m of movers) {
        m.position.x -= v * dt;
        if (m.position.x < -75) m.position.x += 150;
        const md = Math.hypot(m.position.x - camX, m.position.z - camZ);
        let f = (md - fadeEnd) / fadeSpan;
        f = f < 0 ? 0 : f > 1 ? 1 : f;
        const along = m.position.x * dirX + m.position.z * dirZ;
        if (along > 0) {
          const perp = Math.hypot(m.position.x - dirX * along, m.position.z - dirZ * along);
          let c = (perp - 1.6) / 1.6;
          c = c < 0 ? 0 : c > 1 ? 1 : c;
          if (c < f) f = c;
        }
        m.visible = f > 0.02;
        if (m.visible) for (const mat of m.userData.fadeMats) mat.opacity = f;
      }
      for (const cl of clouds) {
        cl.position.x -= (0.35 + v * 0.12) * dt;
        if (cl.position.x < -75) cl.position.x += 150;
      }

      const op = oceanGeo.attributes.position;
      for (let i = 0; i < op.count; i++) {
        const bx = oceanBase[i * 3], bz = oceanBase[i * 3 + 2];
        op.setY(i, Math.sin(bx * 0.25 + t * 1.1) * 0.05 + Math.cos(bz * 0.35 + t * 0.8) * 0.04);
      }
      op.needsUpdate = true;
      foam.material.opacity = 0.16 + 0.08 * Math.sin(t * 1.4);

      const pp = pGeo.attributes.position;
      const count = Math.min(pGeo.drawRange.count, MAX_PARTICLES);
      for (let i = 0; i < count; i++) {
        let x = pp.getX(i) - (1.2 + v * 0.9) * dt;
        if (x < -30) x += 60;
        pp.setX(i, x);
        pp.setY(i, pp.getY(i) + Math.sin(t * 1.6 + pSeed[i]) * 0.004);
      }
      pp.needsUpdate = true;
    }
  };
}