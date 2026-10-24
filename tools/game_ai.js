/* ================= AI 层：身份推断 / 出牌 / 响应启发式 ================= */

// 阵营关系：敌意矩阵（行：自己的角色，列：目标角色）
function isEnemy(me, q) {
  if (me.role === 'lord' || me.role === 'loyalist') return q.role === 'rebel' || q.role === 'spy';
  if (me.role === 'rebel') return q.role === 'lord' || q.role === 'loyalist';
  return true; // spy：对所有人保持敌意（择机而动）
}
function isFriend(me, q) {
  if (me.role === 'lord') return q.role === 'loyalist';
  if (me.role === 'loyalist') return q.role === 'lord';
  if (me.role === 'rebel') return q.role === 'rebel';
  return false;
}

// 威胁评分：越低血、装备越多越优先
function threatScore(me, q) {
  let s = (1 - q.hp / q.maxHp) * 60;
  if (q.equips.weapon) s += 8;
  if (q.role === 'lord') s += 10;
  if (isFriend(me, q)) s -= 100;
  if (q.hp <= 1) s += 25;
  return s;
}
function aiPick(me, candidates) {
  if (!candidates || !candidates.length) return null;
  return candidates.slice().sort((a, b) => threatScore(me, b) - threatScore(me, a))[0];
}
function aiPickReveal(t, revealed) {
  let best = 0, bs = -1;
  revealed.forEach((c, i) => {
    let s = 0;
    if (c.type === 'equip') s = 6;
    if (c.key === 'tao') s = 8;
    if (isShaCard(c)) s = 5;
    if (c.key === 'wuxie') s = 7;
    if (s > bs) { bs = s; best = i; }
  });
  return best;
}

/* ---------- 响应 ---------- */
function aiRespond(p, kind, ctx) {
  if (kind === 'shan') return p.hand.find(c => c.key === 'shan') || null;
  if (kind === 'needSha') return p.hand.find(isShaCard) || null;
  if (kind === 'duelSha') {
    // 有攻击牌就打（保留最后一张闪避）
    const sha = p.hand.find(c => isShaCard(c));
    if (sha && (p.hand.length > 2 || p.hp <= 2)) return sha;
    return null;
  }
  if (kind === 'chainSha') return p.hand.find(isShaCard) || null;
  if (kind === 'jiedaoSha') {
    if (ctx.victim && isEnemy(p, ctx.victim)) return p.hand.find(isShaCard) || null;
    return null;
  }
  if (kind === 'wuxie') {
    // 关键锦囊才反制：对己方不利的
    const d = ctx.cardDef;
    if (!d) return null;
    const target = ctx.target;
    const badForMe = target ? isFriend(p, target) || target === p : (d.key === 'wanjian' || d.key === 'shenyuan' || d.key === 'juedou');
    if (!badForMe) return null;
    if (d.key === 'mibao' && ctx.user && isFriend(p, ctx.user)) return null;
    return p.hand.find(c => c.key === 'wuxie') || null;
  }
  return null;
}
function aiWants(p, kind, target) {
  switch (kind) {
    case 'fengying': return target && isEnemy(p, target) && p.hand.length >= 3;
    case 'humo': return target && isEnemy(p, target);
    case 'ayaka2': return target && isEnemy(p, target);
    case 'vody2': return target && isEnemy(p, target) && target.hand.length > 0;
    case 'nilouPay': return target && isEnemy(p, target) ? false : true;
    case 'neuvBurst': return true;
    case 'furinaSave': return isFriend(p, target) || target.role === 'lord' && p.role === 'spy' ? false : (isFriend(p, target) || (p.role === 'rebel' && target.role === 'rebel'));
    default: return false;
  }
}
function aiChooseSave(p, dying) {
  // 救援策略：救主公/队友，不救敌人（内奸救主公保持平衡）
  const friend = isFriend(p, dying) || (p.role === 'spy' && dying.role === 'lord' && alive().filter(q => q.role === 'rebel').length > 0);
  const self = p === dying;
  if (!friend && !self) return null;
  if (p.role === 'spy' && dying.role === 'spy') return null;
  const tao = p.hand.find(c => c.key === 'tao');
  if (tao) return tao;
  if (self && p.hp <= 0) { const jiu = p.hand.find(c => c.key === 'jiu'); if (jiu) return jiu; }
  return null;
}
function aiDiscard(p, n) {
  const arr = p.hand.slice();
  arr.sort((a, b) => cardKeepVal(a) - cardKeepVal(b));
  return arr.slice(0, n);
}
function cardKeepVal(c) {
  if (c.key === 'tao') return 9;
  if (c.key === 'shan') return 7;
  if (c.key === 'wuxie') return 6;
  if (isShaCard(c)) return 5;
  if (c.type === 'equip') return 4;
  return 2;
}

