/* ============================================================
   꼭 (KKOK) — 파스텔 캘린더 플래너
   할 일 / 구매 목록 / 언젠가 / 링크 보관함 / 공유 / 알람
   순수 정적 PWA. 데이터는 이 기기(localStorage)에 저장됩니다.
============================================================ */
(function () {
'use strict';

/* ---------- 저장소 ---------- */
var KEY = 'kkok.v1';
var PALETTE = ['#F3A6B8','#F6DE96','#A9CFF0','#C4B8F0','#C9CEDB','#A9DEC6','#FBC7A4','#EFB7D6','#9FD7DE','#D8C9A8'];

var DEFAULT = {
  cats: [
    {id:'c1', name:'학교',   color:'#F3A6B8'},
    {id:'c2', name:'외출',   color:'#F6DE96'},
    {id:'c3', name:'업무',   color:'#A9CFF0'},
    {id:'c4', name:'일정',   color:'#C4B8F0'},
    {id:'c5', name:'습관',   color:'#C9CEDB'},
    {id:'c6', name:'마인드', color:'#A9DEC6'}
  ],
  folders: [
    {id:'f1', name:'참고', color:'#A9CFF0'},
    {id:'f2', name:'쇼핑', color:'#FBC7A4'},
    {id:'f3', name:'영감', color:'#C4B8F0'}
  ],
  todos: [],
  links: [],
  settings: { name:'', weekStart:0, sound:true, fs:16 }
};

var S = load();

function load() {
  try {
    var raw = localStorage.getItem(KEY);
    if (!raw) return JSON.parse(JSON.stringify(DEFAULT));
    var d = JSON.parse(raw);
    var base = JSON.parse(JSON.stringify(DEFAULT));
    for (var k in base) if (!(k in d)) d[k] = base[k];
    for (var s in base.settings) if (!(s in d.settings)) d.settings[s] = base.settings[s];
    return d;
  } catch (e) { return JSON.parse(JSON.stringify(DEFAULT)); }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch (e) { toast('저장 공간이 부족해요'); }
}
function uid() { return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3); }

/* ---------- 날짜 유틸 ---------- */
var DOW = ['일','월','화','수','목','금','토'];
function ymd(d) {
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}
function toDate(s) { var p = s.split('-'); return new Date(+p[0], +p[1]-1, +p[2]); }
function today() { return ymd(new Date()); }
function fmtDot(s) { var d = toDate(s); return (d.getMonth()+1) + '. ' + d.getDate() + '. (' + DOW[d.getDay()] + ')'; }
function fmtLong(s) { var d = toDate(s); return (d.getMonth()+1) + '월 ' + d.getDate() + '일 (' + DOW[d.getDay()] + ')'; }
function diffDays(a, b) { return Math.round((toDate(b) - toDate(a)) / 86400000); }
function addDays(s, n) { var d = toDate(s); d.setDate(d.getDate()+n); return ymd(d); }

/* ---------- DOM 헬퍼 ---------- */
function $(id) { return document.getElementById(id); }
function el(tag, cls, txt) {
  var n = document.createElement(tag);
  if (cls) n.className = cls;
  if (txt != null) n.textContent = txt;
  return n;
}
function svg(paths, cls) {
  var s = '<svg viewBox="0 0 24 24" class="' + (cls||'ic') + '">' + paths + '</svg>';
  var w = document.createElement('span'); w.innerHTML = s; return w.firstChild;
}
var IC = {
  check: '<path d="M5 12l4 4 10-10"/>',
  more:  '<circle cx="12" cy="5" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1.6" fill="currentColor" stroke="none"/>',
  bell:  '<path d="M18 8a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7"/><path d="M10.3 20a2 2 0 0 0 3.4 0"/>',
  repeat:'<path d="M17 2l3 3-3 3"/><path d="M4 11V9a4 4 0 0 1 4-4h12"/><path d="M7 22l-3-3 3-3"/><path d="M20 13v2a4 4 0 0 1-4 4H4"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>'
};

function toast(msg) {
  var t = $('toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(t._t);
  t._t = setTimeout(function(){ t.hidden = true; }, 2000);
}

/* ---------- 시트 ---------- */
function openSheet(build) {
  var sh = $('sheet'), body = $('sheetBody'), sc = $('scrim');
  body.innerHTML = '';
  build(body);
  sh.hidden = false; sc.hidden = false;
  document.body.style.overflow = 'hidden';
}
function closeSheet() {
  $('sheet').hidden = true; $('scrim').hidden = true;
  document.body.style.overflow = '';
}
$('scrim').addEventListener('click', closeSheet);

function sheetTitle(body, text) { body.appendChild(el('h3', null, text)); }
function sheetSub(body, text) { body.appendChild(el('h4', null, text)); }
function rowEl(labelHtml) {
  var r = el('div','row');
  var l = el('div','lb'); l.innerHTML = labelHtml;
  r.appendChild(l);
  return r;
}
function bigBtn(text, cls, fn) {
  var b = el('button','btn' + (cls ? ' ' + cls : ''), text);
  b.addEventListener('click', fn);
  return b;
}

/* ---------- 카테고리 ---------- */
function cat(id) {
  for (var i=0;i<S.cats.length;i++) if (S.cats[i].id===id) return S.cats[i];
  return S.cats[0] || {id:'', name:'', color:'#C9CEDB'};
}
function folder(id) {
  for (var i=0;i<S.folders.length;i++) if (S.folders[i].id===id) return S.folders[i];
  return S.folders[0] || {id:'', name:'기타', color:'#C9CEDB'};
}

/* ============================================================
   상태
============================================================ */
var view = 'calendar';
var curMonth = new Date(); curMonth.setDate(1);
var selDate = today();
var dayKind = 'todo';
var linkFilter = 'all';

/* 입력바 초기값 */
var draft = {
  cat: (S.cats[3] || S.cats[0]).id,
  folder: S.folders[0].id,
  time: null,
  alarm: false,
  memoOn: false,
  checksOn: false,
  sched: { mode:'single' }
};

/* ============================================================
   렌더링 — 캘린더
============================================================ */
function renderWeekdays() {
  var w = $('weekdays'); w.innerHTML = '';
  for (var i=0;i<7;i++) {
    var idx = (i + S.settings.weekStart) % 7;
    var d = el('div', idx===0?'sun':(idx===6?'sat':''), DOW[idx]);
    w.appendChild(d);
  }
}

function todosOn(date) {
  return S.todos.filter(function(t){ return t.date === date; });
}

function renderCalendar() {
  $('monthLabel').textContent = curMonth.getFullYear() + '년 ' + (curMonth.getMonth()+1) + '월';
  var grid = $('calGrid'); grid.innerHTML = '';

  var first = new Date(curMonth.getFullYear(), curMonth.getMonth(), 1);
  var lead = (first.getDay() - S.settings.weekStart + 7) % 7;
  var start = new Date(first); start.setDate(1 - lead);
  var tdy = today();

  for (var i=0;i<42;i++) {
    var d = new Date(start); d.setDate(start.getDate()+i);
    var key = ymd(d);
    var cls = 'cell';
    if (d.getMonth() !== curMonth.getMonth()) cls += ' dim';
    if (d.getDay() === 0) cls += ' sun';
    if (d.getDay() === 6) cls += ' sat';
    if (key === tdy) cls += ' today';
    if (key === selDate) cls += ' sel';

    var c = el('button', cls);
    c.appendChild(el('span','num', String(d.getDate())));

    var list = todosOn(key);
    if (list.length) {
      var dots = el('div','dots');
      var colors = [], seen = {};
      for (var j=0;j<list.length;j++) {
        var col = cat(list[j].cat).color;
        if (!seen[col]) { seen[col] = 1; colors.push(col); }
      }
      var shown = colors.slice(0,4);
      for (var k=0;k<shown.length;k++) {
        var dt = el('i'); dt.style.background = shown[k]; dots.appendChild(dt);
      }
      c.appendChild(dots);
      var open = list.filter(function(t){return !t.done;}).length;
      if (open) c.appendChild(el('span','cnt', String(open)));
    }
    (function(key){
      c.addEventListener('click', function(){ selDate = key; renderCalendar(); renderDay(); updateComposer(); });
    })(key);
    grid.appendChild(c);
  }

  // 밀린 할 일 배너
  var over = overdue();
  var b = $('overdueBanner');
  if (over.length) { b.hidden = false; $('overdueText').textContent = over.length + '개의 남은 할 일'; }
  else b.hidden = true;
}

function overdue() {
  var tdy = today();
  return S.todos.filter(function(t){
    return t.date && !t.done && t.date < tdy;
  }).sort(function(a,b){ return a.date < b.date ? -1 : 1; });
}

/* ============================================================
   렌더링 — 아이템 카드
============================================================ */
function itemNode(t, opts) {
  opts = opts || {};
  var li = el('li','item' + (t.done ? ' done' : ''));
  li.style.borderLeftColor = cat(t.cat).color;

  // 체크박스
  var chk = el('button','chk' + (t.done ? ' on' : ''));
  chk.appendChild(svg(IC.check));
  chk.addEventListener('click', function(e){
    e.stopPropagation();
    t.done = !t.done;
    t.doneAt = t.done ? Date.now() : null;
    if (t.done) chime(1);
    save(); renderAll();
  });
  li.appendChild(chk);

  var main = el('div','t-main');
  main.appendChild(el('div','t-title', t.title));

  // 메타
  var meta = el('div','t-meta');
  if (opts.showDplus && t.date) {
    var dd = diffDays(t.date, today());
    if (dd > 0) meta.appendChild(el('span','dplus','D + ' + dd));
  }
  if (opts.showDate && t.date) meta.appendChild(el('span','tag', fmtDot(t.date)));
  if (t.time) {
    var tm = el('span','tag');
    if (t.alarm) tm.appendChild(svg(IC.bell));
    tm.appendChild(el('span', null, t.time));
    tm.style.color = t.alarm ? '#C96E85' : '';
    meta.appendChild(tm);
  }
  if (t.sid) { var rp = el('span','tag'); rp.appendChild(svg(IC.repeat)); meta.appendChild(rp); }
  var ct = el('span','tag');
  var ci = el('i'); ci.style.background = cat(t.cat).color;
  ct.appendChild(ci); ct.appendChild(el('span',null,cat(t.cat).name));
  meta.appendChild(ct);
  if (t.from) meta.appendChild(el('span','tag','👤 ' + t.from));
  main.appendChild(meta);

  if (t.memo) main.appendChild(el('div','t-memo', t.memo));

  if (t.checks && t.checks.length) {
    var ul = el('div','sub-checks');
    t.checks.forEach(function(c, i){
      var row = el('div','sub' + (c.d ? ' on' : ''));
      var cb = el('button','chk' + (c.d ? ' on' : ''));
      cb.appendChild(svg(IC.check));
      cb.addEventListener('click', function(e){
        e.stopPropagation(); c.d = !c.d; if (c.d) chime(1); save(); renderAll();
      });
      row.appendChild(cb);
      row.appendChild(el('span', null, c.t));
      ul.appendChild(row);
    });
    main.appendChild(ul);
  }
  li.appendChild(main);

  var more = el('button','t-more');
  more.appendChild(svg(IC.more));
  more.addEventListener('click', function(e){ e.stopPropagation(); itemMenu(t); });
  li.appendChild(more);

  li.addEventListener('click', function(){ editItem(t); });
  return li;
}

/* ============================================================
   렌더링 — 각 화면
============================================================ */
function renderDay() {
  $('dayLabel').textContent = fmtLong(selDate);
  var list = $('dayList'); list.innerHTML = '';
  var items = todosOn(selDate).filter(function(t){ return (t.kind||'todo') === dayKind; });
  items.sort(function(a,b){
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.time && b.time) return a.time < b.time ? -1 : 1;
    if (a.time) return -1; if (b.time) return 1;
    return a.createdAt - b.createdAt;
  });
  items.forEach(function(t){ list.appendChild(itemNode(t, {})); });
  $('dayEmpty').hidden = items.length > 0;
  $('dayEmpty').textContent = dayKind === 'buy' ? '살 것을 적어보세요 🛒' : '아직 없어요. 아래에 적어보세요 ✏️';
}

function renderSomeday() {
  var list = $('somedayList'); list.innerHTML = '';
  var items = S.todos.filter(function(t){ return t.someday; });
  items.sort(function(a,b){ return (a.done===b.done) ? b.createdAt - a.createdAt : (a.done?1:-1); });
  items.forEach(function(t){ list.appendChild(itemNode(t, {})); });
  $('somedayEmpty').hidden = items.length > 0;
}

function renderBuy() {
  var list = $('buyList'); list.innerHTML = '';
  var doneList = $('buyDoneList'); doneList.innerHTML = '';
  var all = S.todos.filter(function(t){ return t.kind === 'buy'; });
  var open = all.filter(function(t){ return !t.done; });
  var done = all.filter(function(t){ return t.done; });
  open.sort(function(a,b){ return b.createdAt - a.createdAt; });
  done.sort(function(a,b){ return (b.doneAt||0) - (a.doneAt||0); });
  open.forEach(function(t){ list.appendChild(itemNode(t, {showDate:true})); });
  done.forEach(function(t){ doneList.appendChild(itemNode(t, {showDate:true})); });
  $('buyEmpty').hidden = open.length > 0;
  $('buyDoneFold').hidden = done.length === 0;
  $('buyDoneCount').textContent = done.length;
}
$('buyDoneToggle').addEventListener('click', function(){
  var l = $('buyDoneList');
  l.hidden = !l.hidden;
  this.firstChild.textContent = l.hidden ? '구매 완료 ' : '구매 완료 접기 ';
});

function renderLinks() {
  var chips = $('folderChips'); chips.innerHTML = '';
  var mk = function(id, name) {
    var c = el('button','chip' + (linkFilter===id ? ' on' : ''), name);
    c.addEventListener('click', function(){ linkFilter = id; renderLinks(); });
    return c;
  };
  chips.appendChild(mk('all','전체'));
  S.folders.forEach(function(f){ chips.appendChild(mk(f.id, f.name)); });
  var edit = el('button','chip','＋ 폴더');
  edit.addEventListener('click', folderSheet);
  chips.appendChild(edit);

  var list = $('linkList'); list.innerHTML = '';
  var items = S.links.filter(function(l){ return linkFilter==='all' || l.folder===linkFilter; });
  items.sort(function(a,b){ return b.createdAt - a.createdAt; });
  items.forEach(function(l){
    var li = el('li','link-item');
    var f = folder(l.folder);
    var badge = el('div','lk-badge', (l.title || l.url).replace(/^https?:\/\//,'').charAt(0).toUpperCase());
    badge.style.background = f.color;
    li.appendChild(badge);
    var m = el('div','lk-main');
    m.appendChild(el('div','lk-title', l.title || l.url));
    m.appendChild(el('div','lk-url', l.url.replace(/^https?:\/\//,'')));
    if (l.memo) m.appendChild(el('div','lk-memo', l.memo));
    li.appendChild(m);
    var more = el('button','t-more'); more.appendChild(svg(IC.more));
    more.addEventListener('click', function(e){ e.stopPropagation(); linkMenu(l); });
    li.appendChild(more);
    li.addEventListener('click', function(){ window.open(l.url, '_blank', 'noopener'); });
    list.appendChild(li);
  });
  $('linkEmpty').hidden = items.length > 0;
}

function renderAll() {
  renderCalendar(); renderDay(); renderSomeday(); renderBuy(); renderLinks();
}

/* ============================================================
   화면 전환
============================================================ */
function switchView(v) {
  view = v;
  ['calendar','someday','buy','links'].forEach(function(n){
    $('view-' + n).hidden = (n !== v);
  });
  Array.prototype.forEach.call(document.querySelectorAll('.tab'), function(b){
    b.classList.toggle('on', b.dataset.view === v);
  });
  updateComposer();
  window.scrollTo(0,0);
}
Array.prototype.forEach.call(document.querySelectorAll('.tab'), function(b){
  b.addEventListener('click', function(){ switchView(b.dataset.view); });
});

Array.prototype.forEach.call($('daySeg').children, function(b){
  b.addEventListener('click', function(){
    dayKind = b.dataset.kind;
    Array.prototype.forEach.call($('daySeg').children, function(x){ x.classList.toggle('on', x===b); });
    renderDay(); updateComposer();
  });
});

$('prevMonth').addEventListener('click', function(){ curMonth.setMonth(curMonth.getMonth()-1); renderCalendar(); });
$('nextMonth').addEventListener('click', function(){ curMonth.setMonth(curMonth.getMonth()+1); renderCalendar(); });
$('monthLabel').addEventListener('click', function(){ goToday(); });
$('btnToday').addEventListener('click', function(){ switchView('calendar'); goToday(); });
function goToday(){
  selDate = today();
  curMonth = new Date(); curMonth.setDate(1);
  draft.sched = {mode:'single'};
  renderCalendar(); renderDay(); updateComposer();
}

/* ============================================================
   입력바(컴포저)
============================================================ */
var cpText = $('cpText'), cpMemo = $('cpMemo');

cpText.addEventListener('input', function(){
  this.style.height = 'auto';
  this.style.height = Math.min(this.scrollHeight, 120) + 'px';
  $('cpSend').disabled = !this.value.trim();
});
cpText.addEventListener('keydown', function(e){
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComposer(); }
});

function updateComposer() {
  var isLink = (view === 'links');
  var isSomeday = (view === 'someday');
  var kind = (view === 'buy') ? 'buy' : (view === 'calendar' ? dayKind : 'todo');

  cpText.placeholder = isLink ? '링크를 붙여넣으세요 (https://…)'
    : isSomeday ? '언젠가 할 일을 적어보세요'
    : kind === 'buy' ? '구매할 것을 입력하세요'
    : '할 일을 입력하세요';

  $('cpDate').hidden = isLink || isSomeday;
  $('cpAlarm').hidden = isLink || isSomeday;
  $('cpCheckBtn').hidden = isLink;

  // 날짜 칩 텍스트
  var s = draft.sched;
  var txt = fmtDot(selDate);
  if (s.mode === 'range') txt = fmtDotShort(s.from) + ' ~ ' + fmtDotShort(s.to);
  else if (s.mode === 'repeat') txt = repeatLabel(s);
  else if (s.mode === 'multi') txt = s.dates.length + '개 날짜';
  $('cpDateText').textContent = txt;

  // 카테고리 / 폴더 칩
  if (isLink) {
    var f = folder(draft.folder);
    $('cpCatDot').style.background = f.color;
    $('cpCatText').textContent = f.name;
  } else {
    var c = cat(draft.cat);
    $('cpCatDot').style.background = c.color;
    $('cpCatText').textContent = c.name;
  }
  $('cpAlarm').classList.toggle('on', !!draft.time);
  $('cpMemoBtn').classList.toggle('on', draft.memoOn);
  $('cpCheckBtn').classList.toggle('on', draft.checksOn);
  $('cpMemoWrap').hidden = !draft.memoOn;
  $('cpChecks').hidden = !draft.checksOn;
  $('cpExtra').hidden = !(draft.memoOn || draft.checksOn);
  $('cpSend').disabled = !cpText.value.trim();
}
function fmtDotShort(s){ var d = toDate(s); return (d.getMonth()+1) + '/' + d.getDate(); }
function repeatLabel(s) {
  if (s.rtype === 'daily') return '매일';
  if (s.rtype === 'monthly') return '매월 ' + toDate(s.rstart).getDate() + '일';
  var names = (s.days||[]).slice().sort().map(function(i){ return DOW[i]; }).join('·');
  return '매주 ' + (names || DOW[toDate(s.rstart).getDay()]);
}

$('cpMemoBtn').addEventListener('click', function(){ draft.memoOn = !draft.memoOn; updateComposer(); if (draft.memoOn) cpMemo.focus(); });
$('cpCheckBtn').addEventListener('click', function(){
  draft.checksOn = !draft.checksOn;
  if (draft.checksOn && !$('cpChecks').children.length) addCheckInput();
  updateComposer();
});
$('cpCat').addEventListener('click', function(){ view === 'links' ? pickFolder() : pickCat(); });
$('cpAlarm').addEventListener('click', alarmSheet);
$('cpDate').addEventListener('click', scheduleSheet);
$('cpSend').addEventListener('click', submitComposer);

function addCheckInput(val) {
  var li = el('li');
  li.appendChild(el('span','ring'));
  var inp = document.createElement('input');
  inp.type = 'text'; inp.placeholder = '체크 항목'; inp.value = val || '';
  inp.addEventListener('input', function(){
    var ul = $('cpChecks');
    if (this.value && this === ul.lastChild.querySelector('input')) addCheckInput();
  });
  li.appendChild(inp);
  $('cpChecks').appendChild(li);
  return inp;
}
function collectChecks() {
  var out = [];
  Array.prototype.forEach.call($('cpChecks').querySelectorAll('input'), function(i){
    if (i.value.trim()) out.push({t: i.value.trim(), d:false});
  });
  return out;
}
function resetComposer() {
  cpText.value = ''; cpText.style.height = 'auto';
  cpMemo.value = '';
  $('cpChecks').innerHTML = '';
  draft.memoOn = false; draft.checksOn = false;
  draft.time = null; draft.alarm = false;
  draft.sched = {mode:'single'};
  updateComposer();
}

function submitComposer() {
  var text = cpText.value.trim();
  if (!text) return;

  if (view === 'links') { addLinkFromText(text); return; }

  var isSomeday = (view === 'someday');
  var kind = (view === 'buy') ? 'buy' : (view === 'calendar' ? dayKind : 'todo');
  var memo = draft.memoOn ? cpMemo.value.trim() : '';
  var checks = draft.checksOn ? collectChecks() : [];

  if (isSomeday) {
    S.todos.push(mkTodo(text, null, kind, memo, checks, null));
  } else {
    var dates = expandDates(draft.sched);
    var sid = dates.length > 1 ? uid() : null;
    dates.forEach(function(d){
      S.todos.push(mkTodo(text, d, kind, memo, checks, sid));
    });
    if (dates.length > 1) toast(dates.length + '개 날짜에 등록했어요');
  }
  save(); resetComposer(); renderAll(); scheduleAlarms();
}

function mkTodo(title, date, kind, memo, checks, sid) {
  return {
    id: uid(), title: title, memo: memo || '',
    checks: JSON.parse(JSON.stringify(checks || [])),
    date: date, time: draft.time, alarm: !!draft.alarm,
    cat: draft.cat, kind: kind, done: false, doneAt: null,
    someday: !date, sid: sid, createdAt: Date.now(), fired: false
  };
}

function expandDates(s) {
  if (!s || s.mode === 'single') return [selDate];
  if (s.mode === 'range') {
    var out = [], d = s.from;
    var guard = 0;
    while (d <= s.to && guard++ < 400) { out.push(d); d = addDays(d, 1); }
    return out;
  }
  if (s.mode === 'multi') return s.dates.slice();
  if (s.mode === 'repeat') {
    var res = [], cur = s.rstart;
    var end = s.rend || addDays(s.rstart, 365);
    var g = 0;
    while (cur <= end && g++ < 500) {
      var dt = toDate(cur);
      if (s.rtype === 'daily') res.push(cur);
      else if (s.rtype === 'weekly') { if ((s.days||[]).indexOf(dt.getDay()) >= 0) res.push(cur); }
      else if (s.rtype === 'monthly') { if (dt.getDate() === toDate(s.rstart).getDate()) res.push(cur); }
      cur = addDays(cur, 1);
    }
    return res.length ? res : [s.rstart];
  }
  return [selDate];
}

/* ============================================================
   시트 — 카테고리 선택
============================================================ */
function pickCat() {
  openSheet(function(b){
    sheetTitle(b, '카테고리 선택');
    var list = el('div','cat-list');
    S.cats.forEach(function(c){
      var r = el('button','cat-row');
      var d = el('span','dot'); d.style.background = c.color;
      r.appendChild(d);
      r.appendChild(el('span', null, c.name));
      if (c.id === draft.cat) { var m = svg(IC.check); m.style.marginLeft='auto'; m.style.color = c.color; r.appendChild(m); }
      r.addEventListener('click', function(){ draft.cat = c.id; closeSheet(); updateComposer(); });
      list.appendChild(r);
    });
    b.appendChild(list);
    b.appendChild(bigBtn('카테고리 편집','ghost', function(){ closeSheet(); catSheet(); }));
    b.lastChild.style.marginTop = '12px';
  });
}

function catSheet() {
  openSheet(function(b){
    sheetTitle(b, '카테고리 편집');
    var list = el('div','cat-list');
    S.cats.forEach(function(c, i){
      var r = el('div','cat-row');
      var d = el('button','dot'); d.style.background = c.color;
      d.addEventListener('click', function(){ pickColor(c.color, function(col){ c.color = col; save(); catSheet(); renderAll(); }); });
      r.appendChild(d);
      var inp = document.createElement('input');
      inp.type='text'; inp.value = c.name;
      inp.addEventListener('change', function(){ c.name = this.value.trim() || c.name; save(); renderAll(); });
      r.appendChild(inp);
      var up = el('button','t-more','↑');
      up.addEventListener('click', function(){ if (i>0) { var t=S.cats[i-1]; S.cats[i-1]=S.cats[i]; S.cats[i]=t; save(); catSheet(); } });
      r.appendChild(up);
      var del = el('button','t-more','×');
      del.addEventListener('click', function(){
        if (S.cats.length <= 1) return toast('최소 1개는 필요해요');
        if (!confirm('“' + c.name + '” 카테고리를 삭제할까요?\n해당 일정은 첫 번째 카테고리로 옮겨집니다.')) return;
        S.todos.forEach(function(t){ if (t.cat === c.id) t.cat = S.cats[0].id === c.id ? (S.cats[1]||S.cats[0]).id : S.cats[0].id; });
        S.cats = S.cats.filter(function(x){ return x.id !== c.id; });
        if (draft.cat === c.id) draft.cat = S.cats[0].id;
        save(); catSheet(); renderAll(); updateComposer();
      });
      r.appendChild(del);
      list.appendChild(r);
    });
    b.appendChild(list);
    var add = bigBtn('＋ 카테고리 추가','ghost', function(){
      S.cats.push({id: uid(), name: '새 카테고리', color: PALETTE[S.cats.length % PALETTE.length]});
      save(); catSheet();
    });
    add.style.marginTop = '12px';
    b.appendChild(add);
    b.appendChild(bigBtn('완료', null, closeSheet));
    b.lastChild.style.marginTop = '9px';
  });
}

function pickColor(current, cb) {
  openSheet(function(b){
    sheetTitle(b, '색깔 고르기');
    var w = el('div','swatches');
    PALETTE.forEach(function(col){
      var s = el('button','sw' + (col===current ? ' on' : ''));
      s.style.background = col;
      s.addEventListener('click', function(){ closeSheet(); cb(col); });
      w.appendChild(s);
    });
    b.appendChild(w);
  });
}

/* ============================================================
   시트 — 알람 / 시간
============================================================ */
function alarmSheet() {
  openSheet(function(b){
    sheetTitle(b, '시간 · 알람');
    var r = rowEl('<span>시간</span>');
    var t = document.createElement('input'); t.type = 'time'; t.value = draft.time || '09:00';
    r.appendChild(t); b.appendChild(r);

    var r2 = rowEl('<span>그 시간에 알람 울리기</span>');
    var sw = el('button','pill' + (draft.alarm ? ' on' : ''), draft.alarm ? '켬' : '끔');
    sw.addEventListener('click', function(){
      draft.alarm = !draft.alarm;
      sw.textContent = draft.alarm ? '켬' : '끔';
      sw.classList.toggle('on', draft.alarm);
      if (draft.alarm) askNotify();
    });
    r2.appendChild(sw); b.appendChild(r2);

    sheetSub(b, '자주 쓰는 시간');
    var quick = el('div','chips');
    [['아침 8시','08:00'],['점심 12시','12:00'],['오후 3시','15:00'],['저녁 7시','19:00'],['밤 9시','21:00']].forEach(function(q){
      var c = el('button','chip', q[0]);
      c.addEventListener('click', function(){ t.value = q[1]; });
      quick.appendChild(c);
    });
    quick.style.flexWrap = 'wrap';
    b.appendChild(quick);

    b.appendChild(el('p','hint','알람은 앱이 켜져 있을 때 화면과 소리로 알려주고, 알림 권한을 허용하면 화면을 꺼둔 동안에도 알림이 옵니다. (홈 화면에 설치해두면 더 잘 동작해요)'));

    var br = el('div','btn-row');
    br.appendChild(bigBtn('시간 지우기','ghost', function(){ draft.time = null; draft.alarm = false; closeSheet(); updateComposer(); }));
    br.appendChild(bigBtn('확인', null, function(){ draft.time = t.value || null; if (!draft.time) draft.alarm = false; closeSheet(); updateComposer(); }));
    b.appendChild(br);
  });
}

/* ============================================================
   시트 — 일정 방식(일반/기간/반복/다중)
============================================================ */
function scheduleSheet() {
  var tmp = JSON.parse(JSON.stringify(draft.sched));
  if (tmp.mode === 'single') { tmp.date = selDate; }
  if (!tmp.from) { tmp.from = selDate; tmp.to = addDays(selDate, 3); }
  if (!tmp.rtype) { tmp.rtype = 'weekly'; tmp.days = [toDate(selDate).getDay()]; tmp.rstart = selDate; tmp.rend = ''; }
  if (!tmp.dates) tmp.dates = [selDate];

  openSheet(function(b){
    sheetTitle(b, '언제 할까요?');
    var seg = el('div','seg full');
    var panel = el('div');
    var modes = [['single','일반'],['range','기간'],['repeat','반복'],['multi','다중']];
    modes.forEach(function(m){
      var btn = el('button','seg-btn' + (tmp.mode===m[0] ? ' on' : ''), m[1]);
      btn.addEventListener('click', function(){
        tmp.mode = m[0];
        Array.prototype.forEach.call(seg.children, function(x){ x.classList.toggle('on', x===btn); });
        draw();
      });
      seg.appendChild(btn);
    });
    b.appendChild(seg); b.appendChild(panel);

    function draw() {
      panel.innerHTML = '';
      if (tmp.mode === 'single') {
        var r = rowEl('<span>날짜</span>');
        var d = document.createElement('input'); d.type='date'; d.value = tmp.date || selDate;
        d.addEventListener('change', function(){ tmp.date = this.value; });
        r.appendChild(d); panel.appendChild(r);
      }
      else if (tmp.mode === 'range') {
        var r1 = rowEl('<span>시작 날짜</span>');
        var f = document.createElement('input'); f.type='date'; f.value = tmp.from;
        f.addEventListener('change', function(){ tmp.from = this.value; });
        r1.appendChild(f); panel.appendChild(r1);
        var r2 = rowEl('<span>종료 날짜</span>');
        var to = document.createElement('input'); to.type='date'; to.value = tmp.to;
        to.addEventListener('change', function(){ tmp.to = this.value; });
        r2.appendChild(to); panel.appendChild(r2);
        panel.appendChild(el('p','hint','시작일부터 종료일까지 매일 같은 일정이 등록돼요.'));
      }
      else if (tmp.mode === 'repeat') {
        var r0 = rowEl('<span>반복 유형</span>');
        var sel = document.createElement('select');
        [['daily','매일'],['weekly','매주'],['monthly','매월']].forEach(function(o){
          var op = document.createElement('option'); op.value=o[0]; op.textContent=o[1];
          if (tmp.rtype===o[0]) op.selected = true;
          sel.appendChild(op);
        });
        sel.addEventListener('change', function(){ tmp.rtype = this.value; draw(); });
        r0.appendChild(sel); panel.appendChild(r0);

        if (tmp.rtype === 'weekly') {
          var dw = el('div','dow');
          for (var i=0;i<7;i++) (function(i){
            var bt = el('button', (tmp.days||[]).indexOf(i)>=0 ? 'on' : '', DOW[i]);
            bt.addEventListener('click', function(){
              tmp.days = tmp.days || [];
              var k = tmp.days.indexOf(i);
              if (k>=0) tmp.days.splice(k,1); else tmp.days.push(i);
              bt.classList.toggle('on');
            });
            dw.appendChild(bt);
          })(i);
          panel.appendChild(dw);
        }
        var rs = rowEl('<span>시작 날짜</span>');
        var st = document.createElement('input'); st.type='date'; st.value = tmp.rstart || selDate;
        st.addEventListener('change', function(){ tmp.rstart = this.value; });
        rs.appendChild(st); panel.appendChild(rs);
        var re = rowEl('<span>종료 날짜</span>');
        var en = document.createElement('input'); en.type='date'; en.value = tmp.rend || '';
        en.addEventListener('change', function(){ tmp.rend = this.value; });
        re.appendChild(en); panel.appendChild(re);
        panel.appendChild(el('p','hint','종료 날짜를 비워두면 1년 동안 반복돼요.'));
      }
      else if (tmp.mode === 'multi') {
        var box = el('div','mini-cal');
        var mm = toDate(tmp.dates[0] || selDate); mm.setDate(1);
        var head = el('div','cal-head');
        var prev = el('button','icon-btn sm','‹');
        var lab = el('button','month-label');
        var next = el('button','icon-btn sm','›');
        head.appendChild(prev); head.appendChild(lab); head.appendChild(next);
        box.appendChild(head);
        var wk = el('div','weekdays');
        for (var i=0;i<7;i++) { var idx=(i+S.settings.weekStart)%7; wk.appendChild(el('div', idx===0?'sun':(idx===6?'sat':''), DOW[idx])); }
        box.appendChild(wk);
        var g = el('div','mini-grid'); box.appendChild(g);
        function paint() {
          lab.textContent = mm.getFullYear() + '년 ' + (mm.getMonth()+1) + '월';
          g.innerHTML = '';
          var first = new Date(mm.getFullYear(), mm.getMonth(), 1);
          var lead = (first.getDay() - S.settings.weekStart + 7) % 7;
          var st2 = new Date(first); st2.setDate(1 - lead);
          for (var i=0;i<42;i++) {
            var d = new Date(st2); d.setDate(st2.getDate()+i);
            var key = ymd(d);
            var bt = el('button', (d.getMonth()!==mm.getMonth() ? 'dim ' : '') + (tmp.dates.indexOf(key)>=0 ? 'on' : ''), String(d.getDate()));
            (function(key, bt){
              bt.addEventListener('click', function(){
                var k = tmp.dates.indexOf(key);
                if (k>=0) tmp.dates.splice(k,1); else tmp.dates.push(key);
                bt.classList.toggle('on');
              });
            })(key, bt);
            g.appendChild(bt);
          }
        }
        prev.addEventListener('click', function(){ mm.setMonth(mm.getMonth()-1); paint(); });
        next.addEventListener('click', function(){ mm.setMonth(mm.getMonth()+1); paint(); });
        paint();
        panel.appendChild(box);
        panel.appendChild(el('p','hint','원하는 날짜를 여러 개 눌러 한 번에 등록할 수 있어요.'));
      }
    }
    draw();

    var br = el('div','btn-row');
    br.appendChild(bigBtn('취소','ghost', closeSheet));
    br.appendChild(bigBtn('확인', null, function(){
      if (tmp.mode === 'single') { selDate = tmp.date || selDate; draft.sched = {mode:'single'}; curMonth = toDate(selDate); curMonth.setDate(1); }
      else draft.sched = tmp;
      closeSheet(); renderCalendar(); renderDay(); updateComposer();
    }));
    b.appendChild(br);
  });
}

/* ============================================================
   아이템 편집 / 메뉴
============================================================ */
function editItem(t) {
  openSheet(function(b){
    sheetTitle(b, '수정하기');
    var ti = document.createElement('textarea'); ti.rows = 2; ti.value = t.title;
    b.appendChild(ti);

    sheetSub(b, '메모');
    var mm = document.createElement('textarea'); mm.rows = 3; mm.value = t.memo || ''; mm.placeholder = '메모를 남겨보세요';
    b.appendChild(mm);

    sheetSub(b, '체크 항목');
    var cl = el('div','cp-checks'); cl.style.marginBottom = '4px';
    function addRow(val) {
      var li = el('div'); li.style.display='flex'; li.style.alignItems='center'; li.style.gap='8px';
      li.appendChild(el('span','ring'));
      var inp = document.createElement('input'); inp.type='text'; inp.value = val||''; inp.placeholder = '체크 항목';
      inp.style.flex='1'; inp.style.border='0'; inp.style.outline='0'; inp.style.background='transparent';
      inp.style.borderBottom='1px solid var(--line)'; inp.style.padding='6px 0';
      inp.addEventListener('input', function(){ if (this.value && li === cl.lastChild) addRow(); });
      li.appendChild(inp); cl.appendChild(li);
    }
    (t.checks||[]).forEach(function(c){ addRow(c.t); });
    addRow();
    b.appendChild(cl);

    sheetSub(b, '분류 · 날짜 · 알람');
    var rc = rowEl('<span>카테고리</span>');
    var sc = document.createElement('select');
    S.cats.forEach(function(c){ var o=document.createElement('option'); o.value=c.id; o.textContent=c.name; if (c.id===t.cat) o.selected=true; sc.appendChild(o); });
    rc.appendChild(sc); b.appendChild(rc);

    var rk = rowEl('<span>종류</span>');
    var sk = document.createElement('select');
    [['todo','할 일'],['buy','구매']].forEach(function(o){ var op=document.createElement('option'); op.value=o[0]; op.textContent=o[1]; if ((t.kind||'todo')===o[0]) op.selected=true; sk.appendChild(op); });
    rk.appendChild(sk); b.appendChild(rk);

    var rd = rowEl('<span>날짜</span>');
    var dd = document.createElement('input'); dd.type='date'; dd.value = t.date || '';
    rd.appendChild(dd); b.appendChild(rd);

    var rt = rowEl('<span>시간</span>');
    var tt = document.createElement('input'); tt.type='time'; tt.value = t.time || '';
    rt.appendChild(tt); b.appendChild(rt);

    var ra = rowEl('<span>알람</span>');
    var sw = el('button','pill' + (t.alarm ? ' on' : ''), t.alarm ? '켬' : '끔');
    var alarmOn = !!t.alarm;
    sw.addEventListener('click', function(){
      alarmOn = !alarmOn; sw.textContent = alarmOn ? '켬' : '끔'; sw.classList.toggle('on', alarmOn);
      if (alarmOn) askNotify();
    });
    ra.appendChild(sw); b.appendChild(ra);

    var br = el('div','btn-row');
    br.appendChild(bigBtn('삭제','danger', function(){ closeSheet(); removeItem(t); }));
    br.appendChild(bigBtn('저장', null, function(){
      t.title = ti.value.trim() || t.title;
      t.memo = mm.value.trim();
      var checks = [];
      Array.prototype.forEach.call(cl.querySelectorAll('input'), function(i, idx){
        if (i.value.trim()) checks.push({t:i.value.trim(), d: (t.checks && t.checks[idx]) ? !!t.checks[idx].d : false});
      });
      t.checks = checks;
      t.cat = sc.value; t.kind = sk.value;
      t.date = dd.value || null; t.someday = !t.date;
      t.time = tt.value || null; t.alarm = alarmOn && !!t.time;
      t.fired = false; t.snooze = null;
      save(); closeSheet(); renderAll(); scheduleAlarms();
    }));
    b.appendChild(br);
  });
}

function itemMenu(t) {
  openSheet(function(b){
    sheetTitle(b, t.title);
    var opts = [];
    opts.push(['💌  이 일정 공유하기', function(){ closeSheet(); shareItems([t]); }]);
    if (t.date && !t.done) opts.push(['📆  내일로 미루기', function(){ t.date = addDays(t.date,1); t.fired=false; save(); closeSheet(); renderAll(); scheduleAlarms(); toast('내일로 미뤘어요'); }]);
    if (t.date && !t.done) opts.push(['📌  오늘로 가져오기', function(){ t.date = today(); t.fired=false; save(); closeSheet(); renderAll(); scheduleAlarms(); toast('오늘로 옮겼어요'); }]);
    if (!t.someday) opts.push(['🌱  ‘언젠가’로 보내기', function(){ t.date=null; t.someday=true; t.alarm=false; save(); closeSheet(); renderAll(); toast('언젠가로 보냈어요'); }]);
    else opts.push(['📅  날짜 정하기', function(){ closeSheet(); pickDateFor(t); }]);
    opts.push(['✏️  수정하기', function(){ closeSheet(); editItem(t); }]);
    opts.push(['🗑  삭제하기', function(){ closeSheet(); removeItem(t); }]);

    opts.forEach(function(o){
      var r = el('button','row');
      r.style.width='100%'; r.style.textAlign='left';
      var l = el('div','lb', o[0]); r.appendChild(l);
      r.addEventListener('click', o[1]);
      b.appendChild(r);
    });
  });
}

function pickDateFor(t) {
  openSheet(function(b){
    sheetTitle(b, '언제 할까요?');
    var r = rowEl('<span>날짜</span>');
    var d = document.createElement('input'); d.type='date'; d.value = today();
    r.appendChild(d); b.appendChild(r);
    b.appendChild(bigBtn('이 날짜로 옮기기', null, function(){
      t.date = d.value; t.someday = false; save(); closeSheet(); renderAll();
      toast(fmtLong(t.date) + '로 옮겼어요');
    }));
  });
}

function removeItem(t) {
  if (t.sid) {
    openSheet(function(b){
      sheetTitle(b, '반복 일정 삭제');
      b.appendChild(bigBtn('이 날짜만 삭제', 'ghost', function(){
        S.todos = S.todos.filter(function(x){ return x.id !== t.id; });
        save(); closeSheet(); renderAll();
      }));
      var b2 = bigBtn('전체 반복 삭제', 'danger', function(){
        S.todos = S.todos.filter(function(x){ return x.sid !== t.sid; });
        save(); closeSheet(); renderAll();
      });
      b2.style.marginTop = '9px';
      b.appendChild(b2);
    });
    return;
  }
  if (!confirm('삭제할까요?')) return;
  S.todos = S.todos.filter(function(x){ return x.id !== t.id; });
  save(); renderAll();
}

/* ============================================================
   밀린 할 일
============================================================ */
$('overdueBanner').addEventListener('click', function(){
  openSheet(function(b){
    var list = overdue();
    sheetTitle(b, '완료하지 않은 할 일이 ' + list.length + '개 있어요');
    var ul = el('ul','list');
    list.forEach(function(t){ ul.appendChild(itemNode(t, {showDplus:true, showDate:true})); });
    b.appendChild(ul);
    var br = el('div','btn-row');
    br.appendChild(bigBtn('모두 오늘로','ghost', function(){
      list.forEach(function(t){ t.date = today(); t.fired = false; });
      save(); closeSheet(); renderAll(); toast('모두 오늘로 가져왔어요');
    }));
    br.appendChild(bigBtn('닫기', null, closeSheet));
    b.appendChild(br);
  });
});

/* ============================================================
   링크
============================================================ */
function addLinkFromText(text) {
  var m = text.match(/https?:\/\/[^\s]+/);
  var url = m ? m[0] : ('https://' + text.trim().split(/\s+/)[0]);
  var title = text.replace(url, '').replace(/^[\s\-–—:|]+/,'').trim();
  if (!title) { try { title = new URL(url).hostname.replace(/^www\./,''); } catch(e) { title = url; } }
  S.links.push({
    id: uid(), url: url, title: title,
    memo: draft.memoOn ? cpMemo.value.trim() : '',
    folder: draft.folder, createdAt: Date.now()
  });
  save(); resetComposer(); renderLinks(); toast('링크를 저장했어요');
}

function pickFolder() {
  openSheet(function(b){
    sheetTitle(b, '폴더 선택');
    var list = el('div','cat-list');
    S.folders.forEach(function(f){
      var r = el('button','cat-row');
      var d = el('span','dot'); d.style.background = f.color;
      r.appendChild(d); r.appendChild(el('span',null,f.name));
      r.addEventListener('click', function(){ draft.folder = f.id; closeSheet(); updateComposer(); });
      list.appendChild(r);
    });
    b.appendChild(list);
    var e = bigBtn('폴더 편집','ghost', function(){ closeSheet(); folderSheet(); });
    e.style.marginTop='12px'; b.appendChild(e);
  });
}

function folderSheet() {
  openSheet(function(b){
    sheetTitle(b, '폴더 편집');
    var list = el('div','cat-list');
    S.folders.forEach(function(f){
      var r = el('div','cat-row');
      var d = el('button','dot'); d.style.background = f.color;
      d.addEventListener('click', function(){ pickColor(f.color, function(c){ f.color=c; save(); folderSheet(); renderLinks(); }); });
      r.appendChild(d);
      var inp = document.createElement('input'); inp.type='text'; inp.value = f.name;
      inp.addEventListener('change', function(){ f.name = this.value.trim() || f.name; save(); renderLinks(); });
      r.appendChild(inp);
      var del = el('button','t-more','×');
      del.addEventListener('click', function(){
        if (S.folders.length <= 1) return toast('최소 1개는 필요해요');
        if (!confirm('“' + f.name + '” 폴더를 삭제할까요?')) return;
        S.links.forEach(function(l){ if (l.folder === f.id) l.folder = S.folders[0].id === f.id ? (S.folders[1]||S.folders[0]).id : S.folders[0].id; });
        S.folders = S.folders.filter(function(x){ return x.id !== f.id; });
        if (draft.folder === f.id) draft.folder = S.folders[0].id;
        save(); folderSheet(); renderLinks(); updateComposer();
      });
      r.appendChild(del);
      list.appendChild(r);
    });
    b.appendChild(list);
    var add = bigBtn('＋ 폴더 추가','ghost', function(){
      S.folders.push({id: uid(), name:'새 폴더', color: PALETTE[S.folders.length % PALETTE.length]});
      save(); folderSheet();
    });
    add.style.marginTop='12px'; b.appendChild(add);
    var ok = bigBtn('완료', null, closeSheet); ok.style.marginTop='9px'; b.appendChild(ok);
  });
}

function linkMenu(l) {
  openSheet(function(b){
    sheetTitle(b, l.title);
    var box = el('div','share-box', l.url); b.appendChild(box);

    sheetSub(b, '메모');
    var mm = document.createElement('textarea'); mm.rows=2; mm.value = l.memo||''; mm.placeholder='메모';
    b.appendChild(mm);

    sheetSub(b, '폴더');
    var r = rowEl('<span>보관 폴더</span>');
    var sel = document.createElement('select');
    S.folders.forEach(function(f){ var o=document.createElement('option'); o.value=f.id; o.textContent=f.name; if (f.id===l.folder) o.selected=true; sel.appendChild(o); });
    r.appendChild(sel); b.appendChild(r);

    var ti = rowEl('<span>제목</span>');
    var tin = document.createElement('input'); tin.type='text'; tin.value = l.title;
    ti.appendChild(tin); b.appendChild(ti);

    var br = el('div','btn-row');
    br.appendChild(bigBtn('삭제','danger', function(){
      if (!confirm('삭제할까요?')) return;
      S.links = S.links.filter(function(x){ return x.id !== l.id; });
      save(); closeSheet(); renderLinks();
    }));
    br.appendChild(bigBtn('저장', null, function(){
      l.memo = mm.value.trim(); l.folder = sel.value; l.title = tin.value.trim() || l.title;
      save(); closeSheet(); renderLinks();
    }));
    b.appendChild(br);

    var sh = bigBtn('💌  링크 공유하기','ghost', function(){
      closeSheet();
      if (navigator.share) navigator.share({title:l.title, url:l.url}).catch(function(){});
      else copy(l.url);
    });
    sh.style.marginTop='9px'; b.appendChild(sh);
  });
}

/* ============================================================
   공유 (링크로 주고받기)
============================================================ */
function b64enc(obj) {
  var bytes = new TextEncoder().encode(JSON.stringify(obj));
  var bin = '';
  for (var i=0;i<bytes.length;i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function b64dec(str) {
  var s = str.replace(/-/g,'+').replace(/_/g,'/');
  while (s.length % 4) s += '=';
  var bin = atob(s);
  var bytes = new Uint8Array(bin.length);
  for (var i=0;i<bin.length;i++) bytes[i] = bin.charCodeAt(i);
  return JSON.parse(new TextDecoder().decode(bytes));
}

function shareItems(items) {
  var payload = {
    v: 1,
    from: S.settings.name || '',
    items: items.map(function(t){
      return {
        title: t.title, memo: t.memo || '', checks: (t.checks||[]).map(function(c){ return {t:c.t, d:false}; }),
        date: t.date, time: t.time, alarm: !!t.alarm, kind: t.kind || 'todo',
        catName: cat(t.cat).name, catColor: cat(t.cat).color
      };
    })
  };
  var url = location.origin + location.pathname + '#s=' + b64enc(payload);

  openSheet(function(b){
    sheetTitle(b, '일정 공유하기');
    items.slice(0,4).forEach(function(t){
      var p = el('div','preview');
      p.style.borderLeftColor = cat(t.cat).color;
      p.appendChild(el('div','p-t', t.title));
      var sub = [];
      if (t.date) sub.push(fmtLong(t.date));
      if (t.time) sub.push(t.time + (t.alarm ? ' 알람' : ''));
      sub.push(cat(t.cat).name);
      p.appendChild(el('div','p-m', sub.join(' · ')));
      b.appendChild(p);
    });
    if (items.length > 4) b.appendChild(el('p','hint','외 ' + (items.length-4) + '개'));

    if (!S.settings.name) {
      var r = rowEl('<span>보내는 사람</span>');
      var nm = document.createElement('input'); nm.type='text'; nm.placeholder='이름 (예: 엄마)';
      nm.addEventListener('change', function(){
        S.settings.name = this.value.trim(); save();
        payload.from = S.settings.name;
        url = location.origin + location.pathname + '#s=' + b64enc(payload);
        box.textContent = url;
      });
      r.appendChild(nm); b.appendChild(r);
    }

    var box = el('div','share-box', url);
    b.appendChild(box);

    var br = el('div','btn-row');
    br.appendChild(bigBtn('링크 복사','ghost', function(){ copy(url); }));
    br.appendChild(bigBtn('공유하기', null, function(){
      if (navigator.share) navigator.share({ title:'꼭 — 일정 공유', text: items[0].title, url: url }).catch(function(){});
      else copy(url);
    }));
    b.appendChild(br);
    b.appendChild(el('p','hint','이 링크를 카톡·문자로 보내면, 받은 사람이 열어서 자기 “꼭”에 그대로 담을 수 있어요. 서버에 저장되지 않고 링크 안에만 담깁니다.'));
  });
}

function shareDay() {
  var items = todosOn(selDate);
  if (!items.length) return toast('공유할 일정이 없어요');
  openSheet(function(b){
    sheetTitle(b, fmtLong(selDate) + ' 공유');
    var picked = {};
    items.forEach(function(t){ picked[t.id] = true; });
    var ul = el('div','cat-list');
    items.forEach(function(t){
      var r = el('button','cat-row');
      var c = el('span','chk on'); c.appendChild(svg(IC.check));
      r.appendChild(c);
      r.appendChild(el('span', null, t.title));
      r.addEventListener('click', function(){
        picked[t.id] = !picked[t.id];
        c.classList.toggle('on', picked[t.id]);
      });
      ul.appendChild(r);
    });
    b.appendChild(ul);
    var go = bigBtn('선택한 일정 공유', null, function(){
      var sel = items.filter(function(t){ return picked[t.id]; });
      if (!sel.length) return toast('하나 이상 선택해주세요');
      closeSheet(); shareItems(sel);
    });
    go.style.marginTop = '12px';
    b.appendChild(go);
  });
}

function copy(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function(){ toast('링크를 복사했어요'); },
      function(){ fallbackCopy(text); });
  } else fallbackCopy(text);
}
function fallbackCopy(text) {
  var ta = document.createElement('textarea');
  ta.value = text; ta.style.position='fixed'; ta.style.opacity='0';
  document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); toast('링크를 복사했어요'); } catch(e) { toast('복사에 실패했어요'); }
  document.body.removeChild(ta);
}

function handleIncoming() {
  var h = location.hash || '';
  // 공유 링크 받기
  if (h.indexOf('#s=') === 0) {
    var data;
    try { data = b64dec(h.slice(3)); } catch (e) { return; }
    history.replaceState(null, '', location.pathname);
    if (!data || !data.items) return;
    openSheet(function(b){
      sheetTitle(b, (data.from ? data.from + '님이 ' : '') + '일정을 공유했어요');
      data.items.slice(0,6).forEach(function(it){
        var p = el('div','preview');
        p.style.borderLeftColor = it.catColor || '#C9CEDB';
        p.appendChild(el('div','p-t', it.title));
        var sub = [];
        if (it.date) sub.push(fmtLong(it.date));
        if (it.time) sub.push(it.time + (it.alarm ? ' 알람' : ''));
        if (it.catName) sub.push(it.catName);
        p.appendChild(el('div','p-m', sub.join(' · ')));
        if (it.memo) p.appendChild(el('div','p-m', it.memo));
        b.appendChild(p);
      });
      if (data.items.length > 6) b.appendChild(el('p','hint','외 ' + (data.items.length-6) + '개'));
      var br = el('div','btn-row');
      br.appendChild(bigBtn('안 받을래요','ghost', closeSheet));
      br.appendChild(bigBtn('내 캘린더에 담기', null, function(){
        data.items.forEach(function(it){
          var c = catByName(it.catName, it.catColor);
          S.todos.push({
            id: uid(), title: it.title, memo: it.memo || '',
            checks: it.checks || [], date: it.date || null, time: it.time || null,
            alarm: !!it.alarm, cat: c.id, kind: it.kind || 'todo',
            done: false, doneAt: null, someday: !it.date, sid: null,
            createdAt: Date.now(), fired: false, from: data.from || '공유'
          });
        });
        save(); closeSheet(); renderAll(); scheduleAlarms();
        toast(data.items.length + '개를 담았어요');
      }));
      b.appendChild(br);
    });
    return;
  }
  // 홈 화면 바로가기 (#buy, #links, #someday)
  if (h === '#buy' || h === '#links' || h === '#someday' || h === '#calendar') {
    switchView(h.slice(1));
    history.replaceState(null, '', location.pathname);
    return;
  }

  // 안드로이드 공유 시트로 들어온 링크
  var q = new URLSearchParams(location.search);
  if (q.get('url') || q.get('text')) {
    var raw = (q.get('url') || q.get('text') || '').trim();
    var ttl = (q.get('title') || '').trim();
    history.replaceState(null, '', location.pathname);
    var m = raw.match(/https?:\/\/[^\s]+/);
    if (m) {
      S.links.push({ id: uid(), url: m[0], title: ttl || m[0], memo:'', folder: S.folders[0].id, createdAt: Date.now() });
      save(); switchView('links'); renderLinks(); toast('링크를 보관했어요');
    }
  }
}
function catByName(name, color) {
  if (!name) return cat(draft.cat);
  for (var i=0;i<S.cats.length;i++) if (S.cats[i].name === name) return S.cats[i];
  var nc = {id: uid(), name: name, color: color || PALETTE[S.cats.length % PALETTE.length]};
  S.cats.push(nc); return nc;
}

/* ============================================================
   알람
============================================================ */
var audioCtx = null;
function chime(times) {
  if (!S.settings.sound) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    var notes = times === 1 ? [880] : [784, 988, 1319, 988];
    notes.forEach(function(f, i){
      var o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      var t0 = audioCtx.currentTime + i * 0.18;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.22, t0 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.45);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(t0); o.stop(t0 + 0.5);
    });
  } catch (e) {}
}

function askNotify() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') Notification.requestPermission();
}

