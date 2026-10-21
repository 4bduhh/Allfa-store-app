const $=s=>document.querySelector(s),KEY="esevaiPro.v2",XP="Xerox & Print",GV="Government";
const money=n=>"₹"+Number(n||0).toLocaleString("en-IN",{maximumFractionDigits:2});
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const uid=()=>Math.random().toString(36).slice(2,8),dstr=t=>new Date(t).toLocaleDateString("en-CA"),today=()=>dstr(Date.now());
const ic=()=>window.lucide&&lucide.createIcons();
const DEF=()=>({services:[["Xerox – B/W (A4)",XP,2],["Xerox – B/W (A3)",XP,5],["Xerox – Colour (A4)",XP,10],["Print – B/W (A4)",XP,5],["Print – Colour (A4)",XP,15],["Scan to PDF / email",XP,10],["Lamination (A4)",XP,20],["Spiral binding",XP,40],["Passport photos (set)",XP,60],["Income Certificate",GV,100],["Community Certificate",GV,100],["Nativity Certificate",GV,100],["PAN Card",GV,150],["Smart Card",GV,100]].map(([name,cat,price])=>({id:uid(),name,cat,price})),bills:[],apps:[],reminders:[],seq:{b:1000,a:1000}});
let db;try{db=JSON.parse(localStorage.getItem(KEY))}catch{}db=db||DEF();db.reminders=db.reminders||[];try{const p=JSON.parse(localStorage.getItem("esevaiPro.prices"));if(Array.isArray(p)&&p.length)db.services=p}catch{}
const staff=()=>localStorage.getItem("esevaiPro.staff")||"Staff";
const wa=(p,m,k)=>p?`<a class="btn sm" ${k?`data-wa="${k}" `:""}target="_blank" rel="noopener" href="https://wa.me/91${p}?text=${encodeURIComponent(m)}">WhatsApp</a>`:"";
const save=()=>{db._ts=Date.now();localStorage.setItem(KEY,JSON.stringify(db));cloudPush()};

/* ---- templates, migration, helpers ---- */
const RN=[["No reminder",0],["After 6 months",6],["After 1 year",12],["After 2 years",24],["After 3 years",36],["After 5 years",60]];
const FL=["Docs pending","Submitted","Under process","Approved","Ready","Delivered"],ST=[...FL.slice(0,4),"Rejected",...FL.slice(4)];
const stc={"Docs pending":"t-wait",Submitted:"t-proc","Under process":"t-proc",Approved:"t-ok",Rejected:"t-due",Ready:"t-ok",Delivered:"t-done"};
const TPL=()=>[
 {name:"Income Certificate",docs:["Aadhaar card","Ration / Smart card","Passport photo","Income self-declaration","Mobile no. linked to Aadhaar"],gov:0,fee:100,days:15,renew:12},
 {name:"Community Certificate",docs:["Aadhaar card","Ration / Smart card","Father's community certificate","School TC / marksheet","Passport photo"],gov:0,fee:100,days:15,renew:0},
 {name:"Nativity Certificate",docs:["Aadhaar card","Ration / Smart card","School TC / 10th marksheet","Passport photo"],gov:0,fee:100,days:15,renew:0},
 {name:"Legal Heir Certificate",docs:["Death certificate","Aadhaar of all heirs","Ration / Smart card","Applicant photo","Relationship proof"],gov:0,fee:150,days:30,renew:0},
 {name:"Aadhaar Update",docs:["Aadhaar card","Proof of change (address / DOB / name)","Mobile number"],gov:50,fee:30,days:7,renew:0},
 {name:"PAN Card",docs:["Aadhaar card","Passport photo","Signature","Mobile number"],gov:0,fee:150,days:15,renew:0},
 {name:"Voter ID",docs:["Aadhaar card","Passport photo","Age proof","Address proof"],gov:0,fee:100,days:30,renew:0},
 {name:"Ration Card",docs:["Aadhaar of all members","Address proof","Passport photo","Gas connection proof"],gov:0,fee:100,days:30,renew:0},
 {name:"Patta / Chitta",docs:["Survey no. / old patta copy","Aadhaar card","Land document copy"],gov:0,fee:100,days:7,renew:0}];
db.tpl=db.tpl&&db.tpl.length?db.tpl:TPL();db.sent=db.sent||{};db.msgs=db.msgs||{};
db.apps.forEach(a=>{a.status={Pending:"Submitted",Processing:"Under process"}[a.status]||a.status;a.docs=a.docs||[];a.log=a.log||[];a.upd=a.upd||a.ts;a.gov=a.gov||0;a.charge=a.charge||0});
Object.keys(db.sent).forEach(k=>{if(db.sent[k]!==today())delete db.sent[k]});
const addD=(s,n)=>dstr(new Date(s+"T12:00:00").getTime()+n*864e5),addM=(s,n)=>{const d=new Date(s+"T12:00:00");d.setMonth(d.getMonth()+n);return dstr(d)};
const logA=(a,m)=>a.log.push({t:Date.now(),by:staff(),m});
function setStatus(a,s){if(a.status===s)return;logA(a,`Status: ${a.status} → ${s}`);a.status=s;a.upd=Date.now();
  if(s==="Delivered"&&+a.renew){const dt=addM(today(),+a.renew);db.reminders.push({id:uid(),kind:"renew",title:`Renewal: ${a.service} – ${a.customer}`,date:dt,name:a.customer,phone:a.phone,svc:a.service});logA(a,"Renewal reminder set for "+dt)}}
const okDeliver=a=>{const b=db.bills.find(x=>x.id===a.billId);return(!a.held||confirm("Original documents are still held at the shop. Mark delivered anyway?"))&&(!b||due(b)<=0||confirm("Balance "+money(due(b))+" is unpaid. Mark delivered anyway?"))};
function advance(a){const nx=a.status==="Rejected"?"Submitted":FL[FL.indexOf(a.status)+1];if(!nx)return false;
  if(a.status==="Docs pending"&&a.docs.some(x=>!x.ok)&&!confirm("Some documents are still missing. Mark as submitted anyway?"))return false;
  if(nx==="Delivered"&&!okDeliver(a))return false;setStatus(a,nx);save();toast(a.id+" → "+nx);return true}
/* message templates (Tamil / English, editable) */
const L=()=>localStorage.getItem("esevaiPro.lang")||"ta";
const DM={
 ready:{en:"Hello {name}, your {service} is ready. Please collect it from Allfa E-Sevai Maiyam.",ta:"வணக்கம் {name}, உங்கள் {service} தயாராக உள்ளது. Allfa E-Sevai Maiyam-ல் வந்து பெற்றுக்கொள்ளவும்."},
 docs:{en:"Hello {name}, for your {service} application we still need: {docs}. Please bring them to Allfa E-Sevai Maiyam.",ta:"வணக்கம் {name}, உங்கள் {service} விண்ணப்பத்திற்கு இன்னும் தேவை: {docs}. தயவுசெய்து Allfa E-Sevai Maiyam-ல் கொண்டு வரவும்."},
 status:{en:"Hello {name}, your {service} application ({ack}) is now: {status}. – Allfa E-Sevai Maiyam",ta:"வணக்கம் {name}, உங்கள் {service} விண்ணப்பம் ({ack}) தற்போதைய நிலை: {status}. – Allfa E-Sevai Maiyam"},
 rejected:{en:"Hello {name}, your {service} application was rejected: {reason}. Please visit us to resubmit.",ta:"வணக்கம் {name}, உங்கள் {service} விண்ணப்பம் நிராகரிக்கப்பட்டது: {reason}. மீண்டும் சமர்ப்பிக்க Allfa E-Sevai Maiyam-ல் வரவும்."},
 balance:{en:"Hello {name}, a balance of {amt} is pending at Allfa E-Sevai Maiyam (bill {bill}). Please pay when you visit.",ta:"வணக்கம் {name}, Allfa E-Sevai Maiyam-ல் ({bill}) {amt} பாக்கி உள்ளது. வரும்போது செலுத்தவும்."},
 renew:{en:"Hello {name}, your {service} is due for renewal around {date}. We can help you apply. – Allfa E-Sevai Maiyam",ta:"வணக்கம் {name}, உங்கள் {service} புதுப்பிக்க வேண்டிய நேரம் ({date}). நாங்கள் உதவுகிறோம். – Allfa E-Sevai Maiyam"},
 orig:{en:"Hello {name}, please collect your original documents from Allfa E-Sevai Maiyam.",ta:"வணக்கம் {name}, உங்கள் அசல் ஆவணங்களை Allfa E-Sevai Maiyam-ல் பெற்றுக்கொள்ளவும்."}};
const MN={ready:"Ready for pickup",docs:"Documents missing",status:"Status update",rejected:"Rejected",balance:"Balance due",renew:"Renewal",orig:"Return originals"};
const msg=(k,v)=>(db.msgs[k+L()]||DM[k][L()]).replace(/\{(\w+)\}/g,(_,x)=>v[x]??"");
const toast=m=>{const t=$("#toast");t.textContent=m;t.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove("show"),2500)};
const emp=(i,t,s)=>`<div class="empty"><i data-lucide="${i}"></i><b>${t}</b>${s}</div>`;
const tbl=(h,rows,e)=>rows.length?`<div class="tw"><table><thead><tr>${h.map(x=>`<th class="${x[0]==="#"?"n":""}">${x.replace("#","")}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`:e;
const closeM=()=>$("#modal").classList.remove("open");
const due=b=>b.total-b.paid,sum=(a,f)=>a.reduce((n,x)=>n+f(x),0);

