const fs = require('fs');
const path = require('path');

const mode = process.argv[2];
if (!['dev', 'prod'].includes(mode)) {
  console.error('❌ กรุณาระบุโหมด: node switch-env.js <dev|prod>');
  process.exit(1);
}

const sourceFile = mode === 'prod' ? 'ftp-env.txt' : 'dev-env.txt';
const sourcePath = path.join(__dirname, 'envfiles', sourceFile);

const targets = [
  path.resolve(__dirname, '.env'),
  path.resolve(__dirname, 'backend', '.env'),
  path.resolve(__dirname, 'frontend', '.env')
];

console.log(`🚀 กำลังสลับไปใช้โหมด: ${mode.toUpperCase()} (${sourceFile})`);

targets.forEach(target => {
  try {
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, target);
      console.log(`✅ คัดลอกไปยัง: ${target}`);
    } else {
      console.error(`❌ ไม่พบไฟล์ต้นทาง: ${sourcePath}`);
    }
  } catch (err) {
    console.error(`💥 เกิดข้อผิดพลาดที่ ${target}:`, err.message);
  }
});