function notify(t) {
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      var body = (t.time ? t.time + '  ' : '') + (t.memo || '꼭 해야 할 일이에요!');
      if (navigator.serviceWorker && navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready.then(function(reg){
          reg.showNotification('꼭 — ' + t.title, { body: body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: t.id, vibrate:[180,90,180] });
        }).catch(function(){ new Notification('꼭 — ' + t.title, {body: body}); });
      } else new Notification('꼭 — ' + t.title, {body: body});
    }
  } catch (e) {}
}

var alarmQueue = [];
function checkAlarms() {
  var now = new Date();
  var nowStr = ymd(now);
  var hm = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
  var fired = false;
  S.todos.forEach(function(t){
    if (!t.alarm || !t.time || !t.date || t.done) return;
    if (t.snooze) {
      if (Date.now() >= t.snooze) { t.snooze = null; t.fired = true; alarmQueue.push(t); fired = true; }
      return;
    }
    if (t.fired) return;
    if (t.date < nowStr) { t.fired = true; return; }        // 지난 날짜는 조용히 넘김
    if (t.date === nowStr && t.time <= hm) {
      var due = toDate(t.date); var p = t.time.split(':');
      due.setHours(+p[0], +p[1], 0, 0);
      if (Date.now() - due.getTime() < 30*60*1000) { t.fired = true; alarmQueue.push(t); fired = true; }
      else t.fired = true;
    }
  });
  if (fired) { save(); popAlarm(); }
}

