/* ================= UI 层：渲染 / 交互 / 弹窗 ================= */

const ui = {}; // 引擎 ↔ UI 交互接口（引擎在运行期调用）

/* ---------- 资产注入 ---------- */
(function injectAssets() {
  const st = document.createElement('style');
  let css = ':root{';
  for (const k in ASSETS) css += `--img-${k}:url("${ASSETS[k]}");`;
  css += '}';
  for (const k in SLICES) {
    const s = SLICES[k];
    if (!s || !(s.l || s.t || s.r || s.b)) continue;
    const cl = Math.min(s.l, s.w * .45), cr = Math.min(s.r, s.w * .45);
    const ct = Math.min(s.t, s.h * .45), cb = Math.min(s.b, s.h * .45);
    css += `.bi-${k}{border-image:var(--img-${k}) ${cl} ${ct} ${cr} ${cb} fill / ${cl}px ${ct}px ${cr}px ${cb}px stretch;` +
      `border-style:solid;border-width:${ct}px ${cr}px ${cb}px ${cl}px;background-origin:border-box;}`;
  }
  st.textContent = css;
  document.head.appendChild(st);
})();

/* ---------- 工具 ---------- */
function el(html) { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/</g, '&lt;');
function imStyle(key) { return `--im:var(--img-${key})`; }

/* ---------- 卡牌 ---------- */
function artHTML(c) {
  const def = c;
  if (def.tint) {
    return `<div class="c-art" style="background:radial-gradient(circle at 50% 42%, ${def.tint}44 0%, ${def.tint}18 45%, transparent 72%)">` +
      `<i class="tint" style="${imStyle(def.art)};--tint:${def.tint};position:absolute;left:18%;top:12%;width:64%;height:76%"></i></div>`;
  }
  return `<div class="c-art" style="${imStyle(def.art)}"></div>`;
}
function cornerLabel(c) { return `${c.suit || ''}${c.point || ''}`; }
function cardEl(c, opts = {}) {
  const d = el(`<div class="card ${opts.cls || ''}" data-uid="${c.uid}">
    ${artHTML(c)}
    <div class="c-band">${c.elem && c.elem !== 'none' ? `<i class="elmini" style="${imStyle(ELEMS[c.elem].icon)}"></i>` : ''}<span>${c.name}</span></div>
    <div class="c-corner">${cornerLabel(c)}</div>
    <div class="c-type">${c.type === 'basic' ? '基本' : c.type === 'trick' ? '锦囊' : c.sub === 'weapon' ? '武器' : c.sub === 'artifact' ? '圣遗物' : '坐骑'}</div>
  </div>`);
  d.dataset.tooltip = `【${c.name}】${c.desc || ''}`;
  if (opts.onClick) d.addEventListener('click', e => { e.stopPropagation(); opts.onClick(c, d); });
  return d;
}

/* ---------- 屏幕管理 ---------- */
const SCREENS = ['menu', 'pick', 'game', 'result', 'codex'];
function showScreen(name) {
  for (const s of SCREENS) {
    const e = $('#screen-' + s);
    if (e) e.classList.toggle('hidden', s !== name);
  }
}

/* ---------- 主菜单 ---------- */
const MENU_CAST = [
  { key: 'VENTI', glow: 'rgba(116,194,168,.22)' },
  { key: 'NAHIDA', glow: 'rgba(165,200,59,.20)' },
  { key: 'MAVUIKA', glow: 'rgba(239,121,56,.22)' },
  { key: 'KAMISATO_AYAKA', glow: 'rgba(159,214,227,.22)' },
  { key: 'FURINA', glow: 'rgba(76,194,241,.22)' },
];
let menuTimer = null;
function showMenu() {
  if (menuTimer) { clearInterval(menuTimer); menuTimer = null; }
  const SPARKS = [
    { l: '8%', t: '18%', s: 16, d: 0, dur: 3.8, c: '#e8d49a' },
    { l: '16%', t: '64%', s: 11, d: 1.2, dur: 4.4, c: '#9fe8cd' },
    { l: '24%', t: '34%', s: 13, d: .6, dur: 3.2, c: '#e8d49a' },
    { l: '38%', t: '12%', s: 10, d: 1.8, dur: 4.0, c: '#d4d0e8' },
    { l: '55%', t: '22%', s: 14, d: .3, dur: 3.6, c: '#e8d49a' },
    { l: '66%', t: '10%', s: 10, d: 2.1, dur: 4.6, c: '#9fe8cd' },
    { l: '78%', t: '30%', s: 12, d: .9, dur: 3.4, c: '#e8d49a' },
    { l: '88%', t: '16%', s: 15, d: 1.5, dur: 4.2, c: '#d4d0e8' },
    { l: '46%', t: '78%', s: 11, d: 2.4, dur: 3.9, c: '#9fe8cd' },
    { l: '12%', t: '86%', s: 13, d: 1.1, dur: 4.3, c: '#e8d49a' },
    { l: '92%', t: '58%', s: 10, d: .2, dur: 3.5, c: '#e8d49a' },
    { l: '5%', t: '44%', s: 9, d: 2.8, dur: 4.5, c: '#d4d0e8' },
  ];
  const sparkHTML = SPARKS.map(s =>
    `<i class="spark" style="left:${s.l};top:${s.t};width:${s.s}px;height:${s.s}px;animation-delay:${s.d}s;animation-duration:${s.dur}s;--sc:${s.c}"></i>`).join('');
  const elemRow = Object.keys(ELEMS).filter(e => e !== 'none').map((e, i) =>
    `<span class="me" style="--im:var(--img-${ELEMS[e].icon});--ec:${ELEMS[e].color};animation-delay:${(i * .28).toFixed(2)}s" title="${ELEMS[e].name}元素"></span>`).join('');
  const c0 = MENU_CAST[0], h0 = HEROES.find(h => h.key === c0.key);
  $('#app').innerHTML = `
  <div id="screen-menu" class="screen">
    <div class="menu-glow"></div>
    <div class="menu-corner tl" style="--im:var(--img-u_flourish)"></div>
    <div class="menu-corner br" style="--im:var(--img-u_flourish)"></div>
    ${sparkHTML}
    <div id="menu-title-wrap">
      <div class="menu-ornament"></div>
      <div id="menu-title">七国杀</div>
      <div id="menu-sub">提瓦特身份局</div>
      <div id="menu-sub-en">SEVEN NATIONS CLASH</div>
      <div id="menu-elems">${elemRow}</div>
      <div id="menu-version">元素反应 · 身份暗战 · 5人局（你 + 4 AI） · v1.0</div>
    </div>
    <div id="menu-buttons">
      <button class="gbtn primary" id="btn-start">开始对局</button>
      <button class="gbtn" id="btn-codex">武将图鉴</button>
      <button class="gbtn" id="btn-rules">玩法说明</button>
    </div>
    <div class="menu-char-wrap">
      <div class="menu-char-glow" id="menu-glow" style="--mc:${c0.glow}"></div>
      <img class="menu-char" id="menu-char" src="assets/render/${c0.key}.png" alt="">
      <div class="menu-caption" id="menu-cap"><div class="cn">${h0.name}</div><div class="ct">${h0.title} · ${NATIONS[h0.nation].name}</div></div>
    </div>
  </div>`;
  // 立绘轮换
  let castIdx = 0;
  menuTimer = setInterval(() => {
    const img = $('#menu-char');
    if (!img) { clearInterval(menuTimer); menuTimer = null; return; }
    castIdx++;
    const c = MENU_CAST[castIdx % MENU_CAST.length];
    const h = HEROES.find(x => x.key === c.key);
    img.classList.add('swap');
    setTimeout(() => {
      if (!$('#menu-char')) return;
      img.src = `assets/render/${c.key}.png`;
      img.onload = () => img.classList.remove('swap');
      $('#menu-glow').style.setProperty('--mc', c.glow);
      $('#menu-cap').innerHTML = `<div class="cn">${h.name}</div><div class="ct">${h.title} · ${NATIONS[h.nation].name}</div>`;
      setTimeout(() => { if (img.classList.contains('swap')) img.classList.remove('swap'); }, 900);
    }, 550);
  }, 7000);
  $('#btn-start').onclick = () => { if (menuTimer) { clearInterval(menuTimer); menuTimer = null; } showPick(); };
  $('#btn-codex').onclick = () => showCodex('hero');
  $('#btn-rules') && ($('#btn-rules').onclick = () => showRulesModal());
}

