const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',          
  database: 'amslib', 
});

connection.connect((err) => {
  if (err) {
    console.error('❌ ไม่สามารถเชื่อมต่อฐานข้อมูล:', err.message);
    return;
  }
  console.log('✅ เชื่อมต่อฐานข้อมูล MySQL สำเร็จ');
});

module.exports = connection;
