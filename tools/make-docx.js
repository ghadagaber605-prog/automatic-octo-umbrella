const fs=require('fs');
const {Document,Packer,Paragraph,TextRun,Table,TableRow,TableCell,WidthType,AlignmentType,ShadingType,BorderStyle,HeadingLevel,PageBreak,VerticalAlign,LevelFormat,TableLayoutType,HeightRule}=require('docx');
const BRAND="0F5F5C", SOFT="E3F0EE", ACC="B7791F", ACCSOFT="FBF1E1", LINE="BFB9AD";
const FONT="Arial", W=9638; // A4 text width with 1" margins ≈ 9638? (11906-2*1134)
const r=(t,o={})=>new TextRun({text:t,rightToLeft:true,font:FONT,size:o.size||24,bold:o.bold,color:o.color});
const p=(t,o={})=>new Paragraph({bidirectional:true,alignment:o.align||AlignmentType.START,spacing:{after:o.after??120,before:o.before??0},children:Array.isArray(t)?t:[r(t,o)],...(o.extra||{})});
const h=(num,t)=>new Paragraph({bidirectional:true,heading:HeadingLevel.HEADING_1,alignment:AlignmentType.START,spacing:{before:240,after:160},
  border:{bottom:{style:BorderStyle.SINGLE,size:12,color:BRAND,space:4}},children:[r(num+"  ",{size:34,bold:true,color:ACC}),r(t,{size:34,bold:true,color:BRAND})]});
const h3=t=>new Paragraph({bidirectional:true,heading:HeadingLevel.HEADING_2,alignment:AlignmentType.START,spacing:{before:240,after:100},children:[r(t,{size:28,bold:true,color:BRAND})]});
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
// one form per teacher: her next upcoming visit (from today), else her most recent one
function formVisits(){
  const by=new Map();
  for(const v of V.all){(by.get(v.teacher)||by.set(v.teacher,[]).get(v.teacher)).push(v);}
  const pick=[...by.values()].map(vs=>vs.find(v=>v.date>="2026-11-01")||vs[vs.length-1]);
  return pick.sort((a,b)=>a.date.localeCompare(b.date)||(+a.period||9)-(+b.period||9));
}

