const fs=require('fs');
const {Document,Packer,Paragraph,TextRun,Table,TableRow,TableCell,WidthType,AlignmentType,ShadingType,BorderStyle,HeadingLevel,PageBreak,VerticalAlign,LevelFormat,TableLayoutType,HeightRule,ImageRun,Header,Footer,PageNumber,Bookmark,InternalHyperlink}=require('docx');
let TOCP={};try{TOCP=JSON.parse(fs.readFileSync(__dirname+'/toc-pages.json','utf8'));}catch(e){}
const SCHOOL="مدارس الرواد — فرع البدائع بنات", YEAR="1448هـ";
const BRAND="0F5F5C", SOFT="E3F0EE", ACC="B7791F", ACCSOFT="FBF1E1", LINE="BFB9AD";
const FONT="Arial", W=9638; // A4 text width with 1" margins ≈ 9638? (11906-2*1134)
const r=(t,o={})=>new TextRun({text:t,rightToLeft:true,font:FONT,size:o.size||24,bold:o.bold,color:o.color});
const p=(t,o={})=>new Paragraph({bidirectional:true,alignment:o.align||AlignmentType.START,spacing:{after:o.after??120,before:o.before??0},children:Array.isArray(t)?t:[r(t,o)],...(o.extra||{})});
const bm=(id,kids)=>id?[new Bookmark({id,children:kids})]:kids;
const h=(num,t,id,o={})=>new Paragraph({bidirectional:true,heading:HeadingLevel.HEADING_1,pageBreakBefore:!!o.newPage,alignment:AlignmentType.START,spacing:{before:240,after:160},
  border:{bottom:{style:BorderStyle.SINGLE,size:12,color:BRAND,space:4}},children:bm(id,[r(num+"  ",{size:34,bold:true,color:ACC}),r(t,{size:34,bold:true,color:BRAND})])});
const h3=(t,id)=>new Paragraph({bidirectional:true,heading:HeadingLevel.HEADING_2,alignment:AlignmentType.START,spacing:{before:240,after:100},children:bm(id,[r(t,{size:28,bold:true,color:BRAND})])});
const bord={style:BorderStyle.SINGLE,size:4,color:LINE};
const borders={top:bord,bottom:bord,left:bord,right:bord};
const cell=(content,w,o={})=>new TableCell({width:{size:w,type:WidthType.DXA},borders,verticalAlign:o.v||VerticalAlign.CENTER,
  shading:o.fill?{type:ShadingType.CLEAR,color:"auto",fill:o.fill}:undefined,margins:{top:80,bottom:80,left:100,right:100},columnSpan:o.span,
  children:(Array.isArray(content)?content:[content]).map(c=>typeof c==="string"?p(c,{after:0,bold:o.bold,color:o.color,size:o.size||22,align:o.align}):c)});
function table(cols,rows,o={}){
  const total=cols.reduce((a,b)=>a+b,0);
  return new Table({visuallyRightToLeft:true,width:{size:total,type:WidthType.DXA},columnWidths:cols,layout:TableLayoutType.FIXED,
    rows:rows.map((row,i)=>new TableRow({tableHeader:i===0&&o.header!==false,height:o.h&&(i>0||o.header===false)?{value:o.h,rule:HeightRule.ATLEAST}:undefined,
      children:row.map((c,j)=>(i===0&&o.header!==false)||(o.labels&&j%2===0)?cell(c,cols[j],{fill:SOFT,bold:true,color:BRAND}):cell(c,cols[j],{}))}))});
}

