
// Heatmap generator for Risk Manager
// Uses likelihood and impact to position scenarios

function renderHeatmap(canvasId, scenarios){
  const canvas = document.getElementById(canvasId);
  if(!canvas) return;
  const ctx = canvas.getContext("2d");

  const size = 5;
  const cell = canvas.width / size;

  ctx.clearRect(0,0,canvas.width,canvas.height);

  // draw grid
  ctx.strokeStyle = "#999";
  for(let i=0;i<=size;i++){
    ctx.beginPath();
    ctx.moveTo(0, i*cell);
    ctx.lineTo(canvas.width, i*cell);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(i*cell, 0);
    ctx.lineTo(i*cell, canvas.height);
    ctx.stroke();
  }

  scenarios.forEach(s => {
    const x = (s.likelihood-1)*cell + cell/2;
    const y = canvas.height - ((s.impact-1)*cell + cell/2);

    ctx.beginPath();
    ctx.arc(x,y,6,0,Math.PI*2);
    ctx.fillStyle = "#ff6b00";
    ctx.fill();
  });
}
