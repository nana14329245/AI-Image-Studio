import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseConfig } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export default function SetupPage() {
  if (getSupabaseConfig()) redirect("/login");
  return (
    <main style={{ maxWidth: 760, margin: "48px auto", padding: "24px", lineHeight: 1.8 }}>
      <p>AI IMAGE STUDIO</p>
      <h1 style={{ fontSize: "2rem", fontWeight: 700 }}>ตั้งค่า Supabase ก่อนเริ่มใช้งาน</h1>
      <p>ยังไม่มี Project URL หรือ Public key ที่ใช้ได้ จึงยังเข้าสู่ระบบไม่ได้</p>
      <ol style={{ paddingLeft: 24, listStyle: "decimal" }}>
        <li>เปิดโปรเจกต์ของคุณใน <a href="https://supabase.com/dashboard" style={{ textDecoration: "underline" }}>Supabase Dashboard</a> แล้วคัดลอก Project URL และ Publishable key (หรือ anon key)</li>
        <li>สร้างไฟล์ <code>.env.local</code> ในโฟลเดอร์เดียวกับ <code>package.json</code> และใส่ค่าจริงตามตัวอย่างด้านล่าง</li>
        <li>บันทึกไฟล์ กด Control + C ใน Terminal แล้วรัน <code>npm run dev</code> ใหม่</li>
      </ol>
      <pre style={{ padding: 16, border: "1px solid currentColor", overflowX: "auto", fontSize: "0.875rem", margin: "24px 0" }}>{`NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY`}</pre>
      <p>ถ้าใช้ anon key ให้ใช้ชื่อ NEXT_PUBLIC_SUPABASE_ANON_KEY แทน ห้ามใส่ Secret key หรือ service_role key ในตัวแปร NEXT_PUBLIC_</p>
      <p>ตั้งค่าฐานข้อมูลและบริการสร้างภาพเพิ่มเติมตาม README.md ในโปรเจกต์</p>
      <Link href="/" style={{ display: "inline-block", marginTop: 16, textDecoration: "underline" }}>ตั้งค่าแล้ว — กลับหน้าแรก</Link>
    </main>
  );
}
