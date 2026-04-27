import csv
import json

def csv_to_json(csv_filepath, json_filepath):
    """
    แปลงไฟล์ CSV เป็นไฟล์ JSON
    แต่ละแถวใน CSV จะกลายเป็น object ใน JSON array
    """
    data = []
    
    # อ่านไฟล์ CSV
    with open(csv_filepath, 'r', encoding='utf-8') as csvfile:
        # ใช้ DictReader เพื่ออ่านข้อมูลเป็น dictionary โดยใช้แถวแรกเป็น key
        csv_reader = csv.DictReader(csvfile)
        
        # วนลูปเพื่อเก็บแต่ละแถว (ซึ่งเป็น dictionary) ลงใน list
        for row in csv_reader:
            data.append(row)
    
    # เขียนไฟล์ JSON
    with open(json_filepath, 'w', encoding='utf-8') as jsonfile:
        # ใช้ json.dump เพื่อเขียน list ของ dictionary ลงในไฟล์
        # indent=4 ใช้เพื่อจัดรูปแบบให้สามารถอ่านได้ง่ายขึ้น
        json.dump(data, jsonfile, ensure_ascii=False, indent=4)

# ตัวอย่างการใช้งาน:
# ระบุชื่อไฟล์ CSV ที่มีอยู่ของคุณ
input_csv_file = 'classes_data.csv' 
# ระบุชื่อไฟล์ JSON ที่ต้องการสร้าง
output_json_file = 'classes_data.json' 

# เรียกใช้ฟังก์ชัน
try:
    csv_to_json(input_csv_file, output_json_file)
    print(f"การแปลงไฟล์เสร็จสมบูรณ์! ไฟล์ JSON ถูกบันทึกที่: {output_json_file} ✨")
except FileNotFoundError:
    print(f"ข้อผิดพลาด: ไม่พบไฟล์ CSV ที่ระบุ: {input_csv_file}")
except Exception as e:
    print(f"เกิดข้อผิดพลาดระหว่างการแปลง: {e}")