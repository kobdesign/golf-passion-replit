# Google Places API Setup Guide

## ปัญหา: Sync Course ไม่ทำงาน

Edge Function `sync-google-places` ทำงานบน **Supabase Server** ไม่ใช่ Replit  
ดังนั้น `GOOGLE_PLACES_API_KEY` ต้องตั้งค่าใน **Supabase Dashboard** ไม่ใช่ Replit Secrets

---

## วิธีตั้งค่า Google Places API Key ใน Supabase

### ขั้นตอนที่ 1: เปิด Supabase Dashboard
1. ไปที่ [https://supabase.com](https://supabase.com)
2. เข้าสู่ระบบและเลือก Project ของคุณ

### ขั้นตอนที่ 2: ตั้งค่า Secret ใน Edge Functions
1. ไปที่เมนู **Project Settings** (ล่างซ้าย ⚙️)
2. คลิกที่แท็บ **Edge Functions**
3. เลื่อนลงไปหาส่วน **Edge Functions Secrets**
4. คลิกปุ่ม **Add new secret**

### ขั้นตอนที่ 3: เพิ่ม API Key
- **Name**: `GOOGLE_PLACES_API_KEY`
- **Value**: วาง API key ของคุณ (เช่น `AIza...`)
- คลิก **Save**

### ขั้นตอนที่ 4: Deploy Edge Function
หลังจากตั้งค่า secret แล้ว ต้อง deploy Edge Function ใหม่:

```bash
# ถ้าคุณยัง deploy Edge Function ไม่เคยต้อง run คำสั่งนี้
npx supabase functions deploy sync-google-places
```

**หมายเหตุ**: ถ้าคุณไม่มี Supabase CLI ติดตั้ง อาจจะต้องใช้วิธีอื่น หรือ Edge Function อาจ deploy อัตโนมัติจาก GitHub/Git integration

---

## วิธีตรวจสอบว่าตั้งค่าสำเร็จ

### 1. ตรวจสอบ Secret ใน Dashboard
- กลับไปที่ **Project Settings** → **Edge Functions**
- ควรเห็น `GOOGLE_PLACES_API_KEY` ในรายการ Secrets

### 2. ทดสอบ Sync Course
1. ล็อกอินเข้าแอปด้วยบัญชี **admin**
2. ไปที่หน้า **Sync Courses**
3. พิมพ์ชื่อสนามกอล์ฟ เช่น "Siam Country Club"
4. กดปุ่ม **Sync from Google Places**
5. ถ้าสำเร็จ จะเห็นข้อความ "Successfully synced X golf courses"

---

## ถ้ายังไม่ทำงาน

ลอง debug ด้วยวิธีนี้:

### ตรวจสอบ Edge Function Logs
1. ไปที่ Supabase Dashboard
2. คลิกเมนู **Edge Functions** (ด้านซ้าย)
3. เลือก **sync-google-places**
4. ดู **Logs** เพื่อหาข้อความ error

### Error ที่อาจพบ

**"Google Places API key not configured"**
- Secret ยังไม่ถูกตั้งค่าใน Supabase Dashboard
- ชื่อ secret ผิด (ต้องเป็น `GOOGLE_PLACES_API_KEY` ตัวพิมพ์เล็ก-ใหญ่ต้องตรงกัน)

**"Google Places API error: 403"**
- API key ไม่ถูกต้อง หรือยังไม่เปิดใช้งาน Places API (new)
- ไปที่ [Google Cloud Console](https://console.cloud.google.com/apis) → เปิดใช้งาน **Places API (New)**

**"Forbidden: Admin access required"**
- บัญชีของคุณไม่มีสิทธิ์ admin
- ต้องเพิ่ม role ใน database table `user_roles`

---

## สรุป

✅ **Replit Secrets** → ใช้สำหรับ frontend environment variables (`VITE_*`)  
✅ **Supabase Edge Functions Secrets** → ใช้สำหรับ Edge Functions (`GOOGLE_PLACES_API_KEY`)

ต้องตั้งค่าที่ Supabase Dashboard → Project Settings → Edge Functions → Add Secret