function showRulesModal() {
  modal('玩法说明', `
  <div class="m-body">
    <p><b>目标</b>：5人身份局（主公/忠臣/反贼×2/内奸）。主公与忠臣消灭所有反贼和内奸获胜；反贼杀死主公获胜；内奸成为唯一幸存者获胜。</p>
    <p><b>回合流程</b>：准备 → 判定 → 摸牌(2) → 出牌 → 弃牌 → 结束。</p>
    <p><b>元素反应</b>：元素攻击命中后留下附着；已有附着的角色再次受到对应元素伤害时触发反应——<br>
    蒸发/融化/激化 = 伤害+1 ｜ 超载 = 弃1手牌 ｜ 超导 = 碎1装备 ｜ 感电 = 邻座染雷 ｜ 冻结 = 不能闪避 ｜ 绽放 = 草原核延时爆发 ｜ 结晶 = 攻击者得护盾 ｜ 扩散 = 传播附着。</p>
    <p><b>护盾</b>：结晶反应与部分技能提供，上限3点，受击优先抵扣。</p>
    <p><b>距离</b>：座位的环向距离；风之翼使你更近、传送锚点使你更难被够到；武器增加攻击范围。</p>
    <p><b>胜负奖惩</b>：消灭反贼摸3张牌；主公误杀忠臣弃光所有牌。</p>
  </div>`, [{ text: '明白了', cls: 'primary' }]);
}

/* ---------- 选将 ---------- */
let pickSel = null;
function showPick() {
  pickSel = null;
  $('#app').innerHTML = `
  <div id="screen-pick" class="screen">
    <div class="pick-head"><h2>选择武将</h2><span class="hint">你的身份将在开局随机分配 · 点击武将查看技能</span></div>
    <div class="pick-filters" id="pick-filters"></div>
    <div id="pick-grid"></div>
    <div class="pick-foot">
      <div id="pick-detail">选择一名武将开始对局。</div>
      <button class="gbtn" id="btn-pick-back">返回</button>
      <button class="gbtn primary" id="btn-pick-ok" disabled>开始对局</button>
    </div>
  </div>`;
  showScreen('pick');
  const filters = $('#pick-filters');
  const mkChip = (label, on, fn) => {
    const c = el(`<span class="fchip ${on ? 'on' : ''}">${label}</span>`);
    c.onclick = fn; return c;
  };
  let fNation = 'all', fElem = 'all';
  const renderFilters = () => {
    filters.innerHTML = '';
    filters.appendChild(mkChip('全部国家', fNation === 'all', () => { fNation = 'all'; renderFilters(); renderGrid(); }));
    for (const n in NATIONS) filters.appendChild(mkChip(NATIONS[n].name, fNation === n, () => { fNation = n; renderFilters(); renderGrid(); }));
    filters.appendChild(el('<span style="width:14px"></span>'));
    filters.appendChild(mkChip('全部元素', fElem === 'all', () => { fElem = 'all'; renderFilters(); renderGrid(); }));
    for (const e in ELEMS) { if (e === 'none') continue; filters.appendChild(mkChip(ELEMS[e].name, fElem === e, () => { fElem = e; renderFilters(); renderGrid(); })); }
  };
  const renderGrid = () => {
    const grid = $('#pick-grid');
    grid.innerHTML = '';
    for (const h of HEROES) {
      if (fNation !== 'all' && h.nation !== fNation) continue;
      if (fElem !== 'all' && h.elem !== fElem) continue;
      const cell = el(`<div class="hcell" data-k="${h.key}">
        <div class="art" style="--im:url(assets/render/${h.key}.png)"></div>
        <div class="shade"></div>
        <div class="hp">${'<i></i>'.repeat(h.hp)}</div>
        <img class="el" src="${ASSETS[ELEMS[h.elem].icon] || ''}" title="${ELEMS[h.elem].name}">
        <div class="nm">${h.name}</div>
        <div class="ti">${h.title}</div>
        <div class="nat">${NATIONS[h.nation].name}</div>
      </div>`);
      cell.onclick = () => {
        pickSel = h;
        document.querySelectorAll('.hcell').forEach(x => x.classList.remove('selected'));
        cell.classList.add('selected');
        $('#pick-detail').innerHTML = `<b>${h.name} · ${h.title}</b> ${NATIONS[h.nation].name} · ${ELEMS[h.elem].name}元素 · 体力${h.hp} —— ` +
          h.skills.map(s => `【${s.name}】(${({ A: '主动', L: '锁定', O: '限定', T: '触发' })[s.type]}) ${s.desc}`).join('<br>');
        $('#btn-pick-ok').disabled = false;
      };
      grid.appendChild(cell);
    }
  };
  renderFilters(); renderGrid();
  $('#btn-pick-back').onclick = showMenu;
  $('#btn-pick-ok').onclick = () => { if (pickSel) startGame(pickSel.key); };
}

