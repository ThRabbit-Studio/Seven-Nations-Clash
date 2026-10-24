/* ================= 引擎层：状态 / 回合 / 结算 ================= */

const G = {
  players: [], deck: [], discard: [], turnNo: 0, curIdx: 0,
  over: false, result: null, uid: 0, round: 0,
};

const sleep = ms => new Promise(r => setTimeout(r, ms));
const SHUFFLE = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const SUITS = ['♠', '♥', '♣', '♦'];
const isRed = c => c && (c.suit === '♥' || c.suit === '♦');

function makeCard(def) {
  const c = {
    uid: ++G.uid, key: def.key, name: def.name, type: def.type, sub: def.sub || null,
    elem: def.elem || null, art: def.art, tint: def.tint, range: def.range,
    suit: SUITS[Math.floor(Math.random() * 4)],
    point: 1 + Math.floor(Math.random() * 13),
    wuxie: !!def.wuxie, desc: def.desc,
  };
  if (def.key === 'tao') { c.dish = Math.floor(Math.random() * DISHES.length); c.art = 'dish' + (c.dish + 1); }
  return c;
}

function buildDeck() {
  G.deck = [];
  for (const def of CARDS) for (let i = 0; i < def.count; i++) G.deck.push(makeCard(def));
  SHUFFLE(G.deck);
}
function drawCards(n) {
  const got = [];
  for (let i = 0; i < n; i++) {
    if (!G.deck.length) { G.deck = SHUFFLE(G.discard.splice(0)); logL('minor', '牌堆已洗回'); }
    if (!G.deck.length) break;
    got.push(G.deck.pop());
  }
  return got;
}

/* ---------- 建局 ---------- */
function newGame(humanHeroKey) {
  G.players = []; G.discard = []; G.turnNo = 0; G.over = false; G.result = null; G.round = 0;
  buildDeck();
  const pool = HEROES.filter(h => h.key !== humanHeroKey);
  SHUFFLE(pool);
  const chosen = [HEROES.find(h => h.key === humanHeroKey), ...pool.slice(0, 4)];
  const roles = SHUFFLE(['lord', 'loyalist', 'rebel', 'rebel', 'spy']);
  const lordSeat = roles.indexOf('lord');
  for (let i = 0; i < 5; i++) {
    const hero = chosen[i];
    const isLord = roles[i] === 'lord';
    G.players.push({
      seat: i, hero, role: roles[i], isHuman: i === 0,
      maxHp: hero.hp + (isLord ? 1 : 0), hp: hero.hp + (isLord ? 1 : 0),
      shield: 0, hand: [], equips: { weapon: null, artifact: null, mountAtk: null, mountDef: null },
      judgments: [], attach: null, alive: true,
      flags: {}, tokens: {}, marks: {}, usedOnce: {}, usedPerTurn: {},
    });
  }
  for (const p of G.players) { p.hand.push(...drawCards(4)); if (p.role === 'lord') p.hand.push(...drawCards(2)); }
  G.curIdx = lordSeat;
  logL('gold', `身份局开始：主公是 <b>${G.players[lordSeat].hero.name}</b>（座位${lordSeat + 1}）`);
}

const P = i => G.players[i];
const alive = () => G.players.filter(p => p.alive);
const cur = () => G.players[G.curIdx];
const hasSkill = (p, key) => p.hero.skills.some(s => s.key === key);
const getSkill = (p, key) => p.hero.skills.find(s => s.key === key);
const onceOK = (p, key) => { if (p.usedOnce[key]) return false; p.usedOnce[key] = true; return true; };
const turnOnceOK = (p, key, n = 1) => { const c = p.usedPerTurn[key] || 0; if (c >= n) return false; p.usedPerTurn[key] = c + 1; return true; };
const clearPerTurn = p => { p.usedPerTurn = {}; };

/* ---------- 距离与范围 ---------- */
function seatDist(a, b) { const d = Math.abs(a.seat - b.seat); return Math.min(d, G.players.length - d); }
function dist(a, b) {
  if (a === b) return 0;
  let d = seatDist(a, b);
  if (b.equips.mountDef) d += 1;
  if (a.equips.mountAtk) d -= 1;
  if (hasSkill(a, 'odette2') && b.marks.starfield) d = Math.min(d, 1);
  return Math.max(d, 1);
}
function atkRange(p) {
  if (p.flags.infRange) return 99;
  return 1 + (p.equips.weapon ? p.equips.weapon.range : 0);
}
function inAtkRange(a, b) { return dist(a, b) <= atkRange(a); }
function allInAtkRange(a) { return alive().filter(q => q !== a && inAtkRange(a, q)); }

/* ---------- 日志 ---------- */
function logL(cls, html) { ui.log(cls, html); }
const nameOf = p => `<b style="color:${p.isHuman ? '#ffd97a' : '#fff'}">${p.hero.name}</b>`;
const elemSpan = e => `<span class="l-elem" style="background:${(ELEMS[e] || ELEMS.none).color}33;border:1px solid ${(ELEMS[e] || ELEMS.none).color}">${(ELEMS[e] || ELEMS.none).name}</span>`;

/* ---------- 判定 ---------- */
async function judge(p, reason) {
  const c = drawCards(1)[0];
  logL('minor', `${nameOf(p)} 进行判定（${reason}）：<b>${c.name}${c.suit}${c.point}</b>`);
  await ui.stageCard(c, p, '判定');
  await sleep(500);
  G.discard.push(c);
  ui.updateAll();
  return c;
}

/* ---------- 伤害与元素反应 ---------- */
// 计算反应（不含月感电），返回 {reaction, dmgBonus, ...} 或 null
function calcReaction(source, target, elem) {
  if (!elem || elem === 'none' || !target.attach) return null;
  const at = target.attach;
  if (elem === 'geo') return { reaction: 'crystallize' };
  if (elem === 'anemo') return { reaction: 'swirl' };
  const key = (REACT_MAP[at] || {})[elem];
  return key ? { reaction: key } : null;
}

