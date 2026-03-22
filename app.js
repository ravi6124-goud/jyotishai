// ===== CONFIG =====
var BACKEND = 'https://jyotishai-backend.onrender.com';

// ===== STATE =====
var hist = [];
var prem = false;
var CU = JSON.parse(localStorage.getItem('jai_u') || 'null');

// Load free reading count from localStorage
function getTodayKey() {
  return 'free_' + new Date().toISOString().split('T')[0];
}
function getFreeCount() {
  if (CU && (CU.plan === 'bhakt')) return 999;
  var key = getTodayKey();
  var saved = localStorage.getItem(key);
  return saved !== null ? parseInt(saved) : 3;
}
function saveFreeCount(n) {
  localStorage.setItem(getTodayKey(), n);
  // Clean old keys
  for (var k in localStorage) {
    if (k.startsWith('free_') && k !== getTodayKey()) {
      localStorage.removeItem(k);
    }
  }
}
var free = getFreeCount();

// ===== LIVE COUNTER =====
var base = 28;
function updateLive() {
  base = Math.max(18, Math.min(50, base + Math.floor(Math.random() * 5 - 2)));
  var lc = document.getElementById('lc');
  if (lc) lc.textContent = base + ' online';
}
updateLive();
setInterval(updateLive, 7000);

// ===== FREE READINGS =====
function updateDiyas() {
  var d1 = document.getElementById('d1');
  var d2 = document.getElementById('d2');
  var d3 = document.getElementById('d3');
  if (d1) d1.className = 'fb-dot' + (1 > free ? ' off' : '');
  if (d2) d2.className = 'fb-dot' + (2 > free ? ' off' : '');
  if (d3) d3.className = 'fb-dot' + (3 > free ? ' off' : '');
  var fc = document.getElementById('fc');
  if (fc) fc.textContent = free + ' left';
  if (free <= 0 && !prem) {
    var ub = document.getElementById('ub');
    if (ub) ub.style.display = 'flex';
    var qp = document.getElementById('qp');
    if (qp) qp.style.display = 'none';
  }
}

// ===== CHAT MESSAGES =====
function addMsg(role, text) {
  var m = document.getElementById('ms');
  if (!m) return;
  var d = document.createElement('div');
  d.className = 'msg ' + (role === 'u' ? 'user' : 'ai');
  var f = text.replace(/\n/g, '<br>');
  d.innerHTML = '<div class="msg-bubble">' + f + '</div>';
  m.appendChild(d);
  m.scrollTop = m.scrollHeight;
  if (role === 'ai') {
    d.classList.add('new');
    setTimeout(function() { d.classList.remove('new'); }, 2000);
  }
}

function addTyping() {
  var m = document.getElementById('ms');
  if (!m) return;
  var d = document.createElement('div');
  d.className = 'msg ai';
  d.id = 'ty';
  d.innerHTML = '<div class="msg-bubble"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>';
  m.appendChild(d);
  m.scrollTop = m.scrollHeight;
}

// ===== SEND MESSAGE with XHR + birth detail extraction =====
function callChat(body) {
  return new Promise(function(resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', BACKEND + '/chat', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.timeout = 120000;
    xhr.ontimeout = function() { reject(new Error('timeout')); };
    xhr.onerror = function() { reject(new Error('network error')); };
    xhr.onload = function() {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText)); }
        catch(e) { reject(new Error('parse error')); }
      } else {
        try { resolve(JSON.parse(xhr.responseText)); }
        catch(e) { reject(new Error('HTTP ' + xhr.status)); }
      }
    };
    xhr.send(JSON.stringify(body));
  });
}