/* ---------- 对局渲染 ---------- */
function renderGame() {
  $('#app').innerHTML = `
  <div id="screen-game" class="screen">
    <div id="topbar">
      <span class="logo">七国杀</span>
      <span class="turninfo" id="tb-turn"></span>
      <span class="info" id="tb-deck"></span>
      <span class="spacer"></span>
      <button class="gbtn small" id="tb-codex">图鉴</button>
      <button class="gbtn small" id="tb-menu">主菜单</button>
    </div>
    <div id="game-body">
      <div id="col-main">
        <div id="seats-top"></div>
        <div id="stage-zone"></div>
        <div id="bottombar">
          <div id="me-zone"></div>
          <div id="skill-zone"></div>
          <div id="hand-zone"></div>
        </div>
      </div>
      <div id="log"><h4>战 报</h4><div id="log-list"></div></div>
    </div>
  </div>`;
  $('#tb-menu').onclick = () => modal('返回主菜单？', '<div class="m-body">当前对局将丢失。</div>',
    [{ text: '继续游戏', cls: 'primary' }, { text: '返回主菜单', fn: showMenu }]);
  $('#tb-codex').onclick = () => showCodex('hero', true);
  showScreen('game');
}

const nationTag = p => NATIONS[p.hero.nation].name;
function roleRib(p) {
  const me = G.players[0];
  if (p.role === 'lord') return '<span class="rolerib lord">主公</span>';
  if (!p.alive || p.isHuman || G.over) return `<span class="rolerib ${ROLES[p.role].cls}">${ROLES[p.role].name}</span>`;
  if (p.role === 'loyalist' && !me.alive) return '<span class="rolerib r-loyalist">忠臣</span>';
  return '';
}
function statusTags(p) {
  const t = [];
  if (p.attach) t.push(`<span class="stag elem" style="${imStyle(ELEMS[p.attach].icon)};--ec:${ELEMS[p.attach].color}" title="${ELEMS[p.attach].name}附着"></span>`);
  if (p.flags.frozen) t.push('<span class="stag" style="color:#bfe8f5;border-color:#7fb8cc">冻结</span>');
  if (p.flags.linked) t.push('<span class="stag" style="color:#9fc3f0;border-color:#5b7fae">连锁</span>');
  if (p.flags.drunk) t.push('<span class="stag" style="color:#f0c96a;border-color:#a88a3c">果酒</span>');
  if (p.flags.hutaoBuff) t.push('<span class="stag" style="color:#ff9a7d;border-color:#c46a4a">蝶引来生</span>');
  if (p.flags.infRange) t.push('<span class="stag" style="color:#c9a2e8;border-color:#8a5fae">雷楔</span>');
  if (p.marks.plum) t.push('<span class="stag" style="color:#ff8f9d;border-color:#b05060">血梅香</span>');
  if (p.marks.core) t.push(`<span class="stag" style="color:#b3e07a;border-color:#6a9a3c">草原核×${p.marks.core}</span>`);
  if (p.marks.seed) t.push('<span class="stag" style="color:#c9e88a;border-color:#7a9a4c">蕴种印</span>');
  if (p.marks.starfield) t.push('<span class="stag" style="color:#ffe9a8;border-color:#c9a94c">星辉域</span>');
  const toks = [];
  if (p.tokens.yuanli) toks.push(`愿力${p.tokens.yuanli}`);
  if (p.tokens.heart) toks.push(`冷酷之心${p.tokens.heart}`);
  if (p.tokens.drip) toks.push(`源水之滴${p.tokens.drip}`);
  if (p.tokens.blade) toks.push(`剑意${p.tokens.blade}`);
  if (p.tokens.sakra) toks.push(`杀生樱${p.tokens.sakra}`);
  if (toks.length) t.push(`<span class="stag tok">${toks.join(' · ')}</span>`);
  return t.join('');
}
function equipIcons(p) {
  const out = [];
  const E = p.equips;
  const mk = (c, hint) => c ? `<span class="eic" style="${imStyle(c.art)}" data-tooltip="【${c.name}】${c.desc || ''}"></span>` : '';
  out.push(mk(E.weapon), mk(E.artifact), mk(E.mountAtk), mk(E.mountDef));
  for (const j of p.judgments) out.push(`<span class="eic" style="${imStyle(j.art)};opacity:.85" data-tooltip="判定区·【${j.name}】${j.desc || ''}"></span>`);
  return out.join('');
}
function hpHTML(p) {
  let s = '';
  for (let i = 0; i < Math.max(p.maxHp, p.hp); i++) s += `<span class="hppip ${i >= p.hp ? 'lost' : ''} ${i >= p.hero.hp ? 'extra' : ''}"></span>`;
  return `<div class="hpline" data-tooltip="体力 ${p.hp}/${p.maxHp}">${s}</div>`;
}
function shieldHTML(p) {
  if (!p.shield) return '';
  let s = '';
  for (let i = 0; i < p.shield; i++) s += `<span class="shp" style="${imStyle('star4')};background-color:#f0c96a;-webkit-mask:var(--im) center/contain no-repeat"></span>`;
  return `<div class="shieldline" data-tooltip="护盾 ${p.shield}">${s}</div>`;
}
function seatEl(p, small) {
  const d = el(`<div class="seat ${p.alive ? '' : 'dead'} ${G.players[G.curIdx] === p && !G.over ? 'turn' : ''}" data-seat="${p.seat}">
    <div class="pframe">
      <div class="pface" style="--im:url(assets/face/${p.hero.key}.png)"></div>
      <img class="elbadge" src="${ASSETS[ELEMS[p.hero.elem].icon]}" title="${ELEMS[p.hero.elem].name}元素">
      ${roleRib(p)}
    </div>
    <div class="pcol" style="flex:1;min-width:0">
      <div class="nameline">${p.hero.name}<span class="nation">${nationTag(p)}</span>${p.isHuman ? '<span class="nation" style="color:#ffd97a;border-color:#8a743f">你</span>' : ''}</div>
      ${hpHTML(p)}${shieldHTML(p)}
      <div class="statline">${statusTags(p)}</div>
      <div class="equipline">${equipIcons(p)}</div>
    </div>
    <div class="handcount" data-tooltip="手牌数">牌 ${p.hand.length}</div>
    <div class="judgeline"></div>
  </div>`);
  d.dataset.tooltip = p.hero.skills.map(s => `【${s.name}】${({ A: '主动', L: '锁定', O: '限定', T: '触发' })[s.type]}：${s.desc}`).join('\n');
  return d;
}
function updateAll() {
  if (!$('#screen-game') || $('#screen-game').classList.contains('hidden')) return;
  const top = $('#seats-top');
  if (top) {
    top.innerHTML = '';
    for (const p of G.players) { if (p.isHuman) continue; top.appendChild(seatEl(p)); }
  }
  const me = G.players[0];
  const mz = $('#me-zone');
  if (mz) { mz.innerHTML = ''; mz.appendChild(seatEl(me, true)); }
  renderHand();
  renderSkills();
  const tb = $('#tb-turn');
  if (tb) tb.innerHTML = G.over ? '对局结束' : `第 ${Math.ceil(G.turnNo / 5)} 轮 · <b>${cur() ? cur().hero.name : ''}</b> 的回合`;
  const td = $('#tb-deck');
  if (td) td.textContent = `牌堆 ${G.deck.length} · 弃牌 ${G.discard.length} · 回合计 ${G.turnNo}`;
  applyTargetMarks();
}
ui.updateAll = updateAll;

