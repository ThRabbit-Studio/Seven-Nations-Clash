const fs = require('fs'), https = require('https'), path = require('path');
function dl(url, dest) {
  return new Promise((res, rej) => {
    const f = fs.createWriteStream(dest);
    https.get(url, { rejectUnauthorized: false }, r => {
      if (r.statusCode !== 200) { f.close(); try { fs.unlinkSync(dest); } catch (_) {} return rej(new Error(r.statusCode)); }
      r.pipe(f); f.on('finish', () => f.close(res));
    }).on('error', e => { try { f.close(); fs.unlinkSync(dest); } catch (_) {} rej(e); });
  });
}
const base = path.join(__dirname, '..', 'assets');
(async () => {
  await dl('https://enka.network/ui/UI_Gacha_AvatarImg_Shougun.png', path.join(base, 'render', 'RAIDEN_SHOGUN.png'));
  await dl('https://enka.network/ui/UI_AvatarIcon_Shougun.png', path.join(base, 'face', 'RAIDEN_SHOGUN.png'));
  console.log('render:', fs.readdirSync(path.join(base, 'render')).length, 'face:', fs.readdirSync(path.join(base, 'face')).length);
})();