const stageOf=c=>/روضة|المستوى|تمهيدي/.test(c)?"رياض الأطفال":/ثنائي/.test(c)?"ابتدائي (ثنائي اللغة)":/ث$|ثانوي/.test(c)?"ثانوي":/م$|متوسط$|^\S+ متوسط/.test(c)&&!/\//.test(c)?"متوسط":/\//.test(c)?"متوسط / ثانوي":/ب$|ابتدائي|^(أول|ثاني|ثالث|رابع|خامس|سادس)$/.test(c)?"ابتدائي":"غير محدد";
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
function summaryPage(){
  const done=cnt("تمت"),over=cnt("لم تُوثّق"),up=cnt("مجدولة"),due=done+over,rate=Math.round(100*done/due);
  const teachers=[...new Set(V.all.map(v=>v.teacher))];
  const never=teachers.filter(t=>!V.all.some(v=>v.teacher===t&&v.status==="تمت"));
  // per-teacher rows
  const tRows=teachers.map(t=>{const vs=V.all.filter(v=>v.teacher===t);const d=vs.filter(v=>v.status==="تمت");const o=vs.filter(v=>v.status==="لم تُوثّق").length,u=vs.filter(v=>v.status==="مجدولة").length;
    const last=d.length?fmt(d[d.length-1].date):"لا يوجد";const nxt=vs.find(v=>v.status==="مجدولة");
    return {t,n:vs.length,d:d.length,o,u,last,nxt:nxt?fmt(nxt.date):"—"};}).sort((a,b)=>a.d-b.d||b.o-a.o);
  const tc=[2000,1000,1000,1150,1100,1700,1688];
  const tTable=new Table({visuallyRightToLeft:true,width:{size:9638,type:WidthType.DXA},columnWidths:tc,layout:TableLayoutType.FIXED,
    rows:[new TableRow({tableHeader:true,children:["المعلمة","الإجمالي","تمت","لم تُوثّق","مجدولة","آخر زيارة موثقة","الزيارة القادمة"].map((h,j)=>cell(h,tc[j],{fill:SOFT,bold:true,color:BRAND,size:18}))}),
      ...tRows.map(r=>new TableRow({cantSplit:true,children:[r.t,String(r.n),String(r.d),String(r.o),String(r.u),r.last,r.nxt].map((x,j)=>cell(p(x,{after:0,size:18,bold:j===0,color:j===5&&r.d===0?"A83232":undefined}),tc[j],{fill:r.d===0?"FDF0DC":undefined}))}))]});
  const stages=["رياض الأطفال","ابتدائي","ابتدائي (ثنائي اللغة)","متوسط","ثانوي","متوسط / ثانوي","غير محدد"].filter(k=>V.all.some(v=>stageOf(v.cls)===k));
  const types=[...new Set(V.all.map(v=>v.type))];
  return [
    h3("ملخص الإنجاز ومقارنته بالمستهدف"),
    p(`حتى ${fmt("2026-11-01")} 2026 · المصدر: جدول الزيارات في هذا السجل (سجلّ الزيارات الصفية + سجل زيارات خارطة التعليم والتعلم).`,{size:18,color:"5B6675"}),
    kpiRow([[V.all.length,"إجمالي الزيارات المخططة"],[due,"زيارات حلّ موعدها"],[done,"زيارات موثقة","2F7D46","E5F3E9"],[over,"مضى موعدها ولم تُوثّق","A15C07","FDF0DC"],[up,"زيارات قادمة"]]),
    sp(),
    kpiRow([[rate+"%","نسبة التوثيق من الزيارات التي حلّ موعدها",rate>=90?"2F7D46":"A83232"],["90%","المستهدف في الخطة التشغيلية (برنامج 20)"],[teachers.length,"معلمة في الخطة"],[never.length,"معلمات بلا زيارة موثقة","A83232","FDF0DC"]]),
    p(`الفجوة عن المستهدف: ${90-rate} نقطة مئوية. تُحسب النسبة = الزيارات الموثقة ÷ الزيارات التي حلّ موعدها. ترتفع بعد تحديث حالة الزيارات غير الموثقة في جدول الزيارات. مرجع المستهدف: خطة المتابعة الصفية المنتظمة (57 زيارة شهريًا بمعدل 3 زيارات يوميًا، والمستهدف ≥ 90%).`,{size:18,color:"5B6675",before:80}),
    h3("الزيارات حسب المعلمة"),
    p("مرتبة من الأقل توثيقًا. الصفوف المظللة: معلمات لم تُوثّق لهن أي زيارة بعد — أولوية في الأسبوع القادم.",{size:18,color:"5B6675"}),
    tTable,
    h3("الزيارات حسب المرحلة"),
    countTable("المرحلة",v=>stageOf(v.cls),stages),
    h3("الزيارات حسب نوع الزيارة"),
    countTable("نوع الزيارة",v=>v.type,types),
  ];
}