/* ---------- 拖拽出牌 ---------- */
let drag = null;
let suppressClick = false;
const STAGE_OK_KEYS = ['mibao', 'jiu', 'wugu', 'taoyuan', 'wanjian', 'shenyuan', 'shandian'];
function stageOK(card) { return card.type === 'equip' || STAGE_OK_KEYS.includes(card.key); }

function attachDrag(cardDiv, card) {
  cardDiv.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    const me = G.players[0];
    if (!playState || playState.mode !== 'action' || !canPlay(me, card)) return;
    drag = { card, cardDiv, startX: e.clientX, startY: e.clientY, started: false, ghost: null, hoverSeat: null, hoverStage: false };
  });
}
function dragCands(card) {
  const me = G.players[0];
  if (card.key === 'shan' && hasSkill(me, 'chasca1')) return new Set(allInAtkRange(me));
  const spec = targetSpec(me, card);
  return spec ? spec.cands : new Set();
}
function executeDragPlay(card, targets) {
  if (!playState || playState.mode !== 'action') return false;
  const me = G.players[0];
  if (card.key === 'shan' && hasSkill(me, 'chasca1') && targets.length) {
    finishAction({ type: 'play', card: { name: '风之攻击', elem: 'anemo', key: 'sha_anemo', type: 'basic', art: 'g_wind', tint: '#74c2a8', virtual: true, consume: [card], desc: '' }, targets });
  } else {
    finishAction({ type: 'play', card, targets });
  }
  suppressClick = true;
  setTimeout(() => { suppressClick = false; }, 350);
  return true;
}
document.addEventListener('pointermove', e => {
  if (!drag) return;
  if (!drag.started) {
    if (Math.abs(e.clientX - drag.startX) < 7 && Math.abs(e.clientY - drag.startY) < 7) return;
    drag.started = true;
    const r = drag.cardDiv.getBoundingClientRect();
    const ghost = drag.cardDiv.cloneNode(true);
    ghost.classList.add('drag-ghost');
    ghost.classList.remove('usable', 'selected');
    ghost.style.width = r.width + 'px'; ghost.style.height = r.height + 'px';
    document.body.appendChild(ghost);
    drag.ghost = ghost;
    drag.cardDiv.classList.add('dragging');
    drag.cands = dragCands(drag.card);
    document.querySelectorAll('#seats-top .seat').forEach(s => {
      const p = G.players[parseInt(s.dataset.seat)];
      if (p && p.alive && drag.cands.has(p)) s.classList.add('droppable');
    });
    if (stageOK(drag.card)) { const z = $('#stage-zone'); if (z) z.classList.add('droppable'); }
    const tp = $('#tooltip'); if (tp) tp.style.display = 'none';
  }
  drag.ghost.style.left = e.clientX + 'px';
  drag.ghost.style.top = e.clientY + 'px';
  const under = document.elementFromPoint(e.clientX, e.clientY);
  const seatEl = under && under.closest ? under.closest('.seat.droppable') : null;
  const stageEl = under && under.closest ? under.closest('#stage-zone') : null;
  document.querySelectorAll('.dragover').forEach(x => x.classList.remove('dragover'));
  drag.hoverSeat = seatEl; drag.hoverStage = !seatEl && !!stageEl;
  if (seatEl) seatEl.classList.add('dragover');
  else if (stageEl && stageEl.classList.contains('droppable')) stageEl.classList.add('dragover');
});
document.addEventListener('pointerup', e => {
  if (!drag) return;
  const d = drag; drag = null;
  if (!d.started) return;
  if (d.ghost) d.ghost.remove();
  d.cardDiv.classList.remove('dragging');
  document.querySelectorAll('.droppable').forEach(x => x.classList.remove('droppable', 'dragover'));
  if (d.hoverSeat) {
    const p = G.players[parseInt(d.hoverSeat.dataset.seat)];
    if (p && d.cands.has(p)) { executeDragPlay(d.card, [p]); return; }
  }
  if (d.hoverStage && stageOK(d.card)) { executeDragPlay(d.card, []); return; }
  // 拖回原处或无效目标：保持选牌状态提示
  if ((d.hoverSeat || d.hoverStage) && playState && playState.mode === 'action') {
    showPrompt(`【${d.card.name}】不能以该方式使用，请拖到有效目标`, [
      { text: '改用点击', fn: () => { selectCard(d.card); } }]);
  }
});

