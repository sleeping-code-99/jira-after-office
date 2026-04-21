const SUPABASE_URL = 'https://mzxptzoapezfaaepkzul.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16eHB0em9hcGV6ZmFhZXBrenVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3MTQ4MzMsImV4cCI6MjA5MjI5MDgzM30.uMNzyKquhvY4GQqW-8pDHpNWOm5J8SFQntwFKLJlEhI';
const PROJECT_COLORS = ['#0052CC','#36B37E','#FF5630','#FF991F','#6554C0','#00B8D9','#172B4D','#57D9A3'];
const ADMIN_EMAIL = 'kornelius@afteroffice.com';
let sb = null, currentUser = null, demoMode = false;
let projects = [], issues = [], members = [], comments = {}, deliveryLinks = {};
let currentProjectId = null, currentIssueId = null, prevPage = 'projects', selectedMemberColor = '#0052CC';
let dragId = null, issueCounter = 1;
let selectedColor = PROJECT_COLORS[0];

try {
  sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: 'projectflow-auth',
      storage: window.localStorage
    }
  });
} catch(e){ console.error('Supabase init error:', e); }

const DEMO_PROJECTS = [
  {id:'p1',name:'ProjectFlow Dev',key:'PF',color:'#0052CC',description:'Platform project management internal',created_at:new Date().toISOString()},
  {id:'p2',name:'BRIDGE 2026',key:'BR',color:'#36B37E',description:'AfterOffice Academy webinar event',created_at:new Date().toISOString()},
  {id:'p3',name:'Lazy Pajamas CRM',key:'LP',color:'#FF991F',description:'CRM vendor management untuk brand',created_at:new Date().toISOString()},
];
const DEMO_ISSUES_RAW = [
  {id:'i1',project_id:'p1',key:'PF-1',title:'Setup Supabase auth & database schema',description:'Konfigurasi tabel issues, projects, comments di Supabase.',type:'task',priority:'high',status:'done',assignee:'Kornelius',created_at:new Date(Date.now()-7*86400000).toISOString()},
  {id:'i2',project_id:'p1',key:'PF-2',title:'Desain Kanban board dengan drag & drop',description:'Board 4 kolom dengan fitur drag and drop antar status.',type:'story',priority:'high',status:'done',assignee:'Andi',created_at:new Date(Date.now()-5*86400000).toISOString()},
  {id:'i3',project_id:'p1',key:'PF-3',title:'Fitur delivery links di tiap issue',description:'Setiap issue bisa attach multiple link seperti Figma, PRD, staging URL.',type:'story',priority:'high',status:'inprogress',assignee:'Budi',created_at:new Date(Date.now()-3*86400000).toISOString()},
  {id:'i4',project_id:'p1',key:'PF-4',title:'Bug: filter assignee tidak bekerja di Safari',description:'Dropdown filter assignee tidak memfilter card di browser Safari.',type:'bug',priority:'high',status:'inprogress',assignee:'Citra',created_at:new Date(Date.now()-2*86400000).toISOString()},
  {id:'i5',project_id:'p1',key:'PF-5',title:'Implementasi multi-project switching',description:'User bisa switch antar project dari sidebar.',type:'task',priority:'medium',status:'review',assignee:'Kornelius',created_at:new Date(Date.now()-1*86400000).toISOString()},
  {id:'i6',project_id:'p2',key:'BR-1',title:'Finalisasi speaker brief & TOR dokumen',description:'Kirim brief final ke semua 5 speaker BRIDGE 2026.',type:'task',priority:'high',status:'done',assignee:'Kornelius',created_at:new Date(Date.now()-4*86400000).toISOString()},
  {id:'i7',project_id:'p2',key:'BR-2',title:'Buat landing page & registrasi peserta',description:'Landing page BRIDGE 2026 dengan form pendaftaran terintegrasi.',type:'story',priority:'high',status:'inprogress',assignee:'Dani',created_at:new Date(Date.now()-2*86400000).toISOString()},
  {id:'i8',project_id:'p2',key:'BR-3',title:'Rekrut Amplifier Program volunteer',description:'Open call & seleksi 20 amplifier untuk promosi event.',type:'epic',priority:'medium',status:'review',assignee:'Eka',created_at:new Date().toISOString()},
  {id:'i9',project_id:'p3',key:'LP-1',title:'Import data vendor dari Inatex 2026',description:'Migrasikan semua kontak vendor yang dikumpulkan dari pameran ke CRM.',type:'task',priority:'high',status:'inprogress',assignee:'Kornelius',created_at:new Date(Date.now()-1*86400000).toISOString()},
  {id:'i10',project_id:'p3',key:'LP-2',title:'Setup Supabase backend untuk CRM',description:'Buat tabel vendors, contacts, notes di Supabase.',type:'task',priority:'high',status:'done',assignee:'Kornelius',created_at:new Date(Date.now()-3*86400000).toISOString()},
];
const DEMO_LINKS = {
  'i2':[{id:'l1',label:'Figma Design',url:'https://figma.com'},{id:'l2',label:'Prototype',url:'https://figma.com'}],
  'i3':[{id:'l3',label:'PRD Notion',url:'https://notion.so'},{id:'l4',label:'Staging',url:'https://staging.example.com'}],
  'i7':[{id:'l5',label:'Landing Page',url:'https://bridge2026.id'},{id:'l6',label:'Form Registrasi',url:'https://jotform.com'}],
  'i9':[{id:'l7',label:'CRM App',url:'https://crm.lazypajamas.com'}],
};