async function dealDamage(source, target, amount, elem, ctx = {}) {
  if (!target.alive || amount <= 0 || G.over) return 0;
  let dmg = amount;
  let reactionInfo = null;

  // 元素反应预结算
  if (elem && elem !== 'none') {
    reactionInfo = calcReaction(source, target, elem);
    // 菲林斯 月感电：雷伤对附着目标升级
    if (source && hasSkill(source, 'flins1') && elem === 'electro' && target.attach && target.attach !== 'electro') {
      reactionInfo = { reaction: 'moonshock' };
    }
    if (reactionInfo) {
      const rk = reactionInfo.reaction;
      const star = !!target.marks.starfield;
      if (rk === 'vaporize' || rk === 'melt' || rk === 'quicken') dmg += star ? 2 : 1;
      if (rk === 'moonshock') dmg += 1;
      // 反应附加效果（伤害后处理）
      ctx.pendingReaction = { rk, star };
      target._reactConsume = true;
      if (source && hasSkill(source, 'lauma2')) {
        if (turnOnceOK(source, 'lauma2', 2)) { source.hand.push(...drawCards(1)); logL('skill', `${nameOf(source)}【月兆低语】摸1张牌`); }
      }
    }
  }
  // 可莉 火花骑士：火伤判定加成
  if (source && hasSkill(source, 'klee2') && elem === 'pyro') {
    const jc = await judge(source, '火花骑士');
    if (isRed(jc)) { dmg += 1; logL('skill', `${nameOf(source)}【火花骑士】判定红色，伤害+1`); }
  }
  // 希诺宁：对附着角色伤害+1
  if (source && hasSkill(source, 'xilonen1') && target.attach && turnOnceOK(source, 'xilonen1')) {
    dmg += 1; logL('skill', `${nameOf(source)}【岩鑢问奏】对附着目标伤害+1`);
  }
  // 赛诺 嚎猎：对同一目标第二次及以后伤害+1
  if (source && hasSkill(source, 'cyno2')) {
    source.usedPerTurn._hitCount = (source.usedPerTurn._hitCount || 0);
    const hitKey = '_hit_' + target.seat;
    source.usedPerTurn[hitKey] = (source.usedPerTurn[hitKey] || 0) + 1;
    if (source.usedPerTurn[hitKey] >= 2) { dmg += 1; logL('skill', `${nameOf(source)}【嚎猎】对同一目标伤害+1`); }
  }
  // 克洛琳德 拼点雷击等无来源场合安全
  // 抗性削减（沃雅妮莎）在伤害前
  if (source && hasSkill(source, 'vody2') && target.hand.length && (source.usedPerTurn.vody2 || 0) < 1
      && await aiOrHumanWants(source, 'vody2', target)) {
    source.usedPerTurn.vody2 = 1;
    const c = await chooseDiscard(source, target, 1, '【抗性削减】弃置一张手牌');
    if (c) { logL('skill', `${nameOf(source)}【抗性削减】弃置了${nameOf(target)}的1张手牌`); }
  }

  // 护盾抵扣
  while (dmg > 0 && target.shield > 0) { target.shield--; dmg--; }
  if (elem === 'geo' && target.equips.artifact && target.equips.artifact.key === 'a_qianyan' && !(ctx.pierceArmor)) {
    logL('sys', `${nameOf(target)}【千岩牢固】使岩伤害无效`);
    dmg = 0;
  }
  if (dmg > 0) {
    target.hp -= dmg;
    ui.floatText(target.seat, `-${dmg}`, 'elem', (ELEMS[elem] || ELEMS.none).color);
    target._el = target._el || {}; target._el.shake = true;
    const srcLabel = source ? nameOf(source) : `<b>${ctx.srcName || '???'}</b>`;
    logL('warn', `${srcLabel} 对 ${nameOf(target)} 造成 <b>${dmg}</b> 点${elem && elem !== 'none' ? elemSpan(elem) : ''}伤害`);
  }
  // 反应附加效果
  if (ctx.pendingReaction) {
    const { rk, star } = ctx.pendingReaction;
    const rx = rk === 'moonshock' ? { name: '月感电', color: '#c9b6f5', icon: 're_electro' } : REACTIONS[rk];
    ui.reactionFx(target.seat, rx.icon, rx.color);
    ui.floatText(target.seat, rx.name, 'reaction');
    logL('gold', `触发反应 <b>${rx.name}</b>（${rx.desc || ''}${star ? '，星辉域强化' : ''}）`);
    await applyReaction(source, target, rk, star, ctx);
    target.attach = null;
  }
  // 元素附着（未被反应消耗时）
  if (elem && elem !== 'none' && !target._reactConsume) {
    target.attach = elem;
  }
  target._reactConsume = false;

  // 元素连锁传导
  if (elem && elem !== 'none' && target.flags.linked && !ctx.chained) {
    const linkedOthers = alive().filter(q => q !== target && q.flags.linked);
    if (linkedOthers.length) {
      logL('gold', `【元素连锁】传导给 ${linkedOthers.map(q => q.hero.name).join('、')}`);
      for (const q of linkedOthers) {
        if (q.alive) await dealDamage(source, q, 1, elem, { ...ctx, chained: true, srcName: ctx.srcName || '元素连锁' });
        if (G.over) return 0;
      }
    }
  }

  // 受伤后触发
  await afterDamaged(source, target, dmg, elem, ctx);

  ui.updateAll();
  await sleep(260);
  if (target.hp <= 0 && target.alive) await dyingProcess(target, source);
  return dmg;
}

async function applyReaction(source, target, rk, star, ctx) {
  const n = star ? 2 : 1;
  switch (rk) {
    case 'overload': case 'moonshock': {
      const c = await chooseDiscard(source, target, n, `被${rk === 'moonshock' ? '月感电' : '超载'}震落手牌`);
      break;
    }
    case 'superconduct': {
      const eqs = ['weapon', 'artifact', 'mountAtk', 'mountDef'].map(k => target.equips[k]).filter(Boolean);
      if (eqs.length) {
        const eq = star ? eqs[0] : eqs[0];
        const slot = ['weapon', 'artifact', 'mountAtk', 'mountDef'].find(k => target.equips[k] === eq);
        target.equips[slot] = null; G.discard.push(eq);
        logL('sys', `【超导】碎裂了 ${nameOf(target)} 的 <b>${eq.name}</b>`);
      } else {
        const c = await chooseDiscard(source, target, 1, '【超导】无装备可碎，改为弃手牌');
      }
      break;
    }
    case 'electrocharged': {
      const neigh = neighborPlayers(target).filter(q => q !== source);
      for (const q of neigh.slice(0, 2)) {
        if (q.attach !== 'electro') { q.attach = 'electro'; logL('sys', `【感电】蔓延：${nameOf(q)} 获得雷附着`); }
      }
      break;
    }
    case 'frozen': {
      if (star) { target.flags.skipPlayNext = true; logL('sys', `【冻结·强化】${nameOf(target)} 将跳过下个出牌阶段`); }
      else { target.flags.frozen = true; logL('sys', `【冻结】${nameOf(target)} 在其下回合结束前不能使用闪避`); }
      break;
    }
    case 'bloom': {
      target.marks.core = (target.marks.core || 0) + 1;
      logL('sys', `【绽放】${nameOf(target)} 获得草原核`);
      break;
    }
    case 'crystallize': {
      if (source && source.alive) {
        source.shield = Math.min(3, source.shield + (star ? 2 : 1) + ((source.equips.artifact && source.equips.artifact.key === 'a_qianyan') ? 1 : 0));
        logL('sys', `【结晶】${nameOf(source)} 获得护盾（${source.shield}）`);
      }
      break;
    }
    case 'swirl': {
      const near = alive().filter(q => q !== target && q !== source && seatDist(q, target) <= 1);
      if (near.length) {
        const q = source && source.isHuman ? await ui.askTargets('【扩散】选择距离目标1以内的一名角色获得其附着', near, 1, 1) : near[Math.floor(Math.random() * near.length)];
        if (q && q.length) { q[0].attach = target.attach || q[0].attach; logL('sys', `【扩散】${nameOf(q[0])} 获得了${elemSpan(q[0].attach)}附着`); }
      }
      break;
    }
  }
}
function neighborPlayers(p) {
  const n = G.players.length, out = [];
  for (let d = 1; d <= Math.floor(n / 2); d++) {
    out.push(G.players[(p.seat + d) % n]); out.push(G.players[(p.seat - d + n) % n]);
  }
  return out.filter(q => q !== p);
}