/* ---------- 手牌与技能 ---------- */
let playState = null; // 交互状态机
function renderHand() {
  const hz = $('#hand-zone');
  if (!hz) return;
  hz.innerHTML = '';
  const me = G.players[0];
  if (!me) return;
  for (const c of me.hand) {
    let cls = '', onClick = null;
    if (playState && playState.mode === 'action') {
      const ok = canPlay(me, c);
      cls = ok ? 'usable' : 'disabled';
      if (ok) onClick = c2 => selectCard(c2);
    } else if (playState && playState.mode === 'pickcard' && playState.filter(c)) {
      cls = 'usable'; onClick = c2 => { playState.pick(c2); };
    } else cls = 'disabled';
    const cardDiv = cardEl(c, { cls, onClick });
    cardDiv.style.zIndex = String(200 - me.hand.indexOf(c));
    attachDrag(cardDiv, c);
    hz.appendChild(cardDiv);
  }
}
function renderSkills() {
  const sz = $('#skill-zone');
  if (!sz) return;
  sz.innerHTML = '';
  const me = G.players[0];
  if (!me) return;
  for (const sk of me.hero.skills) {
    const usable = (sk.type === 'A' || sk.type === 'O') && skillUsable(me, sk);
    const b = el(`<button class="skbtn ${usable ? 'ready' : ''}" ${usable ? '' : 'disabled'}>
      <span class="skname">${sk.name}</span><span class="sktype">${({ A: '主动', L: '锁定', O: '限定', T: '触发' })[sk.type]}</span>
      <div style="font-size:10.5px;color:#8a92ac;margin-top:2px;max-height:30px;overflow:hidden">${sk.desc}</div>
    </button>`);
    b.dataset.tooltip = `【${sk.name}】${sk.desc}`;
    if (usable) b.onclick = e => { e.stopPropagation(); selectSkill(sk); };
    sz.appendChild(b);
  }
  // 特殊虚拟出牌按钮
  if (playState && playState.mode === 'action' && me.equips.weapon && me.equips.weapon.key === 'w_jingshui' && me.hand.length >= 2 && (me.usedPerTurn._shaCount || 0) < maxAttacks(me)) {
    const b = el('<button class="skbtn ready"><span class="skname">静水流涌之辉</span><div style="font-size:10.5px;color:#8a92ac">两张手牌当攻击</div></button>');
    b.onclick = e => { e.stopPropagation(); startVirtualSha2(); };
    sz.appendChild(b);
  }
}

/* ---------- 出牌交互 ---------- */
let selCard = null, targetCtx = null;
function showPrompt(text, acts) {
  let pbb = $('#prompt-bar');
  if (!pbb) {
    pbb = el('<div id="prompt-bar"></div>');
    const zone = $('#stage-zone');
    if (zone) zone.appendChild(pbb);
    else return;
  }
  pbb.innerHTML = `<span>${text}</span><span class="acts"></span>`;
  const ac = pbb.querySelector('.acts');
  for (const a of acts || []) {
    const b = el(`<button class="gbtn small ${a.cls || ''}">${a.text}</button>`);
    b.onclick = e => { e.stopPropagation(); a.fn(); };
    ac.appendChild(b);
  }
}
function hidePrompt() { const pb = $('#prompt-bar'); if (pb) pb.remove(); }

