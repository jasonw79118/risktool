document.addEventListener("DOMContentLoaded", () => {

const canvas = document.getElementById("riskChart");
if(!canvas) return;

const ctx = canvas.getContext("2d");

const data = [10, 30, 50, 20, 40];

ctx.fillStyle = "#0d3b66";

data.forEach((value, index) => {
ctx.fillRect(index * 60 + 20, 150 - value, 40, value);
});

});
