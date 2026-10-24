/* ================= 数据层：元素 / 反应 / 卡牌 / 武将 ================= */

const ELEMS = {
  none:    { name: '无',   color: '#c8c8c8', glyph: 'g_atk' },
  pyro:    { name: '火',   color: '#ef7938', icon: 'el_fire',  glyph: 'g_fire' },
  hydro:   { name: '水',   color: '#4cc2f1', icon: 'el_hydro', glyph: 'g_hydro' },
  electro: { name: '雷',   color: '#af6ec4', icon: 'el_electro', glyph: 'g_electro' },
  anemo:   { name: '风',   color: '#74c2a8', icon: 'el_anemo', glyph: 'g_wind' },
  geo:     { name: '岩',   color: '#e2a83c', icon: 'el_geo',   glyph: 'g_geo' },
  dendro:  { name: '草',   color: '#a5c83b', icon: 'el_dendro', glyph: 'g_flower' },
  cryo:    { name: '冰',   color: '#9fd6e3', icon: 'el_cryo',  glyph: 'g_cryo' },
};

const NATIONS = {
  mondstadt: { name: '蒙德', color: '#74c2a8' },
  liyue:     { name: '璃月', color: '#e2a83c' },
  inazuma:   { name: '稻妻', color: '#af6ec4' },
  sumeru:    { name: '须弥', color: '#a5c83b' },
  fontaine:  { name: '枫丹', color: '#4cc2f1' },
  natlan:    { name: '纳塔', color: '#ef7938' },
  nodkrai:   { name: '挪德卡莱', color: '#b7c9e6' },
  snezhnaya: { name: '至冬', color: '#9fd6e3' },
};

// 反应表：key: {name, icon, kind, color}
const REACTIONS = {
  vaporize:      { name: '蒸发', icon: 're_vaporize', kind: 'amp', color: '#ffb27d', desc: '伤害+1' },
  melt:          { name: '融化', icon: 're_melt', kind: 'amp', color: '#ffc9a0', desc: '伤害+1' },
  quicken:       { name: '激化', icon: 're_quicken', kind: 'amp', color: '#c9e88a', desc: '伤害+1' },
  overload:      { name: '超载', icon: 're_overload', kind: 'discard1', color: '#ff8f6a', desc: '目标弃1张手牌' },
  superconduct:  { name: '超导', icon: 're_superconduct', kind: 'breakEquip', color: '#b8d4f0', desc: '目标弃1张装备区牌' },
  electrocharged:{ name: '感电', icon: 're_electro', kind: 'spreadElectro', color: '#c99df0', desc: '相邻两名其他角色获得雷附着' },
  frozen:        { name: '冻结', icon: 're_frozen', kind: 'frozen', color: '#bfe8f5', desc: '目标在其下回合结束前不能使用闪避' },
  bloom:         { name: '绽放', icon: 're_bloom', kind: 'core', color: '#b3e07a', desc: '目标获得草原核：其回合开始时受1点草伤' },
  crystallize:   { name: '结晶', icon: 're_crystal', kind: 'shield', color: '#f0c96a', desc: '伤害来源获得1点护盾' },
  swirl:         { name: '扩散', icon: 're_swirl', kind: 'swirl', color: '#9fe8cd', desc: '伤害来源令目标距离1内另一名角色获得同元素附着' },
};
// 附着元素 → 来犯元素 → 反应
const REACT_MAP = {
  pyro:    { hydro: 'vaporize', cryo: 'melt', electro: 'overload' },
  hydro:   { pyro: 'vaporize', cryo: 'frozen', dendro: 'bloom', electro: 'electrocharged' },
  cryo:    { pyro: 'melt', hydro: 'frozen', electro: 'superconduct' },
  electro: { pyro: 'overload', hydro: 'electrocharged', cryo: 'superconduct', dendro: 'quicken' },
  dendro:  { hydro: 'bloom', electro: 'quicken' },
};

