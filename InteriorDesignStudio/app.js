
const rooms = [
 {name:'Warm Minimal Living',type:'Living Room',style:'Warm Minimal',price:185000,img:'assets/living-room.png',desc:'Soft neutrals, tactile fabrics and calm natural textures.'},
 {name:'Quiet Luxury Bedroom',type:'Bedroom',style:'Quiet Luxury',price:142000,img:'assets/bedroom.png',desc:'Layered bedding, warm lighting and refined details.'},
 {name:'Sage Modern Kitchen',type:'Kitchen',style:'Modern Natural',price:210000,img:'assets/kitchen.png',desc:'Clean storage, muted greens and practical work zones.'},
 {name:'Earthy Dining Space',type:'Dining Room',style:'Earthy Organic',price:98000,img:'assets/dining-room.png',desc:'Natural wood, welcoming light and relaxed hosting.'},
 {name:'Creative Work Nook',type:'Workspace',style:'Scandinavian',price:72000,img:'assets/workspace.png',desc:'A focused, uncluttered corner with a little personality.'},
 {name:'Spa Inspired Bath',type:'Bathroom',style:'Spa Inspired',price:125000,img:'assets/bathroom.png',desc:'Fresh surfaces, gentle tones and a restorative feel.'}
];
const palettes = [
 {name:'Warm ivory',color:'#e7ddce'},
 {name:'Sage green',color:'#a7b39b'},
 {name:'Terracotta',color:'#b9785d'},
 {name:'Slate blue',color:'#777d80'},
 {name:'Soft sand',color:'#d2bd9e'}
];
const designStyles = ['Warm Minimal','Quiet Luxury','Modern Natural','Earthy Organic','Scandinavian','Spa Inspired'];
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
let favorites = [];
let savedPlan = null;
let backendOnline = false;
const browserOnly = location.protocol === 'file:';
let clientId = '';
function toast(message){const el=$('#toast');if(!el)return;el.textContent=message;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2300)}
function readStorage(key, fallback){try{const raw=localStorage.getItem(key);if(raw===null)return fallback;const value=JSON.parse(raw);return value ?? fallback}catch{return fallback}}
function writeStorage(key, value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}}
function getClientId(){let id=readStorage('interiorClientId',null);if(typeof id==='string'&&id)return id;id=globalThis.crypto?.randomUUID?crypto.randomUUID():'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return(c==='x'?r:(r&3|8)).toString(16)});writeStorage('interiorClientId',id);return id}
async function apiRequest(path,options={}){const response=await fetch(path,{...options,headers:{'Content-Type':'application/json','X-Client-Id':clientId,...options.headers}});let result={};try{result=await response.json()}catch{}if(!response.ok)throw new Error(result.error||`Request failed (${response.status})`);return result}
async function initializeData(){clientId=getClientId();const localFavorites=readStorage('interiorFavorites',[]),localPlan=readStorage('myInteriorPlan',null);favorites=Array.isArray(localFavorites)?localFavorites:[];savedPlan=localPlan;if(browserOnly)return;try{let state=await apiRequest('/api/state');backendOnline=true;if(!state.initialized&&(favorites.length||savedPlan)){await apiRequest('/api/state',{method:'PUT',body:JSON.stringify({favorites,plan:savedPlan})});state=await apiRequest('/api/state')}favorites=Array.isArray(state.favorites)?state.favorites:[];savedPlan=state.plan||null;writeStorage('interiorFavorites',favorites);writeStorage('myInteriorPlan',savedPlan)}catch(error){backendOnline=false;console.error('SQLite backend unavailable:',error);toast('SQLite backend unavailable; saved data will stay in this browser.')}}
async function saveBrowserState(nextFavorites,nextPlan){if(backendOnline){try{await apiRequest('/api/state',{method:'PUT',body:JSON.stringify({favorites:nextFavorites,plan:nextPlan})});favorites=nextFavorites;savedPlan=nextPlan;writeStorage('interiorFavorites',favorites);writeStorage('myInteriorPlan',savedPlan);return 'database'}catch(error){backendOnline=false;console.error('Could not save to SQLite:',error)}}if(!writeStorage('interiorFavorites',nextFavorites)||!writeStorage('myInteriorPlan',nextPlan)){toast('Saving is unavailable in this browser');return null}favorites=nextFavorites;savedPlan=nextPlan;return 'local'}
function getFavorites(){return favorites}
async function toggleFavorite(name){const exists=favorites.includes(name);const updated=exists?favorites.filter(x=>x!==name):[...favorites,name];const saved=await saveBrowserState(updated,savedPlan);if(!saved)return;toast(saved==='database'?(exists?'Removed from favorites':'Saved to your favorites'):`${exists?'Removed from favorites':'Saved to your favorites'} in this browser (${browserOnly?'offline mode':'SQLite unavailable'})`);renderCardsIfPresent()}
function cardHTML(r){const saved=getFavorites().includes(r.name),query=new URLSearchParams({room:r.type,style:r.style}),plannerUrl=`planner.html?${query.toString()}`,showPrice=document.body.dataset.page!=='gallery';return `<article class="card"><a class="card-image-link" href="${plannerUrl}" aria-label="Plan this ${r.type}"><img src="${r.img}" alt="${r.type} interior concept"></a><div class="card-body"><span class="tag">${r.type}</span><h3>${r.name}</h3><p>${r.desc}</p><div class="card-foot">${showPrice?`<span><b>₹${r.price.toLocaleString('en-IN')}</b> <small style="color:var(--muted)">est.</small></span>`:'<span></span>'}<button class="favorite" aria-label="Save ${r.name}" onclick="toggleFavorite('${r.name}')">${saved?'♥':'♡'}</button></div></div></article>`}
function renderCards(list=rooms,target='#room-grid'){const el=$(target);if(el)el.innerHTML=list.length?list.map(cardHTML).join(''):'<div class="empty">No designs match your search yet.</div>'}
function renderCardsIfPresent(){if($('#room-grid'))filterRooms();if($('#favorite-grid'))renderFavorites()}
function filterRooms(){const q=($('#search')?.value||'').toLowerCase();const type=$('#type-filter')?.value||'All';renderCards(rooms.filter(r=>(type==='All'||r.type===type)&&(r.name+' '+r.type+' '+r.style+' '+r.desc).toLowerCase().includes(q)))}
function renderFavorites(){
 const names=getFavorites();
 renderCards(rooms.filter(r=>names.includes(r.name)),'#favorite-grid');
 const card=$('#saved-plan-card');
 if(!card)return;
 card.hidden=!savedPlan||!savedPlan.room||!savedPlan.style;
 if(card.hidden)return;
 const palette=palettes.find(item=>item.color===savedPlan.palette);
 $('#saved-plan-name').textContent=`${savedPlan.style} ${savedPlan.room}`;
 $('#saved-plan-details').textContent=`${savedPlan.room} · ${savedPlan.style}${palette?` · ${palette.name} palette`:''}`;
 const budget=savedPlan.budget;
 $('#saved-plan-budget').textContent=budget&&Number.isFinite(budget.total)?`Saved estimate: ₹${Math.round(budget.total).toLocaleString('en-IN')} (${budget.area} sq. ft., ${budget.finish}× finish)`:'';
}
function initTheme(){if(readStorage('interiorTheme',null)==='dark')document.body.classList.add('dark');$('#theme-toggle')?.addEventListener('click',()=>{document.body.classList.toggle('dark');writeStorage('interiorTheme',document.body.classList.contains('dark')?'dark':'light')})}
function initMenu(){$('#menu-toggle')?.addEventListener('click',()=>$('.nav')?.classList.toggle('open'))}
async function init(){initTheme();initMenu();await initializeData();const page=document.body.dataset.page;if(page==='home'){renderCards(rooms.slice(0,3))}if(page==='rooms'||page==='gallery'){renderCards();$('#search')?.addEventListener('input',filterRooms);$('#type-filter')?.addEventListener('change',filterRooms)}if(page==='favorites')renderFavorites();if(page==='planner')initPlanner();if(page==='budget')initBudget();if(page==='contact')initContact();if(page==='inspiration')initInspiration()}
function initPlanner(){
 const room=$('#planner-room'),style=$('#planner-style'),preview=$('#planner-preview'),name=$('#preview-name'),params=new URLSearchParams(location.search);
 const queryRoom=params.get('room'),queryStyle=params.get('style'),queryPalette=params.get('palette');
 let selectedPalette=palettes.some(item=>item.color===queryPalette)?queryPalette:(palettes.some(item=>item.color===savedPlan?.palette)?savedPlan.palette:palettes[0].color);
 if(savedPlan&&rooms.some(item=>item.type===savedPlan.room))room.value=savedPlan.room;
 if(savedPlan&&designStyles.includes(savedPlan.style))style.value=savedPlan.style;
 if(rooms.some(item=>item.type===queryRoom))room.value=queryRoom;
 if(designStyles.includes(queryStyle))style.value=queryStyle;
 function update(){
  const selectedRoom=rooms.find(item=>item.type===room.value)||rooms[0];
  preview.src=selectedRoom.img;
  preview.parentElement.style.setProperty('--preview-tint',selectedPalette);
  name.textContent=`${style.value} ${selectedRoom.type} concept`;
  $('#planner-description').textContent=`A ${style.value.toLowerCase()} direction for your ${selectedRoom.type.toLowerCase()}. Use a layered palette, practical furniture and warm lighting.`;
  $$('.palette-choice').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.color===selectedPalette)));
 }
 room?.addEventListener('change',update);
 style?.addEventListener('change',update);
 $$('.palette-choice').forEach(button=>button.addEventListener('click',()=>{selectedPalette=button.dataset.color;update()}));
 update();
 $('#planner-back')?.addEventListener('click',()=>{location.href='rooms.html'});
 $('#planner-next')?.addEventListener('click',()=>{
  const query=new URLSearchParams({room:room.value,style:style.value,palette:selectedPalette});
  location.href=`budget.html?${query.toString()}`;
 });
}
function initBudget(){
 const form=$('#budget-form'),params=new URLSearchParams(location.search),roomType=params.get('room'),styleName=params.get('style'),paletteColor=params.get('palette');
 const activeRoom=rooms.find(item=>item.type===roomType),hasPlan=Boolean(activeRoom&&designStyles.includes(styleName)&&palettes.some(item=>item.color===paletteColor));
 const selectedPalette=hasPlan?paletteColor:palettes[0].color;
 const saveButton=$('#save-budget-plan'),planSummary=$('#budget-plan-summary');
 if(hasPlan){
  planSummary.hidden=false;
  $('#budget-plan-name').textContent=`${styleName} ${activeRoom.type}`;
  $('#budget-plan-palette').style.backgroundColor=selectedPalette;
  $('#budget-back').href=`planner.html?${new URLSearchParams({room:roomType,style:styleName,palette:selectedPalette}).toString()}`;
  $('#budget-flow').hidden=false;
 }
 form?.addEventListener('input',calculateBudget);
 form?.addEventListener('submit',event=>{event.preventDefault();calculateBudget();toast('Estimate updated')});
 function calculateBudget(){
  const area=$('#area').valueAsNumber,rate=$('#rate').valueAsNumber,finish=Number($('#finish').value),extra=$('#extra').valueAsNumber;
  const safeArea=Number.isFinite(area)?area:0,safeRate=Number.isFinite(rate)?rate:0,safeExtra=Number.isFinite(extra)?extra:0,total=safeArea*safeRate*finish+safeExtra;
  $('#budget-total').textContent='₹'+Math.round(total).toLocaleString('en-IN');
  $('#budget-breakdown').textContent=`Base work ₹${Math.round(safeArea*safeRate).toLocaleString('en-IN')} × finish factor ${finish.toFixed(2)} + extras ₹${safeExtra.toLocaleString('en-IN')}.`;
  return {area:safeArea,rate:safeRate,finish,extra:safeExtra,total:Math.round(total)};
 }
 calculateBudget();
 saveButton?.addEventListener('click',async()=>{
  const budget=calculateBudget();
  if(!Number.isFinite(budget.area)||!Number.isFinite(budget.total)||budget.area<1||budget.rate<0||budget.extra<0){toast('Enter valid non-negative budget details before saving');return}
  const plan={room:roomType,style:styleName,palette:selectedPalette,budget};
  const nextFavorites=favorites.includes(activeRoom.name)?favorites:[...favorites,activeRoom.name];
  const saved=await saveBrowserState(nextFavorites,plan);
  if(saved)toast(saved==='database'?'Your complete room idea and budget are saved':`Your complete room idea and budget are saved in this browser (${browserOnly?'offline mode':'SQLite unavailable'})`);
 });
}
function initContact(){$('#contact-form')?.addEventListener('submit',async e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.target));if(backendOnline){try{await apiRequest('/api/enquiries',{method:'POST',body:JSON.stringify(data)});e.target.reset();toast('Thank you! Your enquiry is saved to the SQLite database.');return}catch(error){backendOnline=false;console.error('Could not save enquiry to SQLite:',error)}}const enquiries=readStorage('interiorEnquiries',[]);const updated=Array.isArray(enquiries)?[...enquiries,{...data,date:new Date().toLocaleString()}]:[{...data,date:new Date().toLocaleString()}];if(!writeStorage('interiorEnquiries',updated)){toast('Could not save your enquiry; please try again.');return}e.target.reset();toast(`Enquiry saved in this browser (${browserOnly?'offline mode':'SQLite unavailable'}).`)})}
function initInspiration(){const tips=['Start with one anchor piece, then build the room around it.','Repeat a material or colour at least three times for a cohesive look.','Use warm layered lighting: ambient, task and accent.','Leave breathing space around furniture so the room feels calm.','Mix textures—linen, wood, stone and boucle add depth without clutter.','Measure walkways before buying furniture; comfort is part of good design.'];const el=$('#tip-card');let i=0;function show(){el.textContent=tips[i]}show();$('#next-tip')?.addEventListener('click',()=>{i=(i+1)%tips.length;show()});$('#random-tip')?.addEventListener('click',()=>{i=Math.floor(Math.random()*tips.length);show()})}
document.addEventListener('DOMContentLoaded',init);