async function sendMsg() {
  var inp = document.getElementById('ui');
  var t = inp.value.trim();
  if (!t) return;
  inp.value = '';
  addMsg('u', t);
  addTyping();
  inp.disabled = true;
  document.getElementById('sb').disabled = true;
  hist.push({ role: 'user', content: t });

  // Extract birth details from conversation
  var allText = hist.map(function(m) { return m.content; }).join(' ');

  var dobMatch = allText.match(/(\d{1,2}[-\/\s](?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)[-\/\s]\d{4}|\d{1,2}[-\/]\d{1,2}[-\/]\d{4}|\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/i);
  var timeMatch = allText.match(/(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)/i);
  var placeMatch = allText.match(/(?:\d{1,2}:\d{2}\s*(?:AM|PM)?[,\s]+)([A-Za-z][A-Za-z\s]{2,25}(?:,\s*[A-Za-z\s]{2,20})?)/i);
  if (!placeMatch) {
    placeMatch = allText.match(/\b(Mumbai|Delhi|Chennai|Kolkata|Bangalore|Bengaluru|Hyderabad|Pune|Ahmedabad|Jaipur|Nagpur|Lucknow|Nagaur|Coimbatore|Surat|Indore|Bhopal|Patna|Vadodara|Agra|Varanasi|Kanpur|Rajkot|Amritsar|Jodhpur|Kochi|Visakhapatnam|Mysore|Mysuru|Rajasthan|Maharashtra|Gujarat|Tamil Nadu|Karnataka|Kerala|Punjab|Haryana|Uttar Pradesh|Bihar|Madhya Pradesh|Andhra Pradesh|West Bengal)(?:[,\s]+[A-Za-z\s]{0,20})?/i);
  }

  var dob = (CU && CU.dob) || (dobMatch ? dobMatch[1] : null);
  var birth_time = (CU && CU.birth_time) || (timeMatch ? timeMatch[1] : null);
  var birth_place = (CU && CU.birth_place) || (placeMatch ? placeMatch[1].trim() : null);

  var body = { messages: hist, dob: dob, birth_time: birth_time, birth_place: birth_place };
  if (CU) { body.user_id = CU.id; body.plan = CU.plan; }

  var maxAttempts = 2;
  var data = null;

  for (var attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      data = await callChat(body);
      break;
    } catch (ex) {
      if (attempt < maxAttempts) {
        await new Promise(function(res) { setTimeout(res, 5000); });
      }
    }
  }

  var ty = document.getElementById('ty');
  if (ty) ty.remove();

  if (!data) {
    addMsg('ai', 'Thoda time lag raha hai. Please dobara try karein.');
    hist.pop();
  } else if (data.error) {
    addMsg('ai', data.error);
    hist.pop();
    if (data.error.indexOf('199') > -1 || data.error.indexOf('upgrade') > -1) {
      var ub = document.getElementById('ub');
      if (ub) ub.style.display = 'flex';
    }
  } else {
    hist.push({ role: 'assistant', content: data.reply });
    addMsg('ai', data.reply);
    if (!prem) { free = Math.max(0, free - 1); saveFreeCount(free); updateDiyas(); }
    // Show PDF button for paid users after response
    if (prem) {
      var pdfBtn = document.getElementById('pdfFloating');
      if (pdfBtn) pdfBtn.style.display = 'block';
    }
    if (prem) { var pb = document.getElementById('pdfBtn'); if (pb) pb.style.display = 'block'; }
  }

  if (free > 0 || prem) {
    inp.disabled = false;
    document.getElementById('sb').disabled = false;
    inp.focus();
  }
}

function qa(p) {
  document.getElementById('ui').value = p;
  document.getElementById('ui').focus();
}

document.addEventListener('DOMContentLoaded', function() {
  var ui = document.getElementById('ui');
  if (ui) ui.addEventListener('keydown', function(e) { if (e.key === 'Enter') sendMsg(); });
});

// ===== MODAL SYSTEM =====
function goLogin() {
  window.location.href = 'login.html';
}

