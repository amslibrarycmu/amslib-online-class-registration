# ใช้ Node.js เวอร์ชั่น 18-alpine เป็น Base Image เพื่อให้ Image มีขนาดเล็ก
FROM node:18-alpine

# กำหนด Working Directory ภายใน Container
WORKDIR /app

# Copy package.json และ package-lock.json สำหรับ Backend
# และติดตั้ง Dependencies
COPY backend/package*.json ./backend/
RUN npm install --prefix ./backend

# Copy โค้ดส่วนที่เหลือของ Backend ไปยัง Container
COPY backend/ ./backend/

# เปิด Port 5000 สำหรับแอปพลิเคชัน Node.js
EXPOSE 5000

# กำหนด Working Directory เป็นโฟลเดอร์ Backend เพื่อรันคำสั่ง npm start
WORKDIR /app/backend

# คำสั่งที่จะรันเมื่อ Container เริ่มทำงาน (ตามที่กำหนดใน package.json)
CMD ["npm", "start"]
