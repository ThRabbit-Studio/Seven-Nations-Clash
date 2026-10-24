// 从 enka.network 下载透明底官方资源：抽卡立绘(大图) + 角色头像图标(座位用)
const fs = require('fs'), https = require('https'), path = require('path');

const CHARS = {
  VENTI: 'Venti', KLEE: 'Klee', EULA: 'Eula',
  ZHONGLI: 'Zhongli', HUTAO: 'Hutao', KEQING: 'Keqing',
  RAIDEN_SHOGUN: 'RaidenShogun', KAMISATO_AYAKA: 'KamisatoAyaka', YAE_MIKO: 'YaeMiko',
  NAHIDA: 'Nahida', CYNO: 'Cyno', NILOU: 'Nilou',
  FURINA: 'Furina', NEUVILLETTE: 'Neuvillette', CLORINDE: 'Clorinde',
  MAVUIKA: 'Mavuika', XILONEN: 'Xilonen', CHASCA: 'Chasca',
  LAUMA: 'Lauma', FLINS: 'Flins', AINO: 'Aino', COLUMBINA: 'Columbina',
  ALYOSHA: 'Alyosha', ODETTE: 'Odette', VODYANITSA: 'Vodyanitsa'
};

const base = path.join(__dirname, '..');
const renderDir = path.join(base, 'assets', 'render');
const faceDir = path.join(base, 'assets', 'face');
fs.mkdirSync(renderDir, { recursive: true });
fs.mkdirSync(faceDir, { recursive: true });

function dl(url, dest) {
  return new Promise((res, rej) => {
    const f = fs.createWriteStream(dest);
    https.get(url, { rejectUnauthorized: false }, r => {
      if (r.statusCode !== 200) { f.close(); try { fs.unlinkSync(dest); } catch (_) {} return rej(new Error(r.statusCode)); }
      r.pipe(f);
      f.on('finish', () => f.close(res));
    }).on('error', e => { try { f.close(); fs.unlinkSync(dest); } catch (_) {} rej(e); });
  });
}

(async () => {
  let okR = 0, okF = 0, fail = [];
  for (const [key, name] of Object.entries(CHARS)) {
    try {
      const r = path.join(renderDir, key + '.png');
      if (!fs.existsSync(r) || fs.statSync(r).size < 10000) { await dl(`https://enka.network/ui/UI_Gacha_AvatarImg_${name}.png`, r); }
      okR++;
    } catch (e) { fail.push(key + ':render(' + e.message + ')'); }
    try {
      const f = path.join(faceDir, key + '.png');
      if (!fs.existsSync(f) || fs.statSync(f).size < 5000) { await dl(`https://enka.network/ui/UI_AvatarIcon_${name}.png`, f); }
      okF++;
    } catch (e) { fail.push(key + ':face(' + e.message + ')'); }
    process.stdout.write(`\r${okR + okF}/50`);
  }
  console.log(`\ndone render=${okR} face=${okF} fail=${fail.join(',') || 'none'}`);
})();