function selectCard(c) {
  if (suppressClick) return;
  const me = G.players[0];
  if (selCard && selCard.uid === c.uid) { selCard = null; clearTargetMode(); renderHand(); applyTargetMarks(); return; }
  // 恰斯卡：闪避当风之攻击
  if (c.key === 'shan' && hasSkill(me, 'chasca1')) {
    const cands = allInAtkRange(me);
    if (!cands.length) return;
    targetCtx = { spec: { min: 1, max: 1 }, picked: [], kind: 'virtualsha', card: c, cands: new Set(cands) };
    selCard = null;
    renderHand();
    showPrompt('【装填弹药】将【闪避】当风之攻击使用，请选择目标', [
      { text: '取消', fn: () => { clearTargetMode(); renderHand(); applyTargetMarks(); } }]);
    applyTargetMarks();
    return;
  }
  selCard = c;
  const spec = targetSpec(me, c);
  if (!spec) { selCard = null; return; }
  targetCtx = { spec, picked: [], kind: 'card' };
  renderHand();
  showPrompt(`【${c.name}】请选择目标`, [
    { text: '取消', fn: () => { selCard = null; clearTargetMode(); renderHand(); applyTargetMarks(); } }]);
  applyTargetMarks();
}
function selectSkill(sk) {
  const me = G.players[0];
  const spec = SKILL_TARGETS[sk.key];
  if (sk.key === 'raiden2') {
    ui.askTargets('【无想的一刀】选择目标', SKILL_TARGETS.raiden2.cand(me), 1, 1).then(ts => {
      if (!ts || !ts.length) { applyTargetMarks(); return; }
      const n = Math.min(3, me.tokens.yuanli || 0);
      ui.askChoice(`【无想的一刀】移去几枚愿力？（当前 ${me.tokens.yuanli}）`, ['1', '2', '3'].slice(0, n)).then(cnt => {
        finishAction({ type: 'skill', skill: sk, targets: ts, wishCount: parseInt(cnt) });
      });
    });
    return;
  }
  if (sk.key === 'yae1') {
    ui.askPlayCard('【杀生樱】选择1张手牌作为素材弃置', () => true).then(card => {
      if (card) finishAction({ type: 'skill', skill: sk, targets: [], costCard: card });
    });
    return;
  }
  if (!spec) { finishAction({ type: 'skill', skill: sk, targets: [] }); return; }
  const cands = spec.cand(me);
  if (!cands.length) return;
  targetCtx = { spec, picked: [], kind: 'skill', skill: sk, cands };
  selCard = null;
  renderHand();
  showPrompt(`【${sk.name}】请选择目标`, [{ text: '取消', fn: () => { clearTargetMode(); renderHand(); applyTargetMarks(); } }]);
  applyTargetMarks();
}
function startVirtualSha2() {
  ui.askPlayCards('【静水流涌之辉】选择2张手牌作为攻击', () => true, 2).then(cards => {
    if (cards && cards.length === 2) {
      const me = G.players[0];
      ui.askTargets('选择攻击目标', allInAtkRange(me), 1, 1).then(ts => {
        if (ts && ts.length) finishAction({ type: 'play', card: { name: '攻击', elem: 'none', key: 'sha', type: 'basic', art: 'g_atk', tint: '#b8c0d8', virtual: true, consume: cards, desc: '' }, targets: ts });
      });
    }
  });
}
function clearTargetMode() { targetCtx = null; hidePrompt(); }
function applyTargetMarks() {
  const cands = targetCtx ? (targetCtx.cands || (targetCtx.spec && targetCtx.spec.cands)) : null;
  document.querySelectorAll('.seat').forEach(s => {
    const p = G.players[parseInt(s.dataset.seat)];
    s.classList.remove('targetable');
    if (targetCtx && p && p.alive && cands && cands.has(p)) s.classList.add('targetable');
  });
}
document.addEventListener('click', e => {
  const seatDiv = e.target.closest && e.target.closest('.seat.targetable');
  if (!seatDiv || !targetCtx) return;
  const p = G.players[parseInt(seatDiv.dataset.seat)];
  if (targetCtx.picked.includes(p)) return;
  const cands = targetCtx.cands || (targetCtx.spec && targetCtx.spec.cands);
  if (!cands || !cands.has(p)) return;
  targetCtx.picked.push(p);
  const { spec } = targetCtx;
  if (targetCtx.picked.length >= spec.max) resolveTargeting();
  else if (targetCtx.picked.length >= spec.min && spec.max > spec.min) {
    showPrompt(`已选 ${targetCtx.picked.length} 名，可继续选择或确认`, [
      { text: '确认', cls: 'primary', fn: resolveTargeting },
      { text: '取消', fn: () => { clearTargetMode(); applyTargetMarks(); } }]);
  }
});
async function resolveTargeting() {
  const { kind, skill, picked } = targetCtx;
  clearTargetMode();
  if (kind === 'virtualsha') {
    const card = targetCtx.card;
    finishAction({ type: 'play', card: { name: '风之攻击', elem: 'anemo', key: 'sha_anemo', type: 'basic', art: 'g_wind', tint: '#74c2a8', virtual: true, consume: [card], desc: '' }, targets: picked });
    return;
  }
  if (kind === 'card') {
    finishAction({ type: 'play', card: selCard, targets: picked });
    selCard = null;
  } else {
    let costCard = null;
    const sk = skill;
    if (['klee1', 'colu1', 'aly1', 'odette1', 'vody1', 'xilonen2', 'furina1'].includes(sk.key)) {
      costCard = await ui.askPlayCard(`【${sk.name}】选择1张手牌支付`, () => true);
      if (!costCard) { renderHand(); return; }
    }
    finishAction({ type: 'skill', skill: sk, targets: picked, costCard });
  }
}
function finishAction(act) {
  clearTargetMode();
  const st = playState;
  playState = null;
  renderHand(); renderSkills();
  if (st && st.resolve) st.resolve(act);
}