function popAlarm() {
  if (!alarmQueue.length || !$('alarmPop').hidden) return;
  var t = alarmQueue[0];
  $('alarmTime').textContent = t.time || '';
  $('alarmTitle').textContent = t.title;
  $('alarmMemo').textContent = t.memo || '';
  $('alarmPop').hidden = false;
  chime(2);
  notify(t);
  if (navigator.vibrate) try { navigator.vibrate([200,100,200]); } catch(e){}
}
$('alarmDone').addEventListener('click', function(){
  alarmQueue.shift();
  $('alarmPop').hidden = true;
  setTimeout(popAlarm, 300);
});
$('alarmLater').addEventListener('click', function(){
  var t = alarmQueue.shift();
  if (t) { t.snooze = Date.now() + 10*60*1000; save(); }
  $('alarmPop').hidden = true;
  toast('10분 뒤에 다시 알려드릴게요');
  setTimeout(popAlarm, 300);
});

function scheduleAlarms() { checkAlarms(); }
setInterval(checkAlarms, 15000);
document.addEventListener('visibilitychange', function(){ if (!document.hidden) { checkAlarms(); renderCalendar(); } });

/* 자정이 지나면 오늘 표시 갱신 */
var lastDay = today();
setInterval(function(){
  if (today() !== lastDay) { lastDay = today(); renderAll(); }
}, 60000);

