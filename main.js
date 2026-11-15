import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ---------- פרמטרים ----------
// מאומת מהיצרן (KSP 380571 / ezoonboard.com)
const VERIFIED = { width: 0.62, height: 1.18, rungs: 7, stationDepth: 0.50, maxLoadKg: 120 };
// הנחות קונספט (דורשות מדידה)
const ASSUMED = { railW: 0.04, railD: 0.06, rungR: 0.015, rungZ: 0.075, topSurf: 0.045, thick: 0.027 };

const params = {
  tableLen: 0.90,   // סליידר — רוחב לאורך הסולם
  tableDep: 0.60,   // סליידר — בליטה מהקיר
  hookRung: 5,      // סליידר 0..5 (שלב 1-6 מלמעלה); התמיכות ננעלות על השלב שמתחת
  bottomY: 0.55,    // סליידר
};

const state = { t: 1, target: 1, labels: true };
const FOLD_ANGLE = THREE.MathUtils.degToRad(85);

// ---------- סצנה ----------
const container = document.getElementById('scene-container');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 60);
const CAM_HOME = new THREE.Vector3(1.55, 1.45, 2.1);
const TGT_HOME = new THREE.Vector3(0, 0.95, 0.12);
camera.position.copy(CAM_HOME);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(TGT_HOME);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 0.5;
controls.maxDistance = 6;
controls.maxPolarAngle = Math.PI * 0.55;

scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x2a2620, 0.9));
const dir = new THREE.DirectionalLight(0xffffff, 1.6);
dir.position.set(2.5, 4, 3);
scene.add(dir);
const dir2 = new THREE.DirectionalLight(0x88aaff, 0.5);
dir2.position.set(-3, 2, 1.5);
scene.add(dir2);

// קיר ורצפה
const wallMat = new THREE.MeshStandardMaterial({ color: 0x39414f, roughness: 0.95 });
const wall = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 3.2), wallMat);
wall.position.set(0, 1.6, -0.004);
scene.add(wall);
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(8, 8),
  new THREE.MeshStandardMaterial({ color: 0x171b22, roughness: 1 })
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);
const grid = new THREE.GridHelper(8, 16, 0x2c3542, 0x232b36);
grid.position.y = 0.001;
scene.add(grid);

// ---------- חומרים ----------
const wood = new THREE.MeshStandardMaterial({ color: 0xc99a63, roughness: 0.7 });
const woodDark = new THREE.MeshStandardMaterial({ color: 0xa87b47, roughness: 0.75 });
const steel = new THREE.MeshStandardMaterial({ color: 0x9fb2c4, roughness: 0.35, metalness: 0.8 });
const steelDark = new THREE.MeshStandardMaterial({ color: 0x5b6b7c, roughness: 0.4, metalness: 0.7 });
const topMat = new THREE.MeshStandardMaterial({ color: 0x3f8f6f, roughness: 0.55 });

// ---------- גיאומטריית הסולם ----------
const V = VERIFIED, A = ASSUMED;
const spacing = () => V.height / V.rungs;
const rungY = (i) => params.bottomY + V.height - (i + 0.5) * spacing();

let ladderGroup = null, stationGroup = null;
function buildLadder() {
  if (ladderGroup) { scene.remove(ladderGroup); }
  ladderGroup = new THREE.Group();

  const railH = V.height + 0.08;
  const railGeo = new THREE.BoxGeometry(A.railW, railH, A.railD);
  for (const s of [-1, 1]) {
    const rail = new THREE.Mesh(railGeo, wood);
    rail.position.set(s * (V.width / 2 - A.railW / 2), params.bottomY + V.height / 2, A.railD / 2);
    ladderGroup.add(rail);
  }
  const rungGeo = new THREE.CylinderGeometry(A.rungR, A.rungR, V.width - 2 * A.railW + 0.02, 20);
  for (let i = 0; i < V.rungs; i++) {
    const rung = new THREE.Mesh(rungGeo, woodDark);
    rung.rotation.z = Math.PI / 2;
    rung.position.set(0, rungY(i), A.rungZ);
    ladderGroup.add(rung);
  }

  // מתקן מתח/מקבילים (עומק 50 ס״מ מאומת)
  stationGroup = new THREE.Group();
  const topY = params.bottomY + V.height;
  const armGeo = new THREE.BoxGeometry(0.045, 0.05, V.stationDepth);
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(armGeo, steelDark);
    arm.position.set(s * (V.width / 2 - A.railW / 2), topY + 0.06, V.stationDepth / 2);
    stationGroup.add(arm);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.10, 0.05), steelDark);
    post.position.set(s * (V.width / 2 - A.railW / 2), topY + 0.01, 0.035);
    stationGroup.add(post);
  }
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.92, 20), steel);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, topY + 0.06, V.stationDepth - 0.03);
  stationGroup.add(bar);
  // ידיות מקבילים קצרות
  const dipGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.34, 16);
  for (const s of [-1, 1]) {
    const dip = new THREE.Mesh(dipGeo, steel);
    dip.rotation.x = Math.PI / 2;
    dip.position.set(s * (V.width / 2 - A.railW / 2), topY + 0.115, 0.20);
    stationGroup.add(dip);
  }
  ladderGroup.add(stationGroup);
  scene.add(ladderGroup);
}

