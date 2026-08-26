const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
const KEY="vault_state_v2";
let state=JSON.parse(localStorage.getItem(KEY)||"null")||{
 balance:0, hidden:false, frozen:false, light:false, accentTheme:"green",
 transactions:[], revealed:false, linkedCards:[],
 spending:{food:0,shopping:0,bills:0,other:0}, notifications:false, currency:"USD", displayName:"Vault Member"
};
if(!Array.isArray(state.linkedCards))state.linkedCards=[];
if(!state.currency)state.currency="USD";
if(!state.displayName)state.displayName="Vault Member";
const save=()=>localStorage.setItem(KEY,JSON.stringify(state));
const ACCENT_THEMES={
 white:{accent:"#ffffff",accent2:"#e6e6ea",rgb:"255,255,255",dark:"#d3d2d8"},
 purple:{accent:"#8b7cf6",accent2:"#b5aaff",rgb:"139,124,246",dark:"#5e55a5"},
 red:{accent:"#ef4444",accent2:"#ff9b9b",rgb:"239,68,68",dark:"#a82525"},
 green:{accent:"#22c55e",accent2:"#8fefb3",rgb:"34,197,94",dark:"#158249"},
 blue:{accent:"#3b82f6",accent2:"#93c0ff",rgb:"59,130,246",dark:"#1d4ed8"},
 brown:{accent:"#a5713f",accent2:"#d6ac7f",rgb:"165,113,63",dark:"#6b4726"},
 grey:{accent:"#8a8a94",accent2:"#c2c1ca",rgb:"138,138,148",dark:"#57565f"}
};
function applyAccent(name){
 const key=ACCENT_THEMES[name]?name:"purple";
 const t=ACCENT_THEMES[key];
 const r=document.documentElement.style;
 r.setProperty("--accent",t.accent);
 r.setProperty("--accent2",t.accent2);
 r.setProperty("--accent-rgb",t.rgb);
 r.setProperty("--accent-dark",t.dark);
 document.body.dataset.accentTheme=key;
}
function syncAccentSwatches(){
 $$("#accentSwatches [data-accent]").forEach(b=>b.classList.toggle("active",b.dataset.accent===(state.accentTheme||"purple")));
}
const CURRENCY_SYMBOLS={USD:"$",GBP:"£",JPY:"¥",NGN:"₦"};
function syncCurrencySwatches(){
 $$("#currencySwatches [data-currency]").forEach(b=>b.classList.toggle("active",b.dataset.currency===(state.currency||"USD")));
}
function applyFont(){
 document.body.classList.toggle("font-chime",state.fontTheme==="chime");
 document.body.classList.toggle("font-paypal",state.fontTheme==="paypal");
}
function syncFontSwatches(){
 $$("#fontSwatches [data-font]").forEach(b=>b.classList.toggle("active",b.dataset.font===state.fontTheme));
}
const money=n=>(CURRENCY_SYMBOLS[state.currency]||"$")+Number(n).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
function toast(t){let e=$("#toast");e.textContent=t;e.classList.add("show");setTimeout(()=>e.classList.remove("show"),2200)}
function notifSupported(){return "Notification" in window}
function notify(title,body){
 if(!state.notifications) return;
 if(!notifSupported()) return;
 if(Notification.permission!=="granted") return;
 try{ new Notification(title,{body,tag:"vault-"+Date.now()}) }catch(e){}
}
function syncNotifBtn(){
 const b=$("#notifToggleBtn");
 if(!b) return;
 if(!notifSupported()){ b.textContent="Notifications not supported"; b.disabled=true; return }
 if(state.notifications && Notification.permission==="granted"){ b.textContent="Notifications on ✓"; }
 else if(Notification.permission==="denied"){ b.textContent="Notifications blocked — check browser settings"; }
 else{ b.textContent="Enable transaction notifications"; }
}
function genTxId(){return Array.from({length:20},()=>Math.floor(Math.random()*10)).join("")}
function addTx(type,title,amount,meta="Just now",category="other",status="completed"){
 state.transactions.unshift({id:Date.now()+Math.random(),txId:genTxId(),type,title,amount,meta,category,status});
 save(); render();
}
function addPendingTx(type,title,amount,meta,category){
 const id=Date.now()+Math.random();
 state.transactions.unshift({id,txId:genTxId(),type,title,amount,meta,category,status:"pending"});
 save(); render();
 return id;
}
function completeTx(id,newMeta="Just now"){
 const tx=state.transactions.find(t=>t.id===id);
 if(tx){tx.status="completed";tx.meta=newMeta;}
 save(); render();
}
function render(){
 document.body.classList.toggle("light",state.light);
 $("#balance").textContent=state.hidden?"••••••":money(state.balance);
 $("#toggleBalance").textContent=state.hidden?"◎":"◉";
 $("#cvv").textContent=state.revealed?"381":"•••";
 $("#cardNumber").textContent=state.revealed?"4827  1904  6631  4821":"••••  ••••  ••••  4821";
 $("#spendingTotal").textContent=money(state.spending.food+state.spending.shopping+state.spending.bills+state.spending.other);
 $("#availableBalance").textContent=state.hidden?"••••••":money(state.balance);
 $("#foodSpend").textContent=money(state.spending.food);
 $("#shopSpend").textContent=money(state.spending.shopping);
 $("#billSpend").textContent=money(state.spending.bills);
 $("#otherSpend").textContent=money(state.spending.other);
 if($("#homeGreeting"))$("#homeGreeting").textContent="Hi, "+(state.displayName||"Vault Member");
 renderChart(); renderTx(); renderLinkedCards();
 if(currentTxId!==null && !$("#txDetailMain").classList.contains("hidden")){
  const tx=state.transactions.find(t=>t.id===currentTxId);
  if(tx && (tx.status!==txDetailLastStatus || currentTxId!==txDetailLastId)) renderTxDetail();
 }
}
function cardBrand(num){
 if(/^4/.test(num))return"Visa";
 if(/^5[1-5]/.test(num))return"Mastercard";
 if(/^3[47]/.test(num))return"Amex";
 if(/^6(?:011|5)/.test(num))return"Discover";
 return"Card";
}
function linkedCardRow(c,i){
 return `<div class="linked-card"><div class="tx-icon">✓</div><div class="tx-info"><b>${esc(c.brand)} •••• ${esc(c.last4)}</b><small>${esc(c.name)} · Exp ${esc(c.expiry)}</small></div><button class="small-btn" onclick="removeLinkedCard(${i})">Remove</button></div>`;
}
function renderLinkedCards(){
 const html=state.linkedCards.length?state.linkedCards.map(linkedCardRow).join(""):`<div class="empty">No cards added yet.</div>`;
 if($("#linkedCards"))$("#linkedCards").innerHTML=html;
 if($("#linkedCardsChecklist"))$("#linkedCardsChecklist").innerHTML=html;
}
function removeLinkedCard(i){state.linkedCards.splice(i,1);save();render();toast("Card removed")}
function renderChart(){
 const vals=Object.values(state.spending), max=Math.max(...vals,10);
 $("#chart").innerHTML=vals.map(v=>`<div class="bar" style="height:${Math.max(5,v/max*100)}%"></div>`).join("");
}
let currentFilter="all";
let currentTxId=null;
let txDetailLastId=null, txDetailLastStatus=null;
function renderTx(){
 const q=$("#searchTx").value.toLowerCase();
 let arr=state.transactions.filter(t=>(currentFilter==="all"||t.type===currentFilter)&&(`${t.title} ${t.meta}`).toLowerCase().includes(q));
 $("#transactions").innerHTML=arr.length?arr.map(t=>{
 const pending=t.status==="pending";
 const icon=pending?"❗️":(t.type==="sent"?"↗":t.type==="received"?"↓":"＋");
 return `<div class="tx ${pending?"pending":""}" data-id="${t.id}"><div class="tx-icon ${pending?"pulse":""}">${icon}</div><div class="tx-info"><b>${esc(t.title)}</b><small>${pending?"Pending":`${esc(t.meta)} · ${esc(t.category)}`}</small></div><div class="tx-amount ${pending?"pending-amt":(t.amount>=0?"plus":"minus")}">${t.amount>=0?"+":"−"}${money(Math.abs(t.amount))}</div></div>`;
 }).join(""):`<div class="empty">No transactions yet.</div>`;
}
function esc(x){return String(x).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
let lockedScrollY=0;
function openModal(html,opts={}){$("#modalContent").innerHTML=html;$(".modal-sheet").classList.toggle("raised",!!opts.raised);$("#modal").classList.remove("hidden");lockedScrollY=window.scrollY;document.body.style.top=`-${lockedScrollY}px`;document.body.classList.add("modal-lock")}
function closeModal(){$("#modal").classList.add("hidden");document.body.classList.remove("modal-lock");document.body.style.top="";window.scrollTo(0,lockedScrollY)}
$("#closeModal").onclick=closeModal;
$(".modal-backdrop").onclick=closeModal;

const COUNTRIES=["United Kingdom","Ireland","Canada","Australia","New Zealand","Germany","France","Spain","Italy","Netherlands","Belgium","Switzerland","Sweden","Norway","Denmark","Poland","Portugal","Austria","Nigeria","Ghana","South Africa","Kenya","Egypt","Morocco","India","China","Japan","South Korea","Singapore","Hong Kong","United Arab Emirates","Saudi Arabia","Qatar","Israel","Turkey","Brazil","Mexico","Argentina","Chile","Colombia","Philippines","Indonesia","Malaysia","Thailand","Vietnam","Pakistan","Bangladesh"];

function intlForm(){
 return `<h2>International transfer</h2><p>Send money abroad to any bank account.</p>
 <div class="field"><label>Country</label><select id="country">${COUNTRIES.map(c=>`<option>${esc(c)}</option>`).join("")}</select></div>
 <div class="field"><label>Recipient name</label><input id="who" placeholder="e.g. Alex Morgan"></div>
 <div class="field"><label>Account number / IBAN</label><input id="acctNum" placeholder="e.g. GB29 NWBK 6016 1331 9268 19"></div>
 <div class="field"><label>Amount (USD)</label><input id="amt" type="number" inputmode="decimal" min="0.01" step="0.01" placeholder="0.00"></div>
 <button class="primary" id="submitMoney">Send transfer</button>`;
}
function addFromCardForm(){
 return `<h2>Add from card</h2><p>Choose a linked card and amount to add to your balance.</p>
 <div class="field"><label>Card</label><select id="who">${state.linkedCards.map((c,i)=>`<option value="${i}">${esc(c.brand)} •••• ${esc(c.last4)}</option>`).join("")}</select></div>
 <div class="field"><label>Amount (USD)</label><input id="amt" type="number" inputmode="decimal" min="0.01" step="0.01" placeholder="0.00"></div>
 <div class="quick">${[10,50,100,500].map(x=>`<button type="button" onclick="$('#amt').value=${x}">$${x}</button>`).join("")}</div>
 <button class="primary" id="submitMoney">Add to balance</button>`;
}
function amountForm(kind){
 const labels={send:["Send money","Recipient","Send"],receive:["Receive money","From","Add received money"]};
 const [title,who,button]=labels[kind];
 return `<h2>${title}</h2><p>${kind==="send"?"Enter the recipient and amount to continue.":""}</p>
 <div class="field"><label>${who}</label><input id="who" placeholder="e.g. Alex"></div>
 <div class="field"><label>Amount (USD)</label><input id="amt" type="number" inputmode="decimal" min="0.01" step="0.01" placeholder="0.00"></div>
 <button class="primary" id="submitMoney">${button}</button>`;
}
function transactionAuth(kind){
  const labels={send:"Send money",receive:"Receive money",add:"Add from card",intl:"International transfer"};
  openModal(`<div class="success" style="font-size:24px">⌁</div><h2 style="text-align:center">Enter passcode</h2><p style="text-align:center">Enter your 4-digit passcode to continue with ${labels[kind]}.</p>
  <div class="pin-boxes" id="pinBoxes">
    ${[0,1,2,3].map(i=>`<input class="pin-box" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="1" autocomplete="off" data-i="${i}">`).join("")}
  </div>`);
  const boxes=[...document.querySelectorAll("#pinBoxes .pin-box")];
  let checking=false;
  const clearBoxes=()=>{boxes.forEach(b=>{b.value="";b.classList.remove("filled")})};
  const shake=()=>{
    boxes.forEach(b=>b.classList.add("shake"));
    setTimeout(()=>boxes.forEach(b=>b.classList.remove("shake")),400);
  };
  const checkComplete=()=>{
    if(checking) return;
    const pin=boxes.map(b=>b.value).join("");
    if(pin.length<4) return;
    checking=true;
    if(pin==="1472"){
      amountFormAndSubmit(kind);
    }else{
      toast("Incorrect passcode");
      shake();
      setTimeout(()=>{
        clearBoxes();
        boxes[0].focus({preventScroll:true});
        checking=false;
      },400);
    }
  };
  boxes.forEach((box,i)=>{
    box.addEventListener("input",()=>{
      box.value=box.value.replace(/[^0-9]/g,"").slice(-1);
      box.classList.toggle("filled",!!box.value);
      if(box.value && i<3) boxes[i+1].focus({preventScroll:true});
      checkComplete();
    });
    box.addEventListener("keydown",e=>{
      if(e.key==="Backspace" && !box.value && i>0){
        boxes[i-1].focus({preventScroll:true});
      }
    });
  });
  setTimeout(()=>boxes[0]&&boxes[0].focus({preventScroll:true}),50);
}

/* ---- Pending badge (animated) shown the same way the success badge is ---- */
const PENDING_BADGE_SVG=`<svg class="pending-badge" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
 <circle class="pending-ring-bg" cx="50" cy="50" r="42" fill="none" stroke="#f5a52f" stroke-width="8"/>
 <circle class="pending-ring" cx="50" cy="50" r="42" fill="none" stroke="#f5a52f" stroke-width="8" stroke-linecap="round"/>
 <circle class="pending-dot" cx="50" cy="50" r="6" fill="#f5a52f"/>
</svg>`;
function showStatusPage(html){
 $("#homeMain").classList.add("hidden");
 $("#profileMain").classList.add("hidden");
 $("#addCardMain").classList.add("hidden");
 $("#receiveMain").classList.add("hidden");
 $("#txDetailMain").classList.add("hidden");
 $(".bottom-nav").classList.add("hidden");
 $(".topbar").classList.add("hidden");
 $("#statusBody").innerHTML=html;
 $("#statusMain").classList.remove("hidden");
 $("#statusActions").classList.remove("hidden");
 window.scrollTo({top:0});
}
function pending(title,text,note="",badge=PENDING_BADGE_SVG){
 showStatusPage(`<div class="success">${badge}</div><h2 style="text-align:center">${title}</h2><p style="text-align:center">${text}</p>${note?`<p class="status-note">${note}</p>`:""}`);
 save(); render();
}

const CARD_PENDING_SVG=`<svg class="card-pending-badge" viewBox="0 0 160 118" xmlns="http://www.w3.org/2000/svg">
 <defs>
  <linearGradient id="cardPendingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
   <stop offset="0%" stop-color="var(--accent2)"/>
   <stop offset="100%" stop-color="var(--accent-dark)"/>
  </linearGradient>
  <clipPath id="cardPendingClip"><rect x="12" y="16" width="136" height="82" rx="14"/></clipPath>
 </defs>
 <g class="card-pending-body">
  <rect x="12" y="16" width="136" height="82" rx="14" fill="url(#cardPendingGrad)"/>
  <rect x="26" y="34" width="27" height="19" rx="4" fill="#ffffff99"/>
  <rect x="26" y="69" width="58" height="7" rx="3.5" fill="#ffffff66"/>
  <rect x="26" y="81" width="38" height="6" rx="3" fill="#ffffff40"/>
  <g clip-path="url(#cardPendingClip)">
   <rect class="card-pending-shine" x="-40" y="0" width="34" height="118" fill="#ffffff55" transform="skewX(-18)"/>
  </g>
 </g>
 <g transform="translate(130,90)">
  <circle r="17" fill="var(--panel)"/>
  <circle class="card-pending-ring-bg" r="13" fill="none" stroke="#f5a52f" stroke-width="4" opacity=".35"/>
  <circle class="card-pending-ring" r="13" fill="none" stroke="#f5a52f" stroke-width="4" stroke-linecap="round" stroke-dasharray="61 82"/>
  <circle class="card-pending-dot" r="2.6" fill="#f5a52f"/>
 </g>
</svg>`;

function amountFormAndSubmit(kind){
  openModal(kind==="intl"?intlForm():kind==="add"?addFromCardForm():amountForm(kind));
  $("#submitMoney").onclick=()=>{
    const amt=Number($("#amt").value||0);
    let who=kind==="add"?"":($("#who").value.trim()||"Vault user");
    if(kind==="add"){
      const card=state.linkedCards[Number($("#who").value)];
      if(!card){toast("Select a card");return}
      who=`${card.brand} •••• ${card.last4}`;
    }
    if(!(amt>0)){toast("Enter a valid amount");return}
    if(kind==="intl"){
      const country=$("#country").value;
      const acct=$("#acctNum").value.trim();
      if(!acct){toast("Enter an account number");return}
      if(amt>state.balance){toast("Insufficient balance");return}
      const acctTail=acct.replace(/\s+/g,"").slice(-4);
      const id=addPendingTx("sent",`Sent to ${who} (${country})`,-amt,`Intl · Acct •••${acctTail}`,"other");
      pending("Sending transfer…",`Sending ${money(amt)} to ${esc(who)} in ${esc(country)}.`,"International transactions are processed within 24hrs to 2 business days.");
      setTimeout(()=>{
        state.balance-=amt;
        state.spending.other+=amt;
        completeTx(id,`Intl · ${country} · Acct •••${acctTail}`);
        success("Transfer sent",`You sent ${money(amt)} to ${esc(who)} in ${esc(country)}`);
      },10000);
      return;
    }
    if(kind==="add"){
      const id=addPendingTx("added","Money added",amt,`From ${who}`,"other");
      pending("Adding money…",`Adding ${money(amt)} from your ${esc(who)}.`);
      setTimeout(()=>{
        state.balance+=amt;
        completeTx(id);
        success("Money added",`Your balance is now ${money(state.balance)}`);
      },10000);
    }
    if(kind==="send"){
      if(amt>state.balance){toast("Insufficient balance");return}
      const id=addPendingTx("sent",`Sent to ${who}`,-amt,"Just now","other");
      pending("Sending money…",`Sending ${money(amt)} to ${esc(who)}. This usually takes a few moments.`);
      setTimeout(()=>{
        state.balance-=amt;
        state.spending.other+=amt;
        completeTx(id);
        success("Sent successfully",`You sent ${money(amt)} to ${esc(who)}`);
      },10000);
    }
    if(kind==="receive"){
      const id=addPendingTx("received",`Received from ${who}`,amt,"Just now","other");
      pending("Receiving money…",`Receiving ${money(amt)} from ${esc(who)}. This usually takes a few moments.`);
      setTimeout(()=>{
        state.balance+=amt;
        completeTx(id);
        success("Payment received",`Your balance increased by ${money(amt)}`);
      },10000);
    }
  }
}
function showAction(kind){transactionAuth(kind)}

const CHECK_BADGE_SVG=`<svg class="check-badge" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
 <circle class="badge-halo" cx="50" cy="50" r="46" fill="#4FAE72"/>
 <circle class="badge-shape" cx="50" cy="50" r="34" fill="url(#badgeGrad)"/>
 <path class="badge-check" d="M33 51 L45 63 L69 37" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
 <defs>
  <linearGradient id="badgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
   <stop offset="0%" stop-color="#8CE6A8"/>
   <stop offset="100%" stop-color="#4FAE72"/>
  </linearGradient>
 </defs>
</svg>`;
function confettiBurst(colors){
 const palette=colors||["#8CE6A8","#4FAE72","#FFD166","#ffffff"];
 return Array.from({length:12},(_,i)=>{
  const angle=(360/12*i)+(Math.random()*14-7);
  const dist=44+Math.random()*30;
  const color=palette[i%palette.length];
  const delay=(Math.random()*0.08).toFixed(2);
  const size=(4+Math.random()*3).toFixed(1);
  return `<span class="confetti-dot" style="--a:${angle.toFixed(1)}deg;--d:${dist.toFixed(0)}px;background:${color};width:${size}px;height:${size}px;animation-delay:${delay}s"></span>`;
 }).join("");
}
function success(title,text){showStatusPage(`<div class="success confetti-wrap">${CHECK_BADGE_SVG}${confettiBurst()}</div><h2 style="text-align:center">${title}</h2><p style="text-align:center">${text}</p>`);save();render();notify(title,text)}

const CARD_ADDED_SVG=`<svg class="card-added-badge" viewBox="0 0 160 118" xmlns="http://www.w3.org/2000/svg">
 <defs>
  <linearGradient id="cardAddedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
   <stop offset="0%" stop-color="var(--accent2)"/>
   <stop offset="100%" stop-color="var(--accent-dark)"/>
  </linearGradient>
  <clipPath id="cardAddedClip"><rect x="12" y="16" width="136" height="82" rx="14"/></clipPath>
 </defs>
 <g class="card-added-body">
  <rect x="12" y="16" width="136" height="82" rx="14" fill="url(#cardAddedGrad)"/>
  <rect x="26" y="34" width="27" height="19" rx="4" fill="#ffffff99"/>
  <rect x="26" y="69" width="58" height="7" rx="3.5" fill="#ffffff66"/>
  <rect x="26" y="81" width="38" height="6" rx="3" fill="#ffffff40"/>
  <g clip-path="url(#cardAddedClip)">
   <rect class="card-added-shine" x="-40" y="0" width="34" height="118" fill="#ffffff55" transform="skewX(-18)"/>
  </g>
 </g>
 <g transform="translate(130,90)">
  <g class="card-added-check">
   <circle r="17" fill="#4FAE72" stroke="var(--panel)" stroke-width="4"/>
   <path d="M-7 0 L-2 5.5 L8 -6" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" class="card-added-check-path"/>
  </g>
 </g>
</svg>`;

$("#receiveAddCardBtn").onclick=()=>{
 if(!state.linkedCards.length){toast("Link a card first");showAddCardPage();return}
 showAction("add");
};
$("#receiveNormalBtn").onclick=()=>showAction("receive");
$("#receiveBtn").onclick=showReceivePage;
$("#backFromReceive").onclick=showHomePage;
$("#intlTransferBtn").onclick=()=>showAction("intl");
$$("[data-action]").forEach(b=>b.onclick=()=>showAction(b.dataset.action));
$("#toggleBalance").onclick=()=>{state.hidden=!state.hidden;save();render()};
$("#addCardBtn").onclick=showAddCardPage;
$("#quickAddMoney").onclick=showReceivePage;
$("#quickCard").onclick=showAddCardPage;
$("#quickActivity").onclick=()=>document.querySelector(".activity-section").scrollIntoView({behavior:"smooth",block:"start"});
$("#showCard").onclick=()=>{state.revealed=!state.revealed;save();render()};
$("#searchTx").oninput=renderTx;
$$(".filter").forEach(b=>b.onclick=()=>{$$(".filter").forEach(x=>x.classList.remove("active"));b.classList.add("active");currentFilter=b.dataset.filter;renderTx()});
$("#clearHistory").onclick=()=>{if(confirm("Clear transaction history?")){state.transactions=[];save();render()}};

function hideStatusPage(){
 $("#statusMain").classList.add("hidden");
 $("#statusActions").classList.add("hidden");
 $(".bottom-nav").classList.remove("hidden");
}
function showProfilePage(){
 hideStatusPage();
 $(".topbar").classList.add("hidden");
 $("#homeMain").classList.add("hidden");
 $("#profileMain").classList.remove("hidden");
 $("#themeToggleBtn").textContent=`Switch to ${state.light?"dark":"light"} mode`;
 syncAccentSwatches();
 syncCurrencySwatches();
 syncFontSwatches();
 syncDisplayName();
 syncNotifBtn();
 window.scrollTo({top:0});
 $$(".nav").forEach(x=>x.classList.remove("active"));
 $('[data-nav="profile"]').classList.add("active");
}
function showHomePage(){
 hideStatusPage();
 $(".topbar").classList.remove("hidden");
 $("#profileMain").classList.add("hidden");
 $("#addCardMain").classList.add("hidden");
 $("#receiveMain").classList.add("hidden");
 $("#txDetailMain").classList.add("hidden");
 $("#homeMain").classList.remove("hidden");
 currentTxId=null;
 txDetailLastId=null; txDetailLastStatus=null;
 window.scrollTo({top:0});
 $$(".nav").forEach(x=>x.classList.remove("active"));
 $('[data-nav="home"]').classList.add("active");
}
function showReceivePage(){
 hideStatusPage();
 $(".topbar").classList.add("hidden");
 $("#homeMain").classList.add("hidden");
 $("#receiveMain").classList.remove("hidden");
 window.scrollTo({top:0});
}
function showAddCardPage(){
 hideStatusPage();
 $(".topbar").classList.add("hidden");
 $("#homeMain").classList.add("hidden");
 $("#receiveMain").classList.add("hidden");
 $("#addCardMain").classList.remove("hidden");
 $("#addCardForm").reset();
 $("#previewNumber").textContent="•••• •••• •••• ••••";
 $("#previewExpiry").textContent="MM/YY";
 $("#previewCvv").textContent="•••";
 $("#previewName").textContent="CARDHOLDER";
 window.scrollTo({top:0});
}
$("#profileBtn").onclick=showProfilePage;
$("#backHome").onclick=showHomePage;
$("#backFromCard").onclick=showHomePage;
$("#backFromTxDetail").onclick=showHomePage;
$("#statusDoneBtn").onclick=showHomePage;

$("#transactions").addEventListener("click",e=>{
 const row=e.target.closest(".tx");
 if(!row)return;
 showTxDetailPage(Number(row.dataset.id));
});

function showTxDetailPage(id){
 currentTxId=id;
 txDetailLastId=null; txDetailLastStatus=null;
 hideStatusPage();
 $(".topbar").classList.add("hidden");
 $("#homeMain").classList.add("hidden");
 $("#profileMain").classList.add("hidden");
 $("#addCardMain").classList.add("hidden");
 $("#txDetailMain").classList.remove("hidden");
 renderTxDetail();
 window.scrollTo({top:0});
}
function renderTxDetail(){
 const tx=state.transactions.find(t=>t.id===currentTxId);
 if(!tx){showHomePage();return}
 if(!tx.txId){tx.txId=genTxId();save()}
 const pending=tx.status==="pending";
 const catLabels={sent:"Payment",received:"Deposit",added:"Deposit"};
 const catText=pending?"Processing":(catLabels[tx.type]||"Other");
 const d=new Date(Math.floor(tx.id));
 const dateText=isNaN(d)?"—":d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
 const timeText=isNaN(d)?"":d.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});
 $("#txDetailContent").innerHTML=`
  <div class="success" style="margin:16px 0 6px">${pending?PENDING_BADGE_SVG:CHECK_BADGE_SVG}</div>
  <div style="text-align:center;font-size:44px;font-weight:800;letter-spacing:-1px;margin:6px 0 2px" class="${tx.amount>=0?'plus':'minus'}">${tx.amount>=0?"+":"−"}${money(Math.abs(tx.amount))}</div>
  <h2 style="text-align:center;margin:0 0 26px;font-size:19px">${esc(tx.title)}</h2>
  <div class="detail-rows">
    <div class="detail-row"><span>Posted date</span><div class="detail-value"><b>${dateText}</b>${timeText?`<small>${timeText}</small>`:""}</div></div>
    <div class="detail-row"><span>Transaction date</span><div class="detail-value"><b>${dateText}</b>${timeText?`<small>${timeText}</small>`:""}</div></div>
    <div class="detail-row"><span>Merchant</span><div class="detail-value"><b>${esc(tx.title)}</b></div></div>
    <div class="detail-row"><span>Category</span><div class="detail-value"><b>${esc(catText)}</b></div></div>
    <div class="detail-row"><span>Description</span><div class="detail-value"><b>${esc(pending?"Processing…":tx.meta)}</b></div></div>
  </div>
  <button class="outline-btn" onclick="reportTxProblem()">Problem with this transaction?</button>
 `;
 txDetailLastId=currentTxId; txDetailLastStatus=tx.status;
}