/* ============================================================
   설정
============================================================ */
var deferredPrompt = null;
window.addEventListener('beforeinstallprompt', function(e){ e.preventDefault(); deferredPrompt = e; });

$('btnSettings').addEventListener('click', function(){
  openSheet(function(b){
    sheetTitle(b, '설정');

    var rn = rowEl('<span>내 이름 (공유할 때 표시)</span>');
    var nm = document.createElement('input'); nm.type='text'; nm.value = S.settings.name || ''; nm.placeholder='예: 예진';
    nm.addEventListener('change', function(){ S.settings.name = this.value.trim(); save(); });
    rn.appendChild(nm); b.appendChild(rn);

    var rw = rowEl('<span>주 시작 요일</span>');
    var sw = document.createElement('select');
    [['0','일요일'],['1','월요일']].forEach(function(o){
      var op=document.createElement('option'); op.value=o[0]; op.textContent=o[1];
      if (String(S.settings.weekStart)===o[0]) op.selected=true; sw.appendChild(op);
    });
    sw.addEventListener('change', function(){ S.settings.weekStart = +this.value; save(); renderWeekdays(); renderCalendar(); });
    rw.appendChild(sw); b.appendChild(rw);

    var rf = rowEl('<span>글씨 크기</span>');
    var sf = document.createElement('select');
    [['15','작게'],['16','보통'],['18','크게'],['20','아주 크게']].forEach(function(o){
      var op=document.createElement('option'); op.value=o[0]; op.textContent=o[1];
      if (String(S.settings.fs)===o[0]) op.selected=true; sf.appendChild(op);
    });
    sf.addEventListener('change', function(){ S.settings.fs = +this.value; save(); applyFs(); });
    rf.appendChild(sf); b.appendChild(rf);

    sheetSub(b, '알람');
    var rs = rowEl('<span>알람 소리</span>');
    var sb = el('button','pill' + (S.settings.sound ? ' on' : ''), S.settings.sound ? '켬' : '끔');
    sb.addEventListener('click', function(){
      S.settings.sound = !S.settings.sound; save();
      sb.textContent = S.settings.sound ? '켬' : '끔';
      sb.classList.toggle('on', S.settings.sound);
      if (S.settings.sound) chime(2);
    });
    rs.appendChild(sb); b.appendChild(rs);

    var perm = ('Notification' in window) ? Notification.permission : 'unsupported';
    var rp = rowEl('<span>휴대폰 알림</span>');
    var pb = el('button','pill' + (perm==='granted' ? ' on' : ''), perm==='granted' ? '허용됨' : (perm==='denied' ? '차단됨' : '허용하기'));
    pb.addEventListener('click', function(){
      if (!('Notification' in window)) return toast('이 브라우저는 알림을 지원하지 않아요');
      if (Notification.permission === 'denied') return toast('브라우저 설정에서 알림을 허용해주세요');
      Notification.requestPermission().then(function(p){
        pb.textContent = p==='granted' ? '허용됨' : '허용하기';
        pb.classList.toggle('on', p==='granted');
        if (p==='granted') toast('이제 알림을 보내드릴게요');
      });
    });
    rp.appendChild(pb); b.appendChild(rp);

    sheetSub(b, '분류');
    b.appendChild(rowBtn('🎨  카테고리 편집', function(){ closeSheet(); catSheet(); }));
    b.appendChild(rowBtn('🔖  링크 폴더 편집', function(){ closeSheet(); folderSheet(); }));

    sheetSub(b, '데이터');
    b.appendChild(rowBtn('⬇️  백업 파일 저장', backup));
    b.appendChild(rowBtn('⬆️  백업 파일 불러오기', restore));
    b.appendChild(rowBtn('📤  오늘 일정 공유하기', function(){ closeSheet(); shareDay(); }));

    sheetSub(b, '홈 화면 위젯');
    b.appendChild(rowBtn('📅  휴대폰 캘린더로 보내기', function(){ closeSheet(); calendarSheet(); }));
    b.appendChild(el('p','hint','휴대폰 기본 캘린더로 일정을 넘기면, 홈 화면의 캘린더 위젯에 “꼭”에 적은 일정이 그대로 나타나요. 알람도 휴대폰이 직접 울려줘 더 정확합니다.'));

    if (deferredPrompt) {
      sheetSub(b, '설치');
      b.appendChild(rowBtn('📱  홈 화면에 설치하기', function(){
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function(){ deferredPrompt = null; closeSheet(); });
      }));
    } else {
      sheetSub(b, '설치');
      b.appendChild(el('p','hint','아이폰: 사파리에서 공유 버튼 → “홈 화면에 추가”\n안드로이드: 크롬 메뉴(⋮) → “앱 설치” 또는 “홈 화면에 추가”'));
      b.lastChild.style.whiteSpace = 'pre-line';
    }

    var reset = bigBtn('전체 초기화','danger', function(){
      if (!confirm('모든 기록이 지워집니다. 정말 초기화할까요?')) return;
      localStorage.removeItem(KEY); location.reload();
    });
    reset.style.marginTop = '18px';
    b.appendChild(reset);
    b.appendChild(el('p','hint','“꼭” v1.0 · 기록은 이 기기에만 저장돼요. 기기를 바꿀 땐 백업 파일을 이용해주세요.'));
  });
});

