const fs = require('fs');
const dir = 'C:/ugc/ClientUIAnimationEditor/site/ugc-tool-data/Public/CustomUIImage/border/';
const ids = { p_banner: 106046, p_banner2: 106047, p_frame: 106049, p_bar_h: 106091, p_bar_h2: 106092, p_bar_v: 106095, u_panel: 107103, u_panel2: 107104, u_panel3: 107105, u_namebar_blue: 107112, u_namebar_red: 107114, u_btnbar: 107122, u_pill: 107137, u_seat: 107147, u_pill_teal: 107175, u_pill_blue: 107177, u_panel_teal: 107130, u_slot_red: 107113, u_slot_blue: 107111, p_divider: 106052, p_diamond: 106033 };
for (const [k, id] of Object.entries(ids)) {
  const f = dir + id + '.json';
  if (!fs.existsSync(f)) { console.log(k, id, 'NO BORDER FILE'); continue; }
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  const b = j.m_Border || {}, r = j.m_Rect || {};
  const nz = (b.X || 0) || (b.Y || 0) || (b.Z || 0) || (b.W || 0);
  console.log(k, id, 'border', b.X, b.Y, b.Z, b.W, 'rect', r.width + 'x' + r.height, nz ? 'SLICE' : 'plain');
}
// 全库统计九宫格件
let total = 0, slices = [];
for (let i = 100001; i <= 112042; i++) {
  const f = dir + i + '.json';
  if (!fs.existsSync(f)) continue;
  total++;
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  const b = j.m_Border || {};
  if ((b.X || 0) || (b.Y || 0) || (b.Z || 0) || (b.W || 0)) slices.push(i + '(' + [b.X, b.Y, b.Z, b.W].join(',') + ')');
}
console.log('--- all slice assets:', slices.join(' '));