async function afterDamaged(source, target, dmg, elem, ctx) {
  if (dmg <= 0) return;
  // 那维莱特 源水之滴
  if (source && source.alive && hasSkill(source, 'neuv1')) {
    source.tokens.drip = Math.min(6, (source.tokens.drip || 0) + 1);
  }
  // 优菈 冷酷之心（攻击伤害）
  if (source && source.alive && hasSkill(source, 'eula1') && ctx.byAttack) {
    source.tokens.heart = Math.min(4, (source.tokens.heart || 0) + 1);
    logL('skill', `${nameOf(source)} 获得1枚【冷酷之心】（${source.tokens.heart}）`);
  }
  // 胡桃 血梅香
  if (source && source.alive && hasSkill(source, 'hutao2') && elem === 'pyro' && !target.marks.plum) {
    target.marks.plum = 1;
    logL('skill', `${nameOf(target)} 沾染了【血梅香】`);
  }
  // 纳西妲 心景幻成
  if (target.marks.seed) {
    const nahida = G.players.find(p => p.alive && hasSkill(p, 'nahida2'));
    if (nahida && turnOnceOK(nahida, 'nahida2', 2)) { nahida.hand.push(...drawCards(1)); logL('skill', `${nameOf(nahida)}【心景幻成】摸1张牌`); }
  }
  // 克洛琳德 夜巡
  if (target.alive && hasSkill(target, 'clorinde2') && !ctx.myTurn) {
    target.tokens.blade = Math.min(2, (target.tokens.blade || 0) + 1);
  }
  // 玛薇卡 胜利之焰
  if (source && source.alive && hasSkill(source, 'mavuika2') && elem === 'pyro' && (source.usedPerTurn.mavuika2 || 0) < 1) {
    const jc = await judge(source, '胜利之焰');
    if (isRed(jc)) {
      source.usedPerTurn.mavuika2 = 1;
      source.hp = Math.min(source.maxHp, source.hp + 1);
      ui.floatText(source.seat, '+1', 'heal');
      logL('skill', `${nameOf(source)}【胜利之焰】判定红色，回复1点体力`);
    }
  }
}

/* ---------- 濒死与死亡 ---------- */
async function dyingProcess(p) {
  logL('warn', `${nameOf(p)} 进入濒死状态！`);
  ui.updateAll();
  const order = [];
  for (let d = 0; d < G.players.length; d++) {
    const q = G.players[(p.seat + d) % G.players.length];
    if (q.alive) order.push(q);
  }
  const askedFurina = new Set();
  for (const saver of order) {
    while (p.hp <= 0 && p.alive) {
      let saved = false;
      // 芙宁娜 水神审判
      for (const f of alive()) {
        if (p.hp > 0) break;
        if (hasSkill(f, 'furina2') && !askedFurina.has(f.seat) && (f.usedPerTurn.furina2 || 0) < 1) {
          askedFurina.add(f.seat);
          const want = f.isHuman ? await ui.confirm(`【水神审判】视为对濒死的 ${p.hero.name} 使用1张料理？`) : aiWants(f, 'furinaSave', p);
          if (want) {
            f.usedPerTurn.furina2 = 1;
            p.hp += 1; saved = true;
            logL('skill', `${nameOf(f)}【水神审判】救起 ${nameOf(p)}（+1体力）`);
            ui.floatText(p.seat, '+1', 'heal');
            ui.updateAll();
          }
        }
      }
      if (saved) continue;
      let card = null;
      if (saver.isHuman) {
        card = await ui.askPlayCard(`${p.hero.name} 濒死！请打出【料理】${saver === p ? '或【果酒】' : ''}救助`, c =>
          c.key === 'tao' || (c.key === 'jiu' && saver === p));
      } else {
        card = aiChooseSave(saver, p);
      }
      if (!card) break;
      removeFromHand(saver, card); G.discard.push(card);
      p.hp += 1;
      logL('gold', `${nameOf(saver)} 打出【料理】救起 ${nameOf(p)}（+1体力）`);
      if (p.equips.artifact && p.equips.artifact.key === 'a_shaonv') { p.hand.push(...drawCards(1)); logL('sys', `${nameOf(p)}【被怜爱的少女】摸1张牌`); }
      ui.floatText(p.seat, '+1', 'heal');
      ui.updateAll();
      await sleep(300);
    }
    if (p.hp > 0) break;
  }
  if (p.hp <= 0) await killPlayer(p, arguments[1] || null);
}

async function killPlayer(p, killer) {
  p.alive = false;
  // 清场
  for (const c of p.hand.splice(0)) G.discard.push(c);
  for (const k of ['weapon', 'artifact', 'mountAtk', 'mountDef']) { if (p.equips[k]) { G.discard.push(p.equips[k]); p.equips[k] = null; } }
  for (const c of p.judgments.splice(0)) G.discard.push(c);
  p.attach = null; p.marks = {}; p.shield = 0;
  logL('warn', `☠ ${nameOf(p)} 阵亡，身份是 <b>${ROLES[p.role].name}</b>`);
  if (killer && killer.alive) {
    if (p.role === 'rebel') { const got = drawCards(3); killer.hand.push(...got); logL('gold', `${nameOf(killer)} 消灭反贼，摸3张牌`); }
    if (p.role === 'loyalist' && killer.role === 'lord') {
      for (const c of killer.hand.splice(0)) G.discard.push(c);
      for (const k of ['weapon', 'artifact', 'mountAtk', 'mountDef']) if (killer.equips[k]) { G.discard.push(killer.equips[k]); killer.equips[k] = null; }
      logL('warn', `主公误杀忠臣，弃置所有牌`);
    }
  }
  ui.updateAll();
  await sleep(600);
  checkVictory();
}

function checkVictory() {
  const a = alive();
  const lordDead = !G.players.find(p => p.role === 'lord').alive;
  if (lordDead) {
    if (a.length === 1 && a[0].role === 'spy') G.result = { win: 'spy', text: '内奸获胜！' };
    else G.result = { win: 'rebel', text: '反贼获胜！主公已阵亡' };
  } else {
    const evilGone = !G.players.some(p => p.alive && (p.role === 'rebel' || p.role === 'spy'));
    if (evilGone) G.result = { win: 'lord', text: '主公与忠臣获胜！' };
  }
  if (G.result) {
    G.over = true;
    const me = G.players[0];
    const myWin = (me.role === 'lord' || me.role === 'loyalist') ? G.result.win === 'lord'
      : me.role === 'rebel' ? G.result.win === 'rebel' : G.result.win === 'spy';
    G.result.meWin = myWin;
  }
}

