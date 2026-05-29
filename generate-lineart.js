const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

function applyLineartFilter(data, w, h) {
  const copy = new Uint8ClampedArray(data);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = (y * w + x) * 4;
      if (copy[idx + 3] < 10) continue;
      
      const tl = ((y-1)*w + (x-1))*4, tm = ((y-1)*w + x)*4, tr = ((y-1)*w + (x+1))*4;
      const ml = (y*w + (x-1))*4, mr = (y*w + (x+1))*4;
      const bl = ((y+1)*w + (x-1))*4, bm = ((y+1)*w + x)*4, br = ((y+1)*w + (x+1))*4;
      
      const getLum = (i) => 0.299*copy[i] + 0.587*copy[i+1] + 0.114*copy[i+2];
      const l_tl = getLum(tl), l_tm = getLum(tm), l_tr = getLum(tr);
      const l_ml = getLum(ml), l_mr = getLum(mr);
      const l_bl = getLum(bl), l_bm = getLum(bm), l_br = getLum(br);
      
      const edgeX = (l_tr + 2*l_mr + l_br) - (l_tl + 2*l_ml + l_bl);
      const edgeY = (l_bl + 2*l_bm + l_br) - (l_tl + 2*l_tm + l_tr);
      const magnitude = Math.sqrt(edgeX*edgeX + edgeY*edgeY);
      const edgeWeight = Math.min(255, magnitude * 2.5) / 255;
      const shading = 240 + (getLum(idx) / 255) * 15;
      const finalVal = (30 * edgeWeight) + (shading * (1 - edgeWeight));
      
      data[idx] = data[idx+1] = data[idx+2] = finalVal;
    }
  }
}

async function run() {
  const sourceDir = './images/generations';
  const targetDir = './images/generations/lineart';
  
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  
  const files = fs.readdirSync(sourceDir)
    .filter(f => f.toLowerCase().endsWith('.webp') && f !== 'lineart');
    
  console.log(`Найдено картинок для обработки: ${files.length}`);
  
  for (const file of files) {
    const inputPath = path.join(sourceDir, file);
    const outputPath = path.join(targetDir, file);
    
    // Пропускаем, если схема уже была сгенерирована ранее (для экономии времени)
    if (fs.existsSync(outputPath)) continue;
    
    try {
      const image = sharp(inputPath);
      const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      applyLineartFilter(data, info.width, info.height);
      
      await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
        .webp({ quality: 85 })
        .toFile(outputPath);
        
      console.log(`✓ Обработан: ${file}`);
    } catch (e) {
      console.error(`Ошибка при обработке ${file}:`, e);
    }
  }
}
run();
