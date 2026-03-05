/**
 * SHIFT Store — Client-Side Security Module
 * NOTE: This provides UI-layer protection.
 * Real security MUST be enforced server-side.
 */

const ShiftSecurity = (() => {

  /* ── CSRF TOKEN ── */
  function generateCSRF() {
    const arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(b => b.toString(16).padStart(2,'0')).join('');
  }
  function getCSRFToken() {
    let token = sessionStorage.getItem('csrf_token');
    if (!token) { token = generateCSRF(); sessionStorage.setItem('csrf_token', token); }
    return token;
  }
  // Inject hidden CSRF input into every form
  function injectCSRF() {
    document.querySelectorAll('form').forEach(f => {
      if (!f.querySelector('[name=_csrf]')) {
        const inp = document.createElement('input');
        inp.type = 'hidden'; inp.name = '_csrf'; inp.value = getCSRFToken();
        f.appendChild(inp);
      }
    });
  }

  /* ── INPUT SANITIZER ── */
  function sanitize(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#x27;').replace(/\//g,'&#x2F;')
      .trim().slice(0, 2000);
  }

  /* ── RATE LIMITER (UI layer) ── */
  const _rateLimits = {};
  function rateLimit(key, maxAttempts, windowMs) {
    const now = Date.now();
    if (!_rateLimits[key]) _rateLimits[key] = { count: 0, start: now };
    const rl = _rateLimits[key];
    if (now - rl.start > windowMs) { rl.count = 0; rl.start = now; }
    rl.count++;
    return rl.count <= maxAttempts;
  }
  function getRemainingAttempts(key, max) {
    return Math.max(0, max - (_rateLimits[key]?.count || 0));
  }

  /* ── BRUTE FORCE LOCKOUT ── */
  function recordFailedLogin(identifier) {
    const key = `fail_${identifier}`;
    const data = JSON.parse(sessionStorage.getItem(key) || '{"count":0,"until":0}');
    data.count++;
    if (data.count >= 5) data.until = Date.now() + 15 * 60 * 1000; // 15 min lockout
    sessionStorage.setItem(key, JSON.stringify(data));
    return data;
  }
  function isLockedOut(identifier) {
    const data = JSON.parse(sessionStorage.getItem(`fail_${identifier}`) || '{"count":0,"until":0}');
    return data.until > Date.now();
  }
  function getLockoutRemaining(identifier) {
    const data = JSON.parse(sessionStorage.getItem(`fail_${identifier}`) || '{"count":0,"until":0}');
    return Math.max(0, Math.ceil((data.until - Date.now()) / 1000));
  }
  function clearFailedLogins(identifier) {
    sessionStorage.removeItem(`fail_${identifier}`);
  }

  /* ── SESSION MANAGER ── */
  const SESSION_KEY = 'shift_session';
  const SESSION_DURATION = 30 * 60 * 1000; // 30 min

  function createSession(user) {
    const session = {
      user, token: generateCSRF(),
      created: Date.now(), expires: Date.now() + SESSION_DURATION,
      role: user.role || 'customer'
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }
  function getSession() {
    try {
      const s = JSON.parse(sessionStorage.getItem(SESSION_KEY));
      if (!s || Date.now() > s.expires) { clearSession(); return null; }
      // Refresh expiry on activity
      s.expires = Date.now() + SESSION_DURATION;
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
      return s;
    } catch { return null; }
  }
  function clearSession() { sessionStorage.removeItem(SESSION_KEY); }
  function requireAuth(role) {
    const s = getSession();
    if (!s) { window.location.href = 'login.html'; return false; }
    if (role && s.role !== role) { window.location.href = 'index.html'; return false; }
    return s;
  }
  function requireAdmin() { return requireAuth('admin'); }

  /* ── OTP ── */
  function generateOTP() {
    // In production: sent from server, never generated client-side
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
  // Stores a hashed version (demo only — real OTP must be server-side)
  async function storeOTP(otp) {
    const enc = new TextEncoder();
    const hash = await crypto.subtle.digest('SHA-256', enc.encode(otp + 'shift_salt'));
    const hashArr = Array.from(new Uint8Array(hash));
    const hashHex = hashArr.map(b => b.toString(16).padStart(2,'0')).join('');
    sessionStorage.setItem('pending_otp', JSON.stringify({ hash: hashHex, exp: Date.now() + 5 * 60 * 1000 }));
    return otp;
  }
  async function verifyOTP(input) {
    const stored = JSON.parse(sessionStorage.getItem('pending_otp') || 'null');
    if (!stored || Date.now() > stored.exp) return false;
    const enc = new TextEncoder();
    const hash = await crypto.subtle.digest('SHA-256', enc.encode(input + 'shift_salt'));
    const hashHex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,'0')).join('');
    if (hashHex === stored.hash) { sessionStorage.removeItem('pending_otp'); return true; }
    return false;
  }

  /* ── VALIDATORS ── */
  const validators = {
    email: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    phone: v => /^[\+]?[0-9]{10,13}$/.test(v.replace(/\s/g,'')),
    pin: v => /^[0-9]{6}$/.test(v),
    name: v => v.trim().length >= 2 && v.trim().length <= 80 && !/[<>\"'\/]/.test(v),
    password: v => v.length >= 8 && /[A-Z]/.test(v) && /[0-9]/.test(v) && /[^A-Za-z0-9]/.test(v),
    cardNum: v => {
      const n = v.replace(/\s/g,'');
      if (!/^\d{13,19}$/.test(n)) return false;
      // Luhn check
      let s=0,alt=false;
      for(let i=n.length-1;i>=0;i--){let d=+n[i];if(alt){d*=2;if(d>9)d-=9;}s+=d;alt=!alt;}
      return s%10===0;
    },
    cvv: v => /^\d{3,4}$/.test(v),
    expiry: v => {
      const m = v.replace(/\s/g,'').match(/^(\d{2})[\/-](\d{2,4})$/);
      if (!m) return false;
      const mo = parseInt(m[1]), yr = parseInt(m[2].length===2?'20'+m[2]:m[2]);
      const now = new Date();
      return mo>=1 && mo<=12 && (yr>now.getFullYear() || (yr===now.getFullYear() && mo>=now.getMonth()+1));
    }
  };

  /* ── CONTENT SECURITY POLICY (meta tag injection) ── */
  function injectCSP() {
    if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
      const m = document.createElement('meta');
      m.httpEquiv = 'Content-Security-Policy';
      m.content = "default-src 'self'; script-src 'self' 'unsafe-inline' https://fonts.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com; font-src https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self'";
      document.head.prepend(m);
    }
  }

  /* ── ANTI-CLICKJACKING ── */
  function preventClickjacking() {
    if (window.self !== window.top) {
      document.body.innerHTML = '<p style="padding:2rem;font-family:sans-serif">Access denied.</p>';
    }
  }

  /* ── AUDIT LOG ── */
  const _auditLog = JSON.parse(sessionStorage.getItem('audit_log') || '[]');
  function auditLog(action, details = {}) {
    _auditLog.push({ action, details, time: new Date().toISOString(), page: location.pathname });
    if (_auditLog.length > 200) _auditLog.shift();
    sessionStorage.setItem('audit_log', JSON.stringify(_auditLog));
  }
  function getAuditLog() { return [..._auditLog]; }

  /* ── THEME HELPER ── */
  function initTheme(darkId='darkOpt', lightId='lightOpt', toggleId='themeToggle') {
    const html = document.documentElement;
    const dOpt = document.getElementById(darkId);
    const lOpt = document.getElementById(lightId);
    function setTheme(t) {
      html.setAttribute('data-theme', t);
      if (dOpt) dOpt.classList.toggle('active', t==='dark');
      if (lOpt) lOpt.classList.toggle('active', t==='light');
      localStorage.setItem('shift_theme', t);
    }
    const saved = localStorage.getItem('shift_theme');
    if (saved) setTheme(saved);
    document.getElementById(toggleId)?.addEventListener('click', () => {
      setTheme(html.getAttribute('data-theme')==='dark' ? 'light' : 'dark');
    });
    return setTheme;
  }

  /* ── INIT ── */
  function init() {
    preventClickjacking();
    injectCSP();
    document.addEventListener('DOMContentLoaded', injectCSRF);
  }

  init();

  return {
    getCSRFToken, sanitize, rateLimit, getRemainingAttempts,
    recordFailedLogin, isLockedOut, getLockoutRemaining, clearFailedLogins,
    createSession, getSession, clearSession, requireAuth, requireAdmin,
    generateOTP, storeOTP, verifyOTP,
    validators, auditLog, getAuditLog, initTheme
  };
})();