function form(title,sub,fields,ok,fn){
  $("#mform").innerHTML=`<h2>${title}</h2><p class="sub">${sub}</p><div class="fg">${fields.map(f=>f.t==="html"?`<div class="full" id="${f.k}"></div>`:`<label class="${f.full?"full":""}">${f.l}${f.t==="select"?`<select name="${f.k}">${f.o.map(o=>`<option ${o===f.v?"selected":""}>${esc(o)}</option>`).join("")}</select>`:f.t==="area"?`<textarea name="${f.k}" rows="${f.r||2}">${esc(f.v??"")}</textarea>`:`<input name="${f.k}" type="${f.t||"text"}" value="${esc(f.v??"")}" ${f.req?"required":""} ${f.pat?`pattern="${f.pat}" maxlength="10" inputmode="numeric"`:""} ${f.t==="number"?'min="0" step="any"':""} placeholder="${esc(f.p||"")}">`}</label>`).join("")}</div><div class="ma"><button type="button" class="btn" id="mc">Cancel</button><button class="btn pri">${ok}</button></div>`;
  $("#modal").classList.add("open");$("#mc").onclick=closeM;
  $("#mform").onsubmit=e=>{e.preventDefault();fn(Object.fromEntries(new FormData(e.target)));closeM()};
}
function addBill({customer,phone,items,discount=0,paid=0,mode="Cash",by=staff()}){
  const total=Math.max(0,sum(items,i=>i.qty*i.price)-discount);paid=Math.min(paid,total);
  const b={id:"B-"+(++db.seq.b),ts:Date.now(),date:today(),customer,phone,items,discount,total,paid,mode,by,pays:paid>0?[{d:today(),a:paid}]:[]};
  db.bills.unshift(b);save();return b;
}
function receipt(b){
  $("#printArea").innerHTML=`<h3>Allfa E-Sevai Maiyam</h3><div class="c">Receipt ${b.id}</div><div class="c">${new Date(b.ts).toLocaleString("en-IN")}</div><hr>${b.customer?`<div>${esc(b.customer)} ${esc(b.phone)}</div><hr>`:""}${b.items.map(i=>`<div>${esc(i.name)}</div><div class="r"><span>${i.qty} x ${i.price}</span><span>${i.qty*i.price}</span></div>`).join("")}<hr>${b.discount?`<div class="r"><span>Discount</span><span>-${b.discount}</span></div>`:""}<div class="r"><b>TOTAL</b><b>${money(b.total)}</b></div><div class="r"><span>Paid (${b.mode})</span><span>${money(b.paid)}</span></div>${due(b)>0?`<div class="r"><b>BALANCE DUE</b><b>${money(due(b))}</b></div>`:""}<hr><div class="c">Thank you! Visit again.</div>`;
  setTimeout(()=>window.print(),60);
}
const billTag=b=>due(b)>0?`<span class="tag t-due">Due ${money(due(b))}</span>`:`<span class="tag t-ok">Paid</span>`;
const billRow=(b,act)=>`<tr><td><b>${b.id}</b></td><td>${new Date(b.ts).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"numeric",minute:"2-digit"})}</td><td>${esc(b.customer||"Walk-in")}</td><td>${esc(b.items.map(i=>i.name+(i.qty>1?" ×"+i.qty:"")).join(", ").slice(0,44))}</td><td class="n"><b>${money(b.total)}</b></td><td>${billTag(b)}</td>${act?`<td class="n"><button class="btn sm" data-print="${b.id}">Print</button> ${due(b)>0?`<button class="btn sm pri" data-collect="${b.id}">Collect</button>`:""} ${ib("data-bedit",b.id,"pencil","Edit bill")}${ib("data-bdel",b.id,"trash-2","Delete bill","dng")}</td>`:""}</tr>`;

