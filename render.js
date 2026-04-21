// ── SIDEBAR ──
function renderSidebar(){
  const list=document.getElementById('sb-projects-list');
  list.innerHTML=projects.map(p=>{
    const cnt=issues.filter(i=>i.project_id===p.id).length;
    return`<div class="sb-project-item${p.id===currentProjectId?' active':''}" onclick="selectProject('${p.id}')">
      <div class="sb-project-dot" style="background:${p.color}">${p.key.charAt(0)}</div>
      <div class="sb-project-info"><div class="sb-project-name">${esc(p.name)}</div><div class="sb-project-count">${cnt} issue${cnt!==1?'s':''}</div></div>
    </div>`;
  }).join('');
  // update assignee filter
  const assignees=members.length?members.map(m=>m.name):[...new Set(issues.filter(i=>!currentProjectId||i.project_id===currentProjectId).map(i=>i.assignee).filter(Boolean))];
  const sel=document.getElementById('f-assignee');
  const prev=sel.value;
  sel.innerHTML='<option value="">Semua Assignee</option>'+assignees.map(a=>`<option value="${a}">${esc(a)}</option>`).join('');
  if(prev) sel.value=prev;
  // board count
  document.getElementById('sb-board-count').textContent=visibleIssues().length;
}
function selectProject(id){
  currentProjectId=id;
  renderSidebar();
  renderBoard();renderBacklog();renderSprint();
  showPage('board',document.getElementById('nav-board'));
  const p=projects.find(x=>x.id===id);
  if(p) setCrumb(p.name,'Board');
}

// ── PROJECTS PAGE ──
function renderProjects(){
  const grid=document.getElementById('projects-grid');
  grid.innerHTML=projects.map(p=>{
    const total=issues.filter(i=>i.project_id===p.id).length;
    const done=issues.filter(i=>i.project_id===p.id&&i.status==='done').length;
    return`<div class="project-card" onclick="selectProject('${p.id}')">
      <div class="project-card-dot" style="background:${p.color}">${p.key.charAt(0)}</div>
      <div class="project-card-name">${esc(p.name)}</div>
      <div class="project-card-key">${p.key}</div>
      <div style="font-size:12px;color:var(--text-s);margin-bottom:10px">${esc(p.description||'')}</div>
      <div class="project-card-stats">
        <span class="project-stat">${total} issues</span>
        <span class="project-stat" style="color:var(--green-dk);background:var(--green-lt)">${done} done</span>
      </div>
    </div>`;
  }).join('');
  grid.innerHTML+=`<div class="project-card new-project-card" onclick="openNewProject()">
    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
    <span>Buat Project Baru</span>
  </div>`;
}

// ── BOARD ──
function visibleIssues(){
  const type=document.getElementById('f-type')?.value||'',prio=document.getElementById('f-prio')?.value||'',assignee=document.getElementById('f-assignee')?.value||'',search=document.getElementById('board-search')?.value?.toLowerCase()||'';
  return issues.filter(i=>{
    if(currentProjectId&&i.project_id!==currentProjectId) return false;
    if(type&&i.type!==type) return false;
    if(prio&&i.priority!==prio) return false;
    if(assignee&&i.assignee!==assignee) return false;
    if(search&&!i.title.toLowerCase().includes(search)&&!i.key.toLowerCase().includes(search)) return false;
    return true;
  });
}
function renderBoard(){
  const filtered=visibleIssues();
  const cols={todo:[],inprogress:[],review:[],done:[]};
  filtered.forEach(i=>{if(cols[i.status])cols[i.status].push(i);});
  ['todo','inprogress','review','done'].forEach(s=>{
    document.getElementById('cnt-'+s).textContent=cols[s].length;
    document.getElementById('cards-'+s).innerHTML=cols[s].map(i=>cardHTML(i)).join('');
  });
  document.getElementById('sb-board-count').textContent=filtered.length;
}
function cardHTML(i){
  const tc={'story':'badge-story','bug':'badge-bug','task':'badge-task','epic':'badge-epic'}[i.type]||'badge-task';
  const av=i.assignee?i.assignee.charAt(0).toUpperCase():'?';
  const links=deliveryLinks[i.id]||[];
  const linksHTML=links.length?`<div class="ic-links">${links.slice(0,2).map(l=>`<a class="ic-link-item" href="${esc(l.url)}" target="_blank" onclick="event.stopPropagation()"><svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg><span class="ic-link-label">${esc(l.label||l.url)}</span></a>`).join('')+(links.length>2?`<span class="ic-link-more">+${links.length-2} lainnya</span>`:'')}
  </div>`:'';
  return`<div class="issue-card" draggable="true" ondragstart="dragStart(event,'${i.id}')" ondragend="dragEnd(event)" onclick="openDetail('${i.id}')">
    <div class="ic-top"><div class="ic-title">${esc(i.title)}</div><div class="ic-prio prio-${i.priority}"></div></div>
    <div class="ic-badges"><span class="badge ${tc}">${i.type}</span><span class="ic-key">${i.key||''}</span></div>
    ${linksHTML}
    <div class="ic-footer">
      <div></div>
      <div class="ic-assignees"><div class="ic-av" title="${esc(i.assignee||'')}">${av}</div></div>
    </div>
  </div>`;
}

