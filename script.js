const historyEl = document.getElementById("history");
const expressionEl = document.getElementById("expression");
const previewEl = document.getElementById("preview");
const modeBtn = document.getElementById("mode");

let expr = "";            // what the user has typed
let ans = 0;              // last answer
let degrees = true;       // DEG or RAD for trig
let justEvaluated = false;

// ---------- Button clicks ----------
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
    // After "=", an operator continues from the result, anything else starts fresh
    if (justEvaluated && !/^[+−×÷^%!]/.test(key)) expr = "";
    expr += key;
  }
  justEvaluated = false;
  update();
}

// Remove the last character, or a whole token like "sin(" or "Ans"
function deleteLast(s) {
  const tokens = ["sin(", "cos(", "tan(", "log(", "ln(", "√(", "Ans", "×10^"];
  for (const t of tokens) {
    if (s.endsWith(t)) return s.slice(0, -t.length);
  }
  return s.slice(0, -1);
}

// ---------- Screen ----------
function update() {
  expressionEl.textContent = expr || "0";
  expressionEl.classList.toggle("long", expr.length > 12);
  expressionEl.classList.toggle("very-long", expr.length > 20);
  expressionEl.scrollLeft = expressionEl.scrollWidth;

  previewEl.classList.remove("error");
  previewEl.textContent = "";

  // Live preview of the answer while typing
  if (expr && /[+−×÷^%!(]/.test(expr)) {
    try {
      previewEl.textContent = "= " + format(calculate(expr));
    } catch (e) { /* unfinished expression, show nothing */ }
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
    void expressionEl.offsetWidth;          // restart animation
    expressionEl.classList.add("flash");
  } catch (e) {
    previewEl.textContent = "Error";
    previewEl.classList.add("error");
  }
}

// ---------- Maths ----------
function factorial(n) {
  if (n < 0 || !Number.isInteger(n)) return NaN;
  if (n > 170) return Infinity;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

const toRad = x => degrees ? x * Math.PI / 180 : x;

const scope = {
  sin: x => Math.sin(toRad(x)),
  cos: x => Math.cos(toRad(x)),
  tan: x => Math.tan(toRad(x)),
  log: Math.log10,
  ln: Math.log,
  sqrt: Math.sqrt,
  fact: factorial,
  PI: Math.PI,
  E: Math.E,
};

function calculate(input) {
  let s = input;

  // Close any open brackets
  const open = (s.match(/\(/g) || []).length - (s.match(/\)/g) || []).length;
  s += ")".repeat(Math.max(0, open));

  // Implicit multiplication: 2π, 3(4), 2sin(30), (2)(3)
  s = s.replace(/([\d)πe!%])(?=[πe(√sctlA])/g, "$1×");

  // Turn calculator symbols into JavaScript
  s = s
    .replace(/Ans/g, "(" + ans + ")")
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-")
    .replace(/π/g, "PI")
    .replace(/e/g, "E")
    .replace(/√/g, "sqrt")
    .replace(/%/g, "/100")
    .replace(/\^/g, "**");

  s = replaceFactorial(s);

  // Safety check: only allow numbers, operators and our own functions
  const words = s.match(/[a-zA-Z]+/g) || [];
  if (!words.every(w => w in scope) || /[^\w\s+\-*/().]/.test(s)) {
    throw new Error("Invalid");
  }

  const fn = new Function(...Object.keys(scope), "return " + s);
  const result = fn(...Object.values(scope));

  if (typeof result !== "number" || !isFinite(result)) throw new Error("Math error");
  return result;
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
      while (j >= 0 && /[\d.]/.test(s[j])) j--;
      j++;
    }
    s = s.slice(0, j) + "fact(" + s.slice(j, i) + ")" + s.slice(i + 1);
  }
  return s;
}

// Tidy up a number for the screen
function format(n) {
  if (Math.abs(n) < 1e-12) n = 0;                 // fixes sin(180) = 0.0000000000000001
  n = parseFloat(n.toPrecision(12));              // fixes 0.1 + 0.2 = 0.30000000000000004
  let s;
  if (n !== 0 && (Math.abs(n) >= 1e15 || Math.abs(n) < 1e-6)) {
    s = n.toExponential(6).replace(/\.?0+e/, "e").replace(/e\+?/, "×10^");
  } else {
    s = String(n);
  }
  return s.replace(/-/g, "−");
}

// ---------- Keyboard ----------
document.addEventListener("keydown", e => {
  const map = { "*": "×", "/": "÷", "-": "−", "Enter": "=", "Backspace": "DEL", "Escape": "AC" };
  const key = map[e.key] || e.key;
  if (/^[\d.+()^%!e=]$|^[×÷−]$|^DEL$|^AC$/.test(key) || key === "=") {
    e.preventDefault();
    press(key);
    const btn = document.querySelector(`[data-key="${CSS.escape(key)}"]`);
    if (btn) {
      btn.classList.add("pressed");
      setTimeout(() => btn.classList.remove("pressed"), 100);
    }
  }
});

update();
