// Pamja 3D e kompjuterit te "Kompleto PC".
// Çdo pjesë (procesori, RAM, kartë grafike…) montohet me animacion kur zgjidhet një ofertë,
// shfaqet si hologram ndërkohë që kërkohet, dhe kur vendoset furnizuesi (PSU) PC-ja "ndizet" (RGB + ventilatorët).
import * as THREE from './vendor/three.module.min.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';
import { EffectComposer } from './vendor/EffectComposer.js';
import { RenderPass } from './vendor/RenderPass.js';
import { UnrealBloomPass } from './vendor/UnrealBloomPass.js';
import { OutputPass } from './vendor/OutputPass.js';

const SLOT_NAMES = { cpu: 'Procesori', mobo: 'Pllaka amë', ram: 'RAM', gpu: 'Kartë grafike', ssd: 'SSD', psu: 'Furnizuesi', case: 'Kutia', cooler: 'Ftohja' };
const ORDER = ['case', 'mobo', 'cpu', 'cooler', 'ram', 'ssd', 'gpu', 'psu'];
const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const stage = document.getElementById('pcStage');
const canvas = document.getElementById('pcCanvas');

function webglOk() {
  try { const c = document.createElement('canvas'); return !!(window.WebGL2RenderingContext && c.getContext('webgl2')); } catch (e) { return false; }
}

if (!stage || !canvas) {
  // asgjë për të bërë
} else if (!webglOk()) {
  document.getElementById('stageFallback').hidden = false;
  canvas.hidden = true;
  window.PC3D = { set() {}, setLoading() {}, sync() {} };
  window.dispatchEvent(new Event('pc3d-ready'));
} else {
  init();
}

function canvasTexEarly(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  return new THREE.CanvasTexture(c);
}

