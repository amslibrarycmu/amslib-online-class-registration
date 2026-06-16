# สำหรับเจ้าหน้าที่ IT: ขั้นตอนการตั้งค่าและรันระบบบนเซิร์ฟเวอร์ UAT

เอกสารนี้รวบรวมเฉพาะขั้นตอนการปฏิบัติงานสำหรับเจ้าหน้าที่ IT ในการนำระบบจองคอร์สเรียนขึ้นรันบนเซิร์ฟเวอร์ และเปิดระบบอัปเดตอัตโนมัติด้วย Watchtower

---

## 📄 1. อัปเดตไฟล์ `docker-compose.yml` (ในโฟลเดอร์หลัก)

ให้ทำการปรับแก้ไฟล์ `docker-compose.yml` บนเซิร์ฟเวอร์หลักของคณะให้มีรายละเอียดตามนี้:

```yaml
version: '3.8'

networks:
  amslib-network:
    driver: bridge

services:

  # 1. ตู้แอปพลิเคชัน PHP เดิมของคณะ
  php_app:
    build:
      context: ./html/php
      dockerfile: Dockerfile
    container_name: amslib_php
    restart: always
    volumes:
      - ./html/php/html:/var/www/html
      - ./html/php/config/php.ini:/usr/local/etc/php/conf.d/custom.ini
    networks:
      - amslib-network

  # 2. ตู้ระบบจองคอร์สเรียน (React + Node) รันผ่านคลังออนไลน์
  js_app_amslibclass:
    image: amslibrarycmu35071/amslib-js-app:latest  # ดึง Image สำเร็จรูปจาก Docker Hub
    container_name: amslib_js_amslibclass
    restart: always
    env_file:
      - ./html/js/src/amslibclass/.env  # อ่านคอนฟิกค่าความลับและรหัสผ่านจากเซิร์ฟเวอร์จริง
    environment:
      - PORT=5000
      - DB_HOST=${DB_HOST}
    # [ถอด Volume /app/dist ออก] เพื่อให้เว็บหน้าบ้านรันผ่านภายในตัว Image โดยตรง
    networks:
      - amslib-network

  # 3. ตู้ระบบอัปเดตระบบอัตโนมัติ (Watchtower)
  watchtower:
    image: containrrr/watchtower
    container_name: amslib_watchtower
    restart: always
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock  # สิทธิ์จัดการ Container ในตัวระบบ
    command: --interval 300 --cleanup  # ตรวจสอบและดึงโค้ดเวอร์ชันล่าสุดทุกๆ 5 นาที พร้อมเคลียร์ขยะ Image
    networks:
      - amslib-network
```

---

## 🛠️ 2. ขั้นตอนการดำเนินการฝั่งเจ้าหน้าที่ IT

เมื่อนักพัฒนาอัปโหลดไฟล์คอนฟิกความลับเรียบร้อยแล้ว ให้เจ้าหน้าที่ IT ดำเนินการรันคำสั่งดังต่อไปนี้:

### สเต็ปที่ 1: ตรวจสอบความถูกต้องของไฟล์ตั้งค่า (ทางผู้พัฒนาจะเตรียมการอัปโหลดให้เอง)
*   ตัวไฟล์การตั้งค่าระบบและรหัสผ่านจริง (UAT/Production `.env`) ทางผู้พัฒนาจะทำการอัปโหลดผ่าน FTP ไปวางไว้ที่พิกัด **`./html/js/src/amslibclass/.env`** บนเครื่องเซิร์ฟเวอร์ด้วยตนเองเรียบร้อยแล้ว ทาง IT ไม่จำเป็นต้องดำเนินการใด ๆ ในส่วนนี้

### สเต็ปที่ 2: รันคำสั่งเปิดระบบเฉพาะตู้แอป JS และ Watchtower
*   เปิด Terminal ของเครื่องเซิร์ฟเวอร์ เข้าไปยังโฟลเดอร์ที่มีไฟล์ `docker-compose.yml`
*   สั่งอัปเดตและสร้างเฉพาะตู้ระบบฝั่ง JS และตู้ Watchtower โดยไม่มีผลกระทบและไม่ต้องหยุดระบบตู้ PHP เดิมที่รันอยู่ (Zero Downtime for PHP):
    ```bash
    docker-compose up -d js_app_amslibclass watchtower
    ```
    *(ในขั้นตอนนี้ Docker จะทำการดึงข้อมูลเว็บจองคอร์สเรียนของคุณเวอร์ชันใหม่ล่าสุดจาก Docker Hub มาเปิดใช้งาน พร้อมรันระบบ Watchtower ไปด้วยกัน โดยที่ตู้ php_app จะทำงานต่อเนื่องตามปกติโดยไม่มีการขัดจังหวะการให้บริการครับ)*

---

## 🔄 3. การทำงานหลังจากนี้ (ไม่ต้องประสานงาน IT เพิ่มเติม)
*   **เมื่อมีการปรับปรุงตัวเว็บ**: เมื่อคุณทำการอัปเดตไฟล์ขึ้น Docker Hub แล้ว ตัว **Watchtower** จะเช็คพบอิมเมจใหม่ และสั่งปิด-เปิดเพื่ออัปเดตตู้เว็บเวอร์ชันล่าสุดบนเซิร์ฟเวอร์คณะให้เองภายใน 5 นาที
*   **ไม่มีความจำเป็น**ที่ IT จะต้องรีสตาร์ทเซิร์ฟเวอร์ หรือรันคำสั่ง `up --build` ด้วยตัวเองอีกต่อไปหลังจากขั้นตอนนี้เสร็จสิ้นลงครับ
