
const STORAGE="riskData";

function showView(id){
document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
document.getElementById(id).classList.add('active');
}

function getData(){
let d=localStorage.getItem(STORAGE);
if(!d){
d={scenarios:[]};
localStorage.setItem(STORAGE,JSON.stringify(d));
return d;
}
return JSON.parse(d);
}

function saveData(d){
localStorage.setItem(STORAGE,JSON.stringify(d));
}

function genID(){
let date=new Date();
let y=date.getFullYear();
let m=String(date.getMonth()+1).padStart(2,'0');
let d=String(date.getDate()).padStart(2,'0');
let today=y+""+m+""+d;

let data=getData();
let count=data.scenarios.filter(s=>s.id.startsWith(today)).length+1;

return today+"-"+String(count).padStart(5,'0');
}

function monteCarlo(min,likely,max,it=5000){

function randTriangular(min,mode,max){
let u=Math.random();
let c=(mode-min)/(max-min);
if(u<c){
return min+Math.sqrt(u*(max-min)*(mode-min));
}else{
return max-Math.sqrt((1-u)*(max-min)*(max-mode));
}
}

let results=[];

for(let i=0;i<it;i++){
results.push(randTriangular(min,likely,max));
}

results.sort((a,b)=>a-b);

let mean=results.reduce((a,b)=>a+b)/results.length;

return {
mean:mean,
p10:results[Math.floor(it*0.1)],
p50:results[Math.floor(it*0.5)],
p90:results[Math.floor(it*0.9)]
};
}

function runSimulation(){

let hMin=Number(hardMin.value);
let hLikely=Number(hardLikely.value);
let hMax=Number(hardMax.value);

let sMin=Number(softMin.value);
let sMax=Number(softMax.value);

let mitCost=Number(mitCost.value);
let mitEff=Number(mitEffect.value)/100;

let hard=monteCarlo(hMin,hLikely,hMax);

let softLow=hard.mean*sMin;
let softHigh=hard.mean*sMax;

let totalMean=hard.mean+(softLow+softHigh)/2;

let residual=totalMean*(1-mitEff);

let reduction=totalMean-residual;

let roi=reduction-mitCost;

let horizons=[1,3,5,10,15,20,25,30];

let horizonTable=horizons.map(y=>{
return {years:y,exposure:totalMean*y};
});

report.innerHTML=`
<h3>Simulation Results</h3>
<p>Expected Annual Loss: $${Math.round(totalMean)}</p>
<p>Residual Loss After Mitigation: $${Math.round(residual)}</p>
<p>Risk Reduction Value: $${Math.round(reduction)}</p>
<p>Mitigation Cost: $${mitCost}</p>
<p>Net Benefit: $${Math.round(roi)}</p>

<h3>Time Horizon Exposure</h3>
<table>
<tr><th>Years</th><th>Exposure</th></tr>
${horizonTable.map(r=>`<tr><td>${r.years}</td><td>$${Math.round(r.exposure)}</td></tr>`).join("")}
</table>
`;

}

function saveScenario(){

let data=getData();

let id=genID();

data.scenarios.push({
id:id,
title:title.value,
identified:new Date().toISOString(),
riskScore:Math.round(Math.random()*100)
});

saveData(data);

loadTable();

alert("Scenario Saved");
}

function loadTable(){

let data=getData();

let tbody=document.querySelector("#scenarioTable tbody");

tbody.innerHTML="";

data.scenarios.forEach(s=>{

let tr=document.createElement("tr");

tr.innerHTML=`
<td>${s.id}</td>
<td>${s.title}</td>
<td>${s.riskScore}</td>
<td>${new Date(s.identified).toLocaleDateString()}</td>
<td>-</td>
<td>-</td>
`;

tbody.appendChild(tr);

});
}

loadTable();