function reportTxProblem(){toast("Thanks — we've flagged this transaction for review.")}
$("#cardNum").oninput=e=>{
 let v=e.target.value.replace(/\D/g,"").slice(0,16);
 e.target.value=v.replace(/(.{4})/g,"$1 ").trim();
 $("#previewNumber").textContent=v?e.target.value.padEnd(19,"•").replace(/(.{4})(?=.)/g,"$1 ").trim():"•••• •••• •••• ••••";
};
$("#cardExpiry").oninput=e=>{
 let v=e.target.value.replace(/\D/g,"").slice(0,4);
 if(v.length>=3)v=v.slice(0,2)+"/"+v.slice(2);
 e.target.value=v;
 $("#previewExpiry").textContent=v||"MM/YY";
};
$("#cardCvv").oninput=e=>{
 e.target.value=e.target.value.replace(/\D/g,"").slice(0,4);
 $("#previewCvv").textContent="•".repeat(e.target.value.length)||"•••";
};
$("#cardName").oninput=e=>{
 $("#previewName").textContent=e.target.value.trim()?e.target.value.toUpperCase():"CARDHOLDER";
};
$("#addCardForm").onsubmit=e=>{
 e.preventDefault();
 const digits=$("#cardNum").value.replace(/\D/g,"");
 const name=$("#cardName").value.trim();
 const expiry=$("#cardExpiry").value.trim();
 const cvv=$("#cardCvv").value.trim();
 const zip=$("#cardZip").value.trim();
 if(digits.length<13){toast("Enter a valid card number");return}
 if(!name){toast("Enter the cardholder name");return}
 if(!/^\d{2}\/\d{2}$/.test(expiry)){toast("Enter a valid expiry date");return}
 if(cvv.length<3){toast("Enter a valid CVV");return}
 if(!zip){toast("Enter a billing ZIP / postal code");return}
 const brand=cardBrand(digits), last4=digits.slice(-4);
 pending("Adding card…",`Adding your ${brand} card ending in ${last4}.`,"",CARD_PENDING_SVG);
 setTimeout(()=>{
  state.linkedCards.unshift({brand,last4,name,expiry});
  save(); render();
  cardAdded();
 },10000);
};
function cardAdded(){
 showStatusPage(`<div class="success confetti-wrap">${CARD_ADDED_SVG}${confettiBurst()}</div><h2 style="text-align:center;margin-top:16px">Card added successfully</h2>`);
 save(); render();
 notify("Card added successfully","Your card was linked to Vault.");
}
function syncDisplayName(){
 const name=state.displayName||"Vault Member";
 if($("#profileHeaderName"))$("#profileHeaderName").textContent=name;
 const initial=(name.trim()[0]||"A").toUpperCase();
 if($("#profileBtn"))$("#profileBtn").textContent=initial;
 $$(".balance-card .avatar").forEach(a=>a.textContent=initial);
 if($("#profileName"))$("#profileName").value=name;
}
$("#saveProfileBtn").onclick=()=>{
 const name=$("#profileName").value.trim();
 if(!name){toast("Enter a display name");return}
 state.displayName=name;
 save();
 syncDisplayName();
 toast("Profile saved");
};
$("#themeToggleBtn").onclick=()=>{state.light=!state.light;save();render();$("#themeToggleBtn").textContent=`Switch to ${state.light?"dark":"light"} mode`;toast("Theme updated")};
$("#notifToggleBtn").onclick=()=>{
 if(!notifSupported()){toast("Not supported on this browser");return}
 if(Notification.permission==="denied"){toast("Blocked — enable notifications for this site in browser settings");return}
 if(Notification.permission==="granted"){
  state.notifications=!state.notifications;
  save(); syncNotifBtn();
  toast(state.notifications?"Notifications enabled":"Notifications disabled");
  return;
 }
 Notification.requestPermission().then(perm=>{
  state.notifications=(perm==="granted");
  save(); syncNotifBtn();
  toast(perm==="granted"?"Notifications enabled":"Permission denied");
 });
};
$("#clearHistoryProfileBtn").onclick=()=>{if(confirm("Clear transaction history? This can't be undone.")){state.transactions=[];save();render();toast("Transaction history cleared")}};
$$("#accentSwatches [data-accent]").forEach(b=>b.onclick=()=>{
 state.accentTheme=b.dataset.accent;
 save();
 applyAccent(state.accentTheme);
 syncAccentSwatches();
 toast("Accent color updated");
});
$$("#currencySwatches [data-currency]").forEach(b=>b.onclick=()=>{
 state.currency=b.dataset.currency;
 save();
 syncCurrencySwatches();
 render();
 toast("Currency updated");
});
$$("#fontSwatches [data-font]").forEach(b=>b.onclick=()=>{
 state.fontTheme=state.fontTheme===b.dataset.font?null:b.dataset.font;
 save();
 applyFont();
 syncFontSwatches();
 toast(state.fontTheme?"Font updated":"Font reset to default");
});
$("#notificationsBtn").onclick=()=>openModal(`<h2>Notifications</h2><p>${state.transactions.length?"Your latest wallet activity appears here.":"You're all caught up."}</p>${state.transactions.slice(0,5).map(t=>`<div class="tx"><div class="tx-icon">•</div><div class="tx-info"><b>${esc(t.title)}</b><small>${esc(t.meta)}</small></div></div>`).join("")}`);
$$("[data-nav]").forEach(n=>n.onclick=()=>{let target=n.dataset.nav;if(target==="profile"){showProfilePage();return}if(target==="home"){showHomePage();return}$$(".nav").forEach(x=>x.classList.remove("active"));n.classList.add("active");if(target==="card")document.querySelector("#payActions").scrollIntoView({behavior:"smooth",block:"center"});if(target==="activity")document.querySelector("#insightsSection").scrollIntoView({behavior:"smooth",block:"center"})});