function showOv(t) {
  var id = 'ov' + t.charAt(0).toUpperCase() + t.slice(1);
  var el = document.getElementById(id);
  if (el) {
    el.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
}
function closeOv(t) {
  var id = 'ov' + t.charAt(0).toUpperCase() + t.slice(1);
  var el = document.getElementById(id);
  if (el) { el.style.display = 'none'; document.body.style.overflow = ''; }
}
function switchOv(f, t) { closeOv(f); setTimeout(function() { showOv(t); }, 150); }

// ===== USER AUTH =====
function showUserNav(u) {
  var lb = document.getElementById('loginBtn');
  var up = document.getElementById('userPill');
  if (lb) lb.style.display = 'none';
  if (up) up.style.display = 'flex';
  var ua = document.getElementById('uav');
  var un = document.getElementById('unm');
  if (ua) ua.textContent = u.full_name.charAt(0).toUpperCase();
  if (un) un.textContent = u.full_name.split(' ')[0];
}

function applyPlan(u) {
  var paid = u.plan === 'bhakt';
  if (paid) {
    prem = true; free = 999;
    var fb = document.getElementById('fb');
    if (fb) fb.style.display = 'none';
    var pb = document.getElementById('pdfBtn');
    if (pb) pb.style.display = 'block';
  } else {
    free = Math.max(0, 3 - (u.readings_today || 0));
    updateDiyas();
  }
}

function showProfile() {
  if (!CU) { window.location.href = 'login.html'; return; }
  var pn = document.getElementById('pName');
  if (pn) pn.textContent = 'Namaste, ' + CU.full_name + '!';
  var paid = CU.plan === 'bhakt';
  var pp = document.getElementById('pPlan');
  if (pp) {
    pp.textContent = paid ? CU.plan.toUpperCase() : 'FREE';
    pp.style.background = paid ? 'linear-gradient(135deg,#FF6B35,#FFB347)' : 'rgba(255,107,53,0.15)';
    pp.style.color = paid ? '#fff' : '#FF6B35';
  }
  var pd = document.getElementById('pDob'); if (pd) pd.textContent = CU.dob || 'Not set';
  var pt = document.getElementById('pTime'); if (pt) pt.textContent = CU.birth_time || 'Not set';
  var ppl = document.getElementById('pPlace'); if (ppl) ppl.textContent = CU.birth_place || 'Not set';
  var pr = document.getElementById('pReadings'); if (pr) pr.textContent = (CU.readings_today || 0) + '/3';
  var ub2 = document.getElementById('upgBtn'); if (ub2 && paid) ub2.style.display = 'none';
  showOv('profile');
}

async function doRegister() {
  var n = document.getElementById('rName').value.trim();
  var e = document.getElementById('rEmail').value.trim();
  var p = document.getElementById('rPass').value;
  var d = document.getElementById('rDob').value;
  var t = document.getElementById('rTime').value;
  var pl = document.getElementById('rPlace').value.trim();
  var err = document.getElementById('rErr');
  var ok = document.getElementById('rOk');
  if (err) err.style.display = 'none';
  if (ok) ok.style.display = 'none';
  if (!n || !e || !p) {
    if (err) { err.textContent = 'Naam, email aur password zaroori hai!'; err.style.display = 'block'; }
    return;
  }
  var btn = document.querySelector('#ovRegister .md-btn');
  if (btn) { btn.textContent = 'Creating...'; btn.disabled = true; }
  var xhr2 = new XMLHttpRequest();
  xhr2.open('POST', BACKEND + '/register', true);
  xhr2.setRequestHeader('Content-Type', 'application/json');
  xhr2.timeout = 30000;
  xhr2.ontimeout = function() {
    if (btn) { btn.textContent = 'Create Free Account'; btn.disabled = false; }
    if (err) { err.textContent = 'Timeout. Try again!'; err.style.display = 'block'; }
  };
  xhr2.onerror = function() {
    if (btn) { btn.textContent = 'Create Free Account'; btn.disabled = false; }
    if (err) { err.textContent = 'Connection error. Try again!'; err.style.display = 'block'; }
  };
  xhr2.onload = function() {
    try {
      var data = JSON.parse(xhr2.responseText);
      if (btn) { btn.textContent = 'Create Free Account'; btn.disabled = false; }
      if (data.error) { if (err) { err.textContent = data.error; err.style.display = 'block'; } return; }
      if (ok) { ok.textContent = 'Account ban gaya! Welcome!'; ok.style.display = 'block'; }
      CU = data.user; localStorage.setItem('jai_u', JSON.stringify(CU));
      setTimeout(function() { closeOv('register'); showUserNav(CU); applyPlan(CU); }, 1500);
    } catch(e) {
      if (btn) { btn.textContent = 'Create Free Account'; btn.disabled = false; }
      if (err) { err.textContent = 'Server error. Try again!'; err.style.display = 'block'; }
    }
  };
  xhr2.send(JSON.stringify({ email: e, password: p, full_name: n, dob: d, birth_time: t, birth_place: pl }));
}

async function doLogin() {
  var e = document.getElementById('lEmail').value.trim();
  var p = document.getElementById('lPass').value;
  var err = document.getElementById('lErr');
  var ok = document.getElementById('lOk');
  if (err) err.style.display = 'none';
  if (ok) ok.style.display = 'none';
  if (!e || !p) {
    if (err) { err.textContent = 'Email aur password chahiye!'; err.style.display = 'block'; }
    return;
  }
  var btn = document.querySelector('#ovLogin .md-btn');
  if (btn) { btn.textContent = 'Signing in...'; btn.disabled = true; }
  var xhr = new XMLHttpRequest();
  xhr.open('POST', BACKEND + '/login', true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.timeout = 30000;
  xhr.ontimeout = function() {
    if (btn) { btn.textContent = 'Sign In'; btn.disabled = false; }
    if (err) { err.textContent = 'Timeout. Try again!'; err.style.display = 'block'; }
  };
  xhr.onerror = function() {
    if (btn) { btn.textContent = 'Sign In'; btn.disabled = false; }
    if (err) { err.textContent = 'Connection error. Try again!'; err.style.display = 'block'; }
  };
  xhr.onload = function() {
    try {
      var data = JSON.parse(xhr.responseText);
      if (btn) { btn.textContent = 'Sign In'; btn.disabled = false; }
      if (data.error) { if (err) { err.textContent = data.error; err.style.display = 'block'; } return; }
      if (ok) { ok.textContent = data.message || 'Login successful!'; ok.style.display = 'block'; }
      CU = data.user; localStorage.setItem('jai_u', JSON.stringify(CU));
      setTimeout(function() { closeOv('login'); showUserNav(CU); applyPlan(CU); }, 1200);
    } catch(e) {
      if (btn) { btn.textContent = 'Sign In'; btn.disabled = false; }
      if (err) { err.textContent = 'Server error. Try again!'; err.style.display = 'block'; }
    }
  };
  xhr.send(JSON.stringify({ email: e, password: p }));
}

function doLogout() {
  CU = null; localStorage.removeItem('jai_u');
  prem = false; free = 3; saveFreeCount(3);
  var lb = document.getElementById('loginBtn'); if (lb) lb.style.display = 'block';
  var up = document.getElementById('userPill'); if (up) up.style.display = 'none';
  closeOv('profile'); updateDiyas();
}

// ===== RAZORPAY =====
async function pay(plan, amt) {
  if (!CU) { window.location.href = 'login.html'; return; }
  try {
    var cfgRes = await fetch(BACKEND + '/config');
    var cfg = await cfgRes.json();
    var rk = cfg.razorpay_key || '';
    if (!rk) { alert('Payment not configured. Please try again later.'); return; }
  try {
    new Razorpay({
      key: rk, amount: amt * 100, currency: 'INR',
      name: 'JyotishAI', description: plan, theme: { color: '#FF6B35' },
      prefill: { name: CU.full_name, email: CU.email },
      handler: async function(response) {
        try {
          await fetch(BACKEND + '/payment-success', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: CU.id, razorpay_payment_id: response.razorpay_payment_id, plan: plan.toLowerCase(), amount: amt })
          });
        } catch (ex) {}
        CU.plan = plan.toLowerCase();
        localStorage.setItem('jai_u', JSON.stringify(CU));
        prem = true; free = 999;
        var fb = document.getElementById('fb'); if (fb) fb.style.display = 'none';
        alert('Payment successful! ' + plan + ' plan activated!');
      }
    }).open();
  } catch (ex) { alert('Razorpay error: ' + ex.message); }
  } catch(ex2) { alert('Payment setup failed. Try again!'); }
}