/* ---------- 交互原语 ---------- */
function supersedePlayState() {
  // 新询问取代旧询问时，放行旧的等待（防孤儿 promise 卡死流程）
  if (playState) {
    if (playState.resolve) try { playState.resolve({ type: 'end' }); } catch (_) {}
    if (playState.pick) try { playState.pick(null); } catch (_) {}
  }
  playState = null;
  hidePrompt();
}
ui.getPlayAction = p => new Promise(res => {
  supersedePlayState();
  playState = { mode: 'action', resolve: res };
  selCard = null; targetCtx = null;
  renderHand(); renderSkills();
  showPrompt('出牌阶段：拖动卡牌到角色或上方区域即可出牌 · 也可点击后选目标', [
    { text: '结束回合', cls: 'primary', fn: () => finishAction({ type: 'end' }) }]);
});
ui.askPlayCard = (text, filter, opts = {}) => new Promise(res => {
  supersedePlayState();
  playState = { mode: 'pickcard', filter: filter || (() => true), resolve: null, pick: c => { cleanup(); res(c); } };
  renderHand();
  const acts = [];
  if (!opts.forced) acts.push({ text: '放弃', fn: () => { cleanup(); res(null); } });
  const cleanup = () => { playState = null; hidePrompt(); renderHand(); };
  showPrompt(text, acts);
});
ui.askPlayCards = (text, filter, n) => new Promise(res => {
  supersedePlayState();
  const picked = [];
  playState = {
    mode: 'pickcard', filter: filter || (() => true),
    pick: c => {
      if (!c || picked.includes(c)) return;
      picked.push(c);
      if (picked.length >= n) { playState = null; hidePrompt(); renderHand(); res(picked); }
      else showPrompt(`${text}（已选 ${picked.length}/${n}）`, [{ text: '取消', fn: () => { playState = null; hidePrompt(); renderHand(); res(null); } }]);
    },
  };
  renderHand();
  showPrompt(`${text}（0/${n}）`, [{ text: '取消', fn: () => { playState = null; hidePrompt(); renderHand(); res(null); } }]);
});
ui.askTargets = (text, candidates, min, max) => new Promise(res => {
  if (targetCtx && targetCtx._resolve) try { targetCtx._resolve(null); } catch (_) {}
  targetCtx = { spec: { min, max }, picked: [], kind: '_raw', cands: new Set(candidates), _resolve: res, text };
  renderHand();
  applyTargetMarks();
  showPrompt(text, [{ text: '取消', fn: () => { const r = targetCtx._resolve; clearTargetMode(); renderHand(); r(null); } }]);
});
ui.askPickOption = (text, options) => new Promise(res => {
  const acts = options.map((o, i) => ({ text: o, fn: () => { hidePrompt(); res(i); } }));
  showPrompt(text, acts);
});
ui.askChoice = (text, options) => new Promise(res => {
  const acts = options.map(o => ({ text: o, fn: () => { hidePrompt(); res(o); } }));
  showPrompt(text, acts);
});
ui.confirm = text => new Promise(res => {
  modal(text, '', [{ text: '取消', fn: () => res(false) }, { text: '确定', cls: 'primary', fn: () => res(true) }]);
});
ui.viewHand = (p, title) => new Promise(res => {
  const cards = p.hand.map(c => `<span style="display:inline-block;margin:3px;padding:4px 9px;border:1px solid #4a5276;border-radius:6px;background:#23283c">${c.name}${c.suit}${c.point}</span>`).join('');
  const v = modal(title || '观看手牌', `<div class="m-body" style="max-width:520px">${p.hero.name} 的手牌（${p.hand.length}张）：<br><br>${cards || '（无手牌）'}</div>`, [{ text: '关闭', cls: 'primary', fn: () => res() }]);
});
// 引擎侧原始询问的 targetCtx resolve 接线
const _origResolveTargeting = resolveTargeting;
resolveTargeting = async function () {
  if (targetCtx && targetCtx.kind === '_raw') {
    const { picked, _resolve } = targetCtx;
    clearTargetMode(); renderHand();
    _resolve(picked.slice());
    return;
  }
  return _origResolveTargeting();
};

/* ---------- 表现层 ---------- */
ui.log = (cls, html) => {
  const list = $('#log-list');
  if (!list) return;
  const d = el(`<div class="l-${cls || 'sys'}">${html}</div>`);
  list.appendChild(d);
  while (list.children.length > 140) list.firstChild.remove();
  list.scrollTop = list.scrollHeight;
};
function seatAnchor(seatIdx) {
  const me = G.players[0];
  if (me && seatIdx === 0) return $('#me-zone .seat');
  return document.querySelector(`#seats-top .seat[data-seat="${seatIdx}"]`);
}
ui.floatText = (seatIdx, text, cls, color) => {
  const anchor = seatAnchor(seatIdx);
  const zone = $('#stage-zone');
  if (!zone) return;
  const r = anchor ? anchor.getBoundingClientRect() : zone.getBoundingClientRect();
  const zr = zone.getBoundingClientRect();
  const d = el(`<div class="float-text ${cls || ''}" style="--ec:${color || '#fff'};left:${r.left - zr.left + r.width / 2 - 30}px;top:${r.top - zr.top + r.height / 3}px">${text}</div>`);
  zone.appendChild(d);
  setTimeout(() => d.remove(), 1200);
  if (anchor && cls !== 'reaction') { anchor.classList.remove('shake'); void anchor.offsetWidth; anchor.classList.add('shake'); }
};
ui.reactionFx = (seatIdx, iconKey, color) => {
  const anchor = seatAnchor(seatIdx);
  if (!anchor) return;
  const d = el(`<div class="reaction-flash" style="--ec:${color}"><span style="position:absolute;left:50%;top:38%;transform:translate(-50%,-50%);width:54px;height:54px;background:var(--img-${iconKey}) center/contain no-repeat;filter:drop-shadow(0 0 10px ${color})"></span></div>`);
  anchor.appendChild(d);
  setTimeout(() => d.remove(), 850);
};
ui.stageCard = async (card, player, note) => {
  const zone = $('#stage-zone');
  if (!zone) return;
  const d = el(`<div class="bigcard">${cardEl({ ...card, uid: 'stage' }, {}).outerHTML}<div style="position:absolute;left:0;right:0;bottom:-24px;text-align:center;color:#d3bc8e;font-size:13px;text-shadow:0 1px 3px #000">${player ? player.hero.name : ''} ${note || ''}</div></div>`);
  d.style.left = 'calc(50% - 75px)';
  d.style.top = '26%';
  d.querySelector('.card').style.cssText = 'width:100%;height:100%;pointer-events:none';
  zone.appendChild(d);
  setTimeout(() => d.remove(), 950);
  await sleep(500);
};
ui.stageMiss = t => { logL('sys', `${nameOf(t)} 闪避成功`); ui.floatText(t.seat, '闪避', '', '#9fd6e3'); };

