// 立绘下载重试：api.github.com git/blobs (base64) → jsdelivr CDN 兜底
const fs = require('fs'), https = require('https'), path = require('path');
const tmp = process.env.TEMP || process.env.TMP;
const list = JSON.parse(fs.readFileSync(path.join(tmp, 'genshin_c.json'), 'utf8'));

const WANTED = {
  VENTI: '温迪', KLEE: '可莉', EULA: '优菈',
  ZHONGLI: '钟离', HUTAO: '胡桃', KEQING: '刻晴',
  RAIDEN_SHOGUN: '雷电将军', KAMISATO_AYAKA: '神里绫华', YAE_MIKO: '八重神子',
  NAHIDA: '纳西妲', CYNO: '赛诺', NILOU: '妮露',
  FURINA: '芙宁娜', NEUVILLETTE: '那维莱特', CLORINDE: '克洛琳德',
  MAVUIKA: '玛薇卡', XILONEN: '希诺宁', CHASCA: '恰斯卡',
  LAUMA: '菈乌玛', FLINS: '菲林斯', AINO: '爱诺', COLUMBINA: '哥伦比娅',
  ALYOSHA: '阿罗夏', ODETTE: '奥黛塔', VODYANITSA: '沃雅妮莎'
};

const outDir = path.join(__dirname, '..', 'assets', 'portraits');
fs.mkdirSync(outDir, { recursive: true });

function getJSON(url) {
  return new Promise((res, rej) => {
    https.get(url, { rejectUnauthorized: false, headers: { 'User-Agent': 'genshin-kill', 'Accept': 'application/vnd.github+json' } }, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => r.statusCode === 200 ? res(JSON.parse(d)) : rej(new Error(r.statusCode)));
    }).on('error', rej);
  });
}
function getBin(url) {
  return new Promise((res, rej) => {
    https.get(url, { rejectUnauthorized: false, headers: { 'User-Agent': 'genshin-kill' } }, r => {
      if (r.statusCode !== 200) { r.resume(); return rej(new Error(r.statusCode)); }
      const chunks = [];
      r.on('data', c => chunks.push(c));
      r.on('end', () => res(Buffer.concat(chunks)));
    }).on('error', rej);
  });
}

(async () => {
  const cands = {};
  for (const en of Object.keys(WANTED)) {
    const arr = list.filter(x => x.name.startsWith(en + '-')).sort((a, b) => (b.size || 0) - (a.size || 0));
    if (arr.length) cands[en] = arr[0];
  }
  const missing = Object.keys(WANTED).filter(en => !cands[en]);
  if (missing.length) console.log('NOT_IN_REPO:', missing.join(','));

  let ok = 0, fail = [];
  for (const [en, meta] of Object.entries(cands)) {
    const ext = (path.extname(meta.name) || '.jpg').toLowerCase();
    const dest = path.join(outDir, en + ext);
    try {
      // 方案A：git blobs API
      const blob = await getJSON(`https://api.github.com/repos/gszshdzz/GenshinAvatarCards/git/blobs/${meta.sha}`);
      fs.writeFileSync(dest, Buffer.from(blob.content, 'base64'));
      console.log('OK(blob)', en, ext, Math.round(meta.size / 1024) + 'KB');
      ok++;
    } catch (e1) {
      try {
        // 方案B：jsdelivr
        const enc = encodeURIComponent('C立绘/' + meta.name).replace(/%2F/g, '/');
        const buf = await getBin(`https://cdn.jsdelivr.net/gh/gszshdzz/GenshinAvatarCards@main/${enc}`);
        fs.writeFileSync(dest, buf);
        console.log('OK(jsdelivr)', en, ext, Math.round(buf.length / 1024) + 'KB');
        ok++;
      } catch (e2) {
        console.log('FAIL', en, 'blob:' + e1.message, 'jsd:' + e2.message);
        fail.push(en);
      }
    }
  }
  console.log(`done ok=${ok} fail=${fail.join(',') || 'none'}`);
})();