function rowBtn(label, fn) {
  var r = el('button','row'); r.style.width='100%'; r.style.textAlign='left';
  r.appendChild(el('div','lb', label));
  r.addEventListener('click', fn);
  return r;
}

/* ============================================================
   휴대폰 캘린더로 내보내기 (.ics)
   → 기본 캘린더 앱에 담기면 홈 화면 캘린더 위젯에 그대로 보인다.
============================================================ */
function icsEsc(s) {
  return String(s == null ? '' : s)
    .replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}
function icsFold(line) {
  var out = [];
  while (line.length > 72) { out.push(line.slice(0, 72)); line = ' ' + line.slice(72); }
  out.push(line);
  return out.join('\r\n');
}
function pad2(n) { return String(n).padStart(2, '0'); }
function icsStamp() {
  var d = new Date();
  return d.getUTCFullYear() + pad2(d.getUTCMonth()+1) + pad2(d.getUTCDate()) + 'T' +
         pad2(d.getUTCHours()) + pad2(d.getUTCMinutes()) + pad2(d.getUTCSeconds()) + 'Z';
}

function buildIcs(opts) {
  opts = opts || {};
  var from = addDays(today(), -7);
  var to = addDays(today(), 180);
  var stamp = icsStamp();

  var items = S.todos.filter(function(t){
    if (!t.date || t.someday) return false;
    if (t.date < from || t.date > to) return false;
    if (!opts.includeDone && t.done) return false;
    return true;
  }).slice(0, 600);

  var L = [];
  L.push('BEGIN:VCALENDAR');
  L.push('VERSION:2.0');
  L.push('PRODID:-//kkok//KKOK Planner//KO');
  L.push('CALSCALE:GREGORIAN');
  L.push('METHOD:PUBLISH');
  L.push('X-WR-CALNAME:꼭');
  L.push('X-WR-TIMEZONE:Asia/Seoul');

  items.forEach(function(t){
    var c = cat(t.cat);
    var mark = (t.kind === 'buy') ? '🛒 ' : '';
    var title = mark + t.title + (t.done ? ' ✓' : '');

    var desc = [];
    if (t.memo) desc.push(t.memo);
    if (t.checks && t.checks.length) {
      desc.push((t.memo ? '\n' : '') + t.checks.map(function(x){
        return (x.d ? '☑ ' : '☐ ') + x.t;
      }).join('\n'));
    }
    desc.push((desc.length ? '\n' : '') + '— 꼭');

    L.push('BEGIN:VEVENT');
    L.push('UID:kkok-' + t.id + '@kkok.app');
    L.push('DTSTAMP:' + stamp);
    if (t.time) {
      var start = t.date.replace(/-/g,'') + 'T' + t.time.replace(':','') + '00';
      var endD = toDate(t.date);
      var hm = t.time.split(':');
      endD.setHours(+hm[0], +hm[1] + 30, 0, 0);
      var end = ymd(endD).replace(/-/g,'') + 'T' + pad2(endD.getHours()) + pad2(endD.getMinutes()) + '00';
      L.push('DTSTART:' + start);
      L.push('DTEND:' + end);
    } else {
      L.push('DTSTART;VALUE=DATE:' + t.date.replace(/-/g,''));
      L.push('DTEND;VALUE=DATE:' + addDays(t.date, 1).replace(/-/g,''));
    }
    L.push(icsFold('SUMMARY:' + icsEsc(title)));
    L.push(icsFold('DESCRIPTION:' + icsEsc(desc.join('\n'))));
    L.push(icsFold('CATEGORIES:' + icsEsc(c.name)));
    L.push('SEQUENCE:' + Math.floor(Date.now() / 60000 % 100000));
    L.push('STATUS:CONFIRMED');
    if (t.alarm && t.time && !t.done) {
      L.push('BEGIN:VALARM');
      L.push('ACTION:DISPLAY');
      L.push(icsFold('DESCRIPTION:' + icsEsc(t.title)));
      L.push('TRIGGER:-PT0M');
      L.push('END:VALARM');
    }
    L.push('END:VEVENT');
  });

  L.push('END:VCALENDAR');
  return { text: L.join('\r\n') + '\r\n', count: items.length };
}