/* ===== EDIT / DELETE: applications, reminders, bills, customers ===== */
const ib=(at,id,icon,t,c="")=>`<button type="button" class="btn sm ib ${c}" ${at}="${esc(id)}" title="${t}" aria-label="${t}"><i data-lucide="${icon}"></i></button>`;
const delBtn=fn=>{const x=document.createElement("button");x.type="button";x.className="btn dng";x.innerHTML='<i data-lucide="trash-2"></i>Delete';x.onclick=fn;$("#mform .ma").prepend(x);ic()};
/* -- Applications -- */
function editApp(id){
  const a=db.apps.find(x=>x.id===id);if(!a)return;
  form("Edit "+a.id,"Correct the customer or application details.",[
    {k:"customer",l:"Customer name *",req:1,v:a.customer},
    {k:"phone",l:"Phone *",req:1,pat:"[0-9]{10}",v:a.phone},
    {k:"service",l:"Service",t:"select",o:[...new Set([...db.tpl.map(t=>t.name),"Other service",a.service])],v:a.service},
    {k:"due",l:"Expected completion",t:"date",v:a.due||""},
    {k:"charge",l:"Service charge (₹)",t:"number",v:a.charge},
    {k:"gov",l:"Official fee (₹)",t:"number",v:a.gov},
    {k:"renew",l:"Renewal reminder",t:"select",o:RN.map(r=>r[0]),v:(RN.find(r=>r[1]===+a.renew)||RN[0])[0]},
    {k:"notes",l:"Notes",t:"area",full:1,v:a.notes||""}],"Save changes",d=>{
    const ch=+d.charge||0,gv=+d.gov||0,b=db.bills.find(x=>x.id===a.billId),money_changed=a.service!==d.service||a.charge!==ch||a.gov!==gv;
    Object.assign(a,{customer:d.customer.trim(),phone:d.phone,service:d.service,due:d.due,charge:ch,gov:gv,renew:RN.find(r=>r[0]===d.renew)[1],notes:d.notes});
    logA(a,"Details edited");
    if(b){b.customer=a.customer;b.phone=a.phone;
      if(money_changed){const it=b.items;if(it[0]){it[0].name=a.service;it[0].price=ch}
        const gi=it.findIndex(i=>i.cat==="Fee");
        if(gv){const o={name:"Official fee – "+a.service,cat:"Fee",price:gv,qty:1};gi>=0?it[gi]=o:it.push(o)}else if(gi>=0)it.splice(gi,1);
        retot(b)}}
    save();toast(a.id+" updated");go()});
  delBtn(()=>{if(delApp(id)){closeM();go()}});
}
function delApp(id){
  const a=db.apps.find(x=>x.id===id);if(!a)return false;const b=db.bills.find(x=>x.id===a.billId);
  if(!confirm("Delete application "+a.id+" ("+a.customer+" – "+a.service+")?\nThis cannot be undone."))return false;
  if(b&&confirm("Also delete the linked bill "+b.id+" ("+money(b.total)+", paid "+money(b.paid)+")?\n\nOK = delete the bill too\nCancel = keep the bill"))db.bills=db.bills.filter(x=>x!==b);
  db.apps=db.apps.filter(x=>x!==a);save();toast(a.id+" deleted");return true;
}
/* -- Bills -- */
const retot=b=>{b.total=Math.max(0,sum(b.items,i=>i.qty*i.price)-(b.discount||0));b.paid=Math.min(b.paid,b.total)};
function editBill(id){
  const b=db.bills.find(x=>x.id===id);if(!b)return;const F=$("#mform"),it=b.items.map(i=>({...i}));
  F.innerHTML=`<h2>Edit ${esc(b.id)}</h2><p class="sub">Correct the items, discount or customer. Totals recalculate automatically.</p><div class="fg">
  <label>Customer<input name="customer" value="${esc(b.customer||"")}"></label>
  <label>Phone<input name="phone" value="${esc(b.phone||"")}" pattern="[0-9]{10}" maxlength="10" inputmode="numeric"></label>
  <div class="full"><b style="font-size:13px">Items &nbsp;<small style="color:var(--mut);font-weight:400">name · qty · price</small></b><div id="bi"></div><button type="button" class="btn sm" id="bia"><i data-lucide="plus"></i>Add item</button></div>
  <label>Discount (₹)<input name="discount" type="number" min="0" step="any" value="${b.discount||0}"></label>
  <label>Payment mode<select name="mode">${[...new Set(["Cash","UPI",b.mode].filter(Boolean))].map(m=>`<option ${m===b.mode?"selected":""}>${esc(m)}</option>`).join("")}</select></label>
  <label>Amount paid (₹)<input name="paid" type="number" min="0" step="any" value="${b.paid}"></label>
  <div class="full note" id="bt"></div></div>
  <div class="ma"><button type="button" class="btn" id="mc">Cancel</button><button class="btn pri">Save changes</button></div>`;
  const rows=()=>{$("#bi").innerHTML=it.map((x,n)=>`<div class="bi"><input data-n="${n}" data-f="name" value="${esc(x.name)}" placeholder="Item" required><input data-n="${n}" data-f="qty" type="number" min="1" step="1" value="${x.qty}" title="Qty"><input data-n="${n}" data-f="price" type="number" min="0" step="any" value="${x.price}" title="Price (₹)"><button type="button" class="btn sm ib dng" data-rm="${n}" title="Remove item" aria-label="Remove item"><i data-lucide="x"></i></button></div>`).join("")||'<small style="color:var(--mut)">No items</small>';ic()};
  const E=F.elements,calc=()=>{const sub=sum(it,i=>(+i.qty||0)*(+i.price||0)),dc=Math.min(Math.max(0,+E.discount.value||0),sub),tot=sub-dc,pd=Math.min(Math.max(0,+E.paid.value||0),tot);
    $("#bt").innerHTML=`Subtotal ${money(sub)} · Total <b>${money(tot)}</b> · `+(tot-pd>0?`<b style="color:var(--red)">Balance ${money(tot-pd)}</b>`:"<b>Paid in full</b>")};
  $("#modal").classList.add("open");rows();calc();$("#mc").onclick=closeM;
  $("#bi").oninput=e=>{const t=e.target,x=it[t.dataset.n];if(!x)return;x[t.dataset.f]=t.value;calc()};
  $("#bi").onclick=e=>{const r=e.target.closest("[data-rm]");if(r){it.splice(+r.dataset.rm,1);rows();calc()}};
  $("#bia").onclick=()=>{it.push({name:"",cat:"",price:0,qty:1});rows();calc()};
  E.discount.oninput=E.paid.oninput=calc;
  delBtn(()=>{if(delBill(id)){closeM();go()}});
  F.onsubmit=e=>{e.preventDefault();const d=Object.fromEntries(new FormData(F));
    const items=it.map(i=>({name:String(i.name).trim()||"Item",cat:i.cat||"",price:+i.price||0,qty:Math.max(1,Math.floor(+i.qty)||1)}));
    if(!items.length)return toast("A bill needs at least one item.");
    const sub=sum(items,i=>i.qty*i.price),dc=Math.min(Math.max(0,+d.discount||0),sub),tot=sub-dc,pd=Math.min(Math.max(0,+d.paid||0),tot),df=pd-b.paid;
    if(df)(b.pays=b.pays||[]).push({d:today(),a:df});
    Object.assign(b,{customer:d.customer.trim(),phone:d.phone,items,discount:dc,total:tot,paid:pd,mode:d.mode});
    db.apps.filter(a=>a.billId===b.id&&b.customer).forEach(a=>{a.customer=b.customer;if(b.phone)a.phone=b.phone});
    save();closeM();toast(b.id+" updated");go()};
}
function delBill(id){
  const b=db.bills.find(x=>x.id===id);if(!b)return false;const lk=db.apps.filter(a=>a.billId===id);
  if(!confirm("Delete bill "+b.id+(b.customer?" ("+b.customer+")":"")+" – "+money(b.total)+"?"+(lk.length?"\nIt is linked to application "+lk.map(a=>a.id).join(", ")+". The application will be kept.":"")+"\nThis cannot be undone."))return false;
  lk.forEach(a=>{a.billId="";logA(a,"Linked bill "+id+" deleted")});db.bills=db.bills.filter(x=>x!==b);save();toast(id+" deleted");return true;
}
/* -- Reminders -- */
function editRem(id){
  const r=db.reminders.find(x=>x.id===id);if(!r)return;
  form("Edit reminder","Change the details, date or repeat.",[{k:"title",l:"Reminder *",req:1,full:1,v:r.title},{k:"date",l:"Date",t:"date",v:r.date},{k:"time",l:"Time (optional)",t:"time",v:r.time||""},{k:"repeat",l:"Repeat",t:"select",o:["None","Daily","Weekly","Monthly","Yearly"],v:r.repeat||"None"},{k:"name",l:"Customer (optional)",v:r.name||""},{k:"phone",l:"Phone (optional)",pat:"[0-9]{10}",v:r.phone||""}],"Save changes",d=>{
    Object.assign(r,{title:d.title.trim(),date:d.date||today(),time:d.time,repeat:d.repeat,name:d.name,phone:d.phone});save();toast("Reminder updated");go()});
  delBtn(()=>{if(delRem(id)){closeM();go()}});
}
function delRem(id){const r=db.reminders.find(x=>x.id===id);if(!r||!confirm("Delete reminder “"+r.title+"”?"))return false;db.reminders=db.reminders.filter(x=>x!==r);save();toast("Reminder deleted");return true}
/* -- Customers (built from bills + applications, so edits/deletes apply to those records) -- */
const cB=k=>db.bills.filter(b=>b.customer&&(b.phone||b.customer.toLowerCase())===k),cA=k=>db.apps.filter(a=>a.phone===k),cR=k=>db.reminders.filter(r=>r.phone&&r.phone===k);
function editCust(k){
  const bs=cB(k),as=cA(k),rs=cR(k),x=bs[0]||as[0];if(!x)return;
  form("Edit customer","Changes apply to all their bills, applications and reminders.",[{k:"name",l:"Customer name *",req:1,v:x.customer,full:1},{k:"phone",l:as.length?"Phone *":"Phone",req:as.length?1:0,pat:"[0-9]{10}",v:x.phone||"",p:"10 digits"}],"Save changes",d=>{
    const n=d.name.trim(),p=d.phone.trim(),np=p||n.toLowerCase();
    if(np!==k&&(cB(np).length||cA(np).length)&&!confirm("Another customer already uses this "+(p?"phone number":"name")+". Merge them into one?"))return;
    bs.forEach(b=>{b.customer=n;b.phone=p});as.forEach(a=>{a.customer=n;a.phone=p});rs.forEach(r=>{r.name=n;r.phone=p});
    save();toast("Customer updated");go()});
  delBtn(()=>{if(delCust(k)){closeM();go()}});
}
function delCust(k){
  const bs=cB(k),as=cA(k),rs=cR(k),x=bs[0]||as[0];if(!x)return false;const dd=sum(bs,due);
  if(!confirm("Delete customer "+x.customer+"?\n\nThis permanently removes "+bs.length+" bill(s), "+as.length+" application(s) and "+rs.length+" reminder(s)"+(dd>0?", including an unpaid balance of "+money(dd):"")+".\nThis cannot be undone."))return false;
  db.bills=db.bills.filter(b=>!bs.includes(b));db.apps=db.apps.filter(a=>!as.includes(a));db.reminders=db.reminders.filter(r=>!rs.includes(r));save();toast("Customer deleted");return true;
}

