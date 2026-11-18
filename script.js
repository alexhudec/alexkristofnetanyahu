function calculate(op) {
  let a = Number(document.getElementById("num1").value);
  let b = Number(document.getElementById("num2").value);
  let result;

  if (op === "+") result = a + b;
  if (op === "-") result = a - b;
  if (op === "*") result = a * b;
  if (op === "/") result = b === 0 ? "Can't divide by 0" : a / b;

  document.getElementById("result").textContent = "Result: " + result;
}