// ── DRAG & DROP ──
function dragStart(e,id){dragId=id;setTimeout(()=>{const el=e.target;el.classList.add('dragging');},0);}
function dragEnd(e){e.target.classList.remove('dragging');document.querySelectorAll('.board-col').forEach(c=>c.classList.remove('drag-over'));}
function dragOver(e,col){e.preventDefault();document.getElementById('col-'+col).classList.add('drag-over');}
function dragLeave(e){e.currentTarget.classList.remove('drag-over');}
async function drop(e,newStatus){
  e.preventDefault();
  document.querySelectorAll('.board-col').forEach(c=>c.classList.remove('drag-over'));
  if(!dragId) return;
  const idx=issues.findIndex(i=>i.id===dragId);
  if(idx===-1||issues[idx].status===newStatus) return;
  issues[idx].status=newStatus;
  if(!demoMode&&sb) await sb.from('issues').update({status:newStatus}).eq('id',dragId);
  dragId=null;
  renderBoard();renderBacklog();renderSprint();
  showToast('Status diperbarui ✓');
}

// ── BACKLOG ──
function renderBacklog(){
  const body=document.getElementById('backlog-body');
  const filtered=currentProjectId?issues.filter(i=>i.project_id===currentProjectId):issues;
  const statusClass={todo:'sp-todo',inprogress:'sp-inprogress',review:'sp-review',done:'sp-done'};
  const statusLabel={todo:'To Do',inprogress:'In Progress',review:'In Review',done:'Done'};
  const prioColor={high:'var(--red)',medium:'var(--amber)',low:'var(--green)'};
  body.innerHTML=filtered.map(i=>{
    const links=deliveryLinks[i.id]||[];
    const linksCell=links.length?links.slice(0,2).map(l=>`<a class="bl-link-pill" href="${esc(l.url)}" target="_blank" onclick="event.stopPropagation()" title="${esc(l.url)}">${esc(l.label||'Link')}</a>`).join('')+(links.length>2?`<span style="font-size:10px;color:var(--text-xs)">+${links.length-2}</span>`:''): '<span style="font-size:11px;color:var(--text-xs)">—</span>';
    return`<div class="bl-row" onclick="openDetail('${i.id}')">
      <div style="font-size:11px;font-family:'DM Mono',monospace;color:var(--text-xs);font-weight:500">${esc(i.key||'')}</div>
      <div style="font-size:13px;font-weight:500">${esc(i.title)}</div>
      <div><span class="badge badge-${i.type}">${i.type}</span></div>
      <div style="font-size:12px;font-weight:700;color:${prioColor[i.priority]||'inherit'}">${i.priority}</div>
      <div class="bl-links-cell">${linksCell}</div>
      <div><span class="status-pill ${statusClass[i.status]||'sp-todo'}">${statusLabel[i.status]||i.status}</span></div>
    </div>`;
  }).join('')||'<div style="padding:24px;text-align:center;color:var(--text-s);font-size:13px">Belum ada issue.</div>';
}