function calendarSheet() {
  openSheet(function(b){
    sheetTitle(b, '휴대폰 캘린더로 보내기');

    var includeDone = false;
    var built = buildIcs({ includeDone: includeDone });

    var info = el('div','preview');
    info.style.borderLeftColor = '#A9CFF0';
    info.appendChild(el('div','p-t', '일정 ' + built.count + '개를 보낼 준비가 됐어요'));
    info.appendChild(el('div','p-m', '오늘 기준 지난 7일 ~ 앞으로 180일치 · 알람도 함께 넘어가요'));
    b.appendChild(info);

    var r = rowEl('<span>완료한 일정도 포함</span>');
    var sw = el('button','pill', '끔');
    sw.addEventListener('click', function(){
      includeDone = !includeDone;
      sw.textContent = includeDone ? '켬' : '끔';
      sw.classList.toggle('on', includeDone);
      built = buildIcs({ includeDone: includeDone });
      info.firstChild.textContent = '일정 ' + built.count + '개를 보낼 준비가 됐어요';
    });
    r.appendChild(sw); b.appendChild(r);

    var go = bigBtn('캘린더로 보내기', null, function(){
      var data = buildIcs({ includeDone: includeDone });
      if (!data.count) return toast('보낼 일정이 없어요');
      sendIcs(data.text);
    });
    go.style.marginTop = '14px';
    b.appendChild(go);

    b.appendChild(el('p','hint',
      '· 아이폰: 공유 창이 뜨면 “캘린더”를 골라 “모두 추가”를 누르세요.\n' +
      '· 갤럭시: 저장된 파일을 열어 캘린더 앱으로 가져오면 돼요.\n' +
      '· 일정을 새로 적은 뒤 다시 보내면 최신 내용으로 갱신돼요.\n' +
      '· 날짜 없는 “언젠가” 항목은 캘린더로 보내지 않아요.'
    ));
    b.lastChild.style.whiteSpace = 'pre-line';
  });
}