/* ---------- 出牌主决策 ---------- */
async function aiPlayAction(p) {
  const hand = p.hand.slice();
  // 1. 装备
  for (const c of hand) {
    if (c.type === 'equip') {
      const slot = c.sub === 'weapon' ? 'weapon' : c.sub === 'artifact' ? 'artifact' : c.key === 'm_wing' ? 'mountAtk' : 'mountDef';
      if (!p.equips[slot]) return { type: 'play', card: c, targets: [] };
      if (c.sub === 'weapon' && p.equips.weapon && p.equips.weapon.range < c.range) return { type: 'play', card: c, targets: [] };
    }
  }
  // 2. 料理（自己受伤）
  const tao = hand.find(c => c.key === 'tao');
  if (tao && p.hp <= p.maxHp - 1 && p.hp <= 3) return { type: 'play', card: tao, targets: [p] };
  // 3. 秘宝
  const mibao = hand.find(c => c.key === 'mibao');
  if (mibao) return { type: 'play', card: mibao, targets: [] };
  // 4. 果酒+攻击连招（敌人低血）
  const jiu = hand.find(c => c.key === 'jiu');
  const enemiesInRange = alive().filter(q => q !== p && inAtkRange(p, q) && isEnemy(p, q));
  if (jiu && enemiesInRange.length && p.hp > 2 && p.usedPerTurn._shaCount !== undefined) {
    const weak = enemiesInRange.find(q => q.hp <= 2);
    if (weak) return { type: 'play', card: jiu, targets: [] };
  }
  // 5. 攻击（选择能触发反应的最优元素）
  const atkCount = maxAttacks(p);
  if ((p.usedPerTurn._shaCount || 0) < atkCount) {
    const target = aiPick(p, enemiesInRange);
    if (target) {
      let best = null, bestScore = -1;
      for (const c of hand) {
        if (!isShaCard(c)) continue;
        if (!c.elem || c.elem === 'none') {
          // 普通攻击：分数低，除非有蝶引来生加成
          if (bestScore < 1) { best = c; bestScore = 1; }
        } else {
          const rx = calcReaction(p, target, c.elem);
          let s = 3 + (rx ? 4 : 0);
          if (target.attach === c.elem) s = 2;
          if (s > bestScore) { best = c; bestScore = s; }
        }
      }
      if (best) return { type: 'play', card: best, targets: [target] };
      // 静水流涌之辉：两张手牌当攻击
      if (p.equips.weapon && p.equips.weapon.key === 'w_jingshui' && hand.length >= 3) {
        return { type: 'skill', skill: { key: '_virtual', name: '静水流涌之辉' }, virtual: 'sha2', targets: [target] };
      }
    }
  }
  // 6. 锦囊
  for (const c of hand) {
    if (c.type !== 'trick') continue;
    if (c.key === 'shihuang' || c.key === 'daobao') {
      const maxD = c.key === 'shihuang' ? 1 : 99;
      const targets = alive().filter(q => q !== p && dist(p, q) <= maxD && isEnemy(p, q));
      if (targets.length) return { type: 'play', card: c, targets: [aiPick(p, targets)] };
    }
    if (c.key === 'juedou') {
      const targets = alive().filter(q => q !== p && isEnemy(p, q) && q.hand.length <= 2);
      if (targets.length) return { type: 'play', card: c, targets: [aiPick(p, targets)] };
    }
    if (c.key === 'wanjian' || c.key === 'shenyuan') {
      const enemies = alive().filter(q => q !== p && isEnemy(p, q));
      const friends = alive().filter(q => q !== p && isFriend(p, q));
      if (enemies.length > friends.length) return { type: 'play', card: c, targets: [] };
    }
    if (c.key === 'taoyuan') {
      if (p.hp < p.maxHp || alive().some(q => isFriend(p, q) && q.hp < q.maxHp)) return { type: 'play', card: c, targets: [] };
    }
    if (c.key === 'wugu') return { type: 'play', card: c, targets: [] };
    if (c.key === 'lianhuan') {
      const targets = alive().filter(q => q !== p && isEnemy(p, q) && q.attach).slice(0, 2);
      if (targets.length >= 1) return { type: 'play', card: c, targets };
    }
    if (c.key === 'shandian') return { type: 'play', card: c, targets: [] };
    if (c.key === 'lebus') {
      const targets = alive().filter(q => q !== p && isEnemy(p, q) && !q.judgments.length && dist(p, q) <= 4);
      if (targets.length) return { type: 'play', card: c, targets: [aiPick(p, targets)] };
    }
    if (c.key === 'jiedao') {
      const ts = alive().filter(q => q !== p && isEnemy(p, q) && q.equips.weapon);
      if (ts.length) return { type: 'play', card: c, targets: [ts[0]] };
    }
  }
  // 7. 主动技能（按武将）
  const skAct = aiSkillAction(p, hand);
  if (skAct) return skAct;
  // 8. 再检查攻击（技能后解锁的）
  if ((p.usedPerTurn._shaCount || 0) < maxAttacks(p)) {
    const target = aiPick(p, enemiesInRange);
    const sha = hand.find(isShaCard);
    if (target && sha) return { type: 'play', card: sha, targets: [target] };
  }
  return { type: 'end' };
}