// ===== CATEGORY & SECTIONS =====
var currentCat = 'horoscope';
function setCategory(cat, btn) {
  currentCat = cat;
  document.querySelectorAll('.cat').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');
  moveCatIndicator(btn);
}

function showSection(section) {
  var ps = document.getElementById('plansSection');
  var as = document.getElementById('aboutSection');
  if (ps) ps.classList.remove('visible');
  if (as) as.classList.remove('visible');
  document.querySelectorAll('.bn-item').forEach(function(b) { b.classList.remove('active'); });
  if (section === 'plans') {
    if (ps) ps.classList.add('visible');
    document.querySelectorAll('.bn-item')[1].classList.add('active');
  } else if (section === 'about') {
    if (as) as.classList.add('visible');
    document.querySelectorAll('.bn-item')[2].classList.add('active');
  } else {
    document.querySelectorAll('.bn-item')[0].classList.add('active');
  }
}

function moveCatIndicator(btn) {
  var ind = document.querySelector('.cat-indicator');
  if (!ind || !btn) return;
  ind.style.left = btn.offsetLeft + 'px';
  ind.style.width = btn.offsetWidth + 'px';
}

// ===== RIPPLE =====
document.addEventListener('click', function(e) {
  var btn = e.target.closest('.md-btn,.pc-btn,.tb-login,.send-btn');
  if (!btn) return;
  var r = document.createElement('div');
  r.className = 'ripple';
  var rect = btn.getBoundingClientRect();
  var size = Math.max(rect.width, rect.height);
  r.style.cssText = 'width:'+size+'px;height:'+size+'px;left:'+(e.clientX-rect.left-size/2)+'px;top:'+(e.clientY-rect.top-size/2)+'px';
  btn.appendChild(r);
  setTimeout(function() { r.remove(); }, 700);
});