const DEMO_MEMBERS = [
  {id:'m1',name:'Kornelius S',email:'kornelius@afteroffice.com',role:'Project Manager',color:'#0052CC'},
  {id:'m2',name:'Andi Pratama',email:'andi@afteroffice.com',role:'Developer',color:'#36B37E'},
  {id:'m3',name:'Budi Santoso',email:'budi@afteroffice.com',role:'Designer',color:'#FF5630'},
  {id:'m4',name:'Citra Dewi',email:'citra@afteroffice.com',role:'Content Creator',color:'#6554C0'},
  {id:'m5',name:'Dani Wijaya',email:'dani@afteroffice.com',role:'Marketing',color:'#FF991F'},
];

// ── AUTH ──
document.getElementById('li-pass').addEventListener('keydown', e => { if(e.key==='Enter') doLogin(); });
  if(!pass){err.textContent='Password tidak boleh kosong.';err.style.display='block';return;}
  if(SUPABASE_URL==='YOUR_SUPABASE_URL'){demoMode=true;currentUser={email,id:'demo'};enterApp(email);return;}
  btn.disabled=true;btn.textContent='Masuk...';
  const{data,error}=await sb.auth.signInWithPassword({email,password:pass});
  btn.disabled=false;btn.textContent='Masuk';
  if(error){err.textContent=error.message;err.style.display='block';return;}
  currentUser=data.user;enterApp(email);
}
  await loadData();
  await syncMember(email);
  showPage('projects',document.getElementById('nav-projects'));
}

// ── DATA ──
async function loadData(silent=false){
  if(demoMode){
    if(!silent){
      projects=[...DEMO_PROJECTS];issues=[...DEMO_ISSUES_RAW];
      deliveryLinks={...JSON.parse(JSON.stringify(DEMO_LINKS))};
      members=[...DEMO_MEMBERS];issueCounter=11;
    }
    return;
  }
  try {
    const[r1,r2,r3]=await Promise.all([
      sb.from('projects').select('*').order('created_at'),
      sb.from('issues').select('*').order('created_at',{ascending:false}),
      sb.from('members').select('*').order('name')
    ]);
    if(r1.error) console.error('projects error:',r1.error);
    if(r2.error) console.error('issues error:',r2.error);
    if(r3.error) console.error('members error:',r3.error);

    const newProjects = r1.data||[];
    const newIssues   = r2.data||[];
    const newMembers  = r3.data||[];

    // Only update + re-render if data actually changed
    const projectsChanged = JSON.stringify(newProjects) !== JSON.stringify(projects);
    const issuesChanged   = JSON.stringify(newIssues)   !== JSON.stringify(issues);
    const membersChanged  = JSON.stringify(newMembers)  !== JSON.stringify(members);

    if(projectsChanged) projects = newProjects;
    if(issuesChanged)   issues   = newIssues;
    if(membersChanged)  members  = newMembers;

    // Restore issue counter
    const maxKey=issues.reduce((max,i)=>{
      const n=parseInt((i.key||'').split('-')[1]||0);
      return n>max?n:max;
    },0);
    issueCounter=maxKey+1;

    // Only re-render changed parts
    if(projectsChanged||issuesChanged||membersChanged){
      renderSidebar();
      const activePage=document.querySelector('.page.active')?.id?.replace('page-','');
      if(activePage==='board')    renderBoard();
      if(activePage==='backlog')  renderBacklog();
      if(activePage==='sprint')   renderSprint();
      if(activePage==='projects') renderProjects();
    }
  } catch(e){
    console.error('loadData error:',e);
    if(!silent) showToast('Gagal load data: '+e.message);
  }
}
function renderAll(){renderProjects();renderBoard();renderBacklog();renderSprint();renderSidebar();}