/* ---------- 卡牌定义 ---------- */
// target: {sel:'none'|'self'|'single'|'aoe'|'aoeRespond', inRange, dist, needRespond, multi}
const CARDS = [
  // 基本牌
  { key: 'sha', type: 'basic', name: '攻击', elem: 'none', count: 20, art: 'g_atk', tint: '#b8c0d8',
    target: { sel: 'single', inRange: true }, desc: '对攻击范围内一名角色造成1点伤害，可用【闪避】响应。' },
  { key: 'sha_pyro', type: 'basic', name: '火之攻击', elem: 'pyro', count: 4, art: 'g_fire', tint: '#ef7938',
    target: { sel: 'single', inRange: true }, desc: '造成1点火伤害并附加火元素（可引发反应）。' },
  { key: 'sha_electro', type: 'basic', name: '雷之攻击', elem: 'electro', count: 4, art: 'g_electro', tint: '#af6ec4',
    target: { sel: 'single', inRange: true }, desc: '造成1点雷伤害并附加雷元素（可引发反应）。' },
  { key: 'sha_cryo', type: 'basic', name: '冰之攻击', elem: 'cryo', count: 3, art: 'g_cryo', tint: '#9fd6e3',
    target: { sel: 'single', inRange: true }, desc: '造成1点冰伤害并附加冰元素（可引发反应）。' },
  { key: 'sha_hydro', type: 'basic', name: '水之攻击', elem: 'hydro', count: 3, art: 'g_hydro', tint: '#4cc2f1',
    target: { sel: 'single', inRange: true }, desc: '造成1点水伤害并附加水元素（可引发反应）。' },
  { key: 'sha_dendro', type: 'basic', name: '草之攻击', elem: 'dendro', count: 2, art: 'g_flower', tint: '#a5c83b',
    target: { sel: 'single', inRange: true }, desc: '造成1点草伤害并附加草元素（可引发反应）。' },
  { key: 'sha_anemo', type: 'basic', name: '风之攻击', elem: 'anemo', count: 2, art: 'g_wind', tint: '#74c2a8',
    target: { sel: 'single', inRange: true }, desc: '造成1点风伤害，扩散目标的元素附着。' },
  { key: 'sha_geo', type: 'basic', name: '岩之攻击', elem: 'geo', count: 2, art: 'g_geo', tint: '#e2a83c',
    target: { sel: 'single', inRange: true }, desc: '造成1点岩伤害，结晶为你提供1点护盾。' },
  { key: 'shan', type: 'basic', name: '闪避', elem: null, count: 20, art: 'g_def', tint: '#9fd6e3',
    target: { sel: 'respond' }, desc: '抵消一次【攻击】或群体攻击的效果。' },
  { key: 'tao', type: 'basic', name: '料理', elem: null, count: 10, art: 'dish', tint: null,
    target: { sel: 'single', dying: true, dist: null }, desc: '令一名角色回复1点体力（对濒死者也可使用）。' },
  { key: 'jiu', type: 'basic', name: '果酒', elem: null, count: 4, art: 'wine', tint: null,
    target: { sel: 'self' }, desc: '本回合你使用的下一张攻击伤害+1；濒死时可用作料理自救。' },
  // 锦囊
  { key: 'mibao', type: 'trick', name: '秘宝', count: 4, art: 'b_star', tint: null,
    target: { sel: 'self' }, desc: '摸2张牌。', wuxie: true },
  { key: 'shihuang', type: 'trick', name: '拾荒', count: 4, art: 'b_pin', tint: null,
    target: { sel: 'single', dist: 1 }, desc: '获得距离1以内一名角色的一张手牌或装备区/判定区的一张牌。', wuxie: true },
  { key: 'daobao', type: 'trick', name: '盗宝鼬', count: 4, art: 'g_chest', tint: '#e2a83c',
    target: { sel: 'single' }, desc: '弃置一名角色的一张手牌或装备区/判定区的一张牌。', wuxie: true },
  { key: 'juedou', type: 'trick', name: '武斗', count: 3, art: 'g_duel', tint: '#ef8f7d',
    target: { sel: 'single' }, desc: '与目标轮流打出【攻击】，首先不出的一方受1点伤害。', wuxie: true },
  { key: 'wanjian', type: 'trick', name: '天动万象', count: 1, art: 'el_geo', tint: null,
    target: { sel: 'aoeRespond' }, desc: '所有其他角色需打出【闪避】，否则受1点岩伤害并获得岩附着。', wuxie: true },
  { key: 'shenyuan', type: 'trick', name: '深渊浪潮', count: 1, art: 'g_atk', tint: '#8b5f9e',
    target: { sel: 'aoeRespond' }, desc: '所有其他角色需打出【攻击】，否则受1点伤害。', wuxie: true },
  { key: 'taoyuan', type: 'trick', name: '七国团圆宴', count: 1, art: 'b_heal', tint: null,
    target: { sel: 'aoe' }, desc: '所有受伤角色依次回复1点体力。', wuxie: true },
  { key: 'wugu', type: 'trick', name: '海灯节庆', count: 1, art: 'u_flourish', tint: null,
    target: { sel: 'aoe' }, desc: '亮出人数+1张牌，从你开始依次选择获得1张。', wuxie: true },
  { key: 'wuxie', type: 'trick', name: '岩盾', count: 4, art: 'g_shield', tint: '#e2a83c',
    target: { sel: 'respond' }, desc: '抵消一张锦囊牌对一名角色的效果（可被下一张岩盾反制）。' },
  { key: 'lianhuan', type: 'trick', name: '元素连锁', count: 3, art: 'g_knot', tint: '#7fb2e8',
    target: { sel: 'multi', max: 2 }, desc: '选择至多2名角色横置/恢复：被连结者受到元素伤害时，其余被连结者受同元素1点伤害并获得附着。', wuxie: true },
  { key: 'jiedao', type: 'trick', name: '委托任务', count: 2, art: 'g_flag', tint: '#d3bc8e',
    target: { sel: 'single' }, desc: '令目标对其攻击范围内你指定的一名角色使用一张【攻击】，否则其武器交给你。', wuxie: true },
  { key: 'lebus', type: 'trick', name: '怠惰之咒', count: 2, art: 'b_warn', tint: null,
    target: { sel: 'single', dist: 4 }, desc: '置于目标判定区：其判定阶段判定，若为♠则跳过出牌阶段。', wuxie: true },
  { key: 'shandian', type: 'trick', name: '雷罚之眼', count: 2, art: 'b_bolt', tint: null,
    target: { sel: 'self' }, desc: '置于你的判定区：判定阶段判定，若为♠9~K则受3点雷伤害并附着雷，然后移入弃牌堆；否则移给下家。' },
  // 装备
  { key: 'w_fengying', type: 'equip', sub: 'weapon', name: '风鹰剑', count: 1, range: 2, art: 'w_fengying',
    target: { sel: 'self' }, desc: '攻击范围2。你的【攻击】被闪避抵消时，可弃2张牌令伤害依然生效。' },
  { key: 'w_langmo', type: 'equip', sub: 'weapon', name: '狼的末路', count: 1, range: 3, art: 'w_langmo',
    target: { sel: 'self' }, desc: '攻击范围3。你的【攻击】被闪避抵消后，可再打出1张【攻击】继续结算。' },
  { key: 'w_feilei', type: 'equip', sub: 'weapon', name: '飞雷之弦振', count: 1, range: 3, art: 'w_feilei',
    target: { sel: 'self' }, desc: '攻击范围3。出牌阶段你可使用任意数量的【攻击】。' },
  { key: 'w_humo', type: 'equip', sub: 'weapon', name: '护摩之杖', count: 1, range: 3, art: 'w_humo',
    target: { sel: 'self' }, desc: '攻击范围3。你的【攻击】造成伤害后，可弃置目标坐骑区的一张牌。' },
  { key: 'w_boluan', type: 'equip', sub: 'weapon', name: '波乱月白经津', count: 1, range: 2, art: 'w_boluan',
    target: { sel: 'self' }, desc: '攻击范围2。你的【攻击】结算时无视目标防具。' },
  { key: 'w_tiankong', type: 'equip', sub: 'weapon', name: '天空之傲', count: 1, range: 4, art: 'w_tiankong',
    target: { sel: 'self' }, desc: '攻击范围4。若【攻击】是你最后的手牌，可指定至多3名目标。' },
  { key: 'w_jingshui', type: 'equip', sub: 'weapon', name: '静水流涌之辉', count: 1, range: 2, art: 'w_jingshui',
    target: { sel: 'self' }, desc: '攻击范围2。你可将2张手牌当【攻击】使用。' },
  { key: 'a_zongshi', type: 'equip', sub: 'artifact', name: '昔日宗室之仪', count: 1, art: 'a_zongshi',
    target: { sel: 'self' }, desc: '当你需要使用【闪避】时，可判定：若为红色，视为使用了一张【闪避】。' },
  { key: 'a_qianyan', type: 'equip', sub: 'artifact', name: '千岩牢固', count: 1, art: 'a_qianyan',
    target: { sel: 'self' }, desc: '锁定技：岩伤害对你无效；你因结晶获得护盾时额外+1。' },
  { key: 'a_shaonv', type: 'equip', sub: 'artifact', name: '被怜爱的少女', count: 1, art: 'a_shaonv',
    target: { sel: 'self' }, desc: '你以【料理】回复体力后，摸1张牌。' },
  { key: 'm_wing', type: 'equip', sub: 'mount', name: '风之翼', count: 2, art: 'm_wing',
    target: { sel: 'self' }, desc: '你计算与其他角色的距离-1（你更容易够到别人）。' },
  { key: 'm_anchor', type: 'equip', sub: 'mount', name: '传送锚点', count: 2, art: 'm_anchor',
    target: { sel: 'self' }, desc: '其他角色计算与你的距离+1（你更难被够到）。' },
];
// 料理图鉴（对应原神料理名）
const DISHES = ['甜甜花酿鸡', '蒙德烤鱼', '绝云锅巴', '蟹黄火腿焗时蔬', '水晶虾',
  '蜜酱胡萝卜煎肉', '冒烟烤肉排', '摩拉肉', '黄金蟹', '烤蘑菇披萨'];