// ── SPRINT ──
function renderSprint(){
  const pool=currentProjectId?issues.filter(i=>i.project_id===currentProjectId):issues;
  const total=pool.length,done=pool.filter(i=>i.status==='done').length,inprog=pool.filter(i=>i.status==='inprogress').length,review=pool.filter(i=>i.status==='review').length,todo=pool.filter(i=>i.status==='todo').length;
  const pct=total?Math.round(done/total*100):0;
  document.getElementById('sprint-stats').innerHTML=`
    <div class="sprint-card"><div class="sprint-card-num">${total}</div><div class="sprint-card-label">Total Issues</div></div>
    <div class="sprint-card"><div class="sprint-card-num" style="color:var(--green)">${done}</div><div class="sprint-card-label">Selesai</div><div class="prog-bar"><div class="prog-fill" style="width:${pct}%;background:var(--green)"></div></div></div>
    <div class="sprint-card"><div class="sprint-card-num" style="color:var(--blue)">${inprog}</div><div class="sprint-card-label">In Progress</div></div>
    <div class="sprint-card"><div class="sprint-card-num" style="color:var(--amber)">${review}</div><div class="sprint-card-label">In Review</div></div>
    <div class="sprint-card"><div class="sprint-card-num" style="color:var(--text-s)">${todo}</div><div class="sprint-card-label">To Do</div></div>
    <div class="sprint-card"><div class="sprint-card-num">${pct}%</div><div class="sprint-card-label">Completion Rate</div></div>`;
  document.getElementById('sprint-prog').innerHTML=[{label:'Done',count:done,color:'var(--green)'},{label:'In Progress',count:inprog,color:'var(--blue)'},{label:'In Review',count:review,color:'var(--amber)'},{label:'To Do',count:todo,color:'var(--border-h)'}].map(b=>`<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px"><div style="width:90px;font-size:12px;color:var(--text-s)">${b.label}</div><div style="flex:1;height:10px;background:var(--border);border-radius:5px;overflow:hidden"><div style="width:${total?Math.round(b.count/total*100):0}%;height:100%;background:${b.color};border-radius:5px;transition:width .5s"></div></div><div style="width:36px;text-align:right;font-size:12px;font-weight:700;color:var(--text)">${b.count}</div></div>`).join('');
}

// ── DETAIL ──
function openDetail(id){
  const issue=issues.find(i=>i.id===id);if(!issue)return;
  currentIssueId=id;
  prevPage=document.querySelector('.page.active')?.id.replace('page-','') || 'board';
  const tc={'story':'badge-story','bug':'badge-bug','task':'badge-task','epic':'badge-epic'}[issue.type]||'badge-task';
  document.getElementById('d-type-badge').innerHTML=`<span class="badge ${tc}">${issue.type}</span>`;
  document.getElementById('d-key').textContent=issue.key||'';
  document.getElementById('d-title').textContent=issue.title;
  document.getElementById('d-desc').textContent=issue.description||'Tidak ada deskripsi.';
  const pc={high:'var(--red)',medium:'var(--amber)',low:'var(--green)'};
  document.getElementById('d-prio').innerHTML=`<span style="color:${pc[issue.priority]};font-weight:700">${issue.priority}</span>`;
  document.getElementById('d-assignee').textContent=issue.assignee||'Unassigned';
  const proj=projects.find(p=>p.id===issue.project_id);
  document.getElementById('d-project').innerHTML=proj?`<span style="background:${proj.color};color:#fff;padding:2px 8px;border-radius:3px;font-size:12px;font-weight:700">${esc(proj.key)}</span> ${esc(proj.name)}`:'—';
  document.getElementById('d-created').textContent=new Date(issue.created_at).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
  document.getElementById('d-status').value=issue.status;
  // populate assignee dropdown
  const dasel=document.getElementById('d-assignee');
  dasel.innerHTML='<option value="">— Unassigned —</option>'+members.map(m=>`<option value="${m.name}">${esc(m.name)} — ${esc(m.role)}</option>`).join('');
  dasel.value=issue.assignee||'';
  renderDeliveryLinks(id);
  renderComments(id);
  const crumb=proj?proj.name:'Board';
  setCrumb(crumb,'Detail Issue');
  showPageDirect('detail');
}
function updateIssueAssignee(){
  const assignee=document.getElementById('d-assignee').value;
  if(!currentIssueId) return;
  const idx=issues.findIndex(i=>i.id===currentIssueId);
  if(idx===-1) return;
  issues[idx].assignee=assignee;
  if(!demoMode&&sb) sb.from('issues').update({assignee}).eq('id',currentIssueId);
  renderBoard();renderBacklog();
  showToast('Assignee diperbarui ✓');
}

