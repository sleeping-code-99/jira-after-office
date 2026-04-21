// ── CREATE ISSUE ──
function openCreateIssue(status){
  // populate project dropdown
  const sel=document.getElementById('ni-project');
  sel.innerHTML=projects.map(p=>`<option value="${p.id}"${p.id===currentProjectId?' selected':''}>${esc(p.name)}</option>`).join('');
  if(status) document.getElementById('ni-status').value=status;
  // populate assignee dropdown
  const asel=document.getElementById('ni-assignee');
  asel.innerHTML='<option value="">— Pilih member —</option>'+members.map(m=>`<option value="${m.name}">${esc(m.name)} — ${esc(m.role)}</option>`).join('');
  ['ni-title','ni-desc','ni-link'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('ni-assignee').value='';
  document.getElementById('modal-issue').classList.add('open');
  setTimeout(()=>document.getElementById('ni-title').focus(),100);
}
async function createIssue(){
  const title=document.getElementById('ni-title').value.trim();
  const projId=document.getElementById('ni-project').value;
  if(!title){showToast('Judul issue tidak boleh kosong!');return;}
  const proj=projects.find(p=>p.id===projId);
  const key=(proj?.key||'PF')+'-'+issueCounter++;
  const issue={
    id:'i'+Date.now(), project_id:projId, key, title,
    description:document.getElementById('ni-desc').value.trim(),
    type:document.getElementById('ni-type').value,
    priority:document.getElementById('ni-prio').value,
    status:document.getElementById('ni-status').value,
    assignee:document.getElementById('ni-assignee').value.trim(),
    created_at:new Date().toISOString()
  };
  const link=document.getElementById('ni-link').value.trim();
  if(link){ deliveryLinks[issue.id]=[{id:'l'+Date.now(),label:'Delivery Link',url:link}]; }
  if(!demoMode&&sb){
    const{data,error}=await sb.from('issues').insert([{project_id:issue.project_id,key:issue.key,title:issue.title,description:issue.description,type:issue.type,priority:issue.priority,status:issue.status,assignee:issue.assignee,created_at:issue.created_at}]).select();
    if(error){ console.error('Insert issue error:', error); showToast('Error simpan issue: '+error.message); return; }
    if(data) issue.id=data[0].id;
  }
  issues.unshift(issue);
  closeModal('modal-issue');
  renderAll();
  showToast('Issue berhasil dibuat ✓');
}

// ── NEW PROJECT ──
function openNewProject(){
  initColorSwatches();
  ['np-name','np-key','np-desc'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('modal-project').classList.add('open');
  setTimeout(()=>document.getElementById('np-name').focus(),100);
}
function initColorSwatches(){
  const wrap=document.getElementById('color-swatches');
  wrap.innerHTML=PROJECT_COLORS.map(c=>`<div class="swatch${c===selectedColor?' selected':''}" style="background:${c}" onclick="selectColor('${c}')"></div>`).join('');
}
function selectColor(c){
  selectedColor=c;
  document.querySelectorAll('.swatch').forEach(s=>s.classList.toggle('selected',s.style.background===c||s.style.backgroundColor===c));
}
async function createProject(){
  const name=document.getElementById('np-name').value.trim();
  const key=(document.getElementById('np-key').value.trim().toUpperCase()||name.substring(0,3).toUpperCase());
  if(!name){showToast('Nama project tidak boleh kosong!');return;}
  const proj={id:'p'+Date.now(),name,key,color:selectedColor,description:document.getElementById('np-desc').value.trim(),created_at:new Date().toISOString()};
  if(!demoMode&&sb){
    const{data,error}=await sb.from('projects').insert([{name:proj.name,key:proj.key,color:proj.color,description:proj.description,created_at:proj.created_at}]).select();
    if(error){ console.error('Insert project error:', error); showToast('Error simpan project: '+error.message); return; }
    if(data) proj.id=data[0].id;
  }
  projects.push(proj);
  closeModal('modal-project');
  renderAll();
  showToast('Project dibuat ✓');
}

// ── NAV & UTILS ──
function showPage(name,el){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.sb-item').forEach(n=>n.classList.remove('active'));
  document.getElementById('page-'+name)?.classList.add('active');
  if(el) el.classList.add('active');
  const crumbMap={projects:'Semua Project',board:'Board',backlog:'Backlog',sprint:'Task Overview'};
  document.getElementById('topbar-crumb').innerHTML=crumbMap[name]||name;
  // Render immediately with current data (no flicker)
  if(name==='board')    renderBoard();
  if(name==='backlog')  renderBacklog();
  if(name==='sprint')   renderSprint();
  if(name==='projects'){ renderProjects(); renderSidebar(); }
  // Then silently fetch latest data in background
  loadData(true);
}
function showPageDirect(name){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+name)?.classList.add('active');
}
function goBack(){
  const nav=document.getElementById('nav-'+prevPage);
  showPage(prevPage,nav);
}
function setCrumb(proj,page){
  document.getElementById('topbar-crumb').innerHTML=`${esc(proj)} <span>/ ${esc(page)}</span>`;
}
function closeModal(id){document.getElementById(id).classList.remove('open');}
document.querySelectorAll('.modal-overlay').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('open');}));
function showToast(msg){
  const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2200);
}
function esc(s){return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}