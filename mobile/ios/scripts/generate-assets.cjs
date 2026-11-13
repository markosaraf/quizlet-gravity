// Usage: NODE_PATH=/path/to/node_modules node ios/scripts/generate-assets.cjs
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const root = path.resolve(__dirname, '../..');
const assets = path.join(root, 'ios/QuizletGravity/Assets.xcassets');
const info = {version: 1, author: 'xcode'};
const json = (p,v) => fs.writeFileSync(p, JSON.stringify(v,null,2)+'\n');
(async () => {
  const iosIconSource = path.join(root, 'artwork/app-icon-original-gold-thick.png');
  json(path.join(assets,'Contents.json'), {info});
  // Keep the alternative carousel cards; the starting/final mark is vector PDF.
  for (const [name, source] of Object.entries({LogoGoldBackground:'quizlet-q-chip-indigo-on-gold-3.svg',LogoBlack:'quizlet-q-chip-black-on-indigo3.svg',LogoWhite:'quizlet-q-chip-white-on-indigo-3.svg'})) {
    const dir=path.join(assets,name+'.imageset');fs.mkdirSync(dir,{recursive:true});
    const images=[];
    for(const scale of [1,2,3]) {
      const filename=`${name}@${scale}x.png`;
      await sharp(path.join(root,'artwork',source)).resize(156*scale).flatten().png().toFile(path.join(dir,filename));
      images.push({idiom:'universal',filename,scale:scale+'x'});
    }
    json(path.join(dir,'Contents.json'),{images,info});
  }
  const {chromium}=require('playwright');
  const browser=await chromium.launch();
  try {
    const page=await browser.newPage();
    const svg=fs.readFileSync(path.join(root,'artwork/brand-q-original-gold-thick-transparent.svg'),'utf8').replace(/<\?xml[^>]*>/,'');
    await page.setContent(`<style>@page{size:156pt 156pt;margin:0}html,body{margin:0;background:transparent}svg{display:block;width:156pt;height:156pt}</style>${svg}`);
    const dir=path.join(assets,'LogoGold.imageset');
    await page.pdf({path:path.join(dir,'LogoGold.pdf'),preferCSSPageSize:true,printBackground:true});
    json(path.join(dir,'Contents.json'),{images:[{idiom:'universal',filename:'LogoGold.pdf'}],info,properties:{'preserves-vector-representation':true}});
  } finally {await browser.close();}
  const dir=path.join(assets,'AppIcon.appiconset');fs.mkdirSync(dir,{recursive:true});
  const images=[];
  for(const [idiom, size, scales] of [['iphone',20,[2,3]],['iphone',29,[2,3]],['iphone',40,[2,3]],['iphone',60,[2,3]],['ipad',20,[1,2]],['ipad',29,[1,2]],['ipad',40,[1,2]],['ipad',76,[1,2]],['ipad',83.5,[2]],['ios-marketing',1024,[1]],['mac',16,[1,2]],['mac',32,[1,2]],['mac',128,[1,2]],['mac',256,[1,2]],['mac',512,[1,2]]]) {
    for(const scale of scales){
      const filename=`${idiom}-${size}-${scale}.png`;
      await sharp(iosIconSource).resize(size*scale,size*scale).flatten().png().toFile(path.join(dir,filename));
      images.push({idiom,size:`${size}x${size}`,scale:`${scale}x`,filename});
    }
  }
  json(path.join(dir,'Contents.json'),{images,info});
  await sharp(iosIconSource).resize(1024).flatten().png().toFile(path.join(root,'store/app-store/app-icon.png'));
})();
