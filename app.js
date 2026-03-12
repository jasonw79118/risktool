
const STORAGE_KEY = "riskManagerData";

const seeds = {
productGroups:[
"Digital","Document Services","Education Services","Interfaces and Bridge Integrations",
"LOS","DOS","Managed Services","Core","Payment Services","Regulatory Compliance",
"Risk","Marketing","Legal","Executive Management","Physical Locations","Customer X",
"Relationship Management","CRC","Human Resources","Implementations","State Issues",
"Deployment","Internal","Vendor Due Diligence","Audit","3rd Party","Partnership","Vendors"
],

riskDomains:[
"Compliance","Operational","Strategic","Technology","Cybersecurity","Vendor",
"Legal","Reputational","Financial","Third‑Party","Regulatory Change","Data Governance"
],

scenarioStatuses:["Open","Pending","Closed","Referred to Committee"],
scenarioSources:["Audit","Exam Finding","Risk","New Regulation","Industry News"]
};

function loadData(){
let data = localStorage.getItem(STORAGE_KEY);
if(!data){
data = {scenarios:[],categories:seeds};
localStorage.setItem(STORAGE_KEY,JSON.stringify(data));
return data;
}
return JSON.parse(data);
}

function saveData(data){
localStorage.setItem(STORAGE_KEY,JSON.stringify(data));
}

function populateDropdowns(){

const data = loadData();

["single","complex"].forEach(type=>{

fillSelect(type+"Product",data.categories.productGroups);
fillSelect(type+"Domain",data.categories.riskDomains);
fillSelect(type+"Status",data.categories.scenarioStatuses);
fillSelect(type+"Source",data.categories.scenarioSources);

});

renderAdmin();
renderTable();
updateDashboard();
}

function fillSelect(id,list){
const el=document.getElementById(id);
el.innerHTML="";
list.forEach(v=>{
const opt=document.createElement("option");
opt.textContent=v;
el.appendChild(opt);
});
}

function showView(id){
document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
document.getElementById(id).classList.add("active");
}

function saveScenario(type){

const title=document.getElementById(type+"Title").value;
if(!title) return alert("Title required");

const data=loadData();

const scenario={
id:"RSK-"+Date.now(),
title:title,
product:document.getElementById(type+"Product").value,
domain:document.getElementById(type+"Domain").value,
status:document.getElementById(type+"Status").value,
source:document.getElementById(type+"Source").value
};

data.scenarios.push(scenario);
saveData(data);

renderTable();
updateDashboard();

alert("Scenario saved");
}

function renderTable(){
const data=loadData();
const tbody=document.querySelector("#scenarioTable tbody");
tbody.innerHTML="";

data.scenarios.forEach(s=>{
const tr=document.createElement("tr");
tr.innerHTML=`
<td>${s.id}</td>
<td>${s.title}</td>
<td>${s.product}</td>
<td>${s.domain}</td>
<td>${s.status}</td>
<td>${s.source}</td>
`;
tbody.appendChild(tr);
});
}

function updateDashboard(){
const data=loadData();

document.getElementById("totalScenarios").textContent=data.scenarios.length;
document.getElementById("openScenarios").textContent=data.scenarios.filter(x=>x.status==="Open").length;
document.getElementById("acceptedRisks").textContent=data.scenarios.filter(x=>x.accepted).length;
}

function addCategory(key,inputId){
const val=document.getElementById(inputId).value;
if(!val) return;

const data=loadData();
data.categories[key].push(val);
saveData(data);

populateDropdowns();
}

function renderAdmin(){
const data=loadData();

const p=document.getElementById("productList");
p.innerHTML="";
data.categories.productGroups.forEach(v=>{
const li=document.createElement("li");
li.textContent=v;
p.appendChild(li);
});

const d=document.getElementById("domainList");
d.innerHTML="";
data.categories.riskDomains.forEach(v=>{
const li=document.createElement("li");
li.textContent=v;
d.appendChild(li);
});
}

populateDropdowns();
