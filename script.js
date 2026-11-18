// =====================================================
//  SHARED MATHS
// =====================================================

function factorial(n) {
  if (n < 0 || !Number.isInteger(n)) return NaN;
  if (n > 170) return Infinity;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

// Functions the calculator understands (deg = use degrees for trig)
function makeScope(deg) {
  const r = x => deg ? x * Math.PI / 180 : x;
  return {
    sin: x => Math.sin(r(x)),
    cos: x => Math.cos(r(x)),
    tan: x => Math.tan(r(x)),
    log: Math.log10,
    ln: Math.log,
    sqrt: Math.sqrt,
    abs: Math.abs,
    fact: factorial,
    PI: Math.PI,
    E: Math.E,
  };
}

// Turn a typed expression into a JavaScript function of x
function compile(input, deg) {
  let s = input
    .replace(/\s+/g, "")
    .replace(/pi/g, "π")
    .replace(/sqrt/g, "√")
    .replace(/\*/g, "×")
    .replace(/\//g, "÷")
    .replace(/-/g, "−");

  // Close any open brackets
  const open = (s.match(/\(/g) || []).length - (s.match(/\)/g) || []).length;
  s += ")".repeat(Math.max(0, open));

  // Implicit multiplication: 2π, 3(4), 2x, xsin(x), (2)(3)
  s = s.replace(/([\d)πex!%])(?=[πe(√sctlAxa])/g, "$1×");

  // Calculator symbols -> JavaScript
  s = s
    .replace(/Ans/g, "(" + ans + ")")
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-")
    .replace(/π/g, "PI")
    .replace(/e/g, "E")
    .replace(/√/g, "sqrt")
    .replace(/%/g, "/100")
    .replace(/\^/g, "**")
    .replace(/(^|\()-/g, "$10-");     // "-x^2" -> "0-x**2" (JS needs this)
  while (s.includes("--")) s = s.replace("--", "+");   // "5--3" -> "5+3"

  s = replaceFactorial(s);

  const scope = makeScope(deg);

  // Safety check: only numbers, operators, x and our own functions
  const words = s.match(/[a-zA-Z]+/g) || [];
  if (!s || !words.every(w => w === "x" || w in scope) || /[^\w\s+\-*/().]/.test(s)) {
    throw new Error("Invalid");
  }

  const names = Object.keys(scope);
  const values = Object.values(scope);
  const f = new Function(...names, "x", "return " + s);
  return x => f(...values, x);
}

// Turn "5!" into "fact(5)" and "(2+3)!" into "fact((2+3))"
function replaceFactorial(s) {
  let i;
  while ((i = s.indexOf("!")) !== -1) {
    let j = i - 1;
    if (s[j] === ")") {
      let depth = 0;
      for (; j >= 0; j--) {
        if (s[j] === ")") depth++;
        if (s[j] === "(") depth--;
        if (depth === 0) break;
      }
    } else {
      while (j >= 0 && /[\d.x]/.test(s[j])) j--;
      j++;
    }
    s = s.slice(0, j) + "fact(" + s.slice(j, i) + ")" + s.slice(i + 1);
  }
  return s;
}

// =====================================================
//  CALCULATOR
// =====================================================

const historyEl = document.getElementById("history");
const expressionEl = document.getElementById("expression");
const previewEl = document.getElementById("preview");
const modeBtn = document.getElementById("mode");

let expr = "";
let ans = 0;
let degrees = true;
let justEvaluated = false;

document.querySelectorAll("[data-key]").forEach(btn => {
  btn.addEventListener("click", () => press(btn.dataset.key));
});

function press(key) {
  if (key === "=") return evaluate();
  if (key === "AC") {
    expr = "";
    historyEl.textContent = "";
  } else if (key === "DEL") {
    expr = deleteLast(expr);
  } else if (key === "mode") {
    degrees = !degrees;
    modeBtn.textContent = degrees ? "DEG" : "RAD";
  } else {
    if (justEvaluated && !/^[+−×÷^%!]/.test(key)) expr = "";
    expr += key;
  }
  justEvaluated = false;
  update();
}

function deleteLast(s) {
  const tokens = ["sin(", "cos(", "tan(", "log(", "ln(", "√(", "Ans", "×10^"];
  for (const t of tokens) {
    if (s.endsWith(t)) return s.slice(0, -t.length);
  }
  return s.slice(0, -1);
}

function calculate(input) {
  const result = compile(input, degrees)(0);
  if (typeof result !== "number" || !isFinite(result)) throw new Error("Math error");
  return result;
}

function update() {
  expressionEl.textContent = expr || "0";
  expressionEl.classList.toggle("long", expr.length > 12);
  expressionEl.classList.toggle("very-long", expr.length > 20);
  expressionEl.scrollLeft = expressionEl.scrollWidth;

  previewEl.classList.remove("error");
  previewEl.textContent = "";

  if (expr && /[+−×÷^%!(]/.test(expr)) {
    try {
      previewEl.textContent = "= " + format(calculate(expr));
    } catch (e) { /* unfinished expression */ }
  }
}

function evaluate() {
  if (!expr) return;
  try {
    const result = calculate(expr);
    historyEl.textContent = expr + " =";
    ans = result;
    expr = format(result);
    justEvaluated = true;
    update();
    previewEl.textContent = "";
    expressionEl.classList.remove("flash");
    void expressionEl.offsetWidth;
    expressionEl.classList.add("flash");
  } catch (e) {
    previewEl.textContent = "Error";
    previewEl.classList.add("error");
  }
}

function format(n) {
  if (Math.abs(n) < 1e-12) n = 0;
  n = parseFloat(n.toPrecision(12));
  let s;
  if (n !== 0 && (Math.abs(n) >= 1e15 || Math.abs(n) < 1e-6)) {
    s = n.toExponential(6).replace(/\.?0+e/, "e").replace(/e\+?/, "×10^");
  } else {
    s = String(n);
  }
  return s.replace(/-/g, "−");
}

// Keyboard (only in calculator mode, not while typing in graph inputs)
document.addEventListener("keydown", e => {
  if (graphMode || e.target.tagName === "INPUT") return;
  const map = { "*": "×", "/": "÷", "-": "−", "Enter": "=", "Backspace": "DEL", "Escape": "AC" };
  const key = map[e.key] || e.key;
  if (/^[\d.+()^%!e=]$|^[×÷−]$|^DEL$|^AC$/.test(key)) {
    e.preventDefault();
    press(key);
    const btn = document.querySelector(`[data-key="${CSS.escape(key)}"]`);
    if (btn) {
      btn.classList.add("pressed");
      setTimeout(() => btn.classList.remove("pressed"), 100);
    }
  }
});

// =====================================================
//  TABS
// =====================================================

const calculatorEl = document.getElementById("calculator");
const calcPanel = document.getElementById("calcPanel");
const graphPanel = document.getElementById("graphPanel");
let graphMode = false;

document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    graphMode = tab.dataset.tab === "graph";
    document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t === tab));
    calcPanel.hidden = graphMode;
    graphPanel.hidden = !graphMode;
    calculatorEl.classList.toggle("wide", graphMode);
    if (graphMode) {
      // wait for the width animation, then draw
      draw();
      setTimeout(draw, 320);
    }
  });
});