/* Home */
function tasks(all){
  const t=today(),l=[],add=o=>{o.sent=db.sent[o.key]===t;l.push(o)};
  db.apps.forEach(a=>{
    const v={name:a.customer,service:a.service,ack:a.ack||a.id,status:a.status},b={p:a.phone,aid:a.id,t:`${a.customer} – ${a.service}`};
    if(a.held&&["Approved","Ready","Delivered"].includes(a.status))add({...b,pri:1,i:"folder-output",s:"Return original documents",key:"or:"+a.id,m:msg("orig",v)});
    if(a.status==="Delivered")return;
    if(a.status==="Ready")add({...b,pri:1,i:"package-check",s:"Ready for pickup",key:"rd:"+a.id,m:msg("ready",v)});
    if(a.status==="Docs pending"){const miss=a.docs.filter(x=>!x.ok).map(x=>x.n).join(", ")||"documents";add({...b,pri:a.due&&a.due<t?0:1,i:"file-warning",s:"Documents missing: "+miss,key:"dc:"+a.id,m:msg("docs",{...v,docs:miss})})}
    if(a.status==="Rejected")add({...b,pri:0,i:"circle-alert",s:"Rejected"+(a.rej?": "+a.rej:"")+" · resubmit",key:"rj:"+a.id,m:msg("rejected",{...v,reason:a.rej||"-"})});
    if(["Submitted","Under process"].includes(a.status)){const d=Math.floor((Date.now()-(a.upd||a.ts))/864e5);if(d>=5)add({...b,p:"",pri:1,i:"hourglass",s:`No progress for ${d} days · check the portal`+(a.ack?" ("+a.ack+")":""),key:"sk:"+a.id+":"+a.status})}
    if(a.due&&(all||a.due<=t)&&!["Ready","Docs pending","Rejected"].includes(a.status))add({...b,pri:a.due<t?0:a.due===t?1:2,i:"calendar-clock",s:(a.due<t?"Overdue since ":"Due ")+a.due+" · "+a.status,key:"du:"+a.id+":"+a.status,m:msg("status",v)});
  });
  db.bills.filter(x=>due(x)>0&&x.customer).forEach(x=>add({pri:1,i:"banknote",t:`${x.customer} – balance ${money(due(x))}`,s:`Bill ${x.id}`,p:x.phone,key:"bl:"+x.id,m:msg("balance",{name:x.customer,amt:money(due(x)),bill:x.id})}));
  db.reminders.filter(r=>!r.done&&(all||r.date<=t)).forEach(r=>add({pri:r.date<t?0:r.date===t?1:2,i:r.kind==="renew"?"refresh-cw":"bell",t:r.title,s:r.date+(r.time?" "+r.time:"")+(r.repeat&&r.repeat!=="None"?" · repeats "+r.repeat.toLowerCase():"")+(r.name?" · "+r.name:""),p:r.phone,key:"rm:"+r.id+":"+r.date,m:r.kind==="renew"?msg("renew",{name:r.name,service:r.svc,date:r.date}):r.title,rid:r.id}));
  return l.sort((x,y)=>x.sent-y.sent||x.pri-y.pri);
}
const PT=[["Overdue","t-due"],["Today","t-wait"],["Upcoming","t-proc"]];
const tsum=()=>{const l=tasks().filter(x=>!x.sent),o=l.filter(x=>x.pri===0).length;return l.length?`${l.length} to do${o?` · ${o} overdue`:""} · ${l.filter(x=>x.i==="package-check").length} ready for pickup`:"Nothing pending"};
const taskList=l=>l.length?l.map(x=>`<div class="row${x.sent?" dim":""}"><div style="display:flex;gap:12px;align-items:center"><i data-lucide="${x.i}" style="color:var(--gd)"></i><div><b>${esc(x.t)}</b> <span class="tag ${x.sent?"t-done":PT[x.pri][1]}">${x.sent?"Sent today":PT[x.pri][0]}</span><br><small style="color:var(--mut)">${esc(x.s)}</small></div></div><div class="ta">${x.aid?`<button class="btn sm" data-open="${x.aid}">Open</button>`:""}${x.p?`<a class="btn sm" href="tel:${x.p}">Call</a>`:""}${x.m&&x.p?wa(x.p,x.m,x.key):""}${x.rid?`<button class="btn sm" data-snz="${x.rid}">Snooze</button><button class="btn sm pri" data-done="${x.rid}">Done</button>${ib("data-redit",x.rid,"pencil","Edit reminder")}${ib("data-rdel",x.rid,"trash-2","Delete reminder","dng")}`:""}</div></div>`).join(""):emp("check-circle-2","All clear","No follow-ups pending right now.");
function dash(){
  const t=today(),open=db.apps.filter(a=>a.status!=="Delivered");
  $("#view").innerHTML=`<div class="stats"><div class="stat"><p>Bills made today</p><h3>${db.bills.filter(b=>b.date===t).length}</h3><small>by all staff</small></div><div class="stat"><p>Open applications</p><h3>${open.length}</h3><small>${open.filter(a=>a.due&&a.due<=t).length} due today or overdue</small></div><div class="stat"><p>Ready for pickup</p><h3>${db.apps.filter(a=>a.status==="Ready").length}</h3><small>Tell the customer</small></div><div class="stat"><p>Customers with balance</p><h3>${new Set(db.bills.filter(b=>due(b)>0).map(b=>b.phone||b.customer)).size}</h3><small>Collect at the counter</small></div></div>
  <div class="grid2"><div class="panel"><div class="ph"><div><h2>Today’s work</h2><p>${tsum()}</p></div><a class="btn sm" href="#reminders">See all</a></div><div id="tl">${taskList(tasks())}</div></div>
  <div class="panel"><div class="ph"><div><h2>Quick actions</h2></div></div><div style="display:grid;gap:10px"><a class="btn pri" style="justify-content:center;height:46px" href="#pos"><i data-lucide="scan-line"></i>New bill (Xerox / Print)</a><button class="btn" style="justify-content:center;height:46px" id="qa"><i data-lucide="file-plus"></i>New application</button><a class="btn" style="justify-content:center;height:46px" href="#bills"><i data-lucide="receipt"></i>Find a bill</a></div></div></div>
  <div class="panel"><div class="ph"><div><h2>Recent bills</h2></div></div>${tbl(["Bill","Time","Customer","Items","#Total","Status"],db.bills.slice(0,6).map(b=>billRow(b)),emp("receipt","No bills yet","Open Quick bill to make your first bill."))}</div>`;
  $("#qa").onclick=newApp;$("#tl").onclick=doneClick;
}
function doneClick(e){const g=s=>e.target.closest(s);let b;
  if(b=g("[data-open]"))return openApp(b.dataset.open);
  if(b=g("[data-redit]"))return editRem(b.dataset.redit);
  if(b=g("[data-rdel]")){if(delRem(b.dataset.rdel))go();return}
  if(b=g("[data-wa]")){db.sent[b.dataset.wa]=today();save();setTimeout(go,500);return}
  if(b=g("[data-snz]")){const r=db.reminders.find(x=>x.id===b.dataset.snz);r.date=addD(today(),1);r.time="";save();toast("Snoozed to tomorrow");return go()}
  if(b=g("[data-done]")){const r=db.reminders.find(x=>x.id===b.dataset.done);
    if(r.repeat&&r.repeat!=="None"){let n=r.date;do{n=r.repeat==="Daily"?addD(n,1):r.repeat==="Weekly"?addD(n,7):addM(n,r.repeat==="Monthly"?1:12)}while(n<=today());r.date=n;toast("Next: "+n)}else r.done=1;
    save();go()}}
/* Quick bill */
let cart=[],pcat="All",touched=false;
function pos(){
  const cats=["All",...new Set(db.services.map(s=>s.cat))];
  $("#view").innerHTML=`<div class="pos"><div><div class="chips">${cats.map(c=>`<button class="chip ${c===pcat?"on":""}" data-cat="${esc(c)}">${esc(c)}</button>`).join("")}</div><input class="search" id="q" placeholder="Search service…"><div class="tiles" id="tiles"></div></div><aside class="ticket"><h2>Current bill</h2><div class="two"><label>Customer<input id="cn" placeholder="Optional"></label><label>Phone<input id="cp" inputmode="numeric" maxlength="10" placeholder="Optional"></label></div><div class="cart" id="cart"></div><div id="sum"></div><div class="two"><label>Discount (₹)<input id="disc" type="number" min="0" value="0"></label><label>Payment<select id="mode"><option>Cash</option><option>UPI</option></select></label></div><label>Amount received (₹)<input id="recv" type="number" min="0"></label><div class="acts" style="grid-template-columns:auto 1fr 1fr"><button class="btn" id="clr">Clear</button><button class="btn" id="save">Save</button><button class="btn pri" id="pay"><i data-lucide="printer"></i>Save &amp; print</button></div></aside></div>`;
  const tiles=()=>{const q=$("#q").value.toLowerCase(),l=db.services.filter(s=>(pcat==="All"||s.cat===pcat)&&s.name.toLowerCase().includes(q));$("#tiles").innerHTML=l.length?l.map(s=>`<button class="tile" data-add="${s.id}"><small>${esc(s.cat)}</small><b>${esc(s.name)}</b><span>${money(s.price)}</span></button>`).join(""):emp("search-x","Nothing found","Add services in Price list.")};
  tiles();$("#q").oninput=tiles;
  $(".chips").onclick=e=>{const c=e.target.closest("[data-cat]");if(c){pcat=c.dataset.cat;pos()}};
  $("#tiles").onclick=e=>{const t=e.target.closest("[data-add]");if(!t)return;const s=db.services.find(x=>x.id===t.dataset.add),i=cart.find(x=>x.id===s.id);i?i.qty++:cart.push({id:s.id,name:s.name,cat:s.cat,price:s.price,qty:1});touched=false;draw()};
  $("#cart").onclick=e=>{const b=e.target.closest("[data-d]");if(!b)return;const i=cart[b.dataset.i];i.qty+=Number(b.dataset.d);if(i.qty<1)cart.splice(b.dataset.i,1);touched=false;draw()};
  $("#cart").onchange=e=>{const i=cart[e.target.dataset.i];i.qty=Math.max(1,Number(e.target.value)||1);touched=false;draw()};
  $("#disc").oninput=()=>{touched=false;draw(true)};$("#recv").oninput=()=>{touched=true;draw(true)};
  const fin=print=>{if(!cart.length)return toast("Add at least one service.");const p=pay();const b=addBill({customer:$("#cn").value.trim(),phone:$("#cp").value.trim(),items:cart.map(({name,cat,price,qty})=>({name,cat,price,qty})),discount:p.d,paid:p.r,mode:$("#mode").value,by:staff()});cart=[];touched=false;pos();toast(b.id+" saved");if(print)receipt(b)};
  $("#save").onclick=()=>fin(false);$("#pay").onclick=()=>fin(true);$("#clr").onclick=()=>{cart=[];touched=false;pos()};
  draw();
}
const pay=()=>{const sub=sum(cart,i=>i.qty*i.price),d=Math.min(Number($("#disc").value)||0,sub),tot=sub-d;return{sub,d,tot,r:touched?Number($("#recv").value)||0:tot}};
function draw(keep){
  if(!keep)$("#cart").innerHTML=cart.length?cart.map((i,n)=>`<div class="ci"><div><b>${esc(i.name)}</b><small>${money(i.price)} each</small></div><div class="qty"><button data-i="${n}" data-d="-1">−</button><input data-i="${n}" type="number" value="${i.qty}"><button data-i="${n}" data-d="1">+</button></div><b style="text-align:right">${money(i.qty*i.price)}</b></div>`).join(""):emp("mouse-pointer-click","Bill is empty","Tap a service to add it.");
  const p=pay();if(!touched)$("#recv").value=p.tot||"";
  const r=touched?Number($("#recv").value)||0:p.tot;
  $("#sum").innerHTML=`<div class="tot"><span>Subtotal</span><span>${money(p.sub)}</span></div><div class="tot big"><span>Total</span><span>${money(p.tot)}</span></div>${r<p.tot?`<div class="tot" style="color:var(--red)"><span>Balance due</span><b>${money(p.tot-r)}</b></div>`:""}`;
  ic();
}