/* ---------- 手牌工具 ---------- */
function removeFromHand(p, card) { const i = p.hand.indexOf(card); if (i >= 0) p.hand.splice(i, 1); }
async function chooseDiscard(source, target, n, reason) {
  const got = [];
  for (let i = 0; i < n; i++) {
    if (!target.hand.length) break;
    let c;
    if (target.isHuman) c = await ui.askPlayCard(reason || '请弃置一张手牌', () => true, { forced: true });
    else c = target.hand[Math.floor(Math.random() * target.hand.length)];
    removeFromHand(target, c); G.discard.push(c);
    got.push(c);
    logL('minor', `${nameOf(target)} 弃置了 <b>${c.name}</b>`);
  }
  ui.updateAll();
  return got;
}
// 人机统一询问：source 想对 target 使用 vody2（抗性削减）
async function aiOrHumanWants(source, skillKey, target) {
  if (source.isHuman) return await ui.confirm(`【抗性削减】对 ${target.hero.name} 造成伤害前，先弃其1张手牌？`);
  return aiWants(source, skillKey, target);
}

/* ---------- 攻击结算 ---------- */
async function resolveAttack(user, card, targets, opts = {}) {
  let hitAny = false;
  for (const t of targets) {
    if (!t.alive) continue;
    // 妮露 浮莲舞步
    if (hasSkill(t, 'nilou2') && (t.usedPerTurn.nilou2 || 0) < 1) {
      let paid = false;
      if (user.hand.length) {
        paid = user.isHuman ? await ui.confirm(`${t.hero.name}【浮莲舞步】：你需先弃1张手牌，否则此攻击对其无效。支付？`)
          : aiWants(user, 'nilouPay', t);
        if (paid) { t.usedPerTurn.nilou2 = 1; await chooseDiscard(null, user, 1, '【浮莲舞步】支付手牌'); }
      }
      if (!paid) { logL('skill', `${nameOf(t)}【浮莲舞步】使攻击失效`); continue; }
    }
    // 哥伦比娅 霜月庇护
    if (hasSkill(t, 'colu2') && turnOnceOK(t, 'colu2')) {
      const jc = await judge(t, '霜月庇护');
      if (!isRed(jc)) { logL('skill', `${nameOf(t)}【霜月庇护】使攻击无效`); continue; }
    }
    // 响应闪避
    let dodged = false;
    const canDodge = !t.flags.frozen;
    if (canDodge) {
      let shan = null;
      if (t.isHuman) {
        shan = await ui.askPlayCard(`${user.hero.name} 对你使用【${card.name}】，请打出【闪避】`, c => c.key === 'shan');
      } else shan = aiRespond(t, 'shan', { user, card });
      if (shan) { removeFromHand(t, shan); G.discard.push(shan); dodged = true; logL('sys', `${nameOf(t)} 打出【闪避】`); }
      else if (t.equips.artifact && t.equips.artifact.key === 'a_zongshi' && !(user.equips.weapon && user.equips.weapon.key === 'w_boluan')) {
        const jc = await judge(t, '昔日宗室之仪');
        if (isRed(jc)) { dodged = true; logL('sys', `${nameOf(t)}【昔日宗室之仪】判定生效，视为闪避`); }
      }
    } else {
      logL('sys', `${nameOf(t)} 被冻结，无法闪避！`);
    }
    if (dodged) {
      // 恰斯卡 风矢连珠
      if (hasSkill(user, 'chasca2') && turnOnceOK(user, 'chasca2', 2)) { user.hand.push(...drawCards(1)); logL('skill', `${nameOf(user)}【风矢连珠】摸1张牌`); }
      // 狼的末路：再打一张
      if (user.equips.weapon && user.equips.weapon.key === 'w_langmo') {
        const more = user.isHuman
          ? await ui.askPlayCard('【狼的末路】可再打出1张【攻击】继续', c => isShaCard(c))
          : aiRespond(user, 'chainSha', { target: t });
        if (more) {
          removeFromHand(user, more); G.discard.push(more);
          logL('skill', `${nameOf(user)}【狼的末路】继续攻击！`);
          await resolveAttack(user, more, [t], { noCount: true });
          continue;
        }
      }
      // 风鹰剑：弃2牌强命
      if (user.equips.weapon && user.equips.weapon.key === 'w_fengying' && user.hand.length >= 2) {
        const want = user.isHuman ? await ui.confirm('【风鹰剑】弃2张手牌令伤害生效？') : aiWants(user, 'fengying', t);
        if (want) { await chooseDiscard(null, user, 2, '【风鹰剑】弃2张牌'); logL('skill', `${nameOf(user)}【风鹰剑】伤害依然生效`); }
        else { ui.stageMiss(t); continue; }
      } else { ui.stageMiss(t); continue; }
    }
    // 命中
    hitAny = true;
    let dmg = 1;
    if (user.flags.drunk) { dmg += 1; user.flags.drunk = false; logL('sys', `果酒之力：伤害+1`); }
    if (user.flags.hutaoBuff) dmg += 1;
    let elem = card.elem || 'none';
    if (user.flags.hutaoBuff && elem === 'none') elem = 'pyro';
    if (hasSkill(user, 'cyno1') && elem === 'none' && !user.usedPerTurn._cynoInfused) { elem = 'electro'; user.usedPerTurn._cynoInfused = true; }
    const ctx = { byAttack: true, myTurn: user.isHuman || G.players[G.curIdx] === user };
    await dealDamage(user, t, dmg, elem, ctx);
    // 雷电将军 愿力
    for (const w of alive()) if (w !== user && hasSkill(w, 'raiden1')) { w.tokens.yuanli = Math.min(3, (w.tokens.yuanli || 0) + 1); }
    // 护摩之杖
    if (user.equips.weapon && user.equips.weapon.key === 'w_humo' && (t.equips.mountAtk || t.equips.mountDef)) {
      const want = user.isHuman ? await ui.confirm('【护摩之杖】弃置目标坐骑区一张牌？') : aiWants(user, 'humo', t);
      if (want) {
        const slot = t.equips.mountAtk ? 'mountAtk' : 'mountDef';
        G.discard.push(t.equips[slot]); logL('skill', `${nameOf(user)}【护摩之杖】弃置了 ${t.hero.name} 的【${t.equips[slot].name}】`); t.equips[slot] = null;
      }
    }
    // 神里流·霜灭
    if (hasSkill(user, 'ayaka2') && elem === 'cryo' && user.hand.length && (user.usedPerTurn.ayaka2 || 0) < 1) {
      const want = user.isHuman ? await ui.confirm('【神里流·霜灭】弃1张手牌，对其再造成1点冰伤害？') : aiWants(user, 'ayaka2', t);
      if (want) {
        user.usedPerTurn.ayaka2 = 1;
        await chooseDiscard(null, user, 1, '【神里流·霜灭】');
        await dealDamage(user, t, 1, 'cryo', { byAttack: true });
      }
    }
    await sleep(200);
  }
  return hitAny;
}

function isShaCard(c) { return c && (c.key === 'sha' || c.key.startsWith('sha_')); }

/* ---------- 锦囊结算 ---------- */
async function askWuxie(cardDef, user, target) {
  if (!cardDef.wuxie) return false;
  for (const q of alive()) {
    if (q === user && !target) continue;
    if (q.isHuman && !q.hand.some(c => c.key === 'wuxie')) continue;
    const c = q.isHuman
      ? await ui.askPlayCard(`是否打出【岩盾】抵消 ${user.hero.name} 的【${cardDef.name}】${target ? '（对 ' + target.hero.name + '）' : ''}?`, x => x.key === 'wuxie')
      : aiRespond(q, 'wuxie', { user, cardDef, target });
    if (c) { removeFromHand(q, c); G.discard.push(c); logL('gold', `${nameOf(q)} 打出【岩盾】抵消了【${cardDef.name}】`); ui.updateAll(); return true; }
  }
  return false;
}