applyAccent(state.accentTheme||"purple");
applyFont();
syncDisplayName();
render();

/* ---- Splash screen: shows for at least 4s ---- */
(function(){
 const splash=$("#splashScreen");
 if(!splash)return;
 const MIN_SPLASH_MS=6000;
 const shownAt=Date.now();
 function dismiss(){
  const elapsed=Date.now()-shownAt;
  const wait=Math.max(0,MIN_SPLASH_MS-elapsed);
  setTimeout(()=>{
   splash.classList.add("hide");
   setTimeout(()=>splash.remove(),550);
  },wait);
 }
 if(document.readyState==="complete")dismiss();
 else window.addEventListener("load",dismiss);
})();

/* ---- Pull to refresh ---- */
(function(){
 const pull=$("#pullRefresh");
 if(!pull)return;
 const REST_Y=-70, MAX_PULL=110, TRIGGER_AT=60;
 let startY=0, pulling=false, dragDist=0, refreshing=false;
 function setPull(y){ pull.style.transform=`translate(-50%, ${y}px)`; }
 document.addEventListener("touchstart",e=>{
  if(refreshing)return;
  if(window.scrollY<=0 && $("#modal").classList.contains("hidden")){
   startY=e.touches[0].clientY; pulling=true; dragDist=0;
  }
 },{passive:true});
 document.addEventListener("touchmove",e=>{
  if(!pulling||refreshing)return;
  dragDist=e.touches[0].clientY-startY;
  if(dragDist>0){
   const eased=Math.min(dragDist*0.5,MAX_PULL);
   setPull(REST_Y+eased);
   pull.classList.toggle("visible",eased>8);
  }
 },{passive:true});
 document.addEventListener("touchend",()=>{
  if(!pulling||refreshing)return;
  pulling=false;
  const eased=Math.min(Math.max(dragDist,0)*0.5,MAX_PULL);
  if(eased>=TRIGGER_AT) doRefresh();
  else { setPull(REST_Y); pull.classList.remove("visible"); }
 });
 function doRefresh(){
  refreshing=true;
  setPull(24);
  pull.classList.add("visible","spinning");
  setTimeout(()=>{
   render();
   pull.classList.remove("spinning");
   setPull(REST_Y);
   pull.classList.remove("visible");
   refreshing=false;
   toast("Updated");
  },900);
 }
})();