/* Applications */
const docTag=a=>{const m=a.docs.filter(x=>!x.ok).length;return a.docs.length?(m?`<span class="tag t-due">${m} missing</span>`:`<span class="tag t-ok">Docs ✓</span>`):"–"};
const chg=(n,t)=>{const s=db.services.find(x=>x.name===n);return s?s.price:t?t.fee:0};
function newApp(){
  const T=db.tpl,tp=n=>T.find(t=>t.name===n),t0=T[0]||{name:"",docs:[],gov:0,fee:0,days:7,renew:0},rl=m=>(RN.find(r=>r[1]===m)||RN[0])[0];
  form("New application","Create the case file, bill it and track the documents.",[{k:"phone",l:"Phone *",req:1,pat:"[0-9]{10}",p:"10 digits"},{k:"customer",l:"Customer name *",req:1},{k:"hist",t:"html"},{k:"service",l:"Service",t:"select",o:[...T.map(t=>t.name),"Other service"]},{k:"due",l:"Expected completion",t:"date",v:addD(today(),t0.days)},{k:"charge",l:"Service charge (₹) *",t:"number",req:1,v:chg(t0.name,t0)},{k:"gov",l:"Official fee (₹)",t:"number",v:t0.gov},{k:"recv",l:"Amount received (₹)",t:"number",v:0},{k:"renew",l:"Renewal reminder",t:"select",o:RN.map(r=>r[0]),v:rl(t0.renew)},{k:"dl",t:"html"},{k:"notes",l:"Notes",t:"area",full:1}],"Create application",d=>{
    const t=tp(d.service)||{docs:[]},docs=t.docs.map((n,i)=>({n,ok:!!d["c"+i]})),items=[{name:d.service,cat:GV,price:+d.charge||0,qty:1}];
    if(+d.gov)items.push({name:"Official fee – "+d.service,cat:"Fee",price:+d.gov,qty:1});
    const b=addBill({customer:d.customer.trim(),phone:d.phone,items,paid:+d.recv||0,mode:"Cash"});
    const a={id:"A-"+(++db.seq.a),ts:Date.now(),upd:Date.now(),customer:d.customer.trim(),phone:d.phone,service:d.service,due:d.due,notes:d.notes,status:docs.some(x=>!x.ok)?"Docs pending":"Submitted",billId:b.id,docs,held:!!d.held,ack:"",gov:+d.gov||0,charge:+d.charge||0,renew:RN.find(r=>r[0]===d.renew)[1],assigned:staff(),log:[]};
    logA(a,"Application created · "+a.status);db.apps.unshift(a);save();toast("Application created");go();
    if(confirm("Print acknowledgment slip for the customer?"))ackSlip(a);
  });
  const F=$("#mform"),q=s=>F.querySelector(s);
  const dl=()=>{const t=tp(q("[name=service]").value);q("#dl").innerHTML=`${t?`<b style="font-size:13px">Documents received</b><div class="ckl">${t.docs.map((x,i)=>`<label class="ck"><input type="checkbox" name="c${i}"> ${esc(x)}</label>`).join("")}</div>`:`<small style="color:var(--mut)">Other service – list the documents in Notes.</small>`}<div class="ckl"><label class="ck"><input type="checkbox" name="held"> <b>Original documents taken &amp; held at shop</b></label></div>`};
  dl();
  q("[name=service]").onchange=e=>{const t=tp(e.target.value);if(t){q("[name=charge]").value=chg(t.name,t);q("[name=gov]").value=t.gov;q("[name=due]").value=addD(today(),t.days);q("[name=renew]").value=rl(t.renew)}dl()};
  q("[name=phone]").oninput=e=>{const p=e.target.value,h=q("#hist");h.innerHTML="";if(p.length!==10)return;
    const as=db.apps.filter(a=>a.phone===p),bs=db.bills.filter(x=>x.phone===p),c=(as[0]||bs[0]||{}).customer,bal=sum(bs,due);
    if(c&&!q("[name=customer]").value)q("[name=customer]").value=c;
    if(c)h.innerHTML=`<div class="note"><b>Returning customer</b> · ${as.length} application${as.length===1?"":"s"}${as[0]?` · last: ${esc(as[0].service)} (${as[0].status})`:""}${bal>0?` · <b style="color:var(--red)">balance ${money(bal)}</b>`:""}</div>`};
}
function ackSlip(a){const b=db.bills.find(x=>x.id===a.billId);
  $("#printArea").innerHTML=`<h3>Allfa E-Sevai Maiyam</h3><div class="c">Acknowledgment slip</div><div class="c">${new Date(a.ts).toLocaleString("en-IN")}</div><hr><div class="r"><span>Token</span><b>${a.id}</b></div>${a.ack?`<div class="r"><span>Portal ref</span><b>${esc(a.ack)}</b></div>`:""}<div>${esc(a.customer)} ${esc(a.phone)}</div><div><b>${esc(a.service)}</b></div><hr><div><b>Documents</b></div>${a.docs.map(x=>`<div>${x.ok?"[x]":"[ ]"} ${esc(x.n)}</div>`).join("")||"<div>–</div>"}${a.held?"<div>Originals held at shop</div>":""}<hr><div class="r"><span>Expected</span><span>${a.due||"–"}</span></div><div class="r"><span>Status</span><span>${a.status}</span></div><div class="r"><span>Fee</span><span>${money(a.gov+a.charge)}</span></div>${b&&due(b)>0?`<div class="r"><b>BALANCE</b><b>${money(due(b))}</b></div>`:""}<hr><div class="c">Please bring this slip when you collect.</div>`;
  setTimeout(()=>window.print(),60)}
function openApp(id){
  const a=db.apps.find(x=>x.id===id);if(!a)return;const b=db.bills.find(x=>x.id===a.billId),oth=db.apps.filter(x=>x.phone===a.phone&&x.id!==id),F=$("#mform");
  F.innerHTML=`<h2>${a.id} · ${esc(a.service)}</h2><p class="sub">${esc(a.customer)} · ${esc(a.phone)} · <span class="tag ${stc[a.status]}">${a.status}</span></p><div class="fg">
  <label>Portal ack / reference no.<input name="ack" value="${esc(a.ack||"")}" placeholder="From govt portal"></label>
  <label>Status<select name="status">${ST.map(s=>`<option ${s===a.status?"selected":""}>${s}</option>`).join("")}</select></label>
  <label>Assigned to<input name="assigned" value="${esc(a.assigned||"")}"></label>
  <label>Expected completion<input type="date" name="due" value="${a.due||""}"></label>
  <label class="full" id="rj" style="display:${a.status==="Rejected"?"grid":"none"}">Rejection reason / resubmit note<input name="rej" value="${esc(a.rej||"")}"></label>
  <div class="full"><b style="font-size:13px">Documents</b><div class="ckl">${a.docs.map((x,i)=>`<label class="ck"><input type="checkbox" name="c${i}" ${x.ok?"checked":""}> ${esc(x.n)}</label>`).join("")}<label class="ck"><input type="checkbox" name="held" ${a.held?"checked":""}> <b>Original documents held at shop</b> (untick when returned)</label></div></div>
  <label class="full">Notes<textarea name="notes" rows="2">${esc(a.notes||"")}</textarea></label>
  <div class="full note">Official fee ${money(a.gov)} · Service charge ${money(a.charge)} · ${b?(due(b)>0?`<b style="color:var(--red)">Balance ${money(due(b))}</b> <button type="button" class="btn sm pri" id="cc">Collect</button>`:"<b>Paid</b>"):"No bill"}</div>
  ${oth.length?`<div class="full"><b style="font-size:13px">Earlier applications</b><br><small style="color:var(--mut)">${oth.slice(0,5).map(x=>`${x.id} ${esc(x.service)} (${x.status})`).join(" · ")}</small></div>`:""}
  <div class="full"><b style="font-size:13px">Timeline</b><div class="tlg">${[...a.log].reverse().map(l=>`<div><i></i><span><b>${esc(l.m)}</b><small>${esc(l.by)} · ${new Date(l.t).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"numeric",minute:"2-digit"})}</small></span></div>`).join("")||"<small>No history</small>"}</div></div>
  </div><div class="ma"><button type="button" class="btn" id="mc">Close</button><button type="button" class="btn" id="pr"><i data-lucide="printer"></i>Ack slip</button><button type="button" class="btn" id="ed"><i data-lucide="pencil"></i>Edit details</button><button type="button" class="btn dng" id="dl"><i data-lucide="trash-2"></i>Delete</button><button class="btn pri">Save</button></div>`;
  $("#modal").classList.add("open");ic();$("#mc").onclick=closeM;$("#pr").onclick=()=>ackSlip(a);$("#ed").onclick=()=>editApp(id);$("#dl").onclick=()=>{if(delApp(id)){closeM();go()}};
  F.querySelector("[name=status]").onchange=e=>{$("#rj").style.display=e.target.value==="Rejected"?"grid":"none"};
  const cc=$("#cc");if(cc)cc.onclick=()=>{const x=Number(prompt("Amount received (₹)",due(b)));if(x>0&&x<=due(b)){b.paid+=x;b.pays.push({d:today(),a:x});logA(a,"Collected "+money(x));save();openApp(id);toast(money(x)+" collected")}else if(x)toast("Enter an amount up to "+money(due(b)))};
  F.onsubmit=e=>{e.preventDefault();const d=Object.fromEntries(new FormData(F));let s=d.status;
    const docs=a.docs.map((x,i)=>({n:x.n,ok:!!d["c"+i]}));
    if(s===a.status&&a.status==="Docs pending"&&docs.length&&docs.every(x=>x.ok))s="Submitted";
    if(s==="Delivered"&&a.status!=="Delivered"&&!okDeliver({...a,held:!!d.held}))return;
    docs.forEach((x,i)=>{if(x.ok!==a.docs[i].ok)logA(a,(x.ok?"Received: ":"Not received: ")+x.n)});a.docs=docs;
    if((d.ack||"")!==(a.ack||""))logA(a,"Portal ref: "+(d.ack||"cleared"));if(d.assigned!==a.assigned)logA(a,"Assigned to "+d.assigned);if((d.due||"")!==(a.due||""))logA(a,"Expected date: "+(d.due||"none"));
    if(!!d.held!==!!a.held)logA(a,d.held?"Originals held at shop":"Originals returned to customer");
    if(s==="Rejected"&&(d.rej||"")!==(a.rej||""))logA(a,"Rejection note: "+d.rej);
    Object.assign(a,{ack:d.ack.trim(),assigned:d.assigned,due:d.due,notes:d.notes,held:!!d.held,rej:d.rej||a.rej||""});
    setStatus(a,s);a.upd=Date.now();save();closeM();toast(a.id+" saved");go()};
}
function tplMgr(){const F=$("#mform");
  F.innerHTML=`<h2>Service templates</h2><p class="sub">Documents, fees and processing time used when you create an application. Please check the fees against current portal rates.</p><div>${db.tpl.map((t,i)=>`<div class="row"><div><b>${esc(t.name)}</b><br><small style="color:var(--mut)">${t.docs.length} documents · ${money(t.gov)} official + ${money(t.fee)} charge · ${t.days} days</small></div><button type="button" class="btn sm" data-e="${i}">Edit</button></div>`).join("")}</div><div class="ma"><button type="button" class="btn" id="mc">Close</button><button type="button" class="btn pri" data-e="new">Add template</button></div>`;
  $("#modal").classList.add("open");$("#mc").onclick=closeM;F.onsubmit=e=>e.preventDefault();F.onclick=e=>{const b=e.target.closest("[data-e]");if(b)tplEd(b.dataset.e)}}