async function resolveTrick(user, card, targets) {
  const def = CARDS.find(d => d.key === card.key);
  switch (card.key) {
    case 'mibao': user.hand.push(...drawCards(2)); logL('sys', `${nameOf(user)}【秘宝】摸2张牌`); break;
    case 'shihuang': {
      for (const t of targets) {
        if (await askWuxie(def, user, t)) continue;
        const opts = [];
        if (t.hand.length) opts.push({ kind: 'hand' });
        for (const k of ['weapon', 'artifact', 'mountAtk', 'mountDef']) if (t.equips[k]) opts.push({ kind: 'equip', slot: k });
        for (const j of t.judgments) opts.push({ kind: 'judge', card: j });
        if (!opts.length) { logL('sys', `${nameOf(t)} 没有可以拾取的牌`); continue; }
        let pick = null;
        if (user.isHuman) pick = await ui.askPickOption(`${t.hero.name} 的哪张牌？`, opts.map(o => o.kind === 'equip' ? `装备·${t.equips[o.slot].name}` : o.kind === 'judge' ? `判定区·${o.card.name}` : '随机手牌'));
        else pick = Math.floor(Math.random() * opts.length);
        const o = opts[pick];
        if (o.kind === 'hand') { const c = t.hand[Math.floor(Math.random() * t.hand.length)]; removeFromHand(t, c); user.hand.push(c); }
        else if (o.kind === 'equip') { const c = t.equips[o.slot]; t.equips[o.slot] = null; user.hand.push(c); }
        else { const i = t.judgments.indexOf(o.card); t.judgments.splice(i, 1); user.hand.push(o.card); }
        logL('sys', `${nameOf(user)}【拾荒】获得了 ${nameOf(t)} 的一张牌`);
      }
      break;
    }
    case 'daobao': {
      for (const t of targets) {
        if (await askWuxie(def, user, t)) continue;
        await chooseDiscard(user, t, 1, '被【盗宝鼬】弃置一张牌（自选手牌/装备）');
      }
      break;
    }
    case 'juedou': {
      for (const t of targets) {
        if (await askWuxie(def, user, t)) continue;
        let src = user, dst = t;
        while (true) {
          let sha = null;
          if (dst.isHuman) sha = await ui.askPlayCard(`【武斗】请打出【攻击】（否则受1点伤害）`, isShaCard);
          else sha = aiRespond(dst, 'duelSha', {});
          if (sha) { removeFromHand(dst, sha); G.discard.push(sha); logL('sys', `${nameOf(dst)} 打出【攻击】`); const tmp = src; src = dst; dst = tmp; }
          else { await dealDamage(src, dst, 1, 'none'); break; }
        }
      }
      break;
    }
    case 'wanjian': {
      if (await askWuxie(def, user, null)) break;
      for (const t of alive().filter(q => q !== user)) {
        if (await askWuxie(def, user, t)) continue;
        let dodged = false;
        const shan = t.isHuman ? await ui.askPlayCard('【天动万象】请打出【闪避】', c => c.key === 'shan') : aiRespond(t, 'shan', { aoe: true });
        if (shan) { removeFromHand(t, shan); G.discard.push(shan); dodged = true; }
        if (dodged) logL('sys', `${nameOf(t)} 打出【闪避】`);
        else await dealDamage(user, t, 1, 'geo');
      }
      break;
    }
    case 'shenyuan': {
      if (await askWuxie(def, user, null)) break;
      for (const t of alive().filter(q => q !== user)) {
        if (await askWuxie(def, user, t)) continue;
        const sha = t.isHuman ? await ui.askPlayCard('【深渊浪潮】请打出【攻击】', isShaCard) : aiRespond(t, 'needSha', {});
        if (sha) { removeFromHand(t, sha); G.discard.push(sha); logL('sys', `${nameOf(t)} 打出【攻击】`); }
        else await dealDamage(user, t, 1, 'none');
      }
      break;
    }
    case 'taoyuan': {
      if (await askWuxie(def, user, null)) break;
      for (const t of alive().filter(q => q.hp < q.maxHp)) {
        t.hp = Math.min(t.maxHp, t.hp + 1);
        ui.floatText(t.seat, '+1', 'heal');
        logL('sys', `【七国团圆宴】${nameOf(t)} 回复1点体力`);
        await sleep(220);
      }
      break;
    }
    case 'wugu': {
      if (await askWuxie(def, user, null)) break;
      const n = alive().length;
      const revealed = drawCards(n + 1);
      logL('sys', `【海灯节庆】亮出：${revealed.map(c => c.name).join('、')}`);
      let idx = user.seat;
      for (let i = 0; i < n; i++) {
        const t = G.players[idx % G.players.length];
        if (t.alive && revealed.length) {
          let pick = 0;
          if (t.isHuman) pick = await ui.askPickOption('【海灯节庆】选择获得一张牌', revealed.map(c => `${c.name}${c.suit}${c.point}`));
          else pick = aiPickReveal(t, revealed);
          const c = revealed.splice(pick, 1)[0];
          t.hand.push(c);
          logL('sys', `${nameOf(t)} 获得了 <b>${c.name}</b>`);
        }
        idx++;
      }
      G.discard.push(...revealed);
      break;
    }
    case 'lianhuan': {
      for (const t of targets) {
        if (await askWuxie(def, user, t)) continue;
        t.flags.linked = !t.flags.linked;
        logL('sys', `${nameOf(t)} ${t.flags.linked ? '被连结' : '恢复了'}元素连锁`);
      }
      break;
    }
    case 'jiedao': {
      for (const t of targets) {
        if (await askWuxie(def, user, t)) continue;
        const victims = alive().filter(q => q !== t && inAtkRange(t, q));
        if (!victims.length) { logL('sys', `${nameOf(t)} 攻击范围内没有其他角色`); continue; }
        let victim = null;
        if (user.isHuman) victim = (await ui.askTargets('【委托任务】指定被攻击的角色', victims, 1, 1))[0];
        else victim = aiPick(user, victims);
        if (!victim) continue;
        let sha = null;
        if (t.isHuman) sha = await ui.askPlayCard(`【委托任务】请对 ${victim.hero.name} 使用一张【攻击】`, isShaCard);
        else sha = aiRespond(t, 'jiedaoSha', { victim });
        if (sha) {
          removeFromHand(t, sha); G.discard.push(sha);
          logL('sys', `${nameOf(t)} 被迫对 ${nameOf(victim)} 使用【攻击】`);
          await resolveAttack(t, sha, [victim], { forced: true });
        } else if (t.equips.weapon) {
          const w = t.equips.weapon; t.equips.weapon = null; user.hand.push(w);
          logL('sys', `${nameOf(t)} 交出了【${w.name}】`);
        } else logL('sys', `${nameOf(t)} 没有武器，委托失败`);
      }
      break;
    }
  }
  ui.updateAll();
}