// ---------- השולחן ----------
let tableGroup = null, bracePivots = [], braceBoxes = [];
function buildTable() {
  if (tableGroup) { scene.remove(tableGroup); }
  tableGroup = new THREE.Group();
  bracePivots = []; braceBoxes = [];

  const hookY = rungY(params.hookRung);
  tableGroup.position.set(0, hookY, A.rungZ);

  const len = params.tableLen, dep = params.tableDep;
  const surf = A.topSurf, thick = A.thick;

  // משטח
  const top = new THREE.Mesh(new THREE.BoxGeometry(len, thick, dep), topMat);
  top.position.set(0, surf - thick / 2, dep / 2);
  tableGroup.add(top);
  // שפתית אחורית לקיר (מכסה את הפער מעל השלב)
  const lip = new THREE.Mesh(new THREE.BoxGeometry(len * 0.98, 0.02, 0.07), topMat);
  lip.position.set(0, surf - 0.02, -0.028);
  tableGroup.add(lip);

  // ווים (ציר) — טבעת נירוסטה עוטפת את השלב + פלטת חיבור
  const hookX = V.width / 2 - A.railW - 0.02;
  const torusGeo = new THREE.TorusGeometry(A.rungR + 0.010, 0.008, 12, 28, Math.PI * 1.5);
  for (const s of [-1, 1]) {
    const hook = new THREE.Mesh(torusGeo, steel);
    hook.rotation.y = Math.PI / 2;           // הטבעת עוטפת את ציר X (השלב)
    hook.rotation.x = Math.PI * 0.25;        // פתיחה כלפי מעלה-אחורה להלבשה
    hook.position.set(s * hookX, 0, 0);
    tableGroup.add(hook);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.055, surf - thick + 0.01, 0.035), steel);
    plate.position.set(s * hookX, (surf - thick) / 2 + 0.005, 0.004);
    tableGroup.add(plate);
    // בריח נעילה נגד שחרור (קונספט)
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.07, 10), steelDark);
    bolt.rotation.x = Math.PI / 2;
    bolt.position.set(s * hookX, 0.004, 0.028);
    tableGroup.add(bolt);
  }

  // תמיכות אלכסוניות מתקפלות — נשלפות משקע בגב המשטח וננעלות על השלב שמתחת
  const b1 = new THREE.Vector3(0, 0.030, dep * 0.72);
  const b2 = new THREE.Vector3(0, -spacing() + 0.02, -0.005);
  const d = new THREE.Vector3().subVectors(b2, b1);
  const L = Math.hypot(d.y, d.z);
  const openAngle = Math.atan2(d.y, -d.z);
  tableGroup.userData.openAngle = openAngle;

  const braceGeo = new THREE.BoxGeometry(0.04, 0.024, L);
  braceGeo.translate(0, 0, -L / 2);
  const footGeo = new THREE.BoxGeometry(0.05, 0.03, 0.05);
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * hookX, b1.y, b1.z);
    const brace = new THREE.Mesh(braceGeo, steelDark);
    pivot.add(brace);
    const foot = new THREE.Mesh(footGeo, steel);
    foot.position.set(0, 0, -L);
    pivot.add(foot);
    tableGroup.add(pivot);
    bracePivots.push(pivot);
    braceBoxes.push(brace, foot);
  }

  scene.add(tableGroup);
}

