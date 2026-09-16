# Deploy ขึ้น Vercel และเปิดรับเงินจริง

คู่มือนี้แบ่งเป็น 2 ช่วง ทำช่วงแรกให้เสร็จแล้วทดสอบก่อน ค่อยทำช่วงที่สอง

1. **ขึ้นเว็บจริงแต่ยังใช้ Stripe โหมดทดสอบ** ใช้ส่งอาจารย์หรือให้คนลองใช้ได้ ไม่มีเงินจริงเกี่ยวข้อง
2. **เปลี่ยน Stripe เป็นโหมดจริง** ทำเมื่อพร้อมขายเท่านั้น

> ห้ามใส่คีย์ลับ (`sk_live_`, `SUPABASE_SERVICE_ROLE_KEY`, `FAL_KEY`, `whsec_`) ในไฟล์ที่ commit หรือในตัวแปรที่ขึ้นต้นด้วย `NEXT_PUBLIC_` ใส่ใน Vercel → Settings → Environment Variables เท่านั้น

---

## ช่วงที่ 1 — ขึ้นเว็บด้วย Stripe โหมดทดสอบ

### 1. สร้างโปรเจกต์บน Vercel

1. เข้า vercel.com → Add New → Project → เลือก repo `AI-Image-Studio`
2. Framework เลือก Next.js ให้อัตโนมัติ ไม่ต้องแก้ Build Command
3. ยังไม่ต้องกด Deploy ใส่ Environment Variables ในข้อ 2 ก่อน

### 2. Environment Variables

ใส่ใน Vercel → Settings → Environment Variables เลือก Production (และ Preview ถ้าต้องการ)

| ตัวแปร | ค่า |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL ของ Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret / service_role key |
| `FAL_KEY` | คีย์ fal.ai |
| `STRIPE_SECRET_KEY` | `sk_test_...` (ช่วงนี้ยังเป็นโหมดทดสอบ) |
| `STRIPE_PRICE_PRO`, `STRIPE_PRICE_BUSINESS` | Price ID โหมดทดสอบ ตัวเดียวกับใน `.env.local` |
| `STRIPE_WEBHOOK_SECRET` | ได้จากข้อ 4 — ใส่ทีหลังได้ |
| `NEXT_PUBLIC_SITE_URL` | โดเมนจริง เช่น `https://ชื่อเว็บ.vercel.app` ไม่มี `/` ปิดท้าย |
| `NEXT_PUBLIC_LEGAL_SELLER_NAME` | ชื่อ-นามสกุลผู้ให้บริการ |
| `NEXT_PUBLIC_LEGAL_CONTACT_EMAIL` | อีเมลติดต่อลูกค้า |
| `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` | ไม่บังคับ ถ้าใส่ เว็บจะแสดงแบนเนอร์ขอความยินยอม |

ตัวแปรที่ขึ้นต้นด้วย `NEXT_PUBLIC_` ถูกฝังตอน build ถ้าแก้ค่าภายหลังต้อง Redeploy ถึงจะมีผล

แล้วกด Deploy

### 3. Supabase

1. **Authentication → URL Configuration**
   - Site URL: โดเมนจริง
   - Redirect URLs: เพิ่ม `https://โดเมนจริง/auth/callback` (เก็บ `http://localhost:3000/auth/callback` ไว้สำหรับพัฒนาในเครื่อง)
   - ถ้าไม่ตั้ง ลิงก์ยืนยันอีเมลและลิงก์รีเซ็ตรหัสผ่านจะพาไป localhost
2. **Authentication → Sign In / Providers → Email**: เปิด "Confirm email" ไว้
3. **Authentication → Emails → SMTP**: อีเมลในตัวของ Supabase ส่งได้แค่ไม่กี่ฉบับต่อชั่วโมง พอสำหรับทดสอบ แต่ถ้าเปิดให้คนทั่วไปสมัคร ควรต่อ SMTP ของผู้ให้บริการอีเมล เช่น Resend
4. ตรวจว่า migration ครบถึงไฟล์ล่าสุดใน `supabase/migrations/`

### 4. Stripe webhook (โหมดทดสอบ)