// ===== BACKGROUND EFFECTS =====
(function() {
  // Aurora
  var aurora = document.createElement('div');
  aurora.className = 'aurora';
  for (var a = 0; a < 3; a++) {
    var band = document.createElement('div');
    band.className = 'aurora-band';
    aurora.appendChild(band);
  }
  document.body.insertBefore(aurora, document.body.firstChild);

  // OM symbols
  var omBg = document.createElement('div');
  omBg.className = 'om-bg';
  omBg.textContent = 'OM';
  document.body.insertBefore(omBg, document.body.firstChild);

  // Shooting stars
  for (var i = 1; i <= 5; i++) {
    var ss = document.createElement('div');
    ss.className = 'shooting-star s' + i;
    document.body.appendChild(ss);
  }

  // Twinkling stars
  var colors = ['#fff','#FFD700','#FFA500','#E0E0FF','#FFE4B5','#C4B5FD'];
  for (var j = 0; j < 40; j++) {
    var ts = document.createElement('div');
    ts.className = 'twinkle-star';
    var size = Math.random() * 2.5 + 1;
    var color = colors[Math.floor(Math.random() * colors.length)];
    ts.style.cssText = 'width:'+size+'px;height:'+size+'px;left:'+Math.random()*100+'%;top:'+Math.random()*100+'%;--td:'+(Math.random()*3+2)+'s;--tdelay:'+Math.random()*4+'s;background:'+color+';box-shadow:0 0 '+(size*2)+'px '+color;
    document.body.appendChild(ts);
  }

  // Constellation
  var constellation = document.createElement('div');
  constellation.className = 'constellation';
  var points = [];
  for (var p = 0; p < 15; p++) {
    var cp = document.createElement('div');
    cp.className = 'c-particle';
    var x = Math.random() * 100;
    var y = Math.random() * 100;
    var sz = Math.random() * 3 + 2;
    cp.style.cssText = 'width:'+sz+'px;height:'+sz+'px;left:'+x+'%;top:'+y+'%;--cp:'+(Math.random()*3+2)+'s;--cpl:'+Math.random()*3+'s';
    constellation.appendChild(cp);
    points.push({x:x, y:y});
  }
  for (var l = 0; l < points.length; l++) {
    for (var m = l+1; m < points.length; m++) {
      var dx = points[m].x - points[l].x;
      var dy = points[m].y - points[l].y;
      var dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < 20) {
        var line = document.createElement('div');
        line.className = 'c-line';
        var angle = Math.atan2(dy, dx) * 180 / Math.PI;
        line.style.cssText = 'left:'+points[l].x+'%;top:'+points[l].y+'%;width:'+dist+'vw;transform:rotate('+angle+'deg);animation-delay:'+Math.random()*2+'s';
        constellation.appendChild(line);
      }
    }
  }
  document.body.insertBefore(constellation, document.body.firstChild);
})();