/* ---------- 判定区结算（回合开始） ---------- */
async function resolveJudgments(p) {
  // 闪电
  for (const c of [...p.judgments]) {
    if (c.key === 'shandian') {
      const jc = await judge(p, '雷罚之眼');
      const i = p.judgments.indexOf(c);
      if (jc.suit === '♠' && jc.point >= 9) {
        p.judgments.splice(i, 1); G.discard.push(c);
        logL('warn', `【雷罚之眼】命中 ${nameOf(p)}！`);
        await dealDamage(null, p, 3, 'electro');
      } else {
        p.judgments.splice(i, 1);
        const next = G.players[(p.seat + 1) % G.players.length];
        if (next.alive) { next.judgments.push(c); logL('sys', `【雷罚之眼】移给了 ${nameOf(next)}`); }
        else G.discard.push(c);
      }
    }
  }
  for (const c of [...p.judgments]) {
    if (c.key === 'lebus') {
      const jc = await judge(p, '怠惰之咒');
      const i = p.judgments.indexOf(c);
      p.judgments.splice(i, 1); G.discard.push(c);
      if (jc.suit === '♠') { p.flags.skipPlay = true; logL('warn', `【怠惰之咒】生效，${nameOf(p)} 将跳过出牌阶段`); }
      else logL('sys', `【怠惰之咒】失效`);
    }
  }
  // 草原核
  while (p.marks.core > 0) {
    p.marks.core--;
    logL('gold', `${nameOf(p)} 的草原核绽放！`);
    await dealDamage(null, p, p.marks.starfield ? 2 : 1, 'dendro');
    if (!p.alive) break;
  }
}

/* ---------- 回合循环 ---------- */
async function runTurn(p) {
  G.turnNo++;
  p.usedPerTurn = {};
  p.flags.infRange = false; p.flags.hutaoBuff = false;
  logL('gold', `—— <b>${p.hero.name}</b> 的回合（第${Math.ceil(G.turnNo / 5)}轮）——`);
  ui.updateAll();
  await sleep(350);

  // 准备阶段
  if (p.flags.frozen) { /* 冻结持续到回合结束 */ }
  if (hasSkill(p, 'zhongli1') && p.shield === 0 && p.alive) { p.shield = 1; logL('skill', `${nameOf(p)}【玉璋护盾】获得1点护盾`); }
  if (hasSkill(p, 'clorinde2') && p.tokens.blade) {
    p.flags.atkBonusCount = p.tokens.blade;
    logL('skill', `${nameOf(p)}【夜巡】移去${p.tokens.blade}枚剑意，攻击次数上限+${p.tokens.blade}`);
    p.tokens.blade = 0;
  }
  // 判定阶段
  await resolveJudgments(p);
  if (!p.alive || G.over) return;

  // 摸牌阶段
  const got = drawCards(2);
  p.hand.push(...got);
  logL('minor', `${nameOf(p)} 摸2张牌`);
  ui.updateAll();
  await sleep(250);

  // 出牌阶段
  if (!p.flags.skipPlay && !p.flags.skipPlayNext) {
    p.flags.skipPlayNext = false;
    await playPhase(p);
  } else {
    p.flags.skipPlay = false; p.flags.skipPlayNext = false;
    logL('warn', `${nameOf(p)} 跳过了出牌阶段`);
    await sleep(400);
  }
  if (G.over) return;

  // 弃牌阶段
  const over = p.hand.length - p.hp;
  if (over > 0) {
    if (p.isHuman) {
      const cs = await ui.askPlayCards(`请弃置 ${over} 张手牌（当前体力 ${p.hp}）`, () => true, over);
      for (const c of cs) { removeFromHand(p, c); G.discard.push(c); }
    } else {
      const cs = aiDiscard(p, over);
      for (const c of cs) { removeFromHand(p, c); G.discard.push(c); }
      logL('sys', `${nameOf(p)} 弃置了${over}张手牌`);
    }
  }

  // 结束阶段技能
  await endPhaseSkills(p);
  p.flags.frozen = false;
  ui.updateAll();
}

async function endPhaseSkills(p) {
  // 八重 杀生樱
  if (hasSkill(p, 'yae2') && (p.tokens.sakra || 0) > 0 && p.alive) {
    p.tokens.sakra--;
    const targets = alive().filter(q => q !== p);
    let t = null;
    if (p.isHuman) t = (await ui.askTargets('【野干役咒】选择杀生樱的攻击目标', targets, 1, 1))[0];
    else t = aiPick(p, targets);
    if (t) { logL('skill', `${nameOf(p)}【野干役咒】杀生樱轰击 ${nameOf(t)}`); await dealDamage(p, t, 1, 'electro'); }
  }
  // 那维 谕示裁定
  if (hasSkill(p, 'neuv1') && (p.tokens.drip || 0) >= 3 && p.alive) {
    const want = p.isHuman ? await ui.confirm('【谕示裁定】移去3枚源水之滴发动？') : aiWants(p, 'neuvBurst', null);
    if (want) {
      p.tokens.drip -= 3;
      const targets = alive().filter(q => q !== p);
      let heal = p.hp < p.maxHp;
      if (p.isHuman) heal = await ui.askChoice('回复1点体力，还是造成1点水伤害？', ['回复体力', '造成伤害']) === '回复体力';
      else heal = p.hp <= 2 || !targets.length;
      if (heal) { p.hp = Math.min(p.maxHp, p.hp + 1); ui.floatText(p.seat, '+1', 'heal'); logL('skill', `${nameOf(p)}【谕示裁定】回复1点体力`); }
      else { const t = p.isHuman ? (await ui.askTargets('选择伤害目标', targets, 1, 1))[0] : aiPick(p, targets); if (t) { logL('skill', `${nameOf(p)}【谕示裁定】造成1点水伤害`); await dealDamage(p, t, 1, 'hydro'); } }
    }
  }
  // 菈乌玛 恒暝灵觉
  if (hasSkill(p, 'lauma1') && p.alive) {
    const targets = alive();
    let t = null;
    if (p.isHuman) t = (await ui.askTargets('【恒暝灵觉】选择一名角色（已有附着者将受1点草伤）', targets, 1, 1))[0];
    else t = aiPick(p, targets);
    if (t) {
      if (t.attach) { logL('skill', `${nameOf(p)}【恒暝灵觉】引发反应！`); await dealDamage(p, t, 1, 'dendro'); }
      else { t.attach = 'dendro'; logL('skill', `${nameOf(p)}【恒暝灵觉】令 ${nameOf(t)} 获得草附着`); }
    }
  }
  // 爱诺 机器整备
  if (hasSkill(p, 'aino2') && p.alive) {
    const eqn = ['weapon', 'artifact', 'mountAtk', 'mountDef'].filter(k => p.equips[k]).length;
    if (eqn >= 2) { p.hand.push(...drawCards(1)); logL('skill', `${nameOf(p)}【机器整备】摸1张牌`); }
  }
  // 奥黛塔 雪鹄之梦
  if (hasSkill(p, 'odette2') && p.alive) {
    if (G.players.some(q => q.marks.starfield && q._starOwner === p.seat)) {
      p.hand.push(...drawCards(1));
      logL('skill', `${nameOf(p)}【雪鹄之梦】摸1张牌`);
    }
  }
  // 阿罗夏 战地整备
  if (hasSkill(p, 'aly2') && p.alive && p.usedPerTurn._dealtDmg) {
    let heal = p.hp < p.maxHp;
    if (p.isHuman) heal = await ui.askChoice('【战地整备】回复1点体力或摸1张牌？', ['回复体力', '摸牌']) === '回复体力';
    else heal = p.hp <= p.maxHp - 1;
    if (heal) { p.hp = Math.min(p.maxHp, p.hp + 1); ui.floatText(p.seat, '+1', 'heal'); logL('skill', `${nameOf(p)}【战地整备】回复1点体力`); }
    else { p.hand.push(...drawCards(1)); logL('skill', `${nameOf(p)}【战地整备】摸1张牌`); }
  }
  // 星辉域过期（奥黛塔的下回合开始时清除——简化：她的回合结束时保持，她的下回合开始清除）
}