/* ---------- 弹窗 ---------- */
function modal(title, bodyHTML, buttons) {
  const veil = el(`<div class="modal-veil"><div class="modal"><h3>${title}</h3><div class="m-body">${bodyHTML}</div><div class="m-acts"></div></div></div>`);
  const app = $('#app');
  app.appendChild(veil);
  const acts = veil.querySelector('.m-acts');
  for (const b of buttons || []) {
    const btn = el(`<button class="gbtn ${b.cls || ''}">${b.text}</button>`);
    btn.onclick = () => { veil.remove(); if (b.fn) b.fn(); };
    acts.appendChild(btn);
  }
  return veil;
}

/* ---------- tooltip ---------- */
document.addEventListener('mousemove', e => {
  const tp = $('#tooltip');
  const t = e.target.closest && e.target.closest('[data-tooltip]');
  if (!tp) return;
  if (t) {
    tp.style.display = 'block';
    tp.innerHTML = t.dataset.tooltip.replace(/\n/g, '<br>');
    const x = Math.min(e.clientX + 14, window.innerWidth - 320);
    tp.style.left = x + 'px';
    tp.style.top = Math.min(e.clientY + 16, window.innerHeight - 120) + 'px';
  } else tp.style.display = 'none';
});
(function ensureTooltip() {
  const d = el('<div id="tooltip"></div>');
  document.body.appendChild(d);
})();

/* ---------- 结算 ---------- */
ui.showResult = result => {
  updateAll();
  const me = G.players[0];
  const rolesHtml = G.players.map(p => `
    <div class="rcell ${p.alive ? '' : 'dead'}">
      <div class="rname">${p.hero.name}${p.isHuman ? '（你）' : ''}</div>
      <div class="rrole ${ROLES[p.role].cls}">${ROLES[p.role].name}</div>
    </div>`).join('');
  setTimeout(() => {
    $('#app').innerHTML = `
    <div id="screen-result" class="screen">
      <div id="result-title" class="${result.meWin ? '' : 'lose'}">${result.meWin ? '胜利' : '败北'}</div>
      <div style="color:#c6cde0;font-size:16px;letter-spacing:2px">${result.text}</div>
      <div id="result-roles">${rolesHtml}</div>
      <div style="display:flex;gap:14px;margin-top:14px">
        <button class="gbtn primary" id="btn-again">再来一局</button>
        <button class="gbtn" id="btn-home">返回主菜单</button>
      </div>
    </div>`;
    showScreen('result');
    $('#btn-again').onclick = showPick;
    $('#btn-home').onclick = showMenu;
  }, 800);
};

/* ---------- 图鉴 ---------- */
function showCodex(tab, overlay) {
  const holder = overlay ? null : $('#app');
  const body = `
  <div id="screen-codex" class="screen" style="${overlay ? 'position:absolute;inset:0;background:rgba(10,12,20,.96);z-index:80' : ''}">
    <div class="pick-head"><h2>武将图鉴</h2>
      <div class="codex-tabs">
        <button class="fchip ${tab === 'hero' ? 'on' : ''}" data-t="hero">武将</button>
        <button class="fchip ${tab === 'card' ? 'on' : ''}" data-t="card">卡牌</button>
        <button class="fchip ${tab === 'react' ? 'on' : ''}" data-t="react">元素反应</button>
      </div>
      <span class="spacer" style="flex:1"></span>
      <button class="gbtn small" id="cd-close">关闭</button>
    </div>
    <div class="codex-body" id="codex-body"></div>
  </div>`;
  let host;
  if (overlay) {
    host = el(body);
    $('#app').appendChild(host);
  } else {
    $('#app').innerHTML = body;
    host = $('#screen-codex');
    showScreen('codex');
  }
  host.querySelector('#cd-close').onclick = () => { host.remove(); if (!overlay) showMenu(); };
  host.querySelectorAll('.codex-tabs .fchip').forEach(c => c.onclick = () => {
    host.remove(); showCodex(c.dataset.t, overlay);
  });
  const bd = host.querySelector('#codex-body');
  if (tab === 'hero') {
    for (const h of HEROES) {
      bd.appendChild(el(`<div class="cd-hero">
        <div class="cart" style="--im:url(assets/render/${h.key}.png)"></div>
        <div class="cinfo">
          <h4>${h.name} <small style="color:#97a0ba;font-size:12px">· ${h.title} · ${NATIONS[h.nation].name} · ${ELEMS[h.elem].name} · 体力${h.hp}</small></h4>
          ${h.skills.map(s => `<div class="skill"><b>【${s.name}】</b>（${({ A: '主动技', L: '锁定技', O: '限定技', T: '触发技' })[s.type]}）${s.desc}</div>`).join('')}
        </div>
      </div>`));
    }
  } else if (tab === 'card') {
    const grid = el('<div class="cd-grid"></div>');
    for (const def of CARDS) {
      const sample = makeCard(def);
      grid.appendChild(el(`<div class="cd-card"></div>`));
      const cell = grid.lastChild;
      cell.appendChild(cardEl(sample, {}));
      cell.appendChild(el(`<div class="cdesc"><b>${def.name}</b>${def.range ? '（攻击范围' + def.range + '）' : ''} ×${def.count}<br>${def.desc}</div>`));
    }
    bd.appendChild(grid);
  } else {
    const grid = el('<div class="cd-react"></div>');
    for (const k in REACTIONS) {
      const r = REACTIONS[k];
      grid.appendChild(el(`<div class="rx-cell">
        <div class="rxicon" style="--im:var(--img-${r.icon})"></div>
        <div><div class="rxn">${r.name}</div><div class="rxd">${r.desc}</div></div>
      </div>`));
    }
    bd.appendChild(grid);
    bd.appendChild(el(`<div style="margin-top:14px;color:#8b92a8;font-size:12.5px;line-height:1.8">
      附着规则：角色受到元素伤害后获得该元素附着（覆盖旧附着，同元素刷新）。反应在伤害结算时触发并消耗附着。风/岩对任何附着都会反应（扩散/结晶）。
      <br>月感电：菲林斯的雷伤害对附着目标自动升级（伤害+1且弃1张手牌）。星辉域（奥黛塔）使范围内角色的反应效果强化一档。</div>`));
  }
}