// =====================================================
//  GRAPH
// =====================================================

const canvas = document.getElementById("graph");
const ctx = canvas.getContext("2d");
const coordsEl = document.getElementById("coords");
const fxInputs = [...document.querySelectorAll(".fx input")];

const DEFAULT_VIEW = { cx: 0, cy: 0, scale: 50 };   // scale = pixels per unit
let view = { ...DEFAULT_VIEW };
let functions = [];        // [{ f, color }]
let hoverPx = null;        // mouse x position on canvas

function readFunctions() {
  functions = [];
  fxInputs.forEach(input => {
    const label = input.parentElement;
    const color = getComputedStyle(label).getPropertyValue("--c").trim();
    label.classList.remove("invalid");
    if (!input.value.trim()) return;
    try {
      const f = compile(input.value, false);
      f(1);                                   // test it runs
      functions.push({ f, color });
    } catch (e) {
      label.classList.add("invalid");
    }
  });
}

fxInputs.forEach(input => input.addEventListener("input", () => { readFunctions(); draw(); }));

// Pick a nice grid spacing (1, 2, 5, 10, 20, 50 ...)
function niceStep(rough) {
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const n = rough / pow;
  return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * pow;
}

function label(v) {
  return String(parseFloat(v.toPrecision(10))).replace(/-/g, "−");
}