/* ---------- 武将定义 ---------- */
const HEROES = [
  // 蒙德
  { key: 'VENTI', name: '温迪', title: '风色诗人', nation: 'mondstadt', elem: 'anemo', hp: 3,
    skills: [
      { key: 'venti1', name: '高天之歌', type: 'A', once: true, desc: '出牌阶段限一次：令至多两名其他角色各弃1张手牌，你摸等量的牌。' },
      { key: 'venti2', name: '风神之诗', type: 'O', desc: '限定技，出牌阶段：对所有其他角色各造成1点风伤害并获得风附着。' } ] },
  { key: 'KLEE', name: '可莉', title: '火花骑士', nation: 'mondstadt', elem: 'pyro', hp: 3,
    skills: [
      { key: 'klee1', name: '蹦蹦炸弹', type: 'A', once: true, desc: '出牌阶段限一次：将1张手牌当火之攻击对至多2名角色使用。' },
      { key: 'klee2', name: '火花骑士', type: 'L', desc: '锁定技：你的火伤害生效后判定，红色则此伤害+1。' } ] },
  { key: 'EULA', name: '优菈', title: '浪沫的旋舞', nation: 'mondstadt', elem: 'cryo', hp: 4,
    skills: [
      { key: 'eula1', name: '冷酷之心', type: 'L', desc: '锁定技：你的攻击造成伤害后获得1枚冷酷之心（至多4枚）。' },
      { key: 'eula2', name: '凝浪之光剑', type: 'A', once: true, desc: '出牌阶段限一次：移去所有冷酷之心，对一名角色造成等量冰伤害。' } ] },
  // 璃月
  { key: 'ZHONGLI', name: '钟离', title: '尘世闲游', nation: 'liyue', elem: 'geo', hp: 4,
    skills: [
      { key: 'zhongli1', name: '玉璋护盾', type: 'L', desc: '锁定技：回合开始时若你没有护盾则获得1点；伤害优先由护盾抵扣。' },
      { key: 'zhongli2', name: '天动万象', type: 'O', desc: '限定技，出牌阶段：对所有其他角色各造成1点岩伤害并获得岩附着。' } ] },
  { key: 'HUTAO', name: '胡桃', title: '雪霁梅香', nation: 'liyue', elem: 'pyro', hp: 3,
    skills: [
      { key: 'hutao1', name: '蝶引来生', type: 'A', once: true, desc: '出牌阶段限一次：失去1点体力，直到回合结束你的攻击均视为火之攻击且伤害+1。' },
      { key: 'hutao2', name: '血梅香', type: 'L', desc: '锁定技：受到你火伤的角色获得血梅香；其回合开始时失去1点体力并移除。' } ] },
  { key: 'KEQING', name: '刻晴', title: '霆霓快雨', nation: 'liyue', elem: 'electro', hp: 4,
    skills: [
      { key: 'keqing1', name: '雷楔', type: 'A', once: true, desc: '出牌阶段限一次：本回合你的攻击范围视为无限，下一张攻击视为雷之攻击。' },
      { key: 'keqing2', name: '雷厉', type: 'L', desc: '锁定技：每回合限一次，你的雷伤害生效后摸1张牌。' } ] },
  // 稻妻
  { key: 'RAIDEN_SHOGUN', name: '雷电将军', title: '一心净土', nation: 'inazuma', elem: 'electro', hp: 4,
    skills: [
      { key: 'raiden1', name: '诸愿百眼之轮', type: 'L', desc: '锁定技：其他角色的攻击结算完成后，你获得1枚愿力（至多3枚）。' },
      { key: 'raiden2', name: '无想的一刀', type: 'A', once: true, desc: '出牌阶段限一次：移去至多3枚愿力，对一名角色造成等量雷伤害。' } ] },
  { key: 'KAMISATO_AYAKA', name: '神里绫华', title: '白鹭霜华', nation: 'inazuma', elem: 'cryo', hp: 3,
    skills: [
      { key: 'ayaka1', name: '神里流·霰步', type: 'A', once: true, desc: '出牌阶段限一次：摸2张牌，本回合你的攻击均视为冰之攻击。' },
      { key: 'ayaka2', name: '神里流·霜灭', type: 'T', desc: '每回合限一次：你的冰伤害生效后可弃1张手牌，对同一目标再造成1点冰伤害。' } ] },
  { key: 'YAE_MIKO', name: '八重神子', title: '浮世笑百姿', nation: 'inazuma', elem: 'electro', hp: 3,
    skills: [
      { key: 'yae1', name: '杀生樱', type: 'A', once: true, desc: '出牌阶段限一次：弃1张手牌放置1枚杀生樱（场上至多3枚）。' },
      { key: 'yae2', name: '野干役咒', type: 'L', desc: '锁定技：结束阶段若场上有杀生樱，你移去1枚并对一名角色造成1点雷伤害。' } ] },
  // 须弥
  { key: 'NAHIDA', name: '纳西妲', title: '白草净华', nation: 'sumeru', elem: 'dendro', hp: 3,
    skills: [
      { key: 'nahida1', name: '所闻遍计', type: 'A', once: true, desc: '出牌阶段限一次：观看一名角色的手牌并令其获得蕴种印（场上至多3枚）。' },
      { key: 'nahida2', name: '心景幻成', type: 'L', desc: '锁定技：有蕴种印的角色每受到1次元素伤害，你摸1张牌（每回合限2次）。' } ] },
  { key: 'CYNO', name: '赛诺', title: '缄默的誓士', nation: 'sumeru', elem: 'electro', hp: 4,
    skills: [
      { key: 'cyno1', name: '缄默誓约', type: 'L', desc: '锁定技：你出牌阶段使用的第一张攻击视为雷之攻击，且攻击次数上限+1。' },
      { key: 'cyno2', name: '嚎猎', type: 'L', desc: '锁定技：你于本回合内对同一目标造成的第二次及以后的伤害+1。' } ] },
  { key: 'NILOU', name: '妮露', title: '莲光落舞筵', nation: 'sumeru', elem: 'hydro', hp: 3,
    skills: [
      { key: 'nilou1', name: '金杯的丰穰', type: 'A', once: true, desc: '出牌阶段限一次：令一名角色回复1点体力；若其已满体力则改为摸2张牌。' },
      { key: 'nilou2', name: '浮莲舞步', type: 'T', desc: '每回合限一次：你成为攻击的目标后，使用者须先弃1张手牌，否则取消之。' } ] },
  // 枫丹
  { key: 'FURINA', name: '芙宁娜', title: '不休独舞', nation: 'fontaine', elem: 'hydro', hp: 3,
    skills: [
      { key: 'furina1', name: '普世欢腾', type: 'A', once: true, desc: '出牌阶段限一次：弃1张牌，令一名角色摸2张牌或回复1点体力。' },
      { key: 'furina2', name: '水神审判', type: 'T', desc: '每回合限一次：有角色进入濒死状态时，你可以视为对其使用1张料理。' } ] },
  { key: 'NEUVILLETTE', name: '那维莱特', title: '谕告的潮水', nation: 'fontaine', elem: 'hydro', hp: 4,
    skills: [
      { key: 'neuv1', name: '谕示裁定', type: 'L', desc: '锁定技：你造成伤害后获得1枚源水之滴（至多6枚）；结束阶段若≥3枚，可移去3枚并选择回复1点体力或对一名角色造成1点水伤害。' } ] },
  { key: 'CLORINDE', name: '克洛琳德', title: '决断的裁决', nation: 'fontaine', elem: 'electro', hp: 4,
    skills: [
      { key: 'clorinde1', name: '挑战', type: 'A', once: true, desc: '出牌阶段限一次：与一名角色拼点。赢：视为对其使用1张雷之攻击（不计次数）；输：其可弃你1张牌。' },
      { key: 'clorinde2', name: '夜巡', type: 'L', desc: '锁定技：回合外每受到1点伤害获得1枚剑意（至多2枚）；回合开始时移去，本回合攻击次数上限+X。' } ] },
  // 纳塔
  { key: 'MAVUIKA', name: '玛薇卡', title: '燃焰的凯旋', nation: 'natlan', elem: 'pyro', hp: 4,
    skills: [
      { key: 'mavuika1', name: '焚曜之环', type: 'O', desc: '限定技，出牌阶段：对所有其他角色各造成1点火伤害并获得火附着。' },
      { key: 'mavuika2', name: '胜利之焰', type: 'T', desc: '每回合限一次：你造成火伤害后判定，红色则你回复1点体力。' } ] },
  { key: 'XILONEN', name: '希诺宁', title: '焱猫的静听', nation: 'natlan', elem: 'geo', hp: 3,
    skills: [
      { key: 'xilonen1', name: '岩鑢问奏', type: 'L', desc: '锁定技：每回合限一次，你对有元素附着的角色造成的伤害+1。' },
      { key: 'xilonen2', name: '日落采样', type: 'A', once: true, desc: '出牌阶段限一次：弃1张牌，令一名角色回复1点体力或摸1张牌。' } ] },
  { key: 'CHASCA', name: '恰斯卡', title: '流云的飞翼', nation: 'natlan', elem: 'anemo', hp: 4,
    skills: [
      { key: 'chasca1', name: '装填弹药', type: 'L', desc: '你可以将【闪避】当风之攻击使用，且攻击次数上限+1。' },
      { key: 'chasca2', name: '风矢连珠', type: 'L', desc: '每回合限两次：你的攻击被闪避抵消后，你摸1张牌。' } ] },
  // 挪德卡莱
  { key: 'LAUMA', name: '菈乌玛', title: '月兆的低语', nation: 'nodkrai', elem: 'dendro', hp: 3,
    skills: [
      { key: 'lauma1', name: '恒暝灵觉', type: 'T', desc: '结束阶段：令一名角色获得草附着；若其已有附着，则对其造成1点草伤害。' },
      { key: 'lauma2', name: '月兆低语', type: 'L', desc: '锁定技：你引发或触发元素反应后摸1张牌（每回合限2次）。' } ] },
  { key: 'FLINS', name: '菲林斯', title: '静夜的猎手', nation: 'nodkrai', elem: 'electro', hp: 4,
    skills: [
      { key: 'flins1', name: '月感电', type: 'L', desc: '锁定技：你造成的雷伤害对已附着角色的反应升级为月感电：伤害+1且目标弃1张手牌。' },
      { key: 'flins2', name: '静夜猎手', type: 'L', desc: '锁定技：你出牌阶段攻击次数上限+1。' } ] },
  { key: 'AINO', name: '爱诺', title: '缪缪工坊的巧匠', nation: 'nodkrai', elem: 'hydro', hp: 4,
    skills: [
      { key: 'aino1', name: '机械工坊', type: 'A', once: true, desc: '出牌阶段限一次：亮出牌堆顶3张牌，获得其中的装备牌，其余置入弃牌堆。' },
      { key: 'aino2', name: '机器整备', type: 'L', desc: '锁定技：结束阶段若你装备区有至少2张牌，你摸1张牌。' } ] },
  { key: 'COLUMBINA', name: '哥伦比娅', title: '月之少女', nation: 'nodkrai', elem: 'hydro', hp: 3,
    skills: [
      { key: 'colu1', name: '崩落之月', type: 'A', once: true, desc: '出牌阶段限一次：弃1张牌，令一名角色获得水附着；若其已有附着，则视为对其使用1张水之攻击。' },
      { key: 'colu2', name: '霜月庇护', type: 'T', desc: '每回合限一次：你成为攻击目标时可判定，黑色则此攻击对你无效。' } ] },
  // 至冬（7.x 新）
  { key: 'ALYOSHA', name: '阿罗夏', title: '雪原的炮手', nation: 'snezhnaya', elem: 'electro', hp: 4,
    skills: [
      { key: 'aly1', name: '图加林炮击', type: 'A', once: true, desc: '出牌阶段限一次：弃1张牌，对至多2名角色各造成1点雷伤害。' },
      { key: 'aly2', name: '战地整备', type: 'L', desc: '锁定技：回合结束时若你本回合造成过伤害，你回复1点体力或摸1张牌。' } ] },
  { key: 'ODETTE', name: '奥黛塔', title: '雪鹄之梦', nation: 'snezhnaya', elem: 'cryo', hp: 3,
    skills: [
      { key: 'odette1', name: '星辉域', type: 'A', once: true, desc: '出牌阶段限一次：弃1张牌，将星辉域置于一名角色（场上至多2个）：其受到的元素反应效果强化一档，直到你的下回合开始。' },
      { key: 'odette2', name: '雪鹄之梦', type: 'L', desc: '锁定技：你与星辉域角色的距离视为1；结束阶段若存在星辉域则你摸1张牌。' } ] },
  { key: 'VODYANITSA', name: '沃雅妮莎', title: '羽翎的诗篇', nation: 'snezhnaya', elem: 'hydro', hp: 3,
    skills: [
      { key: 'vody1', name: '羽翎之诗', type: 'A', once: true, desc: '出牌阶段限一次：弃1张牌，令一名角色回复1点体力并摸1张牌。' },
      { key: 'vody2', name: '抗性削减', type: 'T', desc: '每回合限一次：你对角色造成伤害前，可先弃其1张手牌。' } ] },
];

const ROLES = {
  lord:    { name: '主公', cls: 'r-lord', desc: '消灭所有反贼与内奸' },
  loyalist:{ name: '忠臣', cls: 'r-loyalist', desc: '与主公同进退' },
  rebel:   { name: '反贼', cls: 'r-rebel', desc: '推翻主公的统治' },
  spy:     { name: '内奸', cls: 'r-spy', desc: '成为唯一的幸存者' },
};
