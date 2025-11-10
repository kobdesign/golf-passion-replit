# วิธี Deploy Edge Functions ผ่าน Supabase Dashboard

## ขั้นตอนที่ 1: ตั้งค่า Secrets

ก่อนจะ deploy Edge Functions คุณต้องตั้งค่า API Keys ใน Supabase Dashboard ก่อน:

1. ไปที่ [Supabase Dashboard - Edge Functions](https://supabase.com/dashboard/project/exntlsasbkwadxsctjle/functions)
2. คลิก **"Manage secrets"** หรือ **"Add secret"**
3. เพิ่ม secrets ต่อไปนี้:

### Required Secrets:
- **`GOOGLE_PLACES_API_KEY`** - สำหรับ sync-google-places function
  - ถ้ายังไม่มี: ไปสร้างที่ [Google Cloud Console](https://console.cloud.google.com/apis/library/places-backend.googleapis.com)
  - Enable: Places API (New)
  - สร้าง API Key และ copy มาใส่

---

## ขั้นตอนที่ 2: Deploy แต่ละ Function

### Function 1: sync-google-places (สำคัญที่สุด!)

1. ไปที่ [Edge Functions](https://supabase.com/dashboard/project/exntlsasbkwadxsctjle/functions)
2. คลิก **"Create a new function"** (หรือ Edit ถ้ามีอยู่แล้ว)
3. ตั้งชื่อ: `sync-google-places`
4. Copy โค้ดทั้งหมดจากไฟล์ `supabase/functions/sync-google-places/index.ts`
5. Paste ลงใน Code Editor
6. คลิก **"Deploy"**

### Function 2: get-mapbox-token

1. คลิก **"Create a new function"**
2. ตั้งชื่อ: `get-mapbox-token`
3. Copy โค้ดจาก `supabase/functions/get-mapbox-token/index.ts`
4. Paste และคลิก **"Deploy"**

### Function 3: sync-golf-courses (Optional)

1. คลิก **"Create a new function"**
2. ตั้งชื่อ: `sync-golf-courses`
3. Copy โค้ดจาก `supabase/functions/sync-golf-courses/index.ts`
4. Paste และคลิก **"Deploy"**

### Function 4: get-course-details (Optional)

1. คลิก **"Create a new function"**
2. ตั้งชื่อ: `get-course-details`
3. Copy โค้ดจาก `supabase/functions/get-course-details/index.ts`
4. Paste และคลิก **"Deploy"**

---

## ขั้นตอนที่ 3: ทดสอบการทำงาน

หลังจาก deploy `sync-google-places` แล้ว:

1. เปิดแอปของคุณ
2. ไปที่หน้า **Sync Courses** (เมนู Admin)
3. ใส่ชื่อสนามหรือพื้นที่ เช่น "Alpine Golf Club"
4. คลิก **"เริ่ม Sync ข้อมูล"**

### ผลลัพธ์ที่คาดหวัง:
✅ ไม่มี CORS error
✅ แสดงข้อความ "Sync สำเร็จ!"
✅ ข้อมูลสนามถูกนำเข้าใน Courses

### ถ้าเจอ Error:
❌ **CORS Error** - ตรวจสอบว่า deploy ครบทุก function หรือยัง
❌ **API Key Error** - ตรวจสอบว่าตั้งค่า `GOOGLE_PLACES_API_KEY` ใน Secrets แล้วหรือยัง
❌ **Auth Error** - ตรวจสอบว่า user ของคุณมี role "admin" หรือยัง

---

## หมายเหตุ

- Edge Functions ทุกตัวได้ถูกแก้ไขให้เป็น **standalone files** แล้ว ไม่ต้องพึ่ง `_shared` folder
- แต่ละไฟล์มี CORS headers ครบถ้วนอยู่ในตัวแล้ว
- สามารถ deploy ด้วยการ copy-paste ได้เลย ไม่ต้องใช้ Supabase CLI

---

## สำหรับการสร้าง Google Places API Key

1. ไปที่ [Google Cloud Console](https://console.cloud.google.com/)
2. สร้าง Project ใหม่ (หรือเลือก project ที่มีอยู่)
3. ไปที่ **APIs & Services > Library**
4. ค้นหา "Places API (New)" และคลิก **Enable**
5. ไปที่ **APIs & Services > Credentials**
6. คลิก **Create Credentials > API Key**
7. Copy API Key ที่ได้
8. (แนะนำ) คลิก **Restrict Key** เพื่อจำกัดการใช้งาน:
   - API restrictions: เลือก "Places API (New)"
   - Application restrictions: None (หรือ HTTP referrers ถ้าต้องการ)
9. นำ API Key ไปใส่ใน Supabase Edge Functions Secrets ชื่อ `GOOGLE_PLACES_API_KEY`

---

**เรียบร้อย!** 🎉 

ตอนนี้แอปของคุณสามารถ sync สนามกอล์ฟจาก Google Places ได้แล้ว