function draw() {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (!w || !h) return;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const toPx = x => w / 2 + (x - view.cx) * view.scale;
  const toPy = y => h / 2 - (y - view.cy) * view.scale;
  const toX = px => view.cx + (px - w / 2) / view.scale;

  const xMin = toX(0), xMax = toX(w);
  const yMax = view.cy + (h / 2) / view.scale;
  const yMin = view.cy - (h / 2) / view.scale;
  const step = niceStep(80 / view.scale);

  // Grid
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.beginPath();
  for (let x = Math.ceil(xMin / step) * step; x <= xMax; x += step) {
    ctx.moveTo(Math.round(toPx(x)) + 0.5, 0);
    ctx.lineTo(Math.round(toPx(x)) + 0.5, h);
  }
  for (let y = Math.ceil(yMin / step) * step; y <= yMax; y += step) {
    ctx.moveTo(0, Math.round(toPy(y)) + 0.5);
    ctx.lineTo(w, Math.round(toPy(y)) + 0.5);
  }
  ctx.stroke();

  // Axes
  const ax = Math.round(toPx(0)) + 0.5;
  const ay = Math.round(toPy(0)) + 0.5;
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.moveTo(ax, 0); ctx.lineTo(ax, h);
  ctx.moveTo(0, ay); ctx.lineTo(w, ay);
  ctx.stroke();

  // Axis numbers (stick to the edge if the axis is off-screen)
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "11px -apple-system, sans-serif";
  const labelY = Math.min(Math.max(ay + 14, 14), h - 6);
  const labelX = Math.min(Math.max(ax - 6, 30), w - 6);
  ctx.textAlign = "center";
  for (let x = Math.ceil(xMin / step) * step; x <= xMax; x += step) {
    if (Math.abs(x) < step / 2) continue;
    ctx.fillText(label(x), toPx(x), labelY);
  }
  ctx.textAlign = "right";
  for (let y = Math.ceil(yMin / step) * step; y <= yMax; y += step) {
    if (Math.abs(y) < step / 2) continue;
    ctx.fillText(label(y), labelX, toPy(y) + 4);
  }

  // Curves
  ctx.lineWidth = 2.5;
  ctx.lineJoin = "round";
  for (const { f, color } of functions) {
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    let penDown = false;
    let prevPy = 0;
    for (let px = 0; px <= w; px += 1) {
      let y;
      try { y = f(toX(px)); } catch (e) { y = NaN; }
      const py = toPy(y);
      if (!isFinite(py) || Math.abs(py) > h * 20) { penDown = false; continue; }
      if (penDown && Math.abs(py - prevPy) > h) penDown = false;   // jump (e.g. tan)
      if (penDown) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      penDown = true;
      prevPy = py;
    }
    ctx.stroke();
  }
  ctx.shadowBlur = 0;

  // Hover: dots on each curve + readout
  if (hoverPx !== null) {
    const x = toX(hoverPx);
    let html = `x = ${label(+x.toFixed(3))}`;
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(hoverPx + 0.5, 0); ctx.lineTo(hoverPx + 0.5, h);
    ctx.stroke();
    ctx.setLineDash([]);
    for (const { f, color } of functions) {
      let y;
      try { y = f(x); } catch (e) { y = NaN; }
      if (!isFinite(y)) continue;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(hoverPx, toPy(y), 5, 0, Math.PI * 2);
      ctx.fill();
      html += `<br><span style="color:${color}">y = ${label(+y.toFixed(3))}</span>`;
    }
    coordsEl.innerHTML = html;
  } else {
    coordsEl.innerHTML = "";
  }
}

// ---------- Pan (drag) ----------
let dragging = false, lastX = 0, lastY = 0;

canvas.addEventListener("pointerdown", e => {
  dragging = true;
  lastX = e.clientX; lastY = e.clientY;
  canvas.setPointerCapture(e.pointerId);
  canvas.classList.add("dragging");
});

canvas.addEventListener("pointermove", e => {
  const rect = canvas.getBoundingClientRect();
  hoverPx = e.clientX - rect.left;
  if (dragging) {
    view.cx -= (e.clientX - lastX) / view.scale;
    view.cy += (e.clientY - lastY) / view.scale;
    lastX = e.clientX; lastY = e.clientY;
  }
  draw();
});

canvas.addEventListener("pointerup", () => {
  dragging = false;
  canvas.classList.remove("dragging");
});

canvas.addEventListener("pointerleave", () => {
  if (!dragging) { hoverPx = null; draw(); }
});

// ---------- Zoom ----------
function zoom(factor, px, py) {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (px === undefined) { px = w / 2; py = h / 2; }
  const wx = view.cx + (px - w / 2) / view.scale;
  const wy = view.cy - (py - h / 2) / view.scale;
  view.scale = Math.min(Math.max(view.scale * factor, 0.001), 100000);
  view.cx = wx - (px - w / 2) / view.scale;
  view.cy = wy + (py - h / 2) / view.scale;
  draw();
}

canvas.addEventListener("wheel", e => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  zoom(Math.exp(-e.deltaY * 0.0015), e.clientX - rect.left, e.clientY - rect.top);
}, { passive: false });

document.getElementById("zoomIn").addEventListener("click", () => zoom(1.5));
document.getElementById("zoomOut").addEventListener("click", () => zoom(1 / 1.5));
document.getElementById("resetView").addEventListener("click", () => {
  view = { ...DEFAULT_VIEW };
  draw();
});

window.addEventListener("resize", () => { if (graphMode) draw(); });

// =====================================================
//  START
// =====================================================
readFunctions();
update();
