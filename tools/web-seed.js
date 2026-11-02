// Writes the visits plan as ArtifactData batch files (≤50 writes each) for the online record
// (classroom-visits-record.html). Usage: node web-seed.js <out_dir>
const fs=require('fs'), path=require('path');
const V=require('./visits-data.js'), C=require('./classes.js');
const out=process.argv[2]; fs.mkdirSync(out,{recursive:true});
const docs=V.all.map((v,i)=>({op:"set",collection:"plan",doc_id:"p"+String(i+1).padStart(3,"0"),data:{
  date:v.date,teacher:v.teacher,subject:v.subject,grade:v.cls,period:v.period||"",type:v.type,focus:"",
  status:v.status,cls:C.clsFor(v),src:v.src,...(V.PREV[v.teacher]?{prevRec:V.PREV[v.teacher]}:{}),createdAt:Date.parse("2026-11-02T00:00:00Z")+i}}));
docs.push({op:"set",collection:"meta",doc_id:"info",data:{school:"مدارس الرواد — فرع البدائع بنات",year:"1448هـ — الفصل الدراسي الأول",sup:"أ. غادة جابر — المشرفة التربوية"}});
for(let i=0;i<docs.length;i+=50) fs.writeFileSync(path.join(out,`batch${i/50+1}.json`),JSON.stringify(docs.slice(i,i+50)));
console.log(docs.length,"writes in",Math.ceil(docs.length/50),"batches");
