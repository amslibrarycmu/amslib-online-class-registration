# ----------------------------------------------------
# Stage 1: Build Frontend (React + Vite)
# ----------------------------------------------------
FROM node:18-alpine AS build-stage
WORKDIR /app/frontend

# 1. Copy package files ของ Frontend และ Install dependencies
COPY frontend/package*.json ./
RUN npm install

# 2. Copy Code Frontend ทั้งหมด และสั่ง Build
COPY frontend/ .
RUN npm run build
# (Vite จะสร้างไฟล์ผลลัพธ์ไว้ที่ /app/frontend/dist)

# ----------------------------------------------------
# Stage 2: Setup Backend & Merge
# ----------------------------------------------------
FROM node:18-alpine
WORKDIR /app

# 1. Setup Backend: Copy package files และ Install dependencies (เฉพาะ Production)
COPY backend/package*.json ./
RUN npm install --omit=dev

# 2. Copy Code Backend ทั้งหมด
COPY backend/ .

# 3. ⭐️ นำไฟล์ React ที่ Build เสร็จจาก Stage 1 มาวางไว้ในโฟลเดอร์ public ของ Backend
COPY --from=build-stage /app/frontend/dist ./public

# 4. ตั้งค่า Environment Variable (Default Port)
ENV PORT=5000

# 5. เปิด Port และสั่งรัน
EXPOSE 5000
CMD ["npm", "start"]