function tplEd(i){const t=i==="new"?{name:"",docs:[],gov:0,fee:0,days:7,renew:0}:db.tpl[i];
  form(i==="new"?"Add template":"Edit template",t.name||"New service",[{k:"name",l:"Service name *",req:1,v:t.name,full:1},{k:"docs",l:"Required documents (one per line)",t:"area",r:5,v:t.docs.join("\n"),full:1},{k:"gov",l:"Official fee (₹)",t:"number",v:t.gov},{k:"fee",l:"Service charge (₹)",t:"number",v:t.fee},{k:"days",l:"Usual processing days",t:"number",v:t.days},{k:"renew",l:"Renewal reminder",t:"select",o:RN.map(r=>r[0]),v:(RN.find(r=>r[1]===t.renew)||RN[0])[0]}],"Save",d=>{
    const n={name:d.name.trim(),docs:d.docs.split("\n").map(x=>x.trim()).filter(Boolean),gov:+d.gov||0,fee:+d.fee||0,days:+d.days||0,renew:RN.find(r=>r[0]===d.renew)[1]};i==="new"?db.tpl.push(n):db.tpl[i]=n;save();setTimeout(tplMgr,0)});
  if(i!=="new"){const x=document.createElement("button");x.type="button";x.className="btn dng";x.textContent="Delete";x.onclick=()=>{if(confirm("Delete this template?")){db.tpl.splice(i,1);save();closeM();setTimeout(tplMgr,0)}};$("#mform .ma").prepend(x)}}
