const fs = require('fs');
const path = require('path');

// รับค่าจาก Command Line (เช่น 'dev' หรือ 'prod')
const envType = process.argv[2]; 

// กำหนดชื่อไฟล์ต้นฉบับที่จะใช้ดึงข้อมูล (เปลี่ยนมาอ่านจากไฟล์ .env โดยตรง)
const sourceFiles = {
    dev: '.env.development',
    prod: '.env.production'
};

if (!envType || !sourceFiles[envType]) {
    console.error('❌ กรุณาระบุโหมดที่ต้องการ: เช่น "node switch-env.js dev" หรือ "node switch-env.js prod"');
    process.exit(1);
}

const sourceFile = sourceFiles[envType];
const sourcePath = path.join(__dirname, sourceFile);

if (!fs.existsSync(sourcePath)) {
    console.error(`❌ ไม่พบไฟล์: ${sourceFile} กรุณาสร้างไฟล์นี้ไว้ที่ Root โฟลเดอร์ครับ`);
    process.exit(1);
}

const envContent = fs.readFileSync(sourcePath, 'utf8');

// กำหนดเป้าหมายที่ต้องการเอาไฟล์ไปวางทับ
const targetPaths = [
    path.join(__dirname, '.env'),
    path.join(__dirname, 'frontend', '.env'),
    path.join(__dirname, 'backend', '.env')
];

console.log(`\n🔄 กำลังสลับ Environment เป็นโหมด: [ ${envType.toUpperCase()} ]...`);
console.log('--------------------------------------------------');

targetPaths.forEach(target => {
    try {
        fs.writeFileSync(target, envContent);
        console.log(`✅ อัปเดตสำเร็จ: ${target}`);
    } catch (err) {
        console.error(`❌ ไม่สามารถอัปเดตไฟล์: ${target}\n`, err);
    }
});

console.log('--------------------------------------------------');
console.log(`🚀 เสร็จสิ้น! ระบบพร้อมรันสำหรับโหมด '${envType}' แล้วครับ\n`);