// ===== INIT =====
window.addEventListener('load', function() {
  document.getElementById('fb').style.display = 'flex';
  document.getElementById('qp').style.display = 'flex';
  document.getElementById('ui').disabled = false;
  document.getElementById('sb').disabled = false;
  document.getElementById('sb').style.opacity = '1';
  document.querySelectorAll('.bn-item')[0].classList.add('active');
  if (CU) { showUserNav(CU); applyPlan(CU); }
  // Save current free count on load so refresh remembers it
  if (!prem) { saveFreeCount(free); updateDiyas(); }
  // Show PDF button only for paid users
  var pdfFloating = document.getElementById('pdfFloating');
  if (pdfFloating && prem) pdfFloating.style.display = 'block';

  // Cat indicator
  var firstCat = document.querySelector('.cat.active');
  if (firstCat) {
    var ind = document.createElement('div');
    ind.className = 'cat-indicator';
    var catsEl = document.querySelector('.cats');
    if (catsEl) catsEl.appendChild(ind);
    setTimeout(function() { moveCatIndicator(firstCat); }, 100);
  }

  // Wake up server
  fetch(BACKEND + '/ping').catch(function() {});
  setTimeout(function() { fetch(BACKEND + '/ping').catch(function() {}); }, 30000);
});


// ===== PDF DOWNLOAD =====


// ===== PDF GENERATION =====
async function generatePDF() {
  if (!prem) { showSection('plans'); return; }

  // Get birth details from profile OR from conversation
  var allText = hist.map(function(m){ return m.content; }).join(' ');
  var dobM = allText.match(/(\d{1,2}[-\/\s](?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)[-\/\s]\d{4}|\d{1,2}[-\/]\d{1,2}[-\/]\d{4})/i);
  var timeM = allText.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);

  var useDob = (CU && CU.dob) || (dobM ? dobM[1] : null);
  var useTime = (CU && CU.birth_time) || (timeM ? timeM[1] : null);
  var usePlace = (CU && CU.birth_place) || null;
  var useName = (CU && CU.full_name) || 'User';

  if (!useDob || !useTime || !usePlace) {
    alert('Please provide your Name, Date of Birth, Birth Time and Birth Place in the chat first!');
    return;
  }

  // Show loading
  var btn = document.querySelector('.pdf-btn');
  if (btn) { btn.textContent = 'Generating...'; btn.disabled = true; }

  try {
    // Request full Kundli report from AI
    var reportPrompt = 'Generate a COMPLETE VEDIC KUNDLI REPORT for ' + useName + 
      ' born on ' + useDob + ' at ' + useTime + ' in ' + usePlace + 
      '. Include: 1) Birth Chart Summary (Sun/Moon/Lagna/Nakshatra) 2) Personality Analysis 3) Career & Finance 2026 4) Love & Marriage 5) Health 6) Current Dasha Period 7) Lucky Gems, Colors, Numbers 8) Remedies & Mantras. Write in detail, no tables, flowing paragraphs.';

    var body = {
      messages: [{ role: 'user', content: reportPrompt }],
      dob: useDob,
      birth_time: useTime,
      birth_place: usePlace,
      user_id: CU ? CU.id : null,
      plan: CU ? CU.plan : 'bhakt'
    };

    var xhr = new XMLHttpRequest();
    xhr.open('POST', BACKEND + '/chat', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.timeout = 120000;

    xhr.onload = function() {
      try {
        var data = JSON.parse(xhr.responseText);
        if (btn) { btn.textContent = 'Download PDF'; btn.disabled = false; }
        if (data.reply) {
          buildAndPrintPDF(data.reply, data.chart, useName, useDob, useTime, usePlace);
        } else {
          alert('Could not generate report. Try again!');
        }
      } catch(e) {
        if (btn) { btn.textContent = 'Download PDF'; btn.disabled = false; }
        alert('Error generating PDF. Try again!');
      }
    };
    xhr.onerror = function() {
      if (btn) { btn.textContent = 'Download PDF'; btn.disabled = false; }
      alert('Connection error. Try again!');
    };
    xhr.send(JSON.stringify(body));

  } catch(e) {
    if (btn) { btn.textContent = 'Download PDF'; btn.disabled = false; }
    alert('Error: ' + e.message);
  }
}

