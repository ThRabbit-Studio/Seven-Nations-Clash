/* ================= 规则粘合层 + 入口 ================= */

function skillUsable(p, sk) {
  if (sk.type === 'O' && p.usedOnce[sk.key]) return false;
  if (p.usedPerTurn['sk_' + sk.key]) return false;
  const others = alive().filter(q => q !== p);
  switch (sk.key) {
    case 'venti1': return others.some(q => q.hand.length);
    case 'eula2': return (p.tokens.heart || 0) > 0;
    case 'raiden2': return (p.tokens.yuanli || 0) > 0 && others.length > 0;
    case 'klee1': return p.hand.length > 0 && others.some(q => inAtkRange(p, q));
    case 'yae1': return p.hand.length > 0 && (p.tokens.sakra || 0) < 3;
    case 'nahida1': return others.length > 0;
    case 'nilou1': return others.some(q => q.hp < q.maxHp) || others.length > 0;
    case 'furina1': case 'xilonen2': case 'vody1': case 'colu1': case 'odette1': case 'aly1':
      return p.hand.length > 0 && others.length > 0;
    case 'odette1x': return false;
    case 'hutao1': return p.hp > 1;
    case 'clorinde1': return p.hand.length >= 2 && others.length > 0;
    default: return true;
  }
}

const SKILL_TARGETS = {
  venti1:  { min: 1, max: 2, cand: p => alive().filter(q => q !== p && q.hand.length) },
  eula2:   { min: 1, max: 1, cand: p => alive().filter(q => q !== p) },
  raiden2: { min: 1, max: 1, cand: p => alive().filter(q => q !== p) },
  klee1:   { min: 1, max: 2, cand: p => alive().filter(q => q !== p && inAtkRange(p, q)) },
  nahida1: { min: 1, max: 1, cand: p => alive().filter(q => q !== p) },
  nilou1:  { min: 1, max: 1, cand: p => alive().filter(q => q !== p) },
  furina1: { min: 1, max: 1, cand: p => alive() },
  clorinde1: { min: 1, max: 1, cand: p => alive().filter(q => q !== p) },
  xilonen2: { min: 1, max: 1, cand: p => alive() },
  colu1:   { min: 1, max: 1, cand: p => alive().filter(q => q !== p) },
  aly1:    { min: 1, max: 2, cand: p => alive().filter(q => q !== p) },
  odette1: { min: 1, max: 1, cand: p => alive().filter(q => q !== p) },
  vody1:   { min: 1, max: 1, cand: p => alive() },
};

function canPlay(p, c) {
  if (isShaCard(c)) return (p.usedPerTurn._shaCount || 0) < maxAttacks(p) && allInAtkRange(p).length > 0;
  if (c.key === 'shan') return hasSkill(p, 'chasca1') && (p.usedPerTurn._shaCount || 0) < maxAttacks(p) && allInAtkRange(p).length > 0;
  switch (c.key) {
    case 'tao': return p.hp < p.maxHp || alive().some(q => q !== p && q.hp <= 0);
    case 'jiu': return !p.flags.drunk;
    case 'mibao': case 'wugu': case 'shandian': return true;
    case 'shihuang': return alive().some(q => q !== p && dist(p, q) <= 1);
    case 'daobao': case 'juedao': case 'jiedao': return alive().some(q => q !== p);
    case 'lebus': return alive().some(q => q !== p && dist(p, q) <= 4 && !q.judgments.some(j => j.key === 'lebus'));
    case 'lianhuan': return alive().some(q => q !== p);
    case 'wanjian': case 'shenyuan': case 'taoyuan': return alive().length > 1;
    default: return c.type === 'equip';
  }
}

function targetSpec(p, c) {
  const others = alive().filter(q => q !== p);
  if (isShaCard(c)) {
    const cands = others.filter(q => inAtkRange(p, q));
    return cands.length ? { min: 1, max: 1, cands: new Set(cands) } : null;
  }
  switch (c.key) {
    case 'tao': {
      const cands = [...(p.hp < p.maxHp ? [p] : []), ...others.filter(q => q.hp <= 0)];
      return cands.length ? { min: 1, max: 1, cands: new Set(cands) } : null;
    }
    case 'shihuang': {
      const cs = others.filter(q => dist(p, q) <= 1);
      return cs.length ? { min: 1, max: 1, cands: new Set(cs) } : null;
    }
    case 'daobao': case 'juedao': case 'jiedao':
      return others.length ? { min: 1, max: 1, cands: new Set(others) } : null;
    case 'lebus': {
      const cs = others.filter(q => dist(p, q) <= 4 && !q.judgments.some(j => j.key === 'lebus'));
      return cs.length ? { min: 1, max: 1, cands: new Set(cs) } : null;
    }
    case 'lianhuan':
      return others.length ? { min: 1, max: Math.min(2, others.length), cands: new Set(others) } : null;
    default: return null;
  }
}

/* ---------- 入口 ---------- */
async function startGame(heroKey) {
  newGame(heroKey);
  window.__G = G; window.__ui = ui; window.__E = { dealDamage, resolveAttack, useCard, useSkill };
  renderGame();
  const me = G.players[0];
  ui.log('gold', `你的武将是 <b>${me.hero.name}</b>（${me.hero.title} · ${NATIONS[me.hero.nation].name} · ${ELEMS[me.hero.elem].name}）`);
  ui.log('warn', `你的身份：<b>${ROLES[me.role].name}</b> —— ${ROLES[me.role].desc}`);
  ui.log('sys', '主公已亮明身份，其他玩家身份保密。祝好运！');
  ui.updateAll();
  gameLoop();
}

showMenu();
