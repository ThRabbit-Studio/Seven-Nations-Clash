// 构建脚本：把 shell.html + css + js + 内嵌素材 合成单文件 七国杀.html
// 素材来自千星奇域 UGC 资产库 sprite/<ID>.png，九宫格边距来自 border/<ID>.json 的 m_Border
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const SPRITE_DIR = 'C:\\ugc\\ClientUIAnimationEditor\\site\\ugc-tool-data\\Public\\CustomUIImage\\sprite';
const BORDER_DIR = 'C:\\ugc\\ClientUIAnimationEditor\\site\\ugc-tool-data\\Public\\CustomUIImage\\border';

// 选中素材清单: key -> [assetID, 九宫格边距 m_Border(X,Y,Z,W) 若为拉伸件]
const PICK = {
  // 基础形状（可染色）
  sq: 100001, circ: 100002, tri: 100003, star4: 100004, star5: 100005, ring: 100006,
  // 按钮图标（白色单色，mask 染色）
  i_close: 100101, i_ok: 100102, i_next: 100103, i_prev: 100104, i_down: 100105, i_up: 100106,
  i_plus: 100107, i_minus: 100108, i_back: 100109, i_help: 100113,
  // 白色玩法字形（压深色底衬）
  g_wind: 102001, g_fire: 102002, g_cryo: 102004, g_geo: 102005, g_hydro: 102019, g_electro: 102037,
  g_moon: 102041, g_atk: 102012, g_def: 102014, g_chef: 102023, g_crown: 102024, g_chest: 102028,
  g_duel: 102035, g_anchor: 102032, g_wing: 102049, g_shield: 102036, g_knot: 102016, g_flower: 102048,
  // 彩色元素/反应/状态
  el_electro: 103001, el_fire: 103002, el_cryo: 103003, el_dendro: 103004, el_geo: 103005,
  el_hydro: 103006, el_anemo: 103007,
  re_vaporize: 103027, re_melt: 103024, re_quicken: 103025, re_overload: 103021,
  re_superconduct: 103028, re_electro: 103020, re_frozen: 103022, re_bloom: 103026,
  re_crystal: 103019, re_swirl: 103030,
  b_atk: 103039, b_def: 103040, b_flask: 103042, b_bolt: 103046, b_heal: 103079,
  b_heart: 103081, b_heartred: 103082, b_check: 103075, b_warn: 103076, b_star: 103093,
  b_starburst: 103043, b_wing: 103103, b_pin: 103105,
  // 可染色底板件
  p_circ_soft: 106002, p_ring: 106026, p_diamond: 106033, p_banner: 106046, p_banner2: 106047,
  p_frame: 106049, p_divider: 106052, p_glow: 106056, p_glow2: 106057,
  p_bar_h: 106091, p_bar_h2: 106092, p_bar_v: 106095,
  // 海灯节面板（彩色，保留原配色）
  u_panel: 107103, u_panel2: 107104, u_panel3: 107105, u_slot_blue: 107111, u_namebar_blue: 107112,
  u_slot_red: 107113, u_namebar_red: 107114, u_btn: 107115, u_btnbar: 107122, u_pill: 107137,
  u_seat: 107147, u_medal_green: 107156, u_pill_teal: 107175, u_pill_blue: 107177,
  u_flourish: 107163, u_panel_teal: 107130,
  // 特殊字符
  s_vs: 109029,
  // 武器
  w_jingshui: 111065, w_fengying: 111066, w_boluan: 111067, w_langmo: 111070,
  w_tiankong: 111072, w_humo: 111077, w_feilei: 111086,
  // 料理 10 盘
  dish1: 111116, dish2: 111117, dish3: 111118, dish4: 111119, dish5: 111120,
  dish6: 111121, dish7: 111122, dish8: 111123, dish9: 111124, dish10: 111125,
  // 果酒/圣遗物/坐骑
  wine: 111127,
  a_zongshi: 111095, a_qianyan: 111102, a_shaonv: 111096,
  m_wing: 103103, m_anchor: 103105,
};

// 需要读取九宫格边距的拉伸件（三/九宫格）
const SLICE_KEYS = new Set(['p_banner', 'p_banner2', 'p_frame', 'p_bar_h', 'p_bar_h2', 'p_bar_v',
  'u_panel', 'u_panel2', 'u_panel3', 'u_namebar_red', 'u_namebar_blue', 'u_btnbar', 'u_pill',
  'u_seat', 'u_pill_teal', 'u_pill_blue', 'u_panel_teal']);

function b64(p) { return fs.readFileSync(p).toString('base64'); }

const assets = {};
const borders = {};
for (const [key, id] of Object.entries(PICK)) {
  const png = path.join(SPRITE_DIR, `${id}.png`);
  if (!fs.existsSync(png)) { console.error('MISSING sprite', id, key); continue; }
  const stat = fs.statSync(png);
  if (stat.size > 120 * 1024) console.warn('LARGE asset', key, id, Math.round(stat.size / 1024) + 'KB');
  assets[key] = `data:image/png;base64,${b64(png)}`;
  if (SLICE_KEYS.has(key)) {
    const bj = path.join(BORDER_DIR, `${id}.json`);
    let slice = null;
    if (fs.existsSync(bj)) {
      const m = JSON.parse(fs.readFileSync(bj, 'utf8')).m_Border || {};
      slice = { l: m.X || 0, t: m.Y || 0, r: m.Z || 0, b: m.W || 0 };
      const rect = JSON.parse(fs.readFileSync(bj, 'utf8')).m_Rect || {};
      slice.w = rect.width || 0; slice.h = rect.height || 0;
    }
    borders[key] = slice;
  }
}

const read = f => fs.readFileSync(path.join(root, f), 'utf8');
let html = read('tools/shell.html');
html = html.replace('/*__CSS__*/', () => read('tools/game.css'));
html = html.replace('/*__ASSETS__*/', () =>
  `const ASSETS = ${JSON.stringify(assets)};\nconst SLICES = ${JSON.stringify(borders)};`);
const js = ['game_data.js', 'game_engine.js', 'game_ai.js', 'game_ui.js', 'game_main.js']
  .map(f => read('tools/' + f)).join('\n\n');
html = html.replace('/*__JS__*/', () => js);

const out = path.join(root, '七国杀.html');
fs.writeFileSync(out, html);
console.log('built', out, Math.round(fs.statSync(out).size / 1024) + 'KB, assets:', Object.keys(assets).length);