function init() {
  const clock = new THREE.Clock();
  // ---------------- Renderer, skena, kamera ----------------
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#070B14');
  scene.fog = new THREE.Fog('#070B14', 16, 30);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.4;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  const HOME_TARGET = new THREE.Vector3(0.1, 0.1, 0);
  camera.position.set(3.4, 2.3, 11.2);

  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(HOME_TARGET);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 6.5;
  controls.maxDistance = 16;
  controls.minPolarAngle = 0.55;
  controls.maxPolarAngle = 1.75;
  controls.minAzimuthAngle = -1.15;
  controls.maxAzimuthAngle = 1.15;
  let lastInteract = -10;
  controls.addEventListener('start', () => { lastInteract = clock.elapsedTime; stage.classList.add('grabbing'); });
  controls.addEventListener('end', () => { lastInteract = clock.elapsedTime; stage.classList.remove('grabbing'); });

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.6, 0.38, 0.9);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // ---------------- Dritat ----------------
  scene.add(new THREE.HemisphereLight('#9DB4FF', '#0B0F1A', 0.35));
  const key = new THREE.DirectionalLight('#FFFFFF', 2.2);
  key.position.set(4, 8, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -5; key.shadow.camera.right = 5; key.shadow.camera.top = 5; key.shadow.camera.bottom = -5;
  key.shadow.bias = -0.0005;
  key.shadow.radius = 4;
  scene.add(key);
  const rim = new THREE.DirectionalLight('#3B5BFF', 2.4);
  rim.position.set(-6, 3, -6);
  scene.add(rim);
  // dritë kontur vjollcë nga mbrapa-lart (jo mbi dysheme, që të mos krijojë njollë)
  const fill = new THREE.SpotLight('#8B5CF6', 60, 18, 0.6, 0.8, 2);
  fill.position.set(-5, 5, -4);
  fill.target.position.set(0, 0, 0);
  scene.add(fill.target);
  scene.add(fill);
  // spot-dritë nga para-lart që ndriçon brendinë përmes xhamit (pa pika të nxehta pranë sipërfaqeve)
  const showcase = new THREE.SpotLight('#E8EEFF', 40, 20, 0.42, 0.75, 2);
  showcase.position.set(2.5, 5.5, 7);
  showcase.target.position.set(-0.4, 0.3, -0.8);
  scene.add(showcase, showcase.target);
  // drita RGB në qendër të kutisë (larg mureve) — ndizet bashkë me PC-në
  const inner = new THREE.PointLight('#5B8CFF', 0, 9, 2);
  inner.position.set(-0.5, 0.8, -2.6);
  scene.add(inner);
  const flash = new THREE.PointLight('#9EE7FF', 0, 5, 2);
  scene.add(flash);

  // dysheme me reflektim të butë dhe hije
  // dysheme e errët që zbehet drejt skajeve (pa vijë horizonti)
  const fade = canvasTexEarly(256, 256, (g, w, h) => {
    const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    r.addColorStop(0, '#fff'); r.addColorStop(0.45, '#bbb'); r.addColorStop(1, '#000');
    g.fillStyle = r; g.fillRect(0, 0, w, h);
  });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(9, 64), new THREE.MeshStandardMaterial({ color: '#0A0F1A', roughness: 0.55, metalness: 0.4, alphaMap: fade, transparent: true, envMapIntensity: 0.3 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -2.5;
  floor.receiveShadow = true;
  scene.add(floor);
  const glowRing = new THREE.Mesh(new THREE.RingGeometry(3.2, 3.32, 96), new THREE.MeshBasicMaterial({ color: '#2346D8', transparent: true, opacity: 0.55 }));
  glowRing.rotation.x = -Math.PI / 2;
  glowRing.position.y = -2.49;
  scene.add(glowRing);

  // ---------------- Materialet ----------------
  const M = {
    chassis: new THREE.MeshStandardMaterial({ color: '#141A24', metalness: 0.75, roughness: 0.38 }),
    chassisIn: new THREE.MeshStandardMaterial({ color: '#0E131C', metalness: 0.5, roughness: 0.6 }),
    plastic: new THREE.MeshStandardMaterial({ color: '#1A1F29', metalness: 0.2, roughness: 0.55 }),
    darkMetal: new THREE.MeshStandardMaterial({ color: '#2A313D', metalness: 0.9, roughness: 0.32 }),
    alu: new THREE.MeshStandardMaterial({ color: '#B8C2D0', metalness: 1, roughness: 0.22 }),
    copper: new THREE.MeshStandardMaterial({ color: '#C77B4A', metalness: 1, roughness: 0.25 }),
    gold: new THREE.MeshStandardMaterial({ color: '#D4AF37', metalness: 1, roughness: 0.3 }),
    pcbGreen: new THREE.MeshStandardMaterial({ color: '#0F3B2E', metalness: 0.2, roughness: 0.6 }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#6E86C8', metalness: 0, roughness: 0.35, specularIntensity: 0.25, transparent: true, opacity: 0.07, envMapIntensity: 0.18, clearcoat: 0.25, clearcoatRoughness: 0.4, side: THREE.FrontSide, depthWrite: false }),
    blade: new THREE.MeshStandardMaterial({ color: '#E6ECF7', metalness: 0.1, roughness: 0.4, transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
    ghost: new THREE.LineBasicMaterial({ color: '#4F6BFF', transparent: true, opacity: 0.28 }),
    holo: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.35, 1.3, 2.6), transparent: true, opacity: 0.5, wireframe: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
  };
  // materiali RGB i përbashkët — ngjyra ndryshon me kohën (efekti "rainbow")
  const rgbMats = [];
  const rgbMat = (offset = 0) => {
    const m = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#5B8CFF', emissiveIntensity: 0, roughness: 0.4, metalness: 0 });
    m.userData.offset = offset;
    rgbMats.push(m);
    return m;
  };
  const ledMat = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#22D3EE', emissiveIntensity: 0 });

  // ---------------- Teksturat (vizatohen në canvas — pa skedarë të jashtëm) ----------------
  function canvasTex(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }
  function pcbTexture() {
    return canvasTex(512, 640, (g, w, h) => {
      const grd = g.createLinearGradient(0, 0, w, h);
      grd.addColorStop(0, '#0B1220'); grd.addColorStop(1, '#101A2C');
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(80,140,255,0.16)'; g.lineWidth = 2;
      for (let i = 0; i < 90; i++) {
        let x = Math.random() * w, y = Math.random() * h;
        g.beginPath(); g.moveTo(x, y);
        for (let k = 0; k < 4; k++) { if (Math.random() < 0.5) x += (Math.random() - 0.5) * 160; else y += (Math.random() - 0.5) * 160; g.lineTo(x, y); }
        g.stroke();
      }
      g.fillStyle = 'rgba(212,175,55,0.55)';
      for (let i = 0; i < 160; i++) g.fillRect(Math.random() * w, Math.random() * h, 3, 3);
      g.strokeStyle = 'rgba(255,255,255,0.08)'; g.lineWidth = 3; g.strokeRect(6, 6, w - 12, h - 12);
    });
  }
  function labelTexture(text, sub, opts = {}) {
    return canvasTex(512, 128, (g, w, h) => {
      g.fillStyle = opts.bg || '#151B26'; g.fillRect(0, 0, w, h);
      if (opts.stripe) { g.fillStyle = opts.stripe; g.fillRect(0, h - 10, w, 10); }
      g.fillStyle = opts.color || '#E5ECFF';
      g.font = `700 ${opts.size || 54}px "Segoe UI", Arial, sans-serif`;
      g.textBaseline = 'middle';
      g.fillText(String(text || '').slice(0, 18), 26, sub ? 50 : h / 2);
      if (sub) { g.fillStyle = '#8EA2C8'; g.font = '500 30px "Segoe UI", Arial, sans-serif'; g.fillText(String(sub).slice(0, 30), 28, 100); }
    });
  }

  // ---------------- Ndihmës gjeometrie ----------------
  const box = (w, h, d, mat, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  };
  const cyl = (r, h, mat, seg = 32) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat); m.castShadow = true; return m; };

  // Ventilator me unazë RGB dhe fletë që rrotullohen. Bosht = z.
  const fans = [];
  function makeFan(size, ring = true, offset = 0) {
    const g = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.TorusGeometry(size * 0.47, size * 0.045, 12, 48), M.plastic);
    g.add(frame);
    for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) g.add(box(size * 0.16, size * 0.16, size * 0.12, M.plastic, sx * size * 0.42, sy * size * 0.42, 0));
    if (ring) {
      const r = new THREE.Mesh(new THREE.TorusGeometry(size * 0.43, size * 0.018, 8, 64), rgbMat(offset));
      r.position.z = size * 0.05;
      g.add(r);
    }
    const rotor = new THREE.Group();
    const hub = cyl(size * 0.13, size * 0.1, M.plastic);
    hub.rotation.x = Math.PI / 2;
    rotor.add(hub);
    const bladeGeo = new THREE.BoxGeometry(size * 0.3, size * 0.12, 0.012);
    for (let i = 0; i < 7; i++) {
      const b = new THREE.Mesh(bladeGeo, M.blade);
      const a = (i / 7) * Math.PI * 2;
      b.position.set(Math.cos(a) * size * 0.25, Math.sin(a) * size * 0.25, 0);
      b.rotation.set(0.45, 0, a);
      rotor.add(b);
    }
    g.add(rotor);
    fans.push({ rotor, speed: 0.8 + Math.random() * 0.4 });
    return g;
  }

  // ---------------- PC-ja ----------------
  const pc = new THREE.Group();
  scene.add(pc);

  // Sistemi i koordinatave: x = para(+)/mbrapa(−), y = lart, z = drejt kamerës (paneli prej xhami).
  const CASE = { w: 4.4, h: 4.8, d: 2.3 };
  const BACK_Z = -CASE.d / 2 + 0.08; // muri ku vendoset pllaka amë

  // Kutia "fantazmë" (konturat) kur s'është zgjedhur kutia
  const ghostCase = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(CASE.w, CASE.h, CASE.d)), M.ghost);
  ghostCase.position.y = 0.05;
  pc.add(ghostCase);
  const ghostBoard = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2.44, 3.05, 0.02)), M.ghost);
  ghostBoard.position.set(-0.6, 0.55, BACK_Z + 0.03);
  pc.add(ghostBoard);

  const parts = {};
  function part(id, group, from, focus) {
    group.visible = false;
    pc.add(group);
    const holo = group.clone(true);
    holo.traverse((o) => { if (o.isMesh) { o.material = M.holo; o.castShadow = false; } if (o.isLineSegments) o.visible = false; });
    holo.visible = false;
    pc.add(holo);
    parts[id] = { id, group, holo, home: group.position.clone(), from, focus: focus || group.position.clone(), t: 0, target: 0, loading: false, info: null, flashed: false, labels: [] };
    return parts[id];
  }

  // --- Kutia ---
  {
    const g = new THREE.Group();
    const { w, h, d } = CASE;
    g.add(box(w, 0.08, d, M.chassis, 0, h / 2, 0));           // lart
    g.add(box(w, 0.08, d, M.chassis, 0, -h / 2, 0));          // poshtë
    g.add(box(w, h, 0.06, M.chassisIn, 0, 0, -d / 2));        // muri i pasmë (pllaka amë)
    g.add(box(0.08, h, d, M.chassis, -w / 2, 0, 0));          // mbrapa (I/O)
    // ballina me rrjetë + 3 ventilatorë RGB
    const front = new THREE.Group();
    front.add(box(0.06, h, d, new THREE.MeshStandardMaterial({ color: '#0B0F16', metalness: 0.6, roughness: 0.7, transparent: true, opacity: 0.55 }), 0.05, 0, 0));
    for (let i = 0; i < 3; i++) {
      const f = makeFan(1.25, true, i * 0.12);
      f.rotation.y = -Math.PI / 2;
      f.position.set(-0.08, 1.35 - i * 1.32, 0);
      front.add(f);
    }
    front.position.x = w / 2;
    g.add(front);
    // ventilatori i pasmë
    const rear = makeFan(1.1, true, 0.4);
    rear.rotation.y = Math.PI / 2;
    rear.position.set(-w / 2 + 0.1, 1.55, 0);
    g.add(rear);
    // këmbët dhe shiriti LED poshtë
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(box(0.5, 0.08, 0.3, M.plastic, sx * 1.7, -h / 2 - 0.06, sz * 0.8));
    const strip = box(w * 0.9, 0.03, 0.03, rgbMat(0.2), 0, -h / 2 + 0.08, d / 2 - 0.05);
    g.add(strip);
    // butoni i ndezjes
    const btn = cyl(0.07, 0.03, ledMat);
    btn.rotation.z = Math.PI / 2;
    btn.position.set(w / 2 - 0.4, h / 2 + 0.05, 0.6);
    btn.rotation.set(0, 0, 0);
    g.add(btn);
    // paneli prej xhami (rrëshqet nga para)
    const glass = new THREE.Mesh(new THREE.BoxGeometry(w - 0.1, h - 0.1, 0.03), M.glass);
    glass.position.z = d / 2;
    glass.renderOrder = 10;
    g.add(glass);
    const p = part('case', g, new THREE.Vector3(0, 0, 3.5), new THREE.Vector3(0, 0.2, 0));
    p.glass = glass;
  }

  // --- Pllaka amë ---
  {
    const g = new THREE.Group();
    const board = new THREE.Mesh(new THREE.BoxGeometry(2.44, 3.05, 0.05), new THREE.MeshStandardMaterial({ map: pcbTexture(), metalness: 0.35, roughness: 0.55 }));
    board.castShadow = true; board.receiveShadow = true;
    g.add(board);
    // socket-i i procesorit
    g.add(box(0.62, 0.62, 0.05, M.darkMetal, -0.1, 0.75, 0.05));
    // radiatorët VRM
    g.add(box(0.95, 0.32, 0.26, M.darkMetal, -0.25, 1.32, 0.15));
    g.add(box(0.3, 0.95, 0.26, M.darkMetal, -0.85, 0.65, 0.15));
    // mbulesa e I/O me RGB
    const io = box(0.42, 0.95, 0.42, M.plastic, -1.0, 1.0, 0.24);
    g.add(io);
    g.add(box(0.03, 0.8, 0.03, rgbMat(0.3), -0.78, 1.0, 0.44));
    // slotet e RAM-it
    for (let i = 0; i < 4; i++) g.add(box(0.05, 1.36, 0.06, M.plastic, 0.42 + i * 0.12, 0.62, 0.05));
    // slotet PCIe
    g.add(box(1.5, 0.07, 0.07, M.plastic, -0.3, -0.25, 0.05));
    g.add(box(1.5, 0.07, 0.07, M.plastic, -0.3, -0.85, 0.05));
    // çipseti
    const chip = box(0.55, 0.45, 0.1, M.darkMetal, 0.55, -0.85, 0.08);
    g.add(chip);
    g.add(box(0.45, 0.025, 0.02, rgbMat(0.5), 0.55, -0.66, 0.14));
    // vendi i M.2
    g.add(box(0.85, 0.24, 0.02, M.chassisIn, -0.35, 0.1, 0.035));
    // konektori 24-pin
    g.add(box(0.1, 0.55, 0.12, M.plastic, 1.12, 0.6, 0.07));
    g.position.set(-0.6, 0.55, BACK_Z + 0.03);
    part('mobo', g, new THREE.Vector3(0, 0, 3.2), g.position.clone());
  }
  const MB = new THREE.Vector3(-0.6, 0.55, BACK_Z + 0.03); // origjina e pllakës amë

  // --- Procesori ---
  let cpuLabelMat;
  {
    const g = new THREE.Group();
    g.add(box(0.46, 0.46, 0.03, M.pcbGreen, 0, 0, 0));
    cpuLabelMat = new THREE.MeshStandardMaterial({ map: labelTexture('CPU', '', { bg: '#C9D1DC', color: '#1E293B', size: 44 }), metalness: 0.95, roughness: 0.28 });
    const ihs = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.04), [M.alu, M.alu, M.alu, M.alu, cpuLabelMat, M.alu]);
    ihs.position.z = 0.035; ihs.castShadow = true;
    g.add(ihs);
    g.position.set(MB.x - 0.1, MB.y + 0.75, MB.z + 0.1);
    part('cpu', g, new THREE.Vector3(0, 1.6, 2.6));
  }

  // --- Ftohja (ftohës me kulle + ventilator) ---
  {
    const g = new THREE.Group();
    for (let i = 0; i < 14; i++) g.add(box(0.62, 0.012, 0.52, M.alu, 0, -0.4 + i * 0.062, 0));
    for (let i = 0; i < 4; i++) { const p = cyl(0.025, 0.95, M.copper, 12); p.position.set(-0.18 + i * 0.12, 0.0, 0); g.add(p); }
    g.add(box(0.64, 0.05, 0.54, M.darkMetal, 0, 0.45, 0));
    g.add(box(0.6, 0.02, 0.02, rgbMat(0.6), 0, 0.48, 0.27));
    const f = makeFan(0.86, true, 0.6);
    f.rotation.y = Math.PI / 2;
    f.position.set(0.36, 0.02, 0);
    g.add(f);
    g.position.set(MB.x - 0.1, MB.y + 0.75, MB.z + 0.42);
    part('cooler', g, new THREE.Vector3(0, 2.4, 1.8));
  }

  // --- RAM (2 module me RGB) ---
  let ramLabelMat;
  {
    const g = new THREE.Group();
    ramLabelMat = new THREE.MeshStandardMaterial({ map: labelTexture('DDR5', '', { size: 42 }), metalness: 0.6, roughness: 0.35 });
    for (const dx of [0.12, 0.36]) {
      const s = new THREE.Group();
      s.add(box(0.035, 1.3, 0.3, M.pcbGreen, 0, 0, 0));
      const hs = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.3, 0.27), [ramLabelMat, M.darkMetal, M.darkMetal, M.darkMetal, M.darkMetal, M.darkMetal]);
      hs.castShadow = true;
      s.add(hs);
      s.add(box(0.07, 1.25, 0.06, rgbMat(0.1 + dx), 0, 0, 0.16));
      s.position.x = dx;
      g.add(s);
    }
    g.position.set(MB.x + 0.42, MB.y + 0.62, MB.z + 0.2);
    part('ram', g, new THREE.Vector3(0, 2.2, 0.6));
  }

  // --- SSD M.2 ---
  {
    const g = new THREE.Group();
    g.add(box(0.8, 0.2, 0.02, M.pcbGreen, 0, 0, 0));
    g.add(box(0.7, 0.2, 0.04, M.darkMetal, 0.02, 0, 0.03));
    g.add(box(0.06, 0.18, 0.01, M.gold, -0.42, 0, 0));
    g.add(box(0.5, 0.012, 0.01, rgbMat(0.8), 0.04, -0.06, 0.055));
    g.position.set(MB.x - 0.35, MB.y + 0.1, MB.z + 0.07);
    part('ssd', g, new THREE.Vector3(-2.2, 0, 1.6));
  }

  // --- Kartë grafike ---
  let gpuLabelMat;
  {
    const g = new THREE.Group();
    const L = 2.95, T = 0.55, H = 1.15;
    gpuLabelMat = new THREE.MeshStandardMaterial({ map: labelTexture('GPU', '', { size: 56, bg: '#11161F' }), metalness: 0.5, roughness: 0.4 });
    // trupi (shroud) — ana nga kamera ka etiketën me modelin
    const shroud = new THREE.Mesh(new THREE.BoxGeometry(L, T, H), [M.darkMetal, M.darkMetal, M.alu, M.plastic, gpuLabelMat, M.darkMetal]);
    shroud.castShadow = true; shroud.receiveShadow = true;
    g.add(shroud);
    // shiriti RGB anash
    g.add(box(L * 0.92, 0.04, 0.03, rgbMat(0.0), 0, -T / 2 + 0.06, H / 2 + 0.01));
    g.add(box(0.04, T * 0.6, 0.03, rgbMat(0.05), L / 2 - 0.12, 0, H / 2 + 0.01));
    // 3 ventilatorë poshtë
    for (let i = 0; i < 3; i++) {
      const f = makeFan(0.86, true, i * 0.15);
      f.rotation.x = Math.PI / 2;
      f.position.set(-0.95 + i * 0.95, -T / 2 - 0.02, 0.0);
      g.add(f);
    }
    // pllaka e pasme (backplate) dhe kllapa
    g.add(box(L, 0.03, H, M.alu, 0, T / 2 + 0.015, 0));
    g.add(box(0.05, T + 0.2, H + 0.1, M.alu, -L / 2 - 0.02, 0, 0));
    g.position.set(MB.x - 0.25 + L / 2 - 0.45, MB.y - 0.25 - 0.32, MB.z + H / 2 + 0.06);
    part('gpu', g, new THREE.Vector3(3.2, 0, 0.4));
  }

  // --- Furnizuesi (PSU) ---
  {
    const g = new THREE.Group();
    g.add(box(1.6, 0.86, 1.5, M.chassis, 0, 0, 0));
    const fan = makeFan(0.9, false);
    fan.rotation.x = Math.PI / 2;
    fan.position.set(0, 0.44, 0);
    g.add(fan);
    const lbl = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.3), new THREE.MeshStandardMaterial({ map: labelTexture('POWER', '80 PLUS', { bg: '#0F141D' }), metalness: 0.3, roughness: 0.5 }));
    lbl.position.set(0, 0, 0.76);
    g.add(lbl);
    g.add(box(1.5, 0.025, 0.02, ledMat, 0, -0.38, 0.76));
    // kabllot
    const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.6, 0.43, -0.3), new THREE.Vector3(1.0, 1.1, -0.5), new THREE.Vector3(1.25, 2.0, -0.6), new THREE.Vector3(1.15, 2.6, -0.62)]), 24, 0.07, 8), M.plastic);
    g.add(cable);
    g.position.set(-1.2, -1.88, 0.05);
    part('psu', g, new THREE.Vector3(-3.2, 0, 0));
  }

  // ---------------- Efektet e montimit ----------------
  const waves = [];
  const waveGeo = new THREE.RingGeometry(0.85, 1, 64);
  function spawnWave(pos, color = '#7DD3FC') {
    const m = new THREE.Mesh(waveGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    m.position.copy(pos);
    pc.add(m);
    waves.push({ m, t: 0 });
  }
  const sparks = [];
  const sparkGeo = new THREE.SphereGeometry(0.025, 6, 6);
  const sparkMat = new THREE.MeshBasicMaterial({ color: '#BAE6FD', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  function spawnSparks(pos, n = 26) {
    for (let i = 0; i < n; i++) {
      const s = new THREE.Mesh(sparkGeo, sparkMat.clone());
      s.position.copy(pos);
      const v = new THREE.Vector3((Math.random() - 0.5) * 2.4, Math.random() * 2.2, (Math.random() - 0.2) * 2.4);
      pc.add(s);
      sparks.push({ s, v, t: 0 });
    }
  }

  // ---------------- Gjendja / API për app.js ----------------
  const hudSlots = document.getElementById('hudSlots');
  const hudTitle = document.getElementById('hudTitle');
  const hudSub = document.getElementById('hudSub');
  const hudDot = document.getElementById('hudDot');
  const pop = document.getElementById('stagePop');
  let popTimer;
  function showPop(html) {
    pop.innerHTML = html;
    pop.classList.add('show');
    clearTimeout(popTimer);
    popTimer = setTimeout(() => pop.classList.remove('show'), 3200);
  }
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function renderHud() {
    hudSlots.innerHTML = ORDER.map((id) => {
      const p = parts[id];
      const st = p.target ? 'on' : p.loading ? 'load' : '';
      return `<span class="sslot ${st}" title="${esc(p.info ? p.info.title : SLOT_NAMES[id])}"><i></i>${SLOT_NAMES[id]}</span>`;
    }).join('');
    const n = ORDER.filter((id) => parts[id].target).length;
    const powered = isPowered();
    hudDot.classList.toggle('on', powered);
    if (!n) { hudTitle.textContent = 'Ndërto PC-në tënde'; hudSub.textContent = 'Shto pjesët — do t’i shohësh duke u montuar'; }
    else if (powered) { hudTitle.textContent = 'PC-ja u ndez'; hudSub.textContent = `${n} nga ${ORDER.length} pjesë të montuara`; }
    else { hudTitle.textContent = `${n} nga ${ORDER.length} pjesë të montuara`; hudSub.textContent = parts.psu.target ? 'Mungojnë pjesë kryesore për ndezje' : 'Shto furnizuesin (PSU) që ta ndezësh'; }
  }
  const isPowered = () => parts.psu.target && parts.mobo.target && parts.cpu.target && parts.ram.target;

  function shortModel(info, id) {
    if (!info) return '';
    if (info.model) return info.model;
    const t = info.title || '';
    const m = id === 'ram' ? t.match(/\d+\s*gb[^,]*?ddr\s*[45]/i) || t.match(/ddr\s*[45]/i) : id === 'cpu' ? t.match(/(ryzen\s*\d\s*\w+|core\s*(ultra\s*)?\w+[- ]?\w*|i[3579][- ]\w+)/i) : null;
    return m ? m[0].toUpperCase().replace(/\s+/g, ' ') : t.split(/[,(]/)[0].slice(0, 16);
  }
  function setLabel(mat, text, sub, opts) {
    if (!mat) return;
    if (mat.map) mat.map.dispose();
    mat.map = labelTexture(text, sub, opts);
    mat.needsUpdate = true;
  }

  let focusUntil = 0;
  const focusTarget = new THREE.Vector3().copy(HOME_TARGET);

  function set(id, info) {
    const p = parts[id];
    if (!p) return;
    const key = info ? info.url || info.title : null;
    const prevKey = p.info ? p.info.url || p.info.title : null;
    if (key === prevKey) return;
    const wasOn = !!p.target;
    const wasPowered = isPowered();
    p.info = info || null;
    p.target = info ? 1 : 0;
    if (info) {
      p.loading = false;
      if (id === 'gpu') setLabel(gpuLabelMat, shortModel(info, id), info.brand || '', { size: 56, bg: '#11161F', stripe: '#2346D8' });
      if (id === 'cpu') setLabel(cpuLabelMat, shortModel(info, id).replace(/^RYZEN\s*\d\s*/, ''), '', { bg: '#C9D1DC', color: '#1E293B', size: 40 });
      if (id === 'ram') setLabel(ramLabelMat, shortModel(info, id), '', { size: 34 });
      if (!wasOn) { p.t = 0; p.flashed = false; }
      else p.flashed = false; // ndërrim modeli: vetëm efekt i ri
      showPop(`<b>${esc(SLOT_NAMES[id])} ${wasOn ? 'u ndërrua' : 'u montua'}</b><span>${esc(info.title)}</span>${info.price ? `<em>€${Number(info.price).toLocaleString('de-DE')}</em>` : ''}`);
      focusTarget.copy(HOME_TARGET).lerp(p.focus.clone().applyMatrix4(pc.matrixWorld), 0.45);
      focusUntil = clock.elapsedTime + 2.6;
    }
    renderHud();
    if (!wasPowered && isPowered()) powerOn();
  }

  let powerT = 0, powerTarget = 0, bootT = -1;
  function powerOn() {
    powerTarget = 1;
    bootT = clock.elapsedTime;
    setTimeout(() => showPop('<b>⚡ PC-ja u ndez</b><span>Të gjitha pjesët kryesore janë montuar</span>'), 900);
  }

  function setLoading(id, on) {
    const p = parts[id];
    if (!p || p.loading === !!on) return;
    p.loading = !!on;
    renderHud();
  }

  // sinkronizim nga gjendja e app.js
  function sync(build) {
    for (const id of ORDER) {
      const b = build && build[id];
      if (b && b.loading) setLoading(id, true);
      else setLoading(id, false);
      const o = b && b.offer;
      set(id, o ? { url: o.url, title: o.title, price: o.price, store: o.store, brand: o.brand, model: o.perf ? o.perf.model : '' } : null);
    }
    powerTarget = isPowered() ? 1 : 0;
  }

  window.PC3D = { set, setLoading, sync };
  renderHud();
  window.dispatchEvent(new Event('pc3d-ready'));

  // ---------------- Madhësia dhe dukshmëria ----------------
  let visible = true;
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    bloom.setSize(w, h);
    camera.aspect = w / h;
    // në ekrane të ngushta largo kamerën pak që të duket e gjithë kutia
    camera.fov = w < 640 ? 42 : 32;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage);
  new IntersectionObserver((e) => { visible = e[0].isIntersecting; }).observe(stage);
  resize();

  // ---------------- Cikli i animacionit ----------------
  const ease = (x) => 1 - Math.pow(1 - x, 3);
  const easeBack = (x) => { const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  const tmp = new THREE.Vector3();

  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.1);
    const time = clock.elapsedTime;
    if (!visible || stage.offsetParent === null) return;

    // lëkundje e lehtë kur përdoruesi s'po e prek
    if (!reduceMotion && time - lastInteract > 3) pc.rotation.y += (Math.sin(time * 0.25) * 0.32 - pc.rotation.y) * 0.02;

    // pjesët
    for (const id of ORDER) {
      const p = parts[id];
      const speed = id === 'case' ? 0.9 : 1.25;
      if (p.t < p.target) p.t = Math.min(1, p.t + dt * speed);
      else if (p.t > p.target) p.t = Math.max(0, p.t - dt * 2.2);
      const k = p.target ? easeBack(p.t) : ease(p.t);
      p.group.visible = p.t > 0.001;
      p.group.position.copy(p.home).addScaledVector(p.from, 1 - Math.min(1, Math.max(0, k)));
      const sc = 0.85 + 0.15 * Math.min(1, p.t * 1.4);
      p.group.scale.setScalar(sc);
      if (id === 'case' && p.glass) p.glass.position.z = CASE.d / 2 + (1 - ease(p.t)) * 2.5;
      // efekti kur pjesa "ulet" në vend
      if (p.target && p.t >= 0.97 && !p.flashed) {
        p.flashed = true;
        tmp.copy(p.focus);
        if (id !== 'case') { spawnWave(tmp); spawnSparks(tmp, id === 'gpu' ? 40 : 24); }
        flash.position.copy(tmp).applyMatrix4(pc.matrixWorld);
        flash.intensity = 14;
      }
      // hologrami gjatë kërkimit
      p.holo.visible = p.loading && p.t < 0.01;
      if (p.holo.visible) p.holo.position.copy(p.home).y += Math.sin(time * 2) * 0.05;
    }
    M.holo.opacity = 0.42 + Math.sin(time * 6) * 0.18;
    ghostCase.visible = parts.case.t < 0.6;
    ghostBoard.visible = parts.mobo.t < 0.6;
    M.ghost.opacity = 0.18 + Math.sin(time * 1.5) * 0.08;

    // valët dhe shkëndijat
    for (let i = waves.length - 1; i >= 0; i--) {
      const w = waves[i];
      w.t += dt * 1.6;
      w.m.scale.setScalar(0.2 + w.t * 1.4);
      w.m.material.opacity = Math.max(0, 0.9 * (1 - w.t));
      w.m.quaternion.copy(camera.quaternion);
      if (w.t >= 1) { pc.remove(w.m); w.m.material.dispose(); waves.splice(i, 1); }
    }
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.t += dt;
      s.v.y -= dt * 3.5;
      s.s.position.addScaledVector(s.v, dt);
      s.s.material.opacity = Math.max(0, 1 - s.t * 1.3);
      if (s.t > 0.8) { pc.remove(s.s); s.s.material.dispose(); sparks.splice(i, 1); }
    }
    flash.intensity *= Math.pow(0.04, dt);

    // ndezja: RGB + ventilatorët
    powerT += (powerTarget - powerT) * Math.min(1, dt * 1.2);
    const boot = bootT > 0 ? Math.max(0, 1 - (time - bootT) / 1.4) : 0; // shkëlqim i shkurtër në ndezje
    const rgbOn = 0.2 + powerT * 1.45 + boot * 0.8;
    for (const m of rgbMats) {
      const h = (time * 0.08 + m.userData.offset) % 1;
      m.emissive.setHSL(h, 0.85, 0.55);
      m.emissiveIntensity = rgbOn;
    }
    ledMat.emissiveIntensity = powerT * 3;
    inner.color.setHSL((time * 0.08) % 1, 0.8, 0.6);
    inner.intensity = powerT * 26 + boot * 14;
    bloom.strength = 0.5 + powerT * 0.15 + boot * 0.2;
    glowRing.material.color.setHSL(powerT > 0.05 ? (time * 0.08) % 1 : 0.63, 0.75, 0.5);
    glowRing.material.opacity = 0.25 + powerT * 0.4;
    const fanSpeed = 2 + powerT * 22;
    for (const f of fans) f.rotor.rotation.z -= dt * fanSpeed * f.speed;

    // fokusi i kamerës te pjesa e re
    const want = time < focusUntil ? focusTarget : HOME_TARGET;
    controls.target.lerp(want, 0.04);
    controls.update();
    composer.render();
  }
  frame();
}