async function playPhase(p) {
  while (true) {
    if (G.over) return;
    ui.updateAll();
    let act = null;
    if (p.isHuman) act = await ui.getPlayAction(p);
    else { await sleep(500); act = await aiPlayAction(p); }
    if (!act || act.type === 'end') { logL('sys', `${nameOf(p)} 结束出牌阶段`); break; }
    if (act.type === 'play') {
      const card = act.card;
      if (card.consume) { for (const c of card.consume) { removeFromHand(p, c); G.discard.push(c); } }
      else removeFromHand(p, card);
      await useCard(p, card, act.targets || []);
    } else if (act.type === 'skill') {
      await useSkill(p, act.skill, act);
    }
    ui.updateAll();
    if (G.over) return;
  }
}

async function useCard(p, card, targets) {
  const def = CARDS.find(d => d.key === card.key);
  logL('sys', `${nameOf(p)} 使用 <b>【${card.name}】</b>${targets.length ? ' → ' + targets.map(t => t.hero.name).join('、') : ''}`);
  await ui.stageCard(card, p, targets[0] ? `→ ${targets[0].hero.name}` : '');

  if (card.type === 'basic') {
    if (isShaCard(card)) {
      p.usedPerTurn._shaCount = (p.usedPerTurn._shaCount || 0) + 1;
      await resolveAttack(p, card, targets);
      if (!card.virtual) G.discard.push(card);
    } else if (card.key === 'shan') { /* 不主动使用 */ if (!card.virtual) G.discard.push(card); }
    else if (card.key === 'tao') {
      const t = targets[0] || p;
      t.hp = Math.min(t.maxHp, t.hp + 1);
      ui.floatText(t.seat, '+1', 'heal');
      logL('sys', `${nameOf(p)} 使用【料理·${DISHES[card.dish]}】，${nameOf(t)} 回复1点体力`);
      if (t.equips.artifact && t.equips.artifact.key === 'a_shaonv') { t.hand.push(...drawCards(1)); logL('sys', `${nameOf(t)}【被怜爱的少女】摸1张牌`); }
      if (!card.virtual) G.discard.push(card);
    } else if (card.key === 'jiu') {
      if (p.hp <= 0) { p.hp += 1; logL('sys', `【果酒】自救，回复1点体力`); }
      else { p.flags.drunk = true; logL('sys', `${nameOf(p)} 饮下【果酒】，下一张攻击伤害+1`); }
      if (!card.virtual) G.discard.push(card);
    }
  } else if (card.type === 'trick') {
    await resolveTrick(p, card, targets);
    if (!card.virtual) G.discard.push(card);
  } else if (card.type === 'equip') {
    const slot = card.sub === 'weapon' ? 'weapon' : card.sub === 'artifact' ? 'artifact'
      : card.key === 'm_wing' ? 'mountAtk' : 'mountDef';
    if (p.equips[slot]) G.discard.push(p.equips[slot]);
    p.equips[slot] = card;
    logL('minor', `${nameOf(p)} 装备了 <b>【${card.name}】</b>`);
  }
  ui.updateAll();
}

