// config.js — Supabase init & constants
const SUPABASE_URL = 'https://mzxptzoapezfaaepkzul.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16eHB0em9hcGV6ZmFhZXBrenVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3MTQ4MzMsImV4cCI6MjA5MjI5MDgzM30.uMNzyKquhvY4GQqW-8pDHpNWOm5J8SFQntwFKLJlEhI';
const ADMIN_EMAIL = 'kornelius@afteroffice.com';
const PROJECT_COLORS = ['#0052CC','#36B37E','#FF5630','#FF991F','#6554C0','#00B8D9','#172B4D','#57D9A3'];

let sb = null;
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
