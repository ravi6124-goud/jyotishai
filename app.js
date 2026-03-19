// ===== CONFIG =====
var BACKEND = 'https://jyotishai-backend.onrender.com';

// ===== STATE =====
var hist = [];
var free = 3;
var prem = false;
var CU = JSON.parse(localStorage.getItem('jai_u') || 'null');

// ===== STAR RIVER =====
(function() {
  var sr = document.getElementById('starRiver');
  if (!sr) return;
  for (var i = 0; i < 60; i++) {
    var s = document.createElement('div');
    s.className = 'star-river';
    s.style.cssText = 'left:' + Math.random() * 100 + '%;animation-duration:' + (Math.random() * 10 + 8) + 's;animation-delay:' + Math.random() * 8 + 's;width:' + (Math.random() * 2 + 1) + 'px;height:' + (Math.random() * 2 + 1) + 'px;';
    sr.appendChild(s);
  }
})();

// ===== LIVE COUNTER =====
var base = 28;
function updateLive() {
  base = Math.max(18, Math.min(50, base + Math.floor(Math.random() * 5 - 2)));
  var lc = document.getElementById('lc');
  if (lc) lc.textContent = base + ' online';
  var vc = document.getElementById('vn');
  if (vc) vc.textContent = base;
}
updateLive();
setInterval(updateLive, 7000);