function sendIcs(text) {
  var name = 'kkok-' + today() + '.ics';
  var file = null;
  try { file = new File([text], name, { type: 'text/calendar' }); } catch (e) {}

  if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator.share({ files: [file], title: '꼭 일정' }).then(function(){
      toast('캘린더 앱에서 추가해주세요');
    }).catch(function(){});
    return;
  }
  var blob = new Blob([text], { type: 'text/calendar;charset=utf-8' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(function(){ URL.revokeObjectURL(url); }, 2000);
  toast('내려받은 파일을 열어 캘린더에 추가하세요');
}

function backup() {
  var blob = new Blob([JSON.stringify(S, null, 2)], {type:'application/json'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'kkok-backup-' + today() + '.json';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(function(){ URL.revokeObjectURL(a.href); }, 1000);
  toast('백업 파일을 저장했어요');
}
function restore() {
  var i = document.createElement('input');
  i.type = 'file'; i.accept = '.json,application/json';
  i.addEventListener('change', function(){
    var f = this.files[0]; if (!f) return;
    var fr = new FileReader();
    fr.onload = function(){
      try {
        var d = JSON.parse(fr.result);
        if (!d.todos) throw 0;
        if (!confirm('현재 기록을 백업 내용으로 바꿀까요?')) return;
        S = d; save(); location.reload();
      } catch(e) { toast('올바른 백업 파일이 아니에요'); }
    };
    fr.readAsText(f);
  });
  i.click();
}
function applyFs() { document.documentElement.style.setProperty('--fs', S.settings.fs + 'px'); }

/* ============================================================
   시작
============================================================ */
applyFs();
renderWeekdays();
switchView('calendar');
renderAll();
handleIncoming();
checkAlarms();
window.addEventListener('hashchange', handleIncoming);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function(){
    navigator.serviceWorker.register('sw.js').catch(function(){});
  });
}

/* 첫 실행 안내 */
if (!localStorage.getItem(KEY)) {
  save();
  setTimeout(function(){
    openSheet(function(b){
      sheetTitle(b, '“꼭”에 오신 걸 환영해요 🌸');
      b.appendChild(el('p','hint',
        '· 아래 입력창에 할 일을 적고 ▶ 버튼을 누르면 그날 일정에 담겨요.\n' +
        '· 🔔 을 누르면 시간과 알람을, 📋 은 메모, ☑️ 는 체크 항목을 더할 수 있어요.\n' +
        '· 날짜 칩을 누르면 기간 · 반복 · 여러 날짜를 한 번에 정할 수 있어요.\n' +
        '· 하단 탭에서 언젠가 · 구매 목록 · 링크 보관함으로 이동해요.\n' +
        '· 일정의 ⋮ → “이 일정 공유하기”로 가족·친구에게 링크로 보낼 수 있어요.'
      ));
      b.lastChild.style.whiteSpace = 'pre-line';
      b.lastChild.style.fontSize = '14px';
      b.lastChild.style.color = 'var(--ink-2)';
      var ok = bigBtn('시작하기', null, closeSheet);
      ok.style.marginTop = '16px';
      b.appendChild(ok);
    });
  }, 400);
}

})();
