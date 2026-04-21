// greeting.js
(function(){
  var h = new Date().getHours();
  var salam = h < 11 ? 'Selamat Pagi' : h < 15 ? 'Selamat Siang' : h < 18 ? 'Selamat Sore' : 'Selamat Malam';
  var el = document.getElementById('auth-greeting');
  if(el) el.textContent = salam + ', Afterians!';
})();


// ── SUPABASE REALTIME ──
let realtimeChannel = null;

function startRealtime(){
  if(demoMode || !sb) return;
  realtimeChannel = sb.channel('db-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, async () => {
      const { data } = await sb.from('projects').select('*').order('created_at');
      if(data) projects = data;
      const active = document.querySelector('.page.active')?.id?.replace('page-','');
      if(active === 'projects'){ renderProjects(); renderSidebar(); }
      else renderSidebar();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'issues' }, async () => {
      const { data } = await sb.from('issues').select('*').order('created_at', { ascending: false });
      if(data) issues = data;
      const active = document.querySelector('.page.active')?.id?.replace('page-','');
      if(active === 'board')   renderBoard();
      if(active === 'backlog') renderBacklog();
      if(active === 'sprint')  renderSprint();
      renderSidebar();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, async () => {
      const { data } = await sb.from('members').select('*').order('name');
      if(data) members = data;
      renderSidebar();
    })
    .subscribe();
}

function stopRealtime(){
  if(realtimeChannel) sb.removeChannel(realtimeChannel);
  realtimeChannel = null;
}

// ── AUTO SYNC MEMBER ON LOGIN ──
async function syncMember(email){
  if(demoMode) return;
  // Check if user already in members table
  const{data:existing}=await sb.from('members').select('id').eq('email',email).single();
  if(existing) return; // sudah ada, skip

  // Ambil nama dari user metadata kalau ada
  const{data:{user}}=await sb.auth.getUser();
  const name=user?.user_metadata?.name || email.split('@')[0];

  // Insert ke members
  const{data,error}=await sb.from('members').insert([{
    name,
    email,
    role:'Member',
    color:PROJECT_COLORS[Math.floor(Math.random()*PROJECT_COLORS.length)]
  }]).select().single();

  if(!error&&data){
    members.push(data);
    renderAdmin();
    renderSidebar();
  }
}

// ── ADMIN ──
function renderAdmin(){
  const body=document.getElementById('members-table-body');
  if(!body) return;
  const stats=document.getElementById('admin-stats');
  if(stats) stats.innerHTML=`
    <div class="sprint-card"><div class="sprint-card-num">${members.length}</div><div class="sprint-card-label">Total Member</div></div>
    <div class="sprint-card"><div class="sprint-card-num" style="color:var(--blue)">${[...new Set(members.map(m=>m.role))].length}</div><div class="sprint-card-label">Role Berbeda</div></div>
    <div class="sprint-card"><div class="sprint-card-num" style="color:var(--green)">${issues.filter(i=>i.status==='inprogress'||i.status==='review').length}</div><div class="sprint-card-label">Issue Aktif</div></div>
  `;
  body.innerHTML=members.map(m=>{
    const issueCount=issues.filter(i=>i.assignee===m.name).length;
    const ini=m.name.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase();
    return`<div class="member-row">
      <div class="member-av-lg" style="background:${m.color}">${ini}</div>
      <div>
        <div style="font-size:13px;font-weight:600">${esc(m.name)}</div>
        <div style="font-size:11px;color:var(--text-s)">${esc(m.email||'')}</div>
      </div>
      <div style="font-size:12px;color:var(--text-s)">${esc(m.email||'—')}</div>
      <div><span class="role-badge">${esc(m.role)}</span></div>
      <div style="font-size:13px;font-weight:600;color:var(--text-s)">${issueCount} issue${issueCount!==1?'s':''}</div>
      <div><button class="btn-sm btn-danger" style="padding:5px 10px;font-size:11px" onclick="deleteMember('${m.id}')">Hapus</button></div>
    </div>`;
  }).join('')||'<div style="padding:24px;text-align:center;color:var(--text-s);font-size:13px">Belum ada member tim.</div>';
}

function openNewMember(){
  // init color swatches for member
  const wrap=document.getElementById('member-color-swatches');
  if(wrap) wrap.innerHTML=PROJECT_COLORS.map(c=>`<div class="swatch${c===selectedMemberColor?' selected':''}" style="background:${c}" onclick="selectMemberColor('${c}')"></div>`).join('');
  ['nm-name','nm-email'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('nm-role').value='Member';
  document.getElementById('modal-member').classList.add('open');
  setTimeout(()=>document.getElementById('nm-name').focus(),100);
}
function selectMemberColor(c){
  selectedMemberColor=c;
  document.querySelectorAll('#member-color-swatches .swatch').forEach(s=>s.classList.toggle('selected',s.style.background===c||s.style.backgroundColor===c));
}
async function createMember(){
  const name=document.getElementById('nm-name').value.trim();
  const email=document.getElementById('nm-email').value.trim();
  if(!name){showToast('Nama tidak boleh kosong!');return;}
  const m={id:'m'+Date.now(),name,email,role:document.getElementById('nm-role').value,color:selectedMemberColor};
  if(!demoMode&&sb){
    const{data,error}=await sb.from('members').insert([{name,email,role:m.role,color:m.color}]).select().single();
    if(error){showToast('Error: '+error.message);return;}
    if(data) m.id=data.id;
  }
  members.push(m);
  closeModal('modal-member');
  renderAdmin();renderSidebar();
  showToast(name+' ditambahkan ke tim ✓');
}
async function deleteMember(id){
  const m=members.find(x=>x.id===id);
  if(!m||!confirm('Hapus '+m.name+' dari tim?')) return;
  members=members.filter(x=>x.id!==id);
  if(!demoMode&&sb) await sb.from('members').delete().eq('id',id);
  renderAdmin();renderSidebar();
  showToast('Member dihapus.');
}