/* ---------- 主动技能实现 ---------- */
async function useSkill(p, sk, act) {
  const targets = act.targets || [];
  logL('skill', `${nameOf(p)} 发动【${sk.name}】`);
  p.usedPerTurn['sk_' + sk.key] = (p.usedPerTurn['sk_' + sk.key] || 0) + 1;
  if (sk.type === 'O') p.usedOnce[sk.key] = true;

  switch (sk.key) {
    case 'venti1': {
      for (const t of targets) await chooseDiscard(p, t, 1, '被【高天之歌】卷走手牌');
      const n = targets.length;
      if (n) { p.hand.push(...drawCards(n)); logL('sys', `${nameOf(p)} 摸${n}张牌`); }
      break;
    }
    case 'venti2': {
      for (const t of alive().filter(q => q !== p)) await dealDamage(p, t, 1, 'anemo');
      break;
    }
    case 'klee1': {
      const card = act.costCard;
      if (card) { removeFromHand(p, card); G.discard.push(card); }
      await resolveAttack(p, { ...makeCard(CARDS.find(d => d.key === 'sha_pyro')), name: '火之攻击' }, targets);
      break;
    }
    case 'eula2': {
      const n = p.tokens.heart || 0;
      p.tokens.heart = 0;
      if (n > 0) { logL('skill', `凝浪之光剑：${n}点冰伤害`); await dealDamage(p, targets[0], n, 'cryo'); }
      break;
    }
    case 'zhongli2': {
      for (const t of alive().filter(q => q !== p)) await dealDamage(p, t, 1, 'geo');
      break;
    }
    case 'hutao1': {
      p.hp -= 1;
      logL('sys', `${nameOf(p)} 失去1点体力`);
      p.flags.hutaoBuff = true;
      ui.updateAll();
      if (p.hp <= 0) await dyingProcess(p);
      break;
    }
    case 'keqing1': {
      p.flags.infRange = true;
      p.flags.keqingInfuse = true;
      logL('skill', `雷楔：攻击范围无限，下一张攻击视为雷之攻击`);
      break;
    }
    case 'raiden2': {
      const n = act.wishCount || 1;
      p.tokens.yuanli -= n;
      logL('skill', `无想的一刀：${n}点雷伤害`);
      await dealDamage(p, targets[0], n, 'electro');
      break;
    }
    case 'ayaka1': {
      p.hand.push(...drawCards(2));
      p.flags.ayakaInfuse = true;
      logL('skill', `霰步：摸2张牌，本回合攻击视为冰之攻击`);
      break;
    }
    case 'yae1': {
      p.tokens.sakra = Math.min(3, (p.tokens.sakra || 0) + 1);
      const card = act.costCard;
      if (card) { removeFromHand(p, card); G.discard.push(card); }
      logL('sys', `放置杀生樱（场上 ${p.tokens.sakra} 枚）`);
      break;
    }
    case 'nahida1': {
      const t = targets[0];
      const shown = t.isHuman || !t.isHuman ? t.hand : t.hand;
      if (p.isHuman) await ui.viewHand(t, '所闻遍计：观看手牌');
      else logL('sys', `观看了 ${nameOf(t)} 的手牌（${t.hand.length}张）`);
      if (Object.keys(p.marks.seeds || {}).length < 3) {
        t.marks.seed = 1; p.marks.seeds = p.marks.seeds || {}; p.marks.seeds[t.seat] = 1;
        logL('sys', `${nameOf(t)} 获得蕴种印`);
      }
      break;
    }
    case 'nilou1': {
      const t = targets[0];
      if (t.hp < t.maxHp) { t.hp = Math.min(t.maxHp, t.hp + 1); ui.floatText(t.seat, '+1', 'heal'); logL('sys', `【金杯的丰穰】${nameOf(t)} 回复1点体力`); }
      else { t.hand.push(...drawCards(2)); logL('sys', `【金杯的丰穰】${nameOf(t)} 满体力，改为摸2张牌`); }
      break;
    }
    case 'furina1': {
      const card = act.costCard;
      if (card) { removeFromHand(p, card); G.discard.push(card); }
      const t = targets[0];
      let mode = 'draw';
      if (p.isHuman) mode = await ui.askChoice(`【普世欢腾】令 ${t.hero.name} 摸2张牌还是回复1点体力？`, ['摸2张牌', '回复体力']) === '摸2张牌' ? 'draw' : 'heal';
      else mode = t.hp < t.maxHp - 1 ? 'draw' : (t.hp < t.maxHp ? 'heal' : 'draw');
      if (mode === 'draw') { t.hand.push(...drawCards(2)); logL('sys', `${nameOf(t)} 摸2张牌`); }
      else { t.hp = Math.min(t.maxHp, t.hp + 1); ui.floatText(t.seat, '+1', 'heal'); logL('sys', `${nameOf(t)} 回复1点体力`); }
      break;
    }
    case 'clorinde1': {
      const t = targets[0];
      const myCard = p.isHuman ? await ui.askPlayCard('【挑战】请选择拼点牌（点数大者胜）', () => true, { forced: true })
        : p.hand.slice().sort((a, b) => b.point - a.point)[0];
      const tCard = t.isHuman ? await ui.askPlayCard(`${p.hero.name} 与你【拼点】，请选择拼点牌`, () => true, { forced: true })
        : t.hand.slice().sort((a, b) => b.point - a.point)[0];
      logL('gold', `拼点：${nameOf(p)} <b>${myCard.point}</b> vs ${nameOf(t)} <b>${tCard.point}</b>`);
      removeFromHand(p, myCard); G.discard.push(myCard);
      removeFromHand(t, tCard); G.discard.push(tCard);
      if (myCard.point > tCard.point) {
        logL('skill', `${nameOf(p)} 拼点胜利！视为雷之攻击`);
        await resolveAttack(p, { name: '雷之攻击', elem: 'electro', key: 'sha_electro' }, [t], { noCount: true });
      } else {
        logL('sys', `${nameOf(p)} 拼点失败`);
        if (p.hand.length) await chooseDiscard(t, p, 1, '拼点失败被弃一张牌');
      }
      break;
    }
    case 'mavuika2': break;
    case 'xilonen2': {
      const card = act.costCard;
      if (card) { removeFromHand(p, card); G.discard.push(card); }
      const t = targets[0];
      let mode = t.hp < t.maxHp ? 'heal' : 'draw';
      if (p.isHuman) mode = await ui.askChoice('【日落采样】回复体力还是摸牌？', ['回复体力', '摸牌']) === '回复体力' ? 'heal' : 'draw';
      if (mode === 'heal') { t.hp = Math.min(t.maxHp, t.hp + 1); ui.floatText(t.seat, '+1', 'heal'); }
      else { t.hand.push(...drawCards(1)); }
      logL('sys', `【日落采样】${nameOf(t)} ${mode === 'heal' ? '回复1点体力' : '摸1张牌'}`);
      break;
    }
    case 'aino1': {
      const revealed = drawCards(3);
      logL('sys', `【机械工坊】亮出：${revealed.map(c => c.name).join('、')}`);
      for (const c of revealed) {
        if (c.type === 'equip') { p.hand.push(c); logL('sys', `${nameOf(p)} 获得了 <b>${c.name}</b>`); }
        else G.discard.push(c);
      }
      break;
    }
    case 'colu1': {
      const card = act.costCard;
      if (card) { removeFromHand(p, card); G.discard.push(card); }
      const t = targets[0];
      if (t.attach) { logL('skill', `崩落之月：视为对 ${nameOf(t)} 使用水之攻击`); await resolveAttack(p, { name: '水之攻击', elem: 'hydro', key: 'sha_hydro' }, [t], { noCount: true }); }
      else { t.attach = 'hydro'; logL('skill', `崩落之月：${nameOf(t)} 获得水附着`); }
      break;
    }
    case 'aly1': {
      const card = act.costCard;
      if (card) { removeFromHand(p, card); G.discard.push(card); }
      for (const t of targets) { if (t.alive) await dealDamage(p, t, 1, 'electro'); }
      p.usedPerTurn._dealtDmg = true;
      break;
    }
    case 'odette1': {
      const card = act.costCard;
      if (card) { removeFromHand(p, card); G.discard.push(card); }
      const t = targets[0];
      const count = G.players.filter(q => q.marks.starfield && q._starOwner === p.seat).length;
      if (count < 2) { t.marks.starfield = 1; t._starOwner = p.seat; logL('skill', `【星辉域】笼罩了 ${nameOf(t)}`); }
      break;
    }
    case 'vody1': {
      const card = act.costCard;
      if (card) { removeFromHand(p, card); G.discard.push(card); }
      const t = targets[0];
      t.hp = Math.min(t.maxHp, t.hp + 1); t.hand.push(...drawCards(1));
      ui.floatText(t.seat, '+1', 'heal');
      logL('sys', `【羽翎之诗】${nameOf(t)} 回复1点体力并摸1张牌`);
      break;
    }
  }
  ui.updateAll();
}

/* ---------- 攻击结算前的元素注入（绫华/刻晴） ---------- */
const _origResolveAttack = resolveAttack;
resolveAttack = async function (user, card, targets, opts = {}) {
  if (card.key === 'sha' || card.elem === 'none') {
    if (user.flags.ayakaInfuse) card = { ...card, elem: 'cryo', name: '冰之攻击' };
    else if (user.flags.keqingInfuse) { card = { ...card, elem: 'electro', name: '雷之攻击' }; user.flags.keqingInfuse = false; }
  }
  return _origResolveAttack(user, card, targets, opts);
};

/* ---------- 主循环 ---------- */
async function gameLoop() {
  while (!G.over) {
    const p = cur();
    if (p.alive) {
      // 星辉域在奥黛塔回合开始时清除她此前放置的
      if (hasSkill(p, 'odette1')) {
        for (const q of G.players) {
          if (q.marks.starfield && q._starOwner === p.seat) { delete q.marks.starfield; delete q._starOwner; }
        }
      }
      await runTurn(p);
      await sleep(300);
    }
    if (G.over) break;
    G.curIdx = (G.curIdx + 1) % G.players.length;
    if (G.curIdx === 0) G.round++;
  }
  ui.showResult(G.result);
}