let av="list";
function apps(){
  $("#view").innerHTML=`<div class="panel"><div class="ph"><div><h2>Applications</h2><p>Open a case file to tick documents, add the ack number and follow progress.</p></div><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><input id="as" placeholder="Search name / phone / ID / ack no." style="width:230px"><select id="sf" style="width:auto"><option>Active</option><option>All</option>${ST.map(s=>`<option>${s}</option>`).join("")}</select><button class="chip ${av==="list"?"on":""}" data-v="list">List</button><button class="chip ${av==="board"?"on":""}" data-v="board">Board</button><button class="btn sm" id="tp"><i data-lucide="settings-2"></i>Templates</button></div></div><div id="al"></div></div>`;
  const d=()=>{const f=$("#sf").value,q=$("#as").value.toLowerCase(),l=db.apps.filter(a=>(f==="All"||(f==="Active"?a.status!=="Delivered":a.status===f))&&(a.customer+a.phone+a.id+a.service+(a.ack||"")).toLowerCase().includes(q)),t=today();
    if(av==="list")$("#al").innerHTML=tbl(["ID","Customer","Service","Ack no.","Due date","Docs","Status",""],l.map(a=>`<tr><td><b>${a.id}</b></td><td>${esc(a.customer)}<br><small>${esc(a.phone)}</small></td><td>${esc(a.service)}</td><td>${esc(a.ack||"–")}</td><td>${a.due||"–"}</td><td>${docTag(a)}</td><td><span class="tag ${stc[a.status]}">${a.status}</span></td><td class="n"><div class="ra"><button class="btn sm" data-open="${a.id}">Open</button>${wa(a.phone,msg("status",{name:a.customer,service:a.service,ack:a.ack||a.id,status:a.status}))||`<span class="btn sm ghost-slot"></span>`}${a.status!=="Delivered"?`<button class="btn sm pri" data-adv="${a.id}">${a.status==="Rejected"?"Resubmit":FL[FL.indexOf(a.status)+1]}</button>`:`<span class="btn sm ghost-slot"></span>`}<button type="button" class="btn sm r2" data-aedit="${a.id}">Edit</button><button type="button" class="btn sm r2 dng" data-adel="${a.id}">Delete</button></div></td></tr>`),emp("files","No applications","Use New application to add one."));
    else{const cols=f==="Active"?ST.filter(s=>s!=="Delivered"):f==="All"?ST:[f];
      $("#al").innerHTML=l.length||f!=="Active"?`<div class="board">${cols.map(s=>{const c=l.filter(a=>a.status===s).slice(0,s==="Delivered"?8:99);return `<div class="bcol" data-st="${s}"><div class="bh"><span class="tag ${stc[s]}">${s}</span><small>${c.length}</small></div>${c.map(a=>`<div role="button" tabindex="0" draggable="true" class="bcard${a.due&&a.due<t&&a.status!=="Delivered"?" od":""}" data-open="${a.id}"><b>${esc(a.customer)}</b><small>${esc(a.service)}</small><small>${a.ack?esc(a.ack)+" · ":""}Due ${a.due||"–"}</small>${docTag(a)}</div>`).join("")||'<small style="color:var(--mut)">Drop here</small>'}</div>`}).join("")}</div>`:emp("files","No applications","Use New application to add one.")}
    ic()};
  d();$("#sf").onchange=d;$("#as").oninput=d;$("#tp").onclick=tplMgr;
  document.querySelectorAll("[data-v]").forEach(b=>b.onclick=()=>{av=b.dataset.v;apps()});
  $("#al").onclick=e=>{const ae=e.target.closest("[data-aedit]"),ad=e.target.closest("[data-adel]");if(ae)return editApp(ae.dataset.aedit);if(ad){if(delApp(ad.dataset.adel)){d();nav()}return}const o=e.target.closest("[data-open]"),b=e.target.closest("[data-adv]");if(o)openApp(o.dataset.open);if(b&&advance(db.apps.find(x=>x.id===b.dataset.adv))){d();nav()}};
  let dragId=null;const al=$("#al"),clr=()=>al.querySelectorAll(".drag,.over").forEach(x=>x.classList.remove("drag","over"));
  al.ondragstart=e=>{const c=e.target.closest&&e.target.closest(".bcard");if(!c)return;dragId=c.dataset.open;e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",dragId);setTimeout(()=>c.classList.add("drag"),0)};
  al.ondragend=()=>{dragId=null;clr()};
  al.ondragover=e=>{const c=e.target.closest&&e.target.closest(".bcol");if(!c||!dragId)return;e.preventDefault();if(!c.classList.contains("over")){al.querySelectorAll(".over").forEach(x=>x.classList.remove("over"));c.classList.add("over")}};
  al.ondrop=e=>{const c=e.target.closest&&e.target.closest(".bcol");if(!c||!dragId)return;e.preventDefault();const a=db.apps.find(x=>x.id===dragId),s=c.dataset.st;dragId=null;clr();if(!a||!s||a.status===s)return;
    if(a.status==="Docs pending"&&s!=="Docs pending"&&a.docs.some(x=>!x.ok)&&!confirm("Some documents are still missing. Move anyway?"))return;
    if(s==="Delivered"&&!okDeliver(a))return;
    setStatus(a,s);save();toast(a.id+" → "+s);d();nav();if(s==="Rejected")openApp(a.id)};
  al.onkeydown=e=>{const c=e.target.closest&&e.target.closest(".bcard");if(c&&(e.key==="Enter"||e.key===" ")){e.preventDefault();openApp(c.dataset.open)}};
}
/* Bills */
function bills(){
  $("#view").innerHTML=`<div class="panel"><div class="ph"><div><h2>Bills &amp; dues</h2><p>Reprint a receipt or collect a balance.</p></div><div style="display:flex;gap:8px"><input id="bs" placeholder="Search bill / name / phone" style="width:220px"><select id="bf" style="width:auto"><option>All bills</option><option>Unpaid only</option></select></div></div><div id="bl"></div></div>`;
  const d=()=>{const q=$("#bs").value.toLowerCase(),l=db.bills.filter(b=>($("#bf").value==="All bills"||due(b)>0)&&(b.id+b.customer+b.phone).toLowerCase().includes(q)).slice(0,100);$("#bl").innerHTML=tbl(["Bill","Time","Customer","Items","#Total","Status",""],l.map(b=>billRow(b,1)),emp("receipt","No bills","Bills appear here after you save them."));ic()};
  d();$("#bf").onchange=d;$("#bs").oninput=d;
  $("#bl").onclick=e=>{const be=e.target.closest("[data-bedit]"),bd=e.target.closest("[data-bdel]");if(be)return editBill(be.dataset.bedit);if(bd){if(delBill(bd.dataset.bdel)){d();nav()}return}const p=e.target.closest("[data-print]"),c=e.target.closest("[data-collect]");
    if(p)receipt(db.bills.find(b=>b.id===p.dataset.print));
    if(c){const b=db.bills.find(x=>x.id===c.dataset.collect),a=Number(prompt("Amount received (₹)",due(b)));if(a>0&&a<=due(b)){b.paid+=a;b.pays.push({d:today(),a});save();d();toast(money(a)+" collected")}else if(a)toast("Enter an amount up to "+money(due(b)))}};
}
/* Customers */
function custs(){
  const m={};db.bills.forEach(b=>{if(!b.customer)return;const k=b.phone||b.customer.toLowerCase(),c=m[k]||(m[k]={k,n:b.customer,p:b.phone,v:0,d:0});c.v++;c.d+=due(b)});
  db.apps.forEach(a=>{const k=a.phone;if(!m[k])m[k]={k,n:a.customer,p:a.phone,v:0,d:0}});
  const l=Object.values(m).sort((a,b)=>b.v-a.v);
  $("#view").innerHTML=`<div class="panel"><div class="ph"><div><h2>Customers</h2><p>Built from bills and applications.</p></div><input id="cs" placeholder="Search name / phone" style="width:210px"></div><div id="cl"></div></div>`;
  const d=()=>{const q=$("#cs").value.toLowerCase();$("#cl").innerHTML=tbl(["Customer","Phone","#Visits","#Balance",""],l.filter(c=>(c.n+c.p).toLowerCase().includes(q)).map(c=>`<tr><td><b>${esc(c.n)}</b></td><td>${esc(c.p||"–")}</td><td class="n">${c.v}</td><td class="n">${c.d?`<span class="tag t-due">${money(c.d)}</span>`:"–"}</td><td class="n">${wa(c.p,`Hello ${c.n}, greetings from Allfa E-Sevai Maiyam.`)} ${ib("data-cedit",c.k,"pencil","Edit customer")}${ib("data-cdel",c.k,"trash-2","Delete customer","dng")}</td></tr>`),emp("users","No customers yet","Enter a name on a bill or application to start the list."))};
  d();$("#cs").oninput=d;$("#cl").onclick=e=>{const ce=e.target.closest("[data-cedit]"),cd=e.target.closest("[data-cdel]");if(ce)editCust(ce.dataset.cedit);if(cd&&delCust(cd.dataset.cdel))custs()};
}
/* Price list (read only) */
function svc(){
  $("#view").innerHTML=`<div class="panel"><div class="ph"><div><h2>Price list</h2><p>Prices are managed by the admin.</p></div><input id="ps" placeholder="Search service" style="width:200px"></div><div id="sl"></div></div>`;
  const d=()=>{const q=$("#ps").value.toLowerCase();$("#sl").innerHTML=tbl(["Service","Category","#Price"],db.services.filter(s=>s.name.toLowerCase().includes(q)).map(s=>`<tr><td><b>${esc(s.name)}</b></td><td>${esc(s.cat)}</td><td class="n">${money(s.price)}</td></tr>`),emp("tags","No services","Ask the admin to publish the price list."))};
  d();$("#ps").oninput=d;
}
/* Reminders */
function addRem(){form("Add reminder","A follow-up for yourself or a customer (exam last date, scholarship, renewal…).",[{k:"title",l:"Reminder *",req:1,full:1,p:"e.g. Scholarship last date – call Ravi"},{k:"date",l:"Date",t:"date",v:today()},{k:"time",l:"Time (optional)",t:"time"},{k:"repeat",l:"Repeat",t:"select",o:["None","Daily","Weekly","Monthly","Yearly"]},{k:"name",l:"Customer (optional)"},{k:"phone",l:"Phone (optional)",pat:"[0-9]{10}"}],"Save reminder",d=>{db.reminders.push({id:uid(),kind:"own",...d,date:d.date||today()});save();go()})}
function msgEd(){form("Edit messages ("+(L()==="ta"?"Tamil":"English")+")","Use {name} {service} {ack} {status} {docs} {amt} {bill} {date} {reason}. Clear a box to restore the default.",Object.keys(DM).map(k=>({k,l:MN[k],t:"area",r:3,v:db.msgs[k+L()]||DM[k][L()],full:1})),"Save messages",d=>{Object.keys(DM).forEach(k=>{const v=(d[k]||"").trim();if(v&&v!==DM[k][L()])db.msgs[k+L()]=v;else delete db.msgs[k+L()]});save();go();toast("Messages saved")})}
let rf="All";
function rem(){
  $("#view").innerHTML=`<div class="panel"><div class="ph"><div><h2>All follow-ups</h2><p>${tsum()}</p></div><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><select id="lg" style="width:auto"><option value="ta">தமிழ் messages</option><option value="en">English messages</option></select><button class="btn sm" id="me">Edit messages</button><button class="btn sm" id="alr"><i data-lucide="bell-ring"></i>Alerts</button></div></div><div class="chips" id="fc">${["All","Overdue","Today","Upcoming"].map(c=>`<button class="chip ${c===rf?"on":""}" data-f="${c}">${c}</button>`).join("")}</div><div id="tl"></div></div>`;
  const all=tasks(true),p={Overdue:0,Today:1,Upcoming:2};
  $("#tl").innerHTML=taskList(rf==="All"?all:all.filter(x=>x.pri===p[rf]&&!x.sent));
  $("#lg").value=L();$("#lg").onchange=e=>{localStorage.setItem("esevaiPro.lang",e.target.value);rem()};$("#me").onclick=msgEd;
  $("#alr").onclick=()=>{if(!window.Notification)return toast("This browser does not support alerts.");Notification.requestPermission().then(r=>toast(r==="granted"?"Alerts on while this page is open":"Alerts blocked in browser settings"))};
  $("#fc").onclick=e=>{const c=e.target.closest("[data-f]");if(c){rf=c.dataset.f;rem()}};
  $("#tl").onclick=doneClick;ic();
}
function notify(){if(!window.Notification||Notification.permission!=="granted"||document.body.classList.contains("locked"))return;
  const t=today(),n=new Date().toTimeString().slice(0,5);db.reminders.filter(r=>!r.done&&r.date<=t&&(!r.time||r.date<t||r.time<=n)&&db.sent["n:"+r.id+r.date]!==t).forEach(r=>{db.sent["n:"+r.id+r.date]=t;new Notification("E-Sevai reminder",{body:r.title})});save()}
setInterval(notify,60000);
/* Router */
const P={dashboard:["Home",dash,["New application",newApp,"plus"]],pos:["Quick bill",pos],applications:["Applications",apps,["New application",newApp,"plus"]],bills:["Bills & dues",bills],customers:["Customers",custs],reminders:["Reminders",rem,["Add reminder",addRem,"plus"]],services:["Price list",svc]};
function nav(){const n=db.apps.filter(a=>a.status!=="Delivered").length,r=tasks().filter(x=>!x.sent).length;$("#navPending").textContent=n||"";$("#navRem").textContent=r||"";notify()}
function go(){
  const k=location.hash.slice(1),p=P[k]?k:"dashboard",[t,fn,b]=P[p];
  document.querySelectorAll("nav a").forEach(a=>a.classList.toggle("on",a.dataset.page===p));
  $("#title").textContent=t;const tb=$("#topNew");tb.style.display=b?"":"none";
  if(b){tb.innerHTML=`<i data-lucide="${b[2]}"></i>${b[0]}`;tb.onclick=b[1]}
  $("#side").classList.remove("open");fn();nav();ic();
}
function who(){const n=prompt("Staff name (shown on bills you make)",localStorage.getItem("esevaiPro.staff")||"");if(n&&n.trim())localStorage.setItem("esevaiPro.staff",n.trim());$("#staffBtn").lastChild.textContent=" "+staff()}
document.addEventListener("DOMContentLoaded",()=>{
  $("#today").textContent=new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  $("#menuBtn").onclick=()=>$("#side").classList.toggle("open");
  $("#modal").onclick=e=>{if(e.target.id==="modal")closeM()};
  document.onkeydown=e=>{if(e.key==="Escape")closeM()};
  window.onhashchange=()=>{if(!document.body.classList.contains("locked"))go()};
  initLogin();
});
/* ===== SUPABASE (login + cloud data) ===== */
const SB_URL="https://vtcnzhzdwycqmhepsfxt.supabase.co",SB_KEY="sb_publishable_LIM_hs_jBcn0MC9cdIvBYw_Z-VoN2R9",SB_ROW="allfa-main";
const SK="esevaiPro.session",AK="esevaiPro.auth",UK="esevaiPro.users",DOM="@allfa-esevai.app";
const hh=s=>{let h=5381;for(const c of s)h=((h<<5)+h+c.charCodeAt(0))>>>0;return h.toString(36)+"."+s.length};
const getUsers=()=>{try{return JSON.parse(localStorage.getItem(UK))||{}}catch{return{}}};
let auth=null;
function loadAuth(){try{auth=JSON.parse(localStorage.getItem(AK)||sessionStorage.getItem(AK))}catch{auth=null}}
function setSession(j,name,remember){
  auth={access:j.access_token,refresh:j.refresh_token,exp:Date.now()+Math.max(60,(j.expires_in||3600)-60)*1000,name};
  const keep=remember?localStorage:sessionStorage,drop=remember?sessionStorage:localStorage;
  keep.setItem(AK,JSON.stringify(auth));drop.removeItem(AK)
}
const sbAuth=(path,body)=>fetch(SB_URL+"/auth/v1/"+path,{method:"POST",headers:{apikey:SB_KEY,"Content-Type":"application/json"},body:JSON.stringify(body)});
function lockApp(msg){
  auth=null;[localStorage,sessionStorage].forEach(st=>{st.removeItem(AK);st.removeItem(SK)});
  const f=$("#lform");f.reset();$("#lr").checked=true;$("#lerr").textContent=msg||"";
  document.body.classList.add("locked");ic()
}
async function token(){
  if(!auth)return null;
  if(Date.now()<auth.exp)return auth.access;
  try{
    const r=await sbAuth("token?grant_type=refresh_token",{refresh_token:auth.refresh});
    if(r.status>=400&&r.status<500){lockApp("Session expired. Please login again.");return null}
    if(!r.ok)return null;
    setSession(await r.json(),auth.name,!!localStorage.getItem(AK));return auth.access
  }catch{return null}
}
async function hdr(){const t=await token();return t?{apikey:SB_KEY,Authorization:"Bearer "+t,"Content-Type":"application/json"}:null}

/* ===== LOGIN (same username/password on every device) ===== */
function enter(name){
  localStorage.setItem("esevaiPro.staff",name);
  $("#staffBtn").lastChild.textContent=" "+name;
  document.body.classList.remove("locked");
  go();ic();cloudPull()
}
function initLogin(){
  const f=$("#lform"),err=$("#lerr");let creating=false;
  f.querySelector(".lrow").insertAdjacentHTML("afterend",'<p style="text-align:center;margin:10px 0 0"><button type="button" class="lforgot" id="lnew"></button></p>');
  const mode=()=>{$("#lgot").textContent=creating?"Create & Login":"Login";$("#lnew").textContent=creating?"Already have a login? Sign in":"New staff? Create login";$("#lhint").textContent=creating?"Use your email and a password (min 6 characters). It works on all devices.":"";$("#lp").autocomplete=creating?"new-password":"current-password";err.textContent=""};
  const bad=m=>{err.textContent=m;f.classList.remove("shake");void f.offsetWidth;f.classList.add("shake")};
  $("#lu").placeholder="Email";$("#lu").type="email";mode();
  $("#lnew").onclick=()=>{creating=!creating;mode()};
  $("#leye").onclick=()=>{const p=$("#lp"),s=p.type==="password";p.type=s?"text":"password";$("#leye").innerHTML='<i data-lucide="'+(s?"eye-off":"eye")+'"></i>';ic()};
  $("#lforgot").onclick=()=>alert("Password maatha: Supabase Dashboard > Authentication > Users la andha user ku password reset pannalaam. Illana puthu staff login create pannunga.");
  $("#outBtn").onclick=()=>{lockApp();creating=false;mode()};
  f.onsubmit=async e=>{
    e.preventDefault();err.textContent="";
    const name=$("#lu").value.trim(),pw=$("#lp").value,key=name.toLowerCase(),btn=f.querySelector(".lbtn");
    if(!name||!pw)return bad("Enter username and password.");
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key))return bad("Enter a valid email address as your login (example: name@gmail.com).");
    if(creating&&pw.length<6)return bad("Password must be at least 6 characters.");
    const email=key;btn.disabled=true;
    try{
      let r=creating?await sbAuth("signup",{email,password:pw,data:{name:name.split("@")[0]}}):await sbAuth("token?grant_type=password",{email,password:pw});
      let j=await r.json();
      if(creating&&r.ok&&!j.access_token){r=await sbAuth("token?grant_type=password",{email,password:pw});j=await r.json();
        if(!j.access_token)return bad("Account created but Supabase needs email confirmation. Turn OFF 'Confirm email' in Authentication settings.")}
      if(!r.ok||!j.access_token)return bad(creating?(/already/i.test(j.msg||j.message||"")?"This username is taken. Try another.":(j.msg||j.error_description||"Could not create login.")):"Wrong username or password.");
      const nm=(j.user&&j.user.user_metadata&&j.user.user_metadata.name)||name.split("@")[0],rem=$("#lr").checked;
      setSession(j,nm,rem);
      const us=getUsers();us[key]={name:nm,h:hh(pw)};localStorage.setItem(UK,JSON.stringify(us));
      (rem?localStorage:sessionStorage).setItem(SK,nm);
      f.reset();$("#lr").checked=true;creating=false;mode();enter(nm)
    }catch{
      const us=getUsers();
      if(!creating&&us[key]&&us[key].h===hh(pw)){loadAuth();(($("#lr").checked?localStorage:sessionStorage)).setItem(SK,us[key].name);f.reset();$("#lr").checked=true;enter(us[key].name)}
      else bad("No internet. Offline login works only for accounts already used on this device.")
    }finally{btn.disabled=false}
  };
  loadAuth();
  const s=localStorage.getItem(SK)||sessionStorage.getItem(SK);
  if(s&&(auth||getUsers()[s.toLowerCase()]))enter(s);else ic();
}