1. Stripe Dashboard (สวิตช์ Test mode เปิดอยู่) → Developers → Webhooks → Add endpoint
2. URL: `https://โดเมนจริง/api/webhooks/stripe`
3. Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`
4. คัดลอก Signing secret (`whsec_...`) ไปใส่ `STRIPE_WEBHOOK_SECRET` ใน Vercel แล้ว Redeploy

### 5. ทดสอบหลัง deploy

- [ ] หน้าแรก, `/terms`, `/privacy`, `/refund`, `/contact` เปิดได้ และแสดงชื่อกับอีเมลจริง ไม่ใช่ `[...]`
- [ ] สมัครด้วยอีเมลใหม่ → ได้อีเมลยืนยัน → กดลิงก์แล้วกลับมาที่โดเมนจริง
- [ ] ลืมรหัสผ่าน → ลิงก์ในอีเมลพาไปหน้าตั้งรหัสใหม่บนโดเมนจริง
- [ ] ใช้เครื่องมือแต่ละตัวด้วยรูปจากมือถือขนาดใหญ่ (5 MB ขึ้นไป) → ต้องไม่ขึ้น error 413
- [ ] สมัคร Pro ด้วยบัตรทดสอบ `4242 4242 4242 4242` → เครดิตเข้า, หน้า Account แสดง Pro
- [ ] Stripe → Webhooks → endpoint → ดูว่าทุก event ตอบ 200
- [ ] Gallery แสดงรูป, ดาวน์โหลดได้, ลบได้
- [ ] เปิดลิงก์ `https://โดเมนจริง/robots.txt` ต้องอนุญาตให้ index และมี sitemap

---

## ช่วงที่ 2 — เปิดรับเงินจริง

ทำเมื่อผ่านเช็กลิสต์ข้างบนครบ และให้อาจารย์หรือคลินิกกฎหมายตรวจหน้าข้อตกลงกับนโยบายแล้ว

### 1. เปิดบัญชี Stripe แบบจริง

1. Stripe Dashboard → Activate account เลือกประเภท **Individual / Sole proprietor**
2. ต้องใช้บัตรประชาชน อายุ 18 ปีขึ้นไป และบัญชีธนาคารไทยในชื่อตัวเอง
3. Settings → Public details: ตั้งชื่อร้านและ **Statement descriptor** (ข้อความบนสลิปบัตร) ให้ลูกค้าจำได้ เช่น `AI IMAGE STUDIO`
4. Settings → Customer emails: เปิด "Successful payments" และ "Failed payments" เพื่อให้ Stripe ส่งใบเสร็จและแจ้งบัตรตัดไม่ผ่าน

### 2. สร้างของในโหมดจริง

ของในโหมดทดสอบไม่ถูกคัดลอกไปโหมดจริง ต้องสร้างใหม่ทั้งหมด

1. ปิดสวิตช์ Test mode
2. Product catalog → สร้าง Pro ฿299/เดือน และ Business ฿999/เดือน แบบ Recurring สกุลเงิน THB
3. Settings → Billing → Customer portal: เปิดยกเลิก (at end of billing period), อัปเดตวิธีชำระเงิน, ดูใบเสร็จ **ปิด** การเปลี่ยนแพ็กเกจ เพราะแอปจัดการเอง
4. Developers → Webhooks → Add endpoint URL และ events เหมือนช่วงที่ 1 ข้อ 4

### 3. เปลี่ยนค่าใน Vercel

| ตัวแปร | เปลี่ยนเป็น |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_live_...` |
| `STRIPE_PRICE_PRO`, `STRIPE_PRICE_BUSINESS` | Price ID โหมดจริง |
| `STRIPE_WEBHOOK_SECRET` | Signing secret ของ endpoint โหมดจริง |

แล้ว Redeploy

ลูกค้าที่เคยสมัครในโหมดทดสอบมี `stripe_customer_id` ของโหมดทดสอบค้างอยู่ใน `profiles` ซึ่งใช้กับคีย์จริงไม่ได้ ก่อนเปิดขาย ให้ล้างค่าในบัญชีทดสอบ หรือใช้โปรเจกต์ Supabase แยกสำหรับเว็บจริง

### 4. ทดสอบด้วยเงินจริงครั้งเดียว

1. สมัคร Pro ด้วยบัตรของตัวเอง
2. ตรวจว่าเครดิตเข้า, ได้ใบเสร็จทางอีเมล, webhook ตอบ 200
3. ยกเลิกที่หน้า Account แล้วคืนเงินให้ตัวเองใน Stripe → Payments → Refund

### 5. สิ่งที่ต้องเฝ้าดูหลังเปิดขาย

- **fal.ai → Usage** เทียบค่าใช้จ่ายกับรายได้ทุกสัปดาห์ในช่วงแรก ตั้งวงเงินหรือเติมเงินล่วงหน้าเพื่อไม่ให้บิลบานปลาย
- **Stripe → Webhooks** ถ้ามี event ที่ไม่ได้ 200 สถานะแพ็กเกจของลูกค้าจะไม่อัปเดต
- **Supabase → Storage** พื้นที่ของแพ็กฟรีมีจำกัด ภาพสะสมเร็ว
- **ภาษี** รายได้จากการขายเป็นเงินได้ตามมาตรา 40(8) ต้องยื่น ภ.ง.ด.90 และถ้ารายได้ทั้งปีเกิน 1.8 ล้านบาทต้องจด VAT (ซึ่งต้องแก้หน้าข้อตกลงด้วย) ปรึกษาผู้รู้เรื่องภาษีเมื่อเริ่มมีรายได้