function visitsTable(){
  const cols=[450,1450,1550,1350,1050,650,1300,1838];
  const fills={"تمت":"E5F3E9","لم تُوثّق":"FDF0DC","مجدولة":null};
  const sc={"تمت":"2F7D46","لم تُوثّق":"A15C07","مجدولة":"0F5F5C"};
  const c=(t,w,o={})=>cell(p(t,{after:0,size:18,bold:o.bold,color:o.color,align:o.align}),w,{fill:o.fill});
  const head=new TableRow({tableHeader:true,children:["م","التاريخ","اسم المعلمة","المادة","الصف","الحصة","نوع الزيارة","الحالة"].map((h,j)=>cell(h,cols[j],{fill:SOFT,bold:true,color:BRAND,size:18}))});
  const rows=V.all.map((v,i)=>new TableRow({cantSplit:true,children:[
    c(String(i+1),cols[0],{align:AlignmentType.CENTER}),
    c(`${day(v.date)} ${fmt(v.date)}`,cols[1]),
    c(v.teacher,cols[2],{bold:true}),
    c(v.subject,cols[3]),c(v.cls,cols[4]),c(v.period||"—",cols[5],{align:AlignmentType.CENTER}),
    c(v.type,cols[6],{color:v.src==="الخارطة"?ACC:undefined,bold:v.src==="الخارطة"}),
    v.status==="لم تُوثّق"
      ? cell([p("لم تُوثّق",{after:0,size:16,bold:true,color:sc[v.status]}),p("☐ تمت  ☐ مؤجلة  ☐ ملغاة",{after:0,size:16})],cols[7],{fill:fills[v.status]})
      : c(v.status,cols[7],{bold:true,color:sc[v.status],fill:fills[v.status]||undefined}),
  ]}));
  return new Table({visuallyRightToLeft:true,width:{size:9638,type:WidthType.DXA},columnWidths:cols,layout:TableLayoutType.FIXED,rows:[head,...rows]});
}

const sp=()=>p("",{after:60});