function maxAttacks(p) {
  let n = 1;
  if (p.equips.weapon && p.equips.weapon.key === 'w_feilei') n += 99;
  if (hasSkill(p, 'flins2')) n += 1;
  if (hasSkill(p, 'chasca1')) n += 1;
  if (hasSkill(p, 'cyno1')) n += 1;
  n += (p.flags.atkBonusCount || 0);
  return n;
}

function aiSkillAction(p, hand) {
  const H = p.hero.skills.filter(s => s.type === 'A' || s.type === 'O');
  const usable = k => !p.usedOnce[k] && !(p.usedPerTurn['sk_' + k] >= 1);
  for (const sk of H) {
    if (!usable(sk.key)) continue;
    const enemies = alive().filter(q => q !== p);
    switch (sk.key) {
      case 'venti1': {
        const ts = alive().filter(q => q !== p && q.hand.length && isEnemy(p, q)).slice(0, 2);
        if (ts.length) return { type: 'skill', skill: sk, targets: ts };
        break;
      }
      case 'venti2': if (G.round >= 1 && enemies.length) return { type: 'skill', skill: sk, targets: [] }; break;
      case 'klee1': {
        const cost = hand.find(c => !isShaCard(c) && c.type === 'basic') || hand.find(c => c.type === 'trick' && c.key !== 'wuxie');
        const ts = enemies.filter(q => inAtkRange(p, q)).sort((a, b) => threatScore(p, b) - threatScore(p, a)).slice(0, 2);
        if (cost && ts.length) return { type: 'skill', skill: sk, targets: ts, costCard: cost };
        break;
      }
      case 'eula2': {
        const n = p.tokens.heart || 0;
        if (n >= 2) { const t = aiPick(p, enemies.filter(q => inAtkRange(p, q) || true)); if (t) return { type: 'skill', skill: sk, targets: [t] }; }
        break;
      }
      case 'zhongli2': if (G.round >= 1 && enemies.length >= 3) return { type: 'skill', skill: sk, targets: [] }; break;
      case 'hutao1': if (p.hp >= 2 && enemies.some(q => inAtkRange(p, q))) return { type: 'skill', skill: sk, targets: [] }; break;
      case 'keqing1': {
        const far = enemies.find(q => !inAtkRange(p, q) && threatScore(p, q) > 30);
        if (far) return { type: 'skill', skill: sk, targets: [] };
        break;
      }
      case 'raiden2': {
        const n = Math.min(3, p.tokens.yuanli || 0);
        if (n >= 2) { const t = aiPick(p, enemies); if (t) return { type: 'skill', skill: sk, targets: [t], wishCount: n }; }
        break;
      }
      case 'ayaka1': return { type: 'skill', skill: sk, targets: [] };
      case 'yae1': {
        const cost = hand.length > 2 ? hand[hand.length - 1] : null;
        if (cost && (p.tokens.sakra || 0) < 3) return { type: 'skill', skill: sk, targets: [], costCard: cost };
        break;
      }
      case 'nahida1': {
        const t = aiPick(p, enemies);
        if (t) return { type: 'skill', skill: sk, targets: [t] };
        break;
      }
      case 'nilou1': {
        const wounded = alive().filter(q => q.hp < q.maxHp && (isFriend(p, q) || q === p));
        if (wounded.length) return { type: 'skill', skill: sk, targets: [wounded[0]] };
        break;
      }
      case 'furina1': {
        const cost = hand.length > 1 ? hand.filter(c => c.key !== 'shan' && c.key !== 'tao')[0] : null;
        const ally = alive().find(q => isFriend(p, q) && (q.hp < q.maxHp || q.hand.length < 2));
        if (cost && (ally || p.hp < p.maxHp)) return { type: 'skill', skill: sk, targets: [ally || p], costCard: cost };
        break;
      }
      case 'clorinde1': {
        const t = aiPick(p, enemies);
        if (t && p.hand.length >= 2) return { type: 'skill', skill: sk, targets: [t] };
        break;
      }
      case 'mavuika1': if (G.round >= 1 && enemies.length >= 2) return { type: 'skill', skill: sk, targets: [] }; break;
      case 'xilonen2': {
        const cost = hand.length > 1 ? hand[hand.length - 1] : null;
        const wounded = alive().filter(q => q.hp < q.maxHp && (isFriend(p, q) || q === p));
        if (cost && wounded.length) return { type: 'skill', skill: sk, targets: [wounded[0]], costCard: cost };
        break;
      }
      case 'aino1': return { type: 'skill', skill: sk, targets: [] };
      case 'colu1': {
        const cost = hand.length > 1 ? hand[hand.length - 1] : null;
        const t = enemies.find(q => q.attach) || enemies.find(q => isFriend(p, q) === false && q.attach === null && false);
        if (cost && t) return { type: 'skill', skill: sk, targets: [t], costCard: cost };
        break;
      }
      case 'aly1': {
        const cost = hand.length > 1 ? hand[hand.length - 1] : null;
        const ts = enemies.sort((a, b) => threatScore(p, b) - threatScore(p, a)).slice(0, 2);
        if (cost && ts.length) return { type: 'skill', skill: sk, targets: ts, costCard: cost };
        break;
      }
      case 'odette1': {
        const cost = hand.length > 1 ? hand[hand.length - 1] : null;
        const t = enemies.find(q => !q.marks.starfield);
        if (cost && t) return { type: 'skill', skill: sk, targets: [t], costCard: cost };
        break;
      }
      case 'vody1': {
        const cost = hand.length > 1 ? hand[hand.length - 1] : null;
        const wounded = alive().filter(q => q.hp < q.maxHp && (isFriend(p, q) || q === p));
        if (cost && wounded.length) return { type: 'skill', skill: sk, targets: [wounded[0]], costCard: cost };
        break;
      }
    }
  }
  return null;
}