const V=require('./visits-data.js');
const cnt=st=>V.all.filter(v=>v.status===st).length;
const MONTHS=["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const DAYS=["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
const fmt=d=>{const x=new Date(d+"T00:00:00Z");return `${x.getUTCDate()} ${MONTHS[x.getUTCMonth()]}`;};
const day=d=>DAYS[new Date(d+"T00:00:00Z").getUTCDay()];
const HF=new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura-nu-latn",{day:"numeric",month:"long",year:"numeric",timeZone:"UTC"});
const hij=d=>HF.format(new Date(d+"T00:00:00Z")).replace(" هـ","هـ");          // 21 جمادى الأولى 1448هـ
const hijS=d=>hij(d).replace(/ ?\d{4}هـ$/,"");                                      // 21 جمادى الأولى
const TODAY=V.TODAY;
const greg=d=>`${fmt(d)} ${d.slice(0,4)}م`;
// one form per teacher: her next upcoming visit (from today), else her most recent one
// item 9: a form for every upcoming (scheduled) visit; each form knows the same teacher's previous form
let _forms=null;
function formVisits(){
  if(_forms) return _forms;
  _forms=V.all.filter(v=>v.status==="مجدولة").map(v=>({...v}));
  const last={};
  _forms.forEach((v,i)=>{ if(last[v.teacher]!=null) v.prevForm={n:last[v.teacher]+1,date:_forms[last[v.teacher]].date}; last[v.teacher]=i; });
  return _forms;
}

const {stageOf,CLASS,SUPPORT,RANK,clsList,topClass,clsFor,isSupport}=require('./classes.js');
const CLS_COLOR=c=>isSupport(c)?"A83232":c==="معلمة متميزة"?"2F7D46":"5B6675";
const CLS_MARK=c=>isSupport(c)?"● ":c==="معلمة متميزة"?"★ ":"";
function kpiRow(items){
  const w=Math.floor(9638/items.length), cols=items.map((_,i)=>i<items.length-1?w:9638-w*(items.length-1));
  return new Table({visuallyRightToLeft:true,width:{size:9638,type:WidthType.DXA},columnWidths:cols,layout:TableLayoutType.FIXED,
    rows:[new TableRow({children:items.map(([v,k,col,fill],i)=>cell([p(String(v),{after:0,size:40,bold:true,color:col||BRAND,align:AlignmentType.CENTER}),p(k,{after:0,size:18,color:"5B6675",align:AlignmentType.CENTER})],cols[i],{fill:fill||"F6F4EF"}))})]});
}
function countTable(title,keyFn,keys){
  const rows=keys.map(k=>{const vs=V.all.filter(v=>keyFn(v)===k);const d=vs.filter(v=>v.status==="تمت").length,o=vs.filter(v=>v.status==="لم تُوثّق").length,u=vs.filter(v=>v.status==="مجدولة").length;
    return [k,String(vs.length),String(d),String(o),String(u),(d+o)?Math.round(100*d/(d+o))+"%":"—"];});
  return table([2638,1400,1400,1400,1400,1400],[[title,"الإجمالي","تمت","لم تُوثّق","مجدولة","نسبة التوثيق"],...rows]);
}
function prioritySection(){
  const sup=[...new Set(V.all.map(v=>v.teacher))].filter(t=>clsList(t).some(isSupport));
  const pc=[1700,2600,900,1400,1500,1538];
  const rows=sup.map(t=>{const vs=V.all.filter(v=>v.teacher===t);const d=vs.filter(v=>v.status==="تمت").length;const nx=vs.find(v=>v.status==="مجدولة");
    const cl=Object.entries(CLASS[t]).filter(([,c])=>isSupport(c)).map(([s,c])=>`${c} (${s})`).join("، ");
    const style=d===0?"زيارة دعم مباشر خلال أسبوع":"زيارة متابعة + زيارة تبادلية";
    return [t,cl,String(d),nx?`${fmt(nx.date)} / ${hijS(nx.date)}`:"تُجدول",style,d===0?"عاجل":"متابعة"];});
  const pTable=new Table({visuallyRightToLeft:true,width:{size:9638,type:WidthType.DXA},columnWidths:pc,layout:TableLayoutType.FIXED,rows:[
    new TableRow({tableHeader:true,children:["المعلمة","التصنيف","زيارات موثقة","الزيارة القادمة","الإجراء الإشرافي المقترح","الأولوية"].map((h,j)=>cell(h,pc[j],{fill:SOFT,bold:true,color:BRAND,size:18}))}),
    ...rows.map(r=>new TableRow({cantSplit:true,children:r.map((x,j)=>cell(p(x,{after:0,size:17,bold:j===0||j===5,color:j===5?(x==="عاجل"?"A83232":"A15C07"):j===1?"A83232":undefined}),pc[j],{fill:j===5&&x==="عاجل"?"FDF0DC":undefined}))}))]});
  const xc=[1900,2700,1900,3138];
  const xTable=new Table({visuallyRightToLeft:true,width:{size:9638,type:WidthType.DXA},columnWidths:xc,layout:TableLayoutType.FIXED,rows:[
    new TableRow({tableHeader:true,children:["المعلمة الزائرة","تصنيفها","المعلمة المستضيفة (★ متميزة)","المادة / المرحلة"].map((h,j)=>cell(h,xc[j],{fill:SOFT,bold:true,color:BRAND,size:18}))}),
    ...PAIRS.map(([a,c,b,sub])=>new TableRow({cantSplit:true,children:[cell(p(a,{after:0,size:18,bold:true}),xc[0]),cell(p(c,{after:0,size:16,color:"A83232"}),xc[1]),cell(p("★ "+b,{after:0,size:18,bold:true,color:"2F7D46"}),xc[2]),cell(p(sub,{after:0,size:17}),xc[3])]}))]});
  const stars=[...new Set(V.all.map(v=>v.teacher))].filter(t=>clsList(t).includes("معلمة متميزة"));
  return [
    h3("أولوية الزيارات حسب تصنيف المعلمات"),
    p("المعلمات المصنفات «أولى بالرعاية» أو «جديدة» أو «قابلة للتطوير» — يُقدَّمن في جدولة الزيارات وفق الأسلوب الإشرافي المباشر.",{size:17,color:"5B6675"}),
    pTable,
    p("تنبيه: معلمتا رياض الأطفال المصنفتان «أولى بالرعاية» (في البجيدي، شادن الغفيلي) لا تظهر لهما زيارات بالاسم — زيارات الروضة مسجلة باسم «معلمة الروضة». يُستحسن تسمية المعلمة في كل زيارة روضة وجدولة زيارة دعم لكل منهما.",{size:17,color:"A83232",before:80}),
    h3("ترشيحات الزيارات التبادلية"),
    p(`المعلمات المتميزات (${stars.length}): ${stars.join("، ")}. يُقترح أن تزور كل معلمة من فئة الدعم معلمة متميزة في المادة والمرحلة نفسها:`,{size:17,color:"5B6675"}),
    xTable,
  ];
}
function summaryPage(){
  const done=cnt("تمت"),over=cnt("لم تُوثّق"),up=cnt("مجدولة"),due=done+over,rate=Math.round(100*done/due);
  const teachers=[...new Set(V.all.map(v=>v.teacher))];
  const never=teachers.filter(t=>!V.all.some(v=>v.teacher===t&&v.status==="تمت"));
  // per-teacher rows
  const tRows=teachers.map(t=>{const vs=V.all.filter(v=>v.teacher===t);const d=vs.filter(v=>v.status==="تمت");const o=vs.filter(v=>v.status==="لم تُوثّق").length,u=vs.filter(v=>v.status==="مجدولة").length;
    const last=d.length?fmt(d[d.length-1].date)+" / "+hijS(d[d.length-1].date):"لا يوجد";const nxt=vs.find(v=>v.status==="مجدولة");
    return {t,c:topClass(t),n:vs.length,d:d.length,o,u,last,nxt:nxt?fmt(nxt.date)+" / "+hijS(nxt.date):"—"};}).sort((a,b)=>(isSupport(b.c)-isSupport(a.c))||a.d-b.d||b.o-a.o);
  const tc=[1650,1350,700,700,900,800,1769,1769];
  const tTable=new Table({visuallyRightToLeft:true,width:{size:9638,type:WidthType.DXA},columnWidths:tc,layout:TableLayoutType.FIXED,
    rows:[new TableRow({tableHeader:true,children:["المعلمة","التصنيف","الإجمالي","تمت","لم تُوثّق","مجدولة","آخر زيارة موثقة","الزيارة القادمة"].map((h,j)=>cell(h,tc[j],{fill:SOFT,bold:true,color:BRAND,size:18}))}),
      ...tRows.map(r=>new TableRow({cantSplit:true,children:[r.t,CLS_MARK(r.c)+r.c,String(r.n),String(r.d),String(r.o),String(r.u),r.last,r.nxt].map((x,j)=>cell(p(x,{after:0,size:j===1?16:18,bold:j===0||(j===1&&r.c!=="غير مصنفة"),color:j===1?CLS_COLOR(r.c):j===6&&r.d===0?"A83232":undefined}),tc[j],{fill:r.d===0?"FDF0DC":undefined}))}))]});
  const stages=["رياض الأطفال","ابتدائي","ابتدائي (ثنائي اللغة)","متوسط","ثانوي","متوسط / ثانوي","غير محدد"].filter(k=>V.all.some(v=>stageOf(v.cls)===k));
  const types=[...new Set(V.all.map(v=>v.type))];
  return [
    h3("ملخص الإنجاز ومقارنته بالمستهدف","sum"),
    p(`حتى ${day(TODAY)} ${greg(TODAY)} الموافق ${hij(TODAY)} · المصدر: جدول الزيارات في هذا السجل (سجلّ الزيارات الصفية + سجل زيارات خارطة التعليم والتعلم).`,{size:18,color:"5B6675"}),
    kpiRow([[V.all.length,"إجمالي الزيارات المخططة"],[due,"زيارات حلّ موعدها"],[done,"زيارات موثقة","2F7D46","E5F3E9"],[over,"مضى موعدها ولم تُوثّق","A15C07","FDF0DC"],[up,"زيارات قادمة"]]),
    sp(),
    kpiRow([[rate+"%","نسبة التوثيق من الزيارات التي حلّ موعدها",rate>=90?"2F7D46":"A83232"],["90%","المستهدف في الخطة التشغيلية (برنامج 20)"],[teachers.length,"معلمة في الخطة"],[never.length,"معلمات بلا زيارة موثقة","A83232","FDF0DC"]]),
    p(`الفجوة عن المستهدف: ${90-rate} نقطة مئوية. تُحسب النسبة = الزيارات الموثقة ÷ الزيارات التي حلّ موعدها. ترتفع بعد تحديث حالة الزيارات غير الموثقة في جدول الزيارات. مرجع المستهدف: خطة المتابعة الصفية المنتظمة (57 زيارة شهريًا بمعدل 3 زيارات يوميًا، والمستهدف ≥ 90%).`,{size:18,color:"5B6675",before:80}),
    h3("الزيارات حسب المعلمة"),
    p("المعلمات المحتاجات للدعم (● أولى بالرعاية / جديدة / قابلة للتطوير) أولًا، ثم الأقل توثيقًا. ★ متميزة. الصفوف المظللة: لم تُوثّق لهن أي زيارة بعد. التصنيف من ورقة «تصنيف المعلمات» في سجل التدريب والنمو المهني 1448هـ (تُعرض أعلى أولوية عند اختلاف التصنيف بين المراحل).",{size:17,color:"5B6675"}),
    tTable,
    ...prioritySection(),
    h3("الزيارات حسب المرحلة"),
    countTable("المرحلة",v=>stageOf(v.cls),stages),
    h3("الزيارات حسب نوع الزيارة"),
    countTable("نوع الزيارة",v=>v.type,types),
  ];
}

function visitsTable(){
  const cols=[450,1550,1500,1350,1000,600,1300,1888];
  const fills={"تمت":"E5F3E9","لم تُوثّق":"FDF0DC","مجدولة":null};
  const sc={"تمت":"2F7D46","لم تُوثّق":"A15C07","مجدولة":"0F5F5C"};
  const c=(t,w,o={})=>cell(p(t,{after:0,size:18,bold:o.bold,color:o.color,align:o.align}),w,{fill:o.fill});
  const head=new TableRow({tableHeader:true,children:["م","التاريخ (م / هـ)","اسم المعلمة","المادة","الصف","الحصة","نوع الزيارة","الحالة"].map((h,j)=>cell(h,cols[j],{fill:SOFT,bold:true,color:BRAND,size:18}))});
  const rows=V.all.map((v,i)=>new TableRow({cantSplit:true,children:[
    c(String(i+1),cols[0],{align:AlignmentType.CENTER}),
    cell([p(`${day(v.date)} ${fmt(v.date)}`,{after:0,size:18}),p(hijS(v.date),{after:0,size:15,color:"5B6675"})],cols[1]),
    cell([p(v.teacher,{after:0,size:18,bold:true}),...(clsFor(v)!=="غير مصنفة"?[p(CLS_MARK(clsFor(v))+clsFor(v),{after:0,size:14,color:CLS_COLOR(clsFor(v))})]:[])],cols[2]),
    c(v.subject,cols[3]),c(v.cls,cols[4]),c(v.period||"—",cols[5],{align:AlignmentType.CENTER}),
    c(v.type,cols[6],{color:v.src==="الخارطة"?ACC:undefined,bold:v.src==="الخارطة"}),
    v.status==="لم تُوثّق"
      ? cell([p("لم تُوثّق",{after:0,size:16,bold:true,color:sc[v.status]}),p("☐ تمت  ☐ مؤجلة  ☐ ملغاة",{after:0,size:16})],cols[7],{fill:fills[v.status]})
      : c(v.status,cols[7],{bold:true,color:sc[v.status],fill:fills[v.status]||undefined}),
  ]}));
  return new Table({visuallyRightToLeft:true,width:{size:9638,type:WidthType.DXA},columnWidths:cols,layout:TableLayoutType.FIXED,rows:[head,...rows]});
}

const sp=()=>p("",{after:60});
// suggested exchange-visit pairs: support teacher visits a distinguished teacher of the same subject & stage
const PAIRS=[
  ["نوف المطيري","معلمة جديدة","أفراح المنصور","اللغة العربية — ابتدائي"],
  ["شهد المطيري","معلمة جديدة","منار الصميت","الرياضيات — ابتدائي"],
  ["ريم الحميميدي","قابلة للتطوير","عبير البريدي","اللغة الإنجليزية — ابتدائي"],
  ["سجى القرناس","أولى بالرعاية (ثانوي)","عبير البريدي","اللغة الإنجليزية"],
  ["مرام الرشيدي","أولى بالرعاية (ثانوي) / قابلة للتطوير (متوسط)","رغد العريني","العلوم — متوسط"],
];

let TOCITEMS=[];
// Table of contents: page numbers come from tools/toc-pages.json (filled by build.sh after a first render)
function tocPage(){
  const items=TOCITEMS=[["sec1","١. أهداف السجل",0],["sec2","٢. خطة الزيارات الصفية",0],["sum","ملخص الإنجاز ومقارنته بالمستهدف",1],["tbl","جدول الزيارات",1],["sec3","٣. توثيق الزيارات بالصور",0],
    ...formVisits().map((v,i)=>["form"+(i+1),`نموذج ${i+1} — ${v.teacher}  (${fmt(v.date)} / ${hijS(v.date)})`,2]),
    ["sec4","٤. الزيارات الموثقة في السجل الإلكتروني",0],
    ...((V.web&&V.web.visits)||[]).map((v,i)=>["web"+(i+1),`زيارة موثقة ${i+1} — ${v.teacher}  (${fmt(v.date)} / ${hijS(v.date)})`,2]),
    ["sec5","٥. ملاحق: نماذج الزيارات",0],
    ["app1","أ) استمارة زيارة معلمة — الإشراف التربوي (ع-7-004)",1],
    ...PAIRS.map((pr,i)=>["app2_"+(i+1),`ب) استمارة تبادل الزيارات ( ${i+1} ) — ${pr[0]} ← ${pr[2]}`,1]),
    ["app2_"+(PAIRS.length+1),"ب) استمارة تبادل الزيارات — نسخة فارغة",1]];
  const cols=[8238,1400], nb={style:BorderStyle.NONE,size:0,color:"FFFFFF"}, dot={style:BorderStyle.DOTTED,size:4,color:LINE};
  const rows=items.map(([id,t,lvl])=>new TableRow({cantSplit:true,children:[
    new TableCell({width:{size:cols[0],type:WidthType.DXA},borders:{top:nb,left:nb,right:nb,bottom:dot},margins:{top:30,bottom:30,left:80,right:80+lvl*360},
      children:[p([new InternalHyperlink({anchor:id,children:[r(t,{size:lvl===0?24:lvl===1?21:19,bold:lvl===0,color:lvl===0?BRAND:undefined})]})],{after:0})]}),
    new TableCell({width:{size:cols[1],type:WidthType.DXA},borders:{top:nb,left:nb,right:nb,bottom:dot},margins:{top:30,bottom:30,left:80,right:80},
      children:[p(String(TOCP[id]||"…"),{after:0,size:lvl===0?24:20,bold:lvl===0,align:AlignmentType.END})]})]}));
  return [h3("فهرس المحتويات"),
    new Table({visuallyRightToLeft:true,width:{size:9638,type:WidthType.DXA},columnWidths:cols,layout:TableLayoutType.FIXED,rows:[
      new TableRow({children:[cell(p("المحتوى",{after:0,bold:true,color:BRAND,size:20}),cols[0],{fill:SOFT}),cell(p("الصفحة",{after:0,bold:true,color:BRAND,size:20,align:AlignmentType.END}),cols[1],{fill:SOFT})]}),...rows]}),
    p("اضغطي على أي بند للانتقال إليه.",{size:17,color:"5B6675",before:80})];
}

// Cover
const cover=[
  new Paragraph({bidirectional:true,alignment:AlignmentType.CENTER,spacing:{before:1600,after:200},children:[r("سجل الزيارات الصفية",{size:64,bold:true,color:BRAND})]}),
  p("أداة لتخطيط الزيارات الصفية ومتابعتها وتوثيقها بالصور",{align:AlignmentType.CENTER,size:28,color:"5B6675",after:800}),
  table([3000,6638],[["اسم المدرسة",SCHOOL],["العام الدراسي",YEAR+" — الفصل الدراسي الأول"],["الزائرة","أ. غادة جابر — المشرفة التربوية"],["تاريخ بدء السجل",`${day(V.all[0].date)} ${greg(V.all[0].date)} — ${hij(V.all[0].date)}`],["آخر تحديث",`${greg(TODAY)} — ${hij(TODAY)}`],["عدد المعلمات / الزيارات",`${new Set(V.all.map(v=>v.teacher)).size} معلمة · ${V.all.length} زيارة`]],{header:false,h:600,labels:true}),
  new Paragraph({children:[new PageBreak()]}),
  ...tocPage(),
];

// 1 Goals
const goals=[["تحسين جودة التعليم","متابعة الأداء التدريسي داخل الصف ودعمه بما ينعكس على تعلم الطلاب."],
["تشخيص الاحتياجات المهنية","التعرف على نقاط القوة وفرص التحسين لدى كل معلم بدقة وموضوعية."],
["التوثيق المنظم","حفظ بيانات الزيارات ونتائجها وشواهدها المصورة في مرجع واحد يسهل الرجوع إليه."],
["متابعة تنفيذ التوصيات","رصد مدى تطبيق التوصيات السابقة وقياس أثرها في الزيارات اللاحقة."],
["نشر الممارسات المتميزة","رصد الاستراتيجيات الناجحة وتعميمها عبر الزيارات التبادلية ومجتمعات التعلم."],
["تحقيق العدالة والشمول","ضمان زيارة جميع المعلمين وجميع المواد والصفوف وفق خطة زمنية متوازنة."],
["دعم التخطيط للتطوير المهني","بناء البرامج التدريبية والورش على احتياجات فعلية مستخلصة من الزيارات."],
["تعزيز التواصل البنّاء","ترسيخ ثقافة التغذية الراجعة الإيجابية والشراكة بين الإدارة والمعلمين."]];
const sec1=[h("١","أهداف السجل","sec1",{newPage:true}),p("يهدف سجل الزيارات الصفية إلى ما يلي:",{color:"5B6675"}),
  table([700,2800,6138],[["م","الهدف","التوضيح"],...goals.map((g,i)=>[{...cell,opts:{}}&&String(i+1),g[0],g[1]])].map((row,i)=>i===0?row:row.map((c,j)=>j===1?p(c,{after:0,bold:true,size:22}):c)))];

// 2 Plan
const sec2=[new Paragraph({children:[new PageBreak()]}),h("٢","خطة الزيارات الصفية","sec2"),
  h3("أنواع الزيارات الصفية"),
  table([2000,4838,2800],[["نوع الزيارة","الهدف منها","العدد المقترح لكل معلم"],
   ["استطلاعية","التعرف على المعلم وبيئة الصف وتحديد الاحتياجات الأولية","زيارة واحدة بداية العام"],
   ["تقويمية","تقويم الأداء التدريسي وفق بطاقة الملاحظة المعتمدة","زيارتان (زيارة في كل فصل)"],
   ["متابعة / علاجية","التحقق من تنفيذ التوصيات السابقة وتقديم الدعم اللازم","حسب الحاجة"],
   ["تبادلية","تبادل الخبرات بين المعلمين ونقل الممارسات المتميزة","زيارة واحدة على الأقل كل فصل"]]),
  h3("المراحل الزمنية للخطة"),
  table([2000,2400,5238],[["الفترة","المرحلة","الإجراءات"],
   ["الأسابيع ١ – ٤","مرحلة الاستطلاع","زيارات استطلاعية لجميع المعلمين، مع إعطاء الأولوية للمعلمين الجدد، وتحديد الاحتياجات التدريبية."],
   ["الأسابيع ٥ – ١٢","مرحلة التقويم الأولى","زيارات تقويمية وفق البطاقة المعتمدة، واجتماع فردي بعد كل زيارة، وكتابة التوصيات والاتفاق عليها."],
   ["الأسابيع ١٣ – ٢٠","مرحلة المتابعة والتبادل","زيارات متابعة لتنفيذ التوصيات، وزيارات تبادلية بين المعلمين، وورش لنشر الممارسات."],
   ["نهاية العام","مرحلة التقويم الختامي","زيارات تقويمية ختامية، وقياس أثر الدعم المقدّم، وتقرير ختامي وتوصيات للعام القادم."]]),
  h3("محاور الملاحظة أثناء الزيارة"),
  table([3000,6638],[["المحور","أبرز المؤشرات"],
   ["التخطيط للدرس","وضوح الأهداف، ملاءمة الأنشطة، تنوّع مصادر التعلم"],
   ["تنفيذ الدرس","التهيئة، تنوع الاستراتيجيات، توظيف التقنية، إدارة الوقت"],
   ["إدارة الصف","البيئة الصفية الآمنة، الانضباط، تفاعل الطلاب ومشاركتهم"],
   ["التقويم","التقويم التكويني، التغذية الراجعة، مراعاة الفروق الفردية"],
   ["السمات الشخصية والمهنية","سلامة اللغة، التمكن العلمي، العلاقة مع الطلاب"]]),
  new Paragraph({children:[new PageBreak()]}),
  ...summaryPage(),
  new Paragraph({children:[new PageBreak()]}),
  h3("جدول الزيارات","tbl"),
  p(`مصدر البيانات: سجلّ الزيارات الصفية الإلكتروني وسجل زيارات خارطة التعليم والتعلم — حتى ${greg(TODAY)} الموافق ${hij(TODAY)}. إجمالي الزيارات: ${V.all.length} · تمت: ${cnt("تمت")} · مجدولة قادمة: ${cnt("مجدولة")} · مضى موعدها ولم تُوثّق: ${cnt("لم تُوثّق")}.`,{size:20,color:"5B6675"}),
  visitsTable(),
  p("تحت اسم المعلمة: تصنيفها في المرحلة (● فئة دعم · ★ متميزة). الحالة: «تمت» زيارة موثقة · «مجدولة» موعدها قادم · «لم تُوثّق» مضى موعدها دون تسجيل تنفيذها — ضعي علامة على ما حدث فعلًا: تمت (نُفّذت ولم تُسجَّل) أو مؤجلة (تُنقل لموعد جديد) أو ملغاة. نوع «خارطة التعليم والتعلم» = حضور درس مصمم وفق الخارطة.",{size:18,color:"5B6675",before:80}),
];

// 3 Documentation: one page per visit, 3 visit forms
const photoBox=(label)=>new TableCell({width:{size:4819,type:WidthType.DXA},borders:{top:{style:BorderStyle.DASHED,size:8,color:BRAND},bottom:{style:BorderStyle.DASHED,size:8,color:BRAND},left:{style:BorderStyle.DASHED,size:8,color:BRAND},right:{style:BorderStyle.DASHED,size:8,color:BRAND}},
  shading:{type:ShadingType.CLEAR,color:"auto",fill:SOFT},verticalAlign:VerticalAlign.CENTER,
  children:[p("📷",{align:AlignmentType.CENTER,size:32,after:20}),p(label,{align:AlignmentType.CENTER,size:22,color:BRAND,bold:true,after:0}),p("(إدراج ← صورة)",{align:AlignmentType.CENTER,size:18,color:"5B6675",after:0})]});

const AXES=[["التخطيط للدرس","وضوح الأهداف، ملاءمة الأنشطة للأهداف، تنوع مصادر التعلم"],
  ["تنفيذ الدرس","التهيئة، تنوع الاستراتيجيات، توظيف التقنية، إدارة زمن الحصة"],
  ["التفاعل الصفي","مشاركة الطالبات، الأسئلة المحفزة للتفكير، العمل التعاوني"],
  ["إدارة الصف","البيئة الآمنة، الانضباط الإيجابي، تنظيم الانتقال بين الأنشطة"],
  ["التقويم","التقويم التكويني، التغذية الراجعة، مراعاة الفروق الفردية، تذكرة الخروج"]];
function obsCard(){
  const cols=[1700,3938,1000,1000,1000,1000];
  const hdr=new TableRow({tableHeader:true,children:["المحور","المؤشرات","٤ متميز","٣ متقدم","٢ متوسط","١ يحتاج دعمًا"].map((h,j)=>cell(p(h,{after:0,size:17,bold:true,color:BRAND,align:j>1?AlignmentType.CENTER:AlignmentType.START}),cols[j],{fill:SOFT}))});
  const rows=AXES.map(([a,ind])=>new TableRow({cantSplit:true,children:[
    cell(p(a,{after:0,size:18,bold:true}),cols[0]),cell(p(ind,{after:0,size:16,color:"5B6675"}),cols[1]),
    ...[2,3,4,5].map(j=>cell(p("☐",{after:0,size:24,align:AlignmentType.CENTER}),cols[j]))]}));
  const total=new TableRow({children:[
    new TableCell({columnSpan:2,width:{size:cols[0]+cols[1],type:WidthType.DXA},borders,shading:{type:ShadingType.CLEAR,color:"auto",fill:SOFT},margins:{top:60,bottom:60,left:100,right:100},children:[p("المجموع ( ـــــ / ٢٠ )      المتوسط ( ـــــ / ٤ )",{after:0,size:18,bold:true,color:BRAND})]}),
    new TableCell({columnSpan:4,width:{size:4000,type:WidthType.DXA},borders,margins:{top:60,bottom:60,left:100,right:100},children:[p("١٨–٢٠ متميز · ١٤–١٧ متقدم · ١٠–١٣ متوسط · أقل من ١٠ يحتاج دعمًا",{after:0,size:15,color:"5B6675"})]})]});
  return new Table({visuallyRightToLeft:true,width:{size:9638,type:WidthType.DXA},columnWidths:cols,layout:TableLayoutType.FIXED,rows:[hdr,...rows,total]});
}

const PREV=V.PREV;
function followUp(t,prevForm){
  const pr=PREV[t];
  const recCell=prevForm?[p(`التوصية المكتوبة في النموذج رقم ( ${prevForm.n} ) لهذه المعلمة — ${fmt(prevForm.date)} / ${hijS(prevForm.date)}`,{after:0,size:18,bold:true}),p("تُنقل هنا من خانة «التوصيات» في ذلك النموذج: ...........................................",{after:0,size:16,color:"5B6675"})]
    :pr?[p(pr.text,{after:0,size:18,bold:true}),p(`(${pr.src} — ${fmt(pr.date)} / ${hijS(pr.date)})`,{after:0,size:15,color:"5B6675"})]
                  :[p("لا توجد توصية مسجلة في السجل — تُكتب هنا إن وُجدت: ...........................................",{after:0,size:17,color:"5B6675"})];
  const cols=[2400,7238];
  const lab=t=>cell(p(t,{after:0,size:20,bold:true,color:BRAND}),cols[0],{fill:SOFT});
  return new Table({visuallyRightToLeft:true,width:{size:9638,type:WidthType.DXA},columnWidths:cols,layout:TableLayoutType.FIXED,rows:[
    new TableRow({height:{value:430,rule:HeightRule.ATLEAST},children:[lab("التوصية السابقة"),cell(recCell,cols[1])]}),
    new TableRow({height:{value:430,rule:HeightRule.ATLEAST},children:[lab("مستوى التنفيذ"),cell(p("☐ نُفّذت     ☐ نُفّذت جزئيًا     ☐ لم تُنفّذ          الشاهد / الملاحظة: ................................",{after:0,size:18}),cols[1])]})]});
}
function visitPage(n,v){
  v=v||{};
  return [new Paragraph({children:[new PageBreak()]}),
    h3("نموذج توثيق زيارة صفية رقم ( "+n+" )"+(v.teacher?"  —  "+v.teacher:"")+(v.teacher&&clsFor(v)!=="غير مصنفة"?"  ("+clsFor(v)+")":""),"form"+n),
    table([2400,2419,2400,2419],[
      ["تاريخ الزيارة",v.date?[p(`${day(v.date)} ${greg(v.date)}`,{after:0,size:20}),p(hij(v.date),{after:0,size:17,color:"5B6675"})]:"","اسم المعلمة",v.teacher||""],
      ["المادة",v.subject&&v.subject!=="—"?v.subject:"","الصف / الفصل",v.cls||""],
      ["الحصة",v.period||"","نوع الزيارة",v.type||"☐ استطلاعية  ☐ تقويمية  ☐ متابعة  ☐ تبادلية"],
      ["عنوان الدرس","","التقدير العام","☐ متميز ☐ متقدم ☐ متوسط ☐ يحتاج دعمًا"]],{header:false,h:440,labels:true}),
    h3("متابعة توصية الزيارة السابقة"),
    followUp(v.teacher,v.prevForm),
    h3("بطاقة الملاحظة الصفية"),
    obsCard(),
    h3("صور الزيارة"),
    new Table({visuallyRightToLeft:true,width:{size:9638,type:WidthType.DXA},columnWidths:[4819,4819],layout:TableLayoutType.FIXED,
      rows:[new TableRow({height:{value:1400,rule:HeightRule.EXACT},children:[photoBox("صورة ١"),photoBox("صورة ٢")]}),
            new TableRow({height:{value:1400,rule:HeightRule.EXACT},children:[photoBox("صورة ٣"),photoBox("صورة ٤")]})]}),
    sp(),
    table([4819,4819],[["نقاط القوة","التوصيات (تُتابع في الزيارة القادمة)"],["",""]],{h:1000}),
    table([4819,4819],[["توقيع المعلمة: ....................................","توقيع الزائر: ...................................."]],{header:false,h:500}),
  ];
}
// shade label cells in visit info tables: post-process not needed; keep simple.
const sec3=[new Paragraph({children:[new PageBreak()]}),h("٣","توثيق الزيارات بالصور","sec3"),
  p("لكل زيارة صفحة مستقلة: املأ بياناتها، ثم أدرج صور الزيارة داخل المربعات (إدراج ← صورة) أو الصقها مباشرة، ثم اكتب نقاط القوة والتوصيات ووقّع. ولإضافة زيارة جديدة انسخ صفحة نموذج والصقها في نهاية السجل.",{color:"5B6675",size:20}),
  p(`نموذج لكل زيارة مجدولة قادمة (${formVisits().length} نموذجًا لـ ${new Set(formVisits().map(v=>v.teacher)).size} معلمة)، مُعبّأ ببياناتها من جدول الزيارات ومرتب حسب التاريخ. الزيارة الثانية فما بعد للمعلمة نفسها تحيل في «متابعة التوصية السابقة» إلى نموذجها السابق.`,{color:"5B6675",size:20}),
  ...formVisits().flatMap((v,i)=>visitPage(i+1,v))];

// item 13: visits documented in the online record (photos embedded when exported to tools/web-export/assets)
const AX_KEYS=[["plan","التخطيط للدرس"],["delivery","تنفيذ الدرس"],["interaction","التفاعل الصفي"],["management","إدارة الصف"],["assessment","التقويم"]];
const LEVEL=["","يحتاج دعمًا","متوسط","متقدم","متميز"];
function imgRun(file,w){
  const buf=fs.readFileSync(file), ext=file.split('.').pop().toLowerCase();
  let iw=4,ih=3; try{ if(ext==="png"){iw=buf.readUInt32BE(16);ih=buf.readUInt32BE(20);} else { for(let i=2;i<buf.length;){ if(buf[i]!==0xFF){i++;continue;} const m=buf[i+1]; if(m>=0xC0&&m<=0xC3){ih=buf.readUInt16BE(i+5);iw=buf.readUInt16BE(i+7);break;} i+=2+buf.readUInt16BE(i+2);} } }catch(e){}
  return new ImageRun({type:ext==="png"?"png":ext==="gif"?"gif":"jpg",data:buf,transformation:{width:w,height:Math.round(w*ih/iw)}});
}
function webVisitBlock(v,i){
  const sc=v.scores||{}, tot=Object.values(sc).reduce((a,b)=>a+b,0), n=Object.keys(sc).length;
  const out=[ ...(i?[new Paragraph({children:[new PageBreak()]})]:[]),
    h3(`زيارة موثقة ( ${i+1} )  —  ${v.teacher}`,"web"+(i+1)),
    table([2400,2419,2400,2419],[
      ["تاريخ الزيارة",[p(`${day(v.date)} ${greg(v.date)}`,{after:0,size:20}),p(hij(v.date),{after:0,size:17,color:"5B6675"})],"اسم المعلمة",v.teacher||""],
      ["المادة",v.subject||"","الصف / الفصل",v.grade||""],
      ["الحصة",v.period||"","نوع الزيارة",v.type||""],
      ["عنوان الدرس",v.lesson||"","التقدير العام",v.rating?LEVEL[v.rating]:"—"]],{header:false,h:440,labels:true}),
    h3("بطاقة الملاحظة الصفية"),
    table([3400,1600,4638],[["المحور","الدرجة (من ٤)","المستوى"],...AX_KEYS.map(([k,a])=>[a,sc[k]?String(sc[k]):"—",sc[k]?LEVEL[sc[k]]:"—"]),
      ["المجموع",n?`${tot} / ٢٠`:"—",n===5?LEVEL[tot>=18?4:tot>=14?3:tot>=10?2:1]:"لم تكتمل المحاور"]]),
    h3("متابعة توصية الزيارة السابقة"),
    table([2400,7238],[["التوصية السابقة",v.prevRec?`${v.prevRec.text} (${fmt(v.prevRec.date)})`:"لا توجد"],["مستوى التنفيذ",v.followUp||"—"]],{header:false,labels:true}),
    table([4819,4819],[["نقاط القوة","التوصيات"],[v.strengths||"—",v.notes||"—"]]),
  ];
  if((v.photos||[]).length){
    out.push(h3(`صور الزيارة (${v.photos.length})`));
    if(v.photoFiles.length){
      const rows=[]; for(let k=0;k<v.photoFiles.length;k+=2) rows.push(new TableRow({children:[0,1].map(j=>new TableCell({width:{size:4819,type:WidthType.DXA},borders,margins:{top:60,bottom:60,left:60,right:60},
        children:[new Paragraph({alignment:AlignmentType.CENTER,children:v.photoFiles[k+j]?[imgRun(v.photoFiles[k+j],300)]:[]})]}))}));
      out.push(new Table({visuallyRightToLeft:true,width:{size:9638,type:WidthType.DXA},columnWidths:[4819,4819],layout:TableLayoutType.FIXED,rows}));
    } else out.push(p("الصور محفوظة في السجل الإلكتروني ولم تُنزَّل مع هذا التصدير.",{size:18,color:"5B6675"}));
  }
  return out;
}
const webVisits=(V.web&&V.web.visits)||[];
const sec4=[new Paragraph({children:[new PageBreak()]}),h("٤","الزيارات الموثقة في السجل الإلكتروني","sec4"),
  p(V.web?`مصدرها صفحة «سجل الزيارات الصفية» الإلكترونية — تصدير ${greg(V.web.asOf)} الموافق ${hij(V.web.asOf)}. تُوثَّق الزيارة من الجوال (البيانات وبطاقة الملاحظة والصور) فتظهر هنا عند إعادة بناء الملف.`
    :"لم يُصدَّر السجل الإلكتروني بعد. تُوثَّق الزيارات من الجوال في صفحة «سجل الزيارات الصفية» الإلكترونية، ثم يُعاد بناء هذا الملف فتظهر هنا ببطاقاتها وصورها.",{color:"5B6675",size:20}),
  ...(webVisits.length?webVisits.flatMap((v,i)=>webVisitBlock(v,i)):[p("لا توجد زيارات موثقة إلكترونيًا حتى تاريخ التصدير.",{size:20,bold:true,color:ACC,before:200})])];

// ---- section 5: visit forms pulled from Google Drive (rebuilt as editable tables) ----
// A) «استمارة زيارة معلم» — company form ع-7-004 الإشراف التربوي (Drive: نموذج زيارة صفية من المشرف التربوي الزائر.docx)
const OFF=[["تخطيط السبورة",8,[["التاريخ",1],["المادة",1],["موضوع الدرس",1],["تنظيم السبورة",3],["فاعلية الاستخدام",2]]],
  ["الوسائل",14,[["حاجة الدرس لوسيلة",3],["وجود الوسيلة",3],["توظيف الوسيلة",3],["الوسائل الحديثة",3],["وسائل أخرى تُذكر",2]]],
  ["التهيئة والغلق",10,[["مراجعة السابق",2],["التمهيد للدرس",2],["وقت التهيئة",2],["فاعلية التهيئة",2],["غلق الدرس",2]]],
  ["سير الحصة",14,[["الاستراتيجية المستخدمة",4],["مراعاة الفروق الفردية",4],["وضوح الصوت",2],["تنفيذ التقويم بمراحله",4],["استراتيجيات أخرى",0]]],
  ["مشاركة الطالبات",14,[["المتميزات",4],["الأقل أداءً",4],["الالتزام بقواعد الصف",3],["إدارة الفصل بكفاءة",3]]],
  ["الإعداد الذهني والكتابي",14,[["التحضير الذهني",4],["سجل التحضير",4],["خطة المنهج",2],["كفاءة التحضير",2],["تعزيز الانتماء الوطني وقيم النبوة",2]]],
  ["متابعة دفاتر الطالبات",12,[["إعطاء الواجبات بانتظام",3],["تصحيح الواجبات",3],["تصحيح الكتاب",3],["تفعيل أوراق العمل",3]]],
  ["أخرى",14,[["لغة واضحة للطالبات",3],["استخدام سجل المتابعة",3],["تنظيم وقت الحصة",3],["الالتزام بأخلاقيات المهنة",2],["تنفيذ التوصيات السابقة",3]]]];
function officialForm(){
  const cols=[1900,800,5338,800,800];
  const rows=OFF.map(([k,w,els])=>new TableRow({cantSplit:true,children:[
    cell(p(k,{after:0,size:18,bold:true}),cols[0],{fill:SOFT}),cell(p(String(w),{after:0,size:18,bold:true,align:AlignmentType.CENTER}),cols[1]),
    cell(p(els.map(([e,n])=>n?`${e} (${n})`:e).join("  ·  "),{after:0,size:16}),cols[2]),
    cell(p("",{after:0}),cols[3]),cell(p("",{after:0}),cols[4])]}));
  const hdr=new TableRow({tableHeader:true,children:["بند التقييم","الدرجة","عناصر التقييم (درجة كل عنصر)","التقييم","شواهد"].map((h,j)=>cell(h,cols[j],{fill:SOFT,bold:true,color:BRAND,size:18}))});
  const tot=new TableRow({children:[cell(p("المجموع",{after:0,size:18,bold:true,color:BRAND}),cols[0],{fill:SOFT}),cell(p("100",{after:0,size:18,bold:true,align:AlignmentType.CENTER}),cols[1]),
    cell(p("نسبة تحصيل الطالبات: ( ______ / 100% )   ملاحظة: ................................",{after:0,size:16}),cols[2]),cell(p("",{after:0}),cols[3]),cell(p("",{after:0}),cols[4])]});
  return [new Paragraph({children:[new PageBreak()]}),
    h3("أ) استمارة زيارة معلمة — نموذج الإشراف التربوي (ع-7-004)","app1"),
    p("المصدر: «نموذج زيارة صفية من المشرف التربوي الزائر» في Google Drive — نسخة فارغة قابلة للتعبئة.",{size:16,color:"5B6675"}),
    table([1700,2119,1700,2119,1000,1000],[["اسم المعلمة","","التخصص","","الصف",""],["القسم","","سنوات الخدمة","","الزيارة",""],["نوع الزيارة","","النصاب التدريسي","","اليوم والتاريخ",""],["الموضوع","","الهدف من الزيارة","","",""]],{header:false,h:400,labels:true}),
    sp(),
    new Table({visuallyRightToLeft:true,width:{size:9638,type:WidthType.DXA},columnWidths:cols,layout:TableLayoutType.FIXED,rows:[hdr,...rows,tot]}),
    sp(),
    table([3212,3213,3213],[["نقاط القوة","فرص التحسين","مقترحات تطويرية"],["","",""]],{h:1100}),
    sp(),
    table([3212,3213,3213],[["المشرفة التربوية: ........................","المعلمة: ........................","مديرة المدارس: ........................"],["التوقيع: ........................","التوقيع: ........................","التوقيع: ........................"]],{header:false,h:420}),
    p("الختم:",{size:18,before:120})];
}
// B) «استمارة تبادل الزيارات» — merged from Drive: استمارة زيارة تبادلية.doc + استمارة تبادل زيارات.docx
const EXCH=["وضوح أهداف الدرس","تسلسل خطوات الدرس","وضوح وفصاحة الصوت","مناسبة طريقة التدريس","جودة الأسئلة التي تُلقى على الطالبات","مهارة توزيع الأسئلة على الطالبات",
  "تقبّل المعلمة لآراء ومشاركات الطالبات","جذب انتباه الطالبات","استخدام عبارات التشجيع والتعزيز","تمكّن المعلمة من المادة العلمية","استثمار وقت الحصة","شخصية المعلمة",
  "ضبط الطالبات وإدارة الصف","استخدام السبورة وتنظيمها","توظيف الوسائل والتقنية المناسبة للدرس","تنفيذ نشاطات المادة","تقييم الدرس في نهاية الحصة","رصد وتسجيل مشاركات الطالبات"];
function exchangeForm(n,pair){
  const [vis,cl,host,sub]=pair||["","","",""];
  const cols=[500,4338,950,950,950,950,1000];
  const hdr=new TableRow({tableHeader:true,children:["م","المجال","ممتاز","جيد جدًا","جيد","لم ينفذ","ملحوظات"].map((h,j)=>cell(p(h,{after:0,size:17,bold:true,color:BRAND,align:j>1?AlignmentType.CENTER:AlignmentType.START}),cols[j],{fill:SOFT}))});
  const rows=EXCH.map((e,i)=>new TableRow({cantSplit:true,children:[cell(p(String(i+1),{after:0,size:16,align:AlignmentType.CENTER}),cols[0]),cell(p(e,{after:0,size:16}),cols[1]),
    ...[2,3,4,5].map(j=>cell(p("☐",{after:0,size:18,align:AlignmentType.CENTER}),cols[j])),cell(p("",{after:0}),cols[6])]}));
  return [new Paragraph({children:[new PageBreak()]}),
    h3(`ب) استمارة تبادل الزيارات${pair?` ( ${n} )  —  ${vis} ← ${host}`:" (نسخة فارغة)"}`,"app2_"+n),
    p(pair?`ترشيح من قسم «ترشيحات الزيارات التبادلية»: ${vis} (${cl}) تزور ★ ${host} — ${sub}.`:"المصدر: استمارتا تبادل الزيارات في Google Drive، مدمجتان في نموذج واحد.",{size:16,color:"5B6675"}),
    table([1600,1613,1600,1613,1600,1612],[["المعلمة الزائرة",vis,"المعلمة المزارة",host,"المادة",sub.split(" — ")[0]||""],["الصف والفصل","","التاريخ واليوم","","موضوع الدرس / الاستراتيجية",""]],{header:false,h:420,labels:true}),
    table([2400,7238],[["الهدف من الزيارة",pair?`اكتساب ممارسات متميزة من المعلمة المستضيفة في ${sub.split(" — ")[0]} ونقلها إلى صف المعلمة الزائرة.`:""]],{header:false,h:420,labels:true}),
    h3("عناصر التقويم"),
    new Table({visuallyRightToLeft:true,width:{size:9638,type:WidthType.DXA},columnWidths:cols,layout:TableLayoutType.FIXED,rows:[hdr,...rows]}),
    sp(),
    table([4819,4819],[["الملاحظات الإيجابية للمعلمة الزائرة","الممارسات التي ستطبقها المعلمة الزائرة في صفها"],["",""]],{h:850}),
    table([3212,3213,3213],[["المعلمة الزائرة: ..................","المعلمة المزارة: ..................","المشرفة التربوية: .................."]],{header:false,h:420})];
}
const sec5=[new Paragraph({children:[new PageBreak()]}),h("٥","ملاحق: نماذج الزيارات","sec5"),
  p("نماذج الزيارات المحفوظة في Google Drive، أُعيد بناؤها جداول قابلة للتعبئة بتنسيق السجل: استمارة زيارة المعلمة المعتمدة في الإشراف التربوي (ع-7-004)، واستمارة تبادل الزيارات مُعبّأة لكل زوج مرشح في قسم «ترشيحات الزيارات التبادلية» مع نسخة فارغة.",{color:"5B6675",size:20}),
  ...officialForm().slice(1),
  ...PAIRS.flatMap((pr,i)=>exchangeForm(i+1,pr)),
  ...exchangeForm(PAIRS.length+1,null)];

const doc=new Document({styles:{default:{document:{run:{font:FONT,size:24,rightToLeft:true}}}},
  sections:[{properties:{titlePage:true,page:{margin:{top:1300,bottom:1134,left:1134,right:1134,header:560,footer:500}}},
    headers:{first:new Header({children:[p("",{after:0})]}),default:new Header({children:[new Paragraph({bidirectional:true,alignment:AlignmentType.CENTER,spacing:{after:0},
      border:{bottom:{style:BorderStyle.SINGLE,size:6,color:BRAND,space:4}},
      children:[r(SCHOOL,{size:17,bold:true,color:BRAND}),r("   ·   سجل الزيارات الصفية   ·   العام الدراسي "+YEAR,{size:17,color:"5B6675"})]})]})},
    footers:{first:new Footer({children:[p("",{after:0})]}),default:new Footer({children:[new Paragraph({bidirectional:true,alignment:AlignmentType.CENTER,spacing:{after:0},
      children:[new TextRun({rightToLeft:true,font:FONT,size:18,color:"5B6675",children:["صفحة ",PageNumber.CURRENT," من ",PageNumber.TOTAL_PAGES]})]})]})},
    children:[...cover,...sec1,...sec2,...sec3,...sec4,...sec5]}]});
const OUT=__dirname+'/../سجل-الزيارات-الصفية.docx';
if(process.env.DUMP_TOC){fs.writeFileSync(process.env.DUMP_TOC,JSON.stringify(TOCITEMS.map(([id,t])=>[id,id.startsWith('form')?t.split('  (')[0].replace(/^نموذج (\d+) — /,'نموذج توثيق زيارة صفية رقم ( $1 )  —  '):id.startsWith('web')?t.split('  (')[0].replace(/^زيارة موثقة (\d+) — /,'زيارة موثقة ( $1 )  —  '):id==='app1'?'أ) استمارة زيارة معلمة':id.startsWith('app2_')?(+id.slice(5)<=PAIRS.length?`ب) استمارة تبادل الزيارات ( ${id.slice(5)} )`:'ب) استمارة تبادل الزيارات (نسخة فارغة)'):t.replace(/^[١٢٣٤٥]\. /,'')]),null,0));process.exit(0);}
Packer.toBuffer(doc).then(b=>{fs.writeFileSync(OUT,b);require('child_process').execFileSync('python3',[__dirname+'/rtl_tables.py',OUT],{stdio:'inherit'});});