function buildAndPrintPDF(report, chart, useName, useDob, useTime, usePlace) {
  var name = useName || (CU ? CU.full_name : 'User');
  var dob = useDob || (CU ? CU.dob : '-') || '-';
  var place = usePlace || (CU ? CU.birth_place : '-') || '-';
  var time = useTime || (CU ? CU.birth_time : '-') || '-';
  var date = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  var chartSection = '';
  if (chart) {
    chartSection =
      '<div class="chart-grid">' +
      (chart.sun_rashi ? '<div class="chart-item"><div class="ci-label">SUN SIGN</div><div class="ci-value">' + chart.sun_rashi + '</div><div class="ci-deg">' + chart.sun_degrees + ' deg</div></div>' : '') +
      (chart.moon_rashi ? '<div class="chart-item"><div class="ci-label">MOON SIGN</div><div class="ci-value">' + chart.moon_rashi + '</div><div class="ci-deg">' + chart.moon_degrees + ' deg</div></div>' : '') +
      (chart.lagna ? '<div class="chart-item"><div class="ci-label">ASCENDANT</div><div class="ci-value">' + chart.lagna + '</div><div class="ci-deg">' + chart.lagna_degrees + ' deg</div></div>' : '') +
      (chart.nakshatra ? '<div class="chart-item"><div class="ci-label">NAKSHATRA</div><div class="ci-value">' + chart.nakshatra + '</div><div class="ci-deg">Pada ' + (chart.nakshatra_pada || '-') + '</div></div>' : '') +
      '</div>';
  }

  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
    '<style>' +
    '@import url("https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=DM+Sans:wght@300;400;500&display=swap");' +
    '*{margin:0;padding:0;box-sizing:border-box}' +
    'body{font-family:"DM Sans",sans-serif;background:#fff;color:#1A0A2E}' +
    '.cover{background:linear-gradient(135deg,#1A0A2E 0%,#2D1B4E 100%);color:#fff;padding:50px 40px;text-align:center}' +
    '.cover-om{font-size:3.5rem;color:#FFB347;margin-bottom:12px;font-family:serif}' +
    '.cover-brand{font-family:"Playfair Display",serif;font-size:2.5rem;font-weight:700;letter-spacing:6px;color:#FFB347}' +
    '.cover-sub{font-size:0.8rem;color:rgba(255,255,255,0.6);letter-spacing:3px;margin-top:8px;text-transform:uppercase}' +
    '.cover-name{font-family:"Playfair Display",serif;font-size:1.6rem;color:#fff;margin-top:24px}' +
    '.cover-dob{font-size:0.85rem;color:rgba(255,255,255,0.7);margin-top:6px}' +
    '.shimmer{height:3px;background:linear-gradient(90deg,transparent,#FF6B35,#FFB347,#FF6B35,transparent);margin:20px 0}' +
    '.content{padding:36px 44px}' +
    '.section{margin-bottom:30px;page-break-inside:avoid}' +
    '.section-hdr{font-family:"Playfair Display",serif;font-size:1rem;color:#FF6B35;border-bottom:2px solid #FF6B35;padding-bottom:6px;margin-bottom:14px;letter-spacing:1px}' +
    '.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}' +
    '.info-item{background:#F8F4FF;border-left:3px solid #FF6B35;padding:10px 14px}' +
    '.info-label{font-size:0.6rem;color:#888;text-transform:uppercase;letter-spacing:1px}' +
    '.info-value{font-size:0.92rem;color:#1A0A2E;font-weight:600;margin-top:2px}' +
    '.chart-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}' +
    '.chart-item{background:linear-gradient(135deg,#FFF8F4,#FFF3EB);border:1px solid #FFD4B8;border-radius:6px;padding:12px;text-align:center}' +
    '.ci-label{font-size:0.6rem;color:#FF6B35;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:4px}' +
    '.ci-value{font-family:"Playfair Display",serif;font-size:0.95rem;color:#1A0A2E;font-weight:700}' +
    '.ci-deg{font-size:0.7rem;color:#888;margin-top:2px}' +
    '.report{background:#FFF8F4;border:1px solid #FFE4CC;border-radius:6px;padding:20px;line-height:1.9;font-size:0.88rem;color:#2D1B4E;white-space:pre-wrap}' +
    '.footer{text-align:center;padding:20px 40px;font-size:0.72rem;color:#aaa;border-top:1px solid #eee}' +
    '.footer-brand{font-family:"Playfair Display",serif;color:#FF6B35;font-size:0.85rem}' +
    '@media print{.cover{-webkit-print-color-adjust:exact;print-color-adjust:exact}.chart-item{-webkit-print-color-adjust:exact}}' +
    '</style></head><body>' +

    '<div class="cover">' +
    '<div class="cover-om">&#x950;</div>' +
    '<div class="cover-brand">JYOTISHAI</div>' +
    '<div class="cover-sub">Vedic Astrology Life Report</div>' +
    '<div class="shimmer"></div>' +
    '<div class="cover-name">' + name + '</div>' +
    '<div class="cover-dob">' + dob + ' &bull; ' + time + ' &bull; ' + place + '</div>' +
    '</div>' +

    '<div class="content">' +
    '<div class="section">' +
    '<div class="section-hdr">Birth Details</div>' +
    '<div class="info-grid">' +
    '<div class="info-item"><div class="info-label">Full Name</div><div class="info-value">' + name + '</div></div>' +
    '<div class="info-item"><div class="info-label">Date of Birth</div><div class="info-value">' + dob + '</div></div>' +
    '<div class="info-item"><div class="info-label">Birth Time</div><div class="info-value">' + time + '</div></div>' +
    '<div class="info-item"><div class="info-label">Birth Place</div><div class="info-value">' + place + '</div></div>' +
    '</div></div>' +

    (chart ? '<div class="section"><div class="section-hdr">Planetary Positions (Lahiri Ayanamsa)</div>' + chartSection + '</div>' : '') +

    '<div class="section">' +
    '<div class="section-hdr">Complete Life Analysis</div>' +
    '<div class="report">' + report + '</div>' +
    '</div>' +

    '<div class="shimmer"></div>' +
    '</div>' +

    '<div class="footer">' +
    '<div class="footer-brand">JyotishAI</div>' +
    'Generated on ' + date + ' &bull; Ancient Wisdom, Modern AI &bull; For spiritual guidance only' +
    '</div>' +
    '</body></html>';

  var w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
  setTimeout(function() { w.print(); }, 1000);
}