// Cover
const cover=[
  new Paragraph({bidirectional:true,alignment:AlignmentType.CENTER,spacing:{before:1600,after:200},children:[r("سجل الزيارات الصفية",{size:64,bold:true,color:BRAND})]}),
  p("أداة لتخطيط الزيارات الصفية ومتابعتها وتوثيقها بالصور",{align:AlignmentType.CENTER,size:28,color:"5B6675",after:800}),
  table([3000,6638],[["اسم المدرسة",""],["العام الدراسي",""],["الزائر (المدير / المشرف / الوكيل)",""],["تاريخ بدء السجل",""]],{header:false,h:600,labels:true}),
  new Paragraph({children:[new PageBreak()]}),
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
const sec1=[h("١","أهداف السجل"),p("يهدف سجل الزيارات الصفية إلى ما يلي:",{color:"5B6675"}),
  table([700,2800,6138],[["م","الهدف","التوضيح"],...goals.map((g,i)=>[{...cell,opts:{}}&&String(i+1),g[0],g[1]])].map((row,i)=>i===0?row:row.map((c,j)=>j===1?p(c,{after:0,bold:true,size:22}):c)))];

// 2 Plan
const sec2=[new Paragraph({children:[new PageBreak()]}),h("٢","خطة الزيارات الصفية"),
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
  h3("جدول الزيارات"),
  p(`مصدر البيانات: سجلّ الزيارات الصفية الإلكتروني وسجل زيارات خارطة التعليم والتعلم — حتى ${fmt("2026-11-01")}. إجمالي الزيارات: ${V.all.length} · تمت: ${cnt("تمت")} · مجدولة قادمة: ${cnt("مجدولة")} · مضى موعدها ولم تُوثّق: ${cnt("لم تُوثّق")}.`,{size:20,color:"5B6675"}),
  visitsTable(),
  p("الحالة: «تمت» زيارة موثقة · «مجدولة» موعدها قادم · «لم تُوثّق» مضى موعدها دون تسجيل تنفيذها — ضعي علامة على ما حدث فعلًا: تمت (نُفّذت ولم تُسجَّل) أو مؤجلة (تُنقل لموعد جديد) أو ملغاة. نوع «خارطة التعليم والتعلم» = حضور درس مصمم وفق الخارطة.",{size:18,color:"5B6675",before:80}),
];

// 3 Documentation: one page per visit, 3 visit forms
const photoBox=(label)=>new TableCell({width:{size:4819,type:WidthType.DXA},borders:{top:{style:BorderStyle.DASHED,size:8,color:BRAND},bottom:{style:BorderStyle.DASHED,size:8,color:BRAND},left:{style:BorderStyle.DASHED,size:8,color:BRAND},right:{style:BorderStyle.DASHED,size:8,color:BRAND}},
  shading:{type:ShadingType.CLEAR,color:"auto",fill:SOFT},verticalAlign:VerticalAlign.CENTER,
  children:[p("📷",{align:AlignmentType.CENTER,size:40,after:60}),p(label,{align:AlignmentType.CENTER,size:22,color:BRAND,bold:true,after:0}),p("(إدراج ← صورة)",{align:AlignmentType.CENTER,size:18,color:"5B6675",after:0})]});

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

function visitPage(n,v){
  v=v||{};
  return [new Paragraph({children:[new PageBreak()]}),
    h3("نموذج توثيق زيارة صفية رقم ( "+n+" )"+(v.teacher?"  —  "+v.teacher:"")),
    table([2400,2419,2400,2419],[
      ["تاريخ الزيارة",v.date?`${day(v.date)} ${fmt(v.date)} 2026`:"","اسم المعلمة",v.teacher||""],
      ["المادة",v.subject&&v.subject!=="—"?v.subject:"","الصف / الفصل",v.cls||""],
      ["الحصة",v.period||"","نوع الزيارة",v.type||"☐ استطلاعية  ☐ تقويمية  ☐ متابعة  ☐ تبادلية"],
      ["عنوان الدرس","","التقدير العام","☐ متميز ☐ متقدم ☐ متوسط ☐ يحتاج دعمًا"]],{header:false,h:520,labels:true}),
    h3("بطاقة الملاحظة الصفية"),
    obsCard(),
    h3("صور الزيارة"),
    new Table({visuallyRightToLeft:true,width:{size:9638,type:WidthType.DXA},columnWidths:[4819,4819],layout:TableLayoutType.FIXED,
      rows:[new TableRow({height:{value:1750,rule:HeightRule.EXACT},children:[photoBox("صورة ١"),photoBox("صورة ٢")]}),
            new TableRow({height:{value:1750,rule:HeightRule.EXACT},children:[photoBox("صورة ٣"),photoBox("صورة ٤")]})]}),
    sp(),
    table([4819,4819],[["نقاط القوة","التوصيات"],["",""]],{h:1150}),
    table([4819,4819],[["توقيع المعلمة: ....................................","توقيع الزائر: ...................................."]],{header:false,h:500}),
  ];
}
// shade label cells in visit info tables: post-process not needed; keep simple.
const sec3=[new Paragraph({children:[new PageBreak()]}),h("٣","توثيق الزيارات بالصور"),
  p("لكل زيارة صفحة مستقلة: املأ بياناتها، ثم أدرج صور الزيارة داخل المربعات (إدراج ← صورة) أو الصقها مباشرة، ثم اكتب نقاط القوة والتوصيات ووقّع. ولإضافة زيارة جديدة انسخ صفحة نموذج والصقها في نهاية السجل.",{color:"5B6675",size:20}),
  p("وُزّعت النماذج على المعلمات: نموذج لكل معلمة مُعبّأ ببيانات زيارتها القادمة في جدول الزيارات، ومرتبة حسب تاريخ الزيارة.",{color:"5B6675",size:20}),
  ...formVisits().flatMap((v,i)=>visitPage(i+1,v))];

const doc=new Document({styles:{default:{document:{run:{font:FONT,size:24,rightToLeft:true}}}},
  sections:[{properties:{page:{margin:{top:1134,bottom:1134,left:1134,right:1134}}},children:[...cover,...sec1,...sec2,...sec3]}]});
const OUT=__dirname+'/../سجل-الزيارات-الصفية.docx';
Packer.toBuffer(doc).then(b=>{fs.writeFileSync(OUT,b);require('child_process').execFileSync('python3',[__dirname+'/rtl_tables.py',OUT],{stdio:'inherit'});});