/* ===== CLOUD SYNC (localStorage = offline cache) ===== */
let cloudTimer=null,cloudBusy=false;
function cloudPush(){clearTimeout(cloudTimer);cloudTimer=setTimeout(cloudFlush,800)}
async function cloudFlush(){
  cloudTimer=null;
  if(cloudBusy){cloudPush();return}
  cloudBusy=true;
  try{
    const h=await hdr();if(!h)throw new Error("noauth");
    const r=await fetch(SB_URL+"/rest/v1/app_data?on_conflict=id",{method:"POST",headers:{...h,Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({id:SB_ROW,data:db,updated_at:new Date().toISOString()})});
    if(!r.ok)throw new Error(r.status);
    localStorage.removeItem("esevaiPro.dirty");cloudState("ok")
  }catch(e){localStorage.setItem("esevaiPro.dirty","1");cloudState("off")}
  cloudBusy=false;
}
function cloudState(s){const t=$("#today");if(t)t.title=s==="ok"?"Cloud synced":"Offline - will sync later"}
function normDb(){
  db.reminders=db.reminders||[];db.bills=db.bills||[];db.apps=db.apps||[];db.services=db.services||DEF().services;
  db.tpl=db.tpl&&db.tpl.length?db.tpl:TPL();db.sent=db.sent||{};db.msgs=db.msgs||{};
  db.apps.forEach(a=>{a.docs=a.docs||[];a.log=a.log||[];a.upd=a.upd||a.ts;a.gov=a.gov||0;a.charge=a.charge||0})
}
async function cloudPull(){
  if(cloudBusy||cloudTimer||!auth)return;
  try{
    const h=await hdr();if(!h)return;
    const r=await fetch(SB_URL+"/rest/v1/app_data?id=eq."+SB_ROW+"&select=data",{headers:h,cache:"no-store"});
    if(!r.ok)throw new Error(r.status);
    const rows=await r.json();
    if(!rows.length){await cloudFlush();return}
    const remote=rows[0].data||{},rts=+remote._ts||0,lts=+db._ts||0;
    if(localStorage.getItem("esevaiPro.dirty")||lts>rts){await cloudFlush();return}
    if(rts>lts){
      if($("#modal").classList.contains("open"))return;
      db=remote;normDb();localStorage.setItem(KEY,JSON.stringify(db));
      if(!document.body.classList.contains("locked"))go();
    }
    cloudState("ok")
  }catch(e){cloudState("off")}
}
addEventListener("load",()=>setInterval(cloudPull,30000));
addEventListener("online",()=>cloudPull());
document.addEventListener("visibilitychange",()=>{if(!document.hidden)cloudPull()});