// ---------- תוויות ----------
const labelsDiv = document.getElementById('labels');
const labels = [];
function addLabel(getPos, getText, cls) {
  const el = document.createElement('div');
  el.className = 'lbl ' + cls;
  labelsDiv.appendChild(el);
  labels.push({ el, getPos, getText });
  return el;
}
function buildLabels() {
  labels.splice(0).forEach(l => l.el.remove());
  labelsDiv.innerHTML = '';
  const cm = (m) => Math.round(m * 100);
  addLabel(() => new THREE.Vector3(0, params.bottomY + V.height + 0.16, 0.03),
    () => `רוחב סולם ${cm(V.width)} ס״מ ✓`, 'verified');
  addLabel(() => new THREE.Vector3(0, params.bottomY + V.height + 0.10, V.stationDepth),
    () => `מתקן מתח · ${cm(V.stationDepth)} ס״מ מהקיר ✓`, 'verified');
  addLabel(() => new THREE.Vector3(V.width / 2 + 0.14, rungY(2) + spacing() / 2, A.rungZ),
    () => `ריווח ≈${(spacing() * 100).toFixed(1)} ס״מ (נגזר)`, 'assumed');
  addLabel(() => new THREE.Vector3(-V.width / 2 - 0.13, rungY(params.hookRung), A.rungZ),
    () => '⌀30 מ״מ (הנחה)', 'assumed');
  // תוויות על השולחן — עוקבות אחרי הקיפול
  addLabel(() => tableGroup.localToWorld(new THREE.Vector3(0, A.topSurf + 0.05, params.tableDep)),
    () => `רוחב ${Math.round(params.tableLen * 100)} ס״מ (קונספט)`, 'assumed');
  addLabel(() => new THREE.Vector3(params.tableLen / 2 + 0.14, tableGroup.position.y + A.topSurf, A.rungZ + params.tableDep / 2),
    () => `בליטה ${Math.round(params.tableDep * 100)} ס״מ (קונספט)`, 'assumed');
  addLabel(() => new THREE.Vector3(-params.tableLen / 2 - 0.16, (tableGroup.position.y + A.topSurf) / 2, A.rungZ + params.tableDep),
    () => `גובה מהרצפה ≈${Math.round((tableGroup.position.y + A.topSurf) * 100)} ס״מ`, 'assumed');
}

const _v = new THREE.Vector3();
function updateLabels() {
  const w = container.clientWidth, h = container.clientHeight;
  for (const l of labels) {
    if (!state.labels) { l.el.style.display = 'none'; continue; }
    _v.copy(l.getPos()).project(camera);
    if (_v.z > 1 || _v.z < -1) { l.el.style.display = 'none'; continue; }
    l.el.style.display = '';
    l.el.style.left = ((_v.x * 0.5 + 0.5) * w) + 'px';
    l.el.style.top = ((-_v.y * 0.5 + 0.5) * h) + 'px';
    const txt = l.getText();
    if (l.el.textContent !== txt) l.el.textContent = txt;
  }
}

// ---------- מצב פתיחה/קיפול ----------
function applyState() {
  const t = state.t;
  tableGroup.rotation.x = (1 - t) * FOLD_ANGLE;
  const openAngle = tableGroup.userData.openAngle || 0;
  for (const p of bracePivots) {
    p.rotation.x = openAngle * t;
    const s = 0.75 + 0.25 * t;   // טלסקופי בקיפול (קונספט)
    p.scale.set(1, 1, s);
  }
  document.getElementById('btn-toggle').textContent = state.target === 1 ? 'קיפול' : 'פתיחה';
}

// ---------- לולאה ----------
function resize() {
  const w = container.clientWidth, h = container.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
window.addEventListener('resize', resize);

function animate() {
  requestAnimationFrame(animate);
  state.t += (state.target - state.t) * 0.09;
  if (Math.abs(state.target - state.t) < 0.001) state.t = state.target;
  applyState();
  controls.update();
  renderer.render(scene, camera);
  updateLabels();
}

// ---------- UI ----------
function updateComputed() {
  document.getElementById('v-height').textContent =
    Math.round((rungY(params.hookRung) + A.topSurf) * 100);
}
function rebuildAll() {
  buildLadder();
  buildTable();
  buildLabels();
  updateComputed();
}
document.getElementById('btn-toggle').addEventListener('click', () => {
  state.target = state.target === 1 ? 0 : 1;
});
document.getElementById('btn-labels').addEventListener('click', (e) => {
  state.labels = !state.labels;
  e.target.textContent = state.labels ? 'הסתר תוויות' : 'הצג תוויות';
});
document.getElementById('btn-reset').addEventListener('click', () => {
  camera.position.copy(CAM_HOME);
  controls.target.copy(TGT_HOME);
});
function bindSlider(id, valId, fn) {
  const el = document.getElementById(id);
  el.addEventListener('input', () => {
    document.getElementById(valId).textContent = el.value;
    fn(parseFloat(el.value));
  });
}
bindSlider('s-length', 'v-length', (v) => { params.tableLen = v / 100; buildTable(); buildLabels(); updateComputed(); });
bindSlider('s-depth', 'v-depth', (v) => { params.tableDep = v / 100; buildTable(); buildLabels(); });
bindSlider('s-rung', 'v-rung', (v) => { params.hookRung = Math.round(v) - 1; buildTable(); buildLabels(); updateComputed(); });
bindSlider('s-bottom', 'v-bottom', (v) => { params.bottomY = v / 100; rebuildAll(); });

rebuildAll();
resize();
animate();