function updateIssueStatus(){
  const ns=document.getElementById('d-status').value;
  if(!currentIssueId) return;
  const idx=issues.findIndex(i=>i.id===currentIssueId);
  if(idx===-1) return;
  issues[idx].status=ns;
  if(!demoMode&&sb) sb.from('issues').update({status:ns}).eq('id',currentIssueId);
  renderBoard();renderBacklog();renderSprint();
  showToast('Status diperbarui ✓');
}
async function deleteIssue(){
  if(!currentIssueId||!confirm('Hapus issue ini? Aksi tidak bisa dibatalkan.')) return;
  issues=issues.filter(i=>i.id!==currentIssueId);
  delete deliveryLinks[currentIssueId];
  if(!demoMode&&sb) await sb.from('issues').delete().eq('id',currentIssueId);
  renderAll();
  showPage('board',document.getElementById('nav-board'));
  showToast('Issue dihapus.');
}

// ── DELIVERY LINKS ──
function renderDeliveryLinks(id){
  const links=deliveryLinks[id]||[];
  const list=document.getElementById('links-list');
  list.innerHTML=links.length?links.map(l=>`<div class="link-item">
    <div class="link-item-icon"><svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></div>
    <div class="link-item-info">
      <div class="link-item-label">${esc(l.label||'Link')}</div>
      <a class="link-item-url" href="${esc(l.url)}" target="_blank">${esc(l.url)}</a>
    </div>
    <button class="link-item-del" onclick="removeLink('${id}','${l.id}')" title="Hapus">
      <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
    </button>
  </div>`).join(''):'<div style="font-size:13px;color:var(--text-s);padding:4px 0;margin-bottom:8px">Belum ada delivery link.</div>';
}
function addDeliveryLink(){
  const label=document.getElementById('new-link-label').value.trim();
  const url=document.getElementById('new-link-url').value.trim();
  if(!url){showToast('URL tidak boleh kosong!');return;}
  if(!deliveryLinks[currentIssueId]) deliveryLinks[currentIssueId]=[];
  deliveryLinks[currentIssueId].push({id:'l'+Date.now(),label:label||url,url});
  document.getElementById('new-link-label').value='';
  document.getElementById('new-link-url').value='';
  renderDeliveryLinks(currentIssueId);
  renderBoard();renderBacklog();
  showToast('Link ditambahkan ✓');
}
function removeLink(issueId,linkId){
  if(!deliveryLinks[issueId]) return;
  deliveryLinks[issueId]=deliveryLinks[issueId].filter(l=>l.id!==linkId);
  renderDeliveryLinks(issueId);renderBoard();renderBacklog();
  showToast('Link dihapus.');
}

// ── COMMENTS ──
function renderComments(id){
  const list=document.getElementById('comments-list');
  const cmts=comments[id]||[];
  list.innerHTML=cmts.length?cmts.map(c=>`<div class="comment-item">
    <div class="comment-av" style="background:var(--blue)">${c.author.charAt(0).toUpperCase()}</div>
    <div class="comment-body"><div class="comment-meta"><span class="comment-author">${esc(c.author)}</span><span class="comment-time">${c.time}</span></div><div class="comment-text">${esc(c.text)}</div></div>
  </div>`).join(''):'<div style="font-size:13px;color:var(--text-s);margin-bottom:12px">Belum ada komentar.</div>';
}
function addComment(){
  const text=document.getElementById('cmt-input').value.trim();
  if(!text||!currentIssueId) return;
  if(!comments[currentIssueId]) comments[currentIssueId]=[];
  comments[currentIssueId].push({author:currentUser?.email||'User',text,time:new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})});
  document.getElementById('cmt-input').value='';
  renderComments(currentIssueId);
}