// ===== DIYAS =====
function updateDiyas() {
  for (var i = 1; i <= 3; i++) {
    var d = document.getElementById('d' + i);
    if (d) d.className = 'fdiya' + (i > free ? ' off' : '');
  }
  var fc = document.getElementById('fc');
  if (fc) fc.textContent = free + ' of 3 remaining';
  if (free <= 0 && !prem) {
    var ub = document.getElementById('ub');
    if (ub) ub.style.display = 'block';
    var ia = document.getElementById('ia');
    if (ia) ia.style.display = 'none';
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
  var icon = role === 'u' ? '<span style="font-size:1.1rem">&#128591;</span>' : '<span class="flame-icon"></span>';
  d.innerHTML = '<div class="mav">' + icon + '</div><div class="mbubble">' + f + '</div>';
  m.appendChild(d);
  m.scrollTop = m.scrollHeight;
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

// ===== SEND MESSAGE with retry =====
function callChat(body) {
  return new Promise(function(resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', BACKEND + '/chat', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.timeout = 120000; // 2 minutes
    xhr.ontimeout = function() { reject(new Error('timeout')); };
    xhr.onerror = function() { reject(new Error('network error')); };
    xhr.onload = function() {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          var data = JSON.parse(xhr.responseText);
          resolve(data);
        } catch(e) { reject(new Error('parse error')); }
      } else {
        try {
          var err = JSON.parse(xhr.responseText);
          resolve(err);
        } catch(e) { reject(new Error('HTTP ' + xhr.status)); }
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

  var body = { messages: hist };
  if (CU) { body.user_id = CU.id; body.plan = CU.plan; }

  var maxAttempts = 2;
  var data = null;
  var lastErr = '';

  for (var attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      data = await callChat(body);
      break;
    } catch (ex) {
      lastErr = ex.message;
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
      if (ub) ub.style.display = 'block';
      var ia = document.getElementById('ia');
      if (ia) ia.style.display = 'none';
    }
  } else {
    hist.push({ role: 'assistant', content: data.reply });
    addMsg('ai', data.reply);
    if (!prem) { free = Math.max(0, free - 1); updateDiyas(); }
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
function showOv(t) {
  var id = 'ov' + t.charAt(0).toUpperCase() + t.slice(1);
  var el = document.getElementById(id);
  if (el) { el.style.display = 'flex'; document.body.style.overflow = 'hidden'; }
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
  var paid = u.plan === 'bhakt' || u.plan === 'gyani';
  if (paid) {
    prem = true; free = 999;
    var fb = document.getElementById('fb');
    if (fb) fb.style.display = 'none';
  } else {
    free = Math.max(0, 3 - (u.readings_today || 0));
    updateDiyas();
  }
}

function showProfile() {
  if (!CU) { showOv('login'); return; }
  var pn = document.getElementById('pName');
  if (pn) pn.textContent = 'Namaste, ' + CU.full_name + '!';
  var paid = CU.plan === 'bhakt' || CU.plan === 'gyani';
  var pp = document.getElementById('pPlan');
  if (pp) {
    pp.textContent = paid ? CU.plan.toUpperCase() : 'FREE';
    pp.style.background = paid ? 'linear-gradient(135deg,#FF6B00,#FFA500)' : 'rgba(255,107,0,0.2)';
    pp.style.color = paid ? '#050200' : '#FF6B00';
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
  var btn = document.querySelector('#ovRegister .fb');
  if (btn) { btn.textContent = 'Creating...'; btn.disabled = true; }
  try {
    var res = await fetch(BACKEND + '/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: e, password: p, full_name: n, dob: d, birth_time: t, birth_place: pl })
    });
    var data = await res.json();
    if (btn) { btn.textContent = 'Account Banao - Free!'; btn.disabled = false; }
    if (data.error) { if (err) { err.textContent = data.error; err.style.display = 'block'; } return; }
    if (ok) { ok.textContent = 'Account ban gaya! Welcome!'; ok.style.display = 'block'; }
    CU = data.user; localStorage.setItem('jai_u', JSON.stringify(CU));
    setTimeout(function() { closeOv('register'); showUserNav(CU); applyPlan(CU); }, 1500);
  } catch (ex) {
    if (btn) { btn.textContent = 'Account Banao - Free!'; btn.disabled = false; }
    if (err) { err.textContent = 'Connection error. Try again!'; err.style.display = 'block'; }
  }
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
  var btn = document.querySelector('#ovLogin .fb');
  if (btn) { btn.textContent = 'Signing in...'; btn.disabled = true; }
  try {
    var res = await fetch(BACKEND + '/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: e, password: p })
    });
    var data = await res.json();
    if (btn) { btn.textContent = 'Sign In'; btn.disabled = false; }
    if (data.error) { if (err) { err.textContent = data.error; err.style.display = 'block'; } return; }
    if (ok) { ok.textContent = data.message || 'Login successful!'; ok.style.display = 'block'; }
    CU = data.user; localStorage.setItem('jai_u', JSON.stringify(CU));
    setTimeout(function() { closeOv('login'); showUserNav(CU); applyPlan(CU); }, 1200);
  } catch (ex) {
    if (btn) { btn.textContent = 'Sign In'; btn.disabled = false; }
    if (err) { err.textContent = 'Connection error. Try again!'; err.style.display = 'block'; }
  }
}

function doLogout() {
  CU = null; localStorage.removeItem('jai_u');
  prem = false; free = 3;
  var lb = document.getElementById('loginBtn'); if (lb) lb.style.display = 'block';
  var up = document.getElementById('userPill'); if (up) up.style.display = 'none';
  closeOv('profile'); updateDiyas();
}

// ===== RAZORPAY =====
function pay(plan, amt) {
  if (!CU) { showOv('login'); addMsg('ai', 'Payment ke liye pehle login karein!'); return; }
  var rk = localStorage.getItem('jrk') || '';
  if (!rk) { var k = prompt('Enter Razorpay Key ID:'); if (!k) return; rk = k; localStorage.setItem('jrk', k); }
  try {
    new Razorpay({
      key: rk, amount: amt * 100, currency: 'INR',
      name: 'JyotishAI', description: plan, theme: { color: '#FF6B00' },
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
}

// ===== INIT =====
window.addEventListener('load', function() {
  document.getElementById('fb').style.display = 'flex';
  document.getElementById('qp').style.display = 'flex';
  document.getElementById('ui').disabled = false;
  document.getElementById('sb').disabled = false;
  document.getElementById('sb').style.opacity = '1';
  if (CU) { showUserNav(CU); applyPlan(CU); }
  // Wake up Render server immediately on page load
  fetch(BACKEND + '/ping').catch(function() {});
  // Ping again after 30s to ensure server is warm
  setTimeout(function() {
    fetch(BACKEND + '/ping').catch(function() {});
  }, 30000);
});

// CATEGORY
var currentCat = 'horoscope';
var catPrompts = {
  horoscope: 'What is my horoscope and prediction for today?',
  kundli: 'Please analyze my Kundli - birth chart reading',
  numerology: 'Give me my complete numerology reading with Janm Ank and Bhagya Ank',
  prashna: 'I have a specific question for Prashna Kundli reading',
  tarot: 'Give me a Tarot card reading - Past, Present, Future',
  vivah: 'I want Vivah Milan compatibility check'
};

function setCategory(cat, btn) {
  currentCat = cat;
  document.querySelectorAll('.cat').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');
  var inp = document.getElementById('ui');
  if (inp) inp.placeholder = 'Ask about ' + cat + '...';
}

// SECTIONS
function showSection(section) {
  document.getElementById('plansSection').style.display = 'none';
  document.getElementById('aboutSection').style.display = 'none';
  document.querySelectorAll('.bn-item').forEach(function(b) { b.classList.remove('active'); });
  if (section === 'plans') {
    document.getElementById('plansSection').style.display = 'block';
    document.querySelectorAll('.bn-item')[1].classList.add('active');
  } else if (section === 'about') {
    document.getElementById('aboutSection').style.display = 'block';
    document.querySelectorAll('.bn-item')[2].classList.add('active');
  } else {
    document.querySelectorAll('.bn-item')[0].classList.add('active');
  }
}

//  ALL BACKGROUND EFFECTS 
(function() {

  // 1. AURORA BANDS
  var aurora = document.createElement('div');
  aurora.className = 'aurora';
  for (var a = 0; a < 3; a++) {
    var band = document.createElement('div');
    band.className = 'aurora-band';
    aurora.appendChild(band);
  }
  document.body.insertBefore(aurora, document.body.firstChild);

  // 2. OM SYMBOLS
  var omBg = document.createElement('div');
  omBg.className = 'om-bg';
  omBg.textContent = 'OM';
  document.body.insertBefore(omBg, document.body.firstChild);

  var omCenter = document.createElement('div');
  omCenter.className = 'om-center';
  omCenter.textContent = 'OM';
  document.body.insertBefore(omCenter, document.body.firstChild);

  // 3. SHOOTING STARS
  for (var i = 1; i <= 5; i++) {
    var ss = document.createElement('div');
    ss.className = 'shooting-star s' + i;
    document.body.appendChild(ss);
  }

  // 4. TWINKLING STARS
  var colors = ['#fff','#FFD700','#FFA500','#E0E0FF','#FFE4B5','#C4B5FD'];
  for (var j = 0; j < 40; j++) {
    var ts = document.createElement('div');
    ts.className = 'twinkle-star';
    var size = Math.random() * 2.5 + 1;
    var color = colors[Math.floor(Math.random() * colors.length)];
    ts.style.cssText = 'width:'+size+'px;height:'+size+'px;left:'+Math.random()*100+'%;top:'+Math.random()*100+'%;--td:'+(Math.random()*3+2)+'s;--tdelay:'+Math.random()*4+'s;background:'+color+';box-shadow:0 0 '+(size*2)+'px '+color;
    document.body.appendChild(ts);
  }

  // 5. CONSTELLATION PARTICLES + LINES
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
    points.push({x:x,y:y});
  }
  // Connect nearby points with lines
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

//  RIPPLE EFFECT 
document.addEventListener('click', function(e) {
  var btn = e.target.closest('.md-btn,.pc-btn,.tb-login,.cat,.send-btn');
  if (!btn) return;
  var r = document.createElement('div');
  r.className = 'ripple';
  var rect = btn.getBoundingClientRect();
  var size = Math.max(rect.width, rect.height);
  r.style.cssText = 'width:'+size+'px;height:'+size+'px;left:'+(e.clientX-rect.left-size/2)+'px;top:'+(e.clientY-rect.top-size/2)+'px';
  btn.appendChild(r);
  setTimeout(function(){r.remove();}, 700);
});

//  CHAT BUBBLE GLOW 
var _origAddMsg2 = addMsg;
addMsg = function(role, text) {
  _origAddMsg2(role, text);
  if (role === 'ai') {
    var msgs = document.getElementById('ms');
    var lastMsg = msgs ? msgs.lastElementChild : null;
    if (lastMsg) {
      lastMsg.classList.add('new');
      setTimeout(function(){lastMsg.classList.remove('new');}, 2000);
    }
  }
};

//  CATEGORY SLIDE INDICATOR 
window.addEventListener('load', function() {
  var firstCat = document.querySelector('.cat.active');
  if (firstCat) {
    var ind = document.createElement('div');
    ind.className = 'cat-indicator';
    var catsEl = document.querySelector('.cats');
    if (catsEl) catsEl.appendChild(ind);
    moveCatIndicator(firstCat);
  }
});

function moveCatIndicator(btn) {
  var ind = document.querySelector('.cat-indicator');
  if (!ind || !btn) return;
  ind.style.left = btn.offsetLeft + 'px';
  ind.style.width = btn.offsetWidth + 'px';
}

var _origSetCat = setCategory;
setCategory = function(cat, btn) {
  _origSetCat(cat, btn);
  moveCatIndicator(btn);
};
