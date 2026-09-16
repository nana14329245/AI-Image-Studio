import type { Metadata } from "next";
import Link from "next/link";
import ContactEmail from "@/components/ContactEmail";
import LegalPage from "@/components/LegalPage";
import { SERVICE_NAME, sellerName } from "@/lib/legal";

export const metadata: Metadata = {
  title: "ติดต่อเรา",
  description: `ช่องทางติดต่อผู้ให้บริการ ${SERVICE_NAME}`,
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <LegalPage
      path="/contact"
      eyebrow="SUPPORT / CONTACT"
      title="ติดต่อเรา"
      intro={<p>สอบถามการใช้งาน แจ้งปัญหาการชำระเงิน หรือส่งคำขอเกี่ยวกับข้อมูลส่วนบุคคล ติดต่อได้ทางอีเมล</p>}
      sections={[
        {
          id: "email",
          title: "อีเมล",
          body: (
            <>
              <p className="text-base"><ContactEmail /></p>
              <p>ผู้ให้บริการ: {sellerName()} (บุคคลธรรมดา)</p>
              <p>เราตอบภายใน 3 วันทำการ</p>
            </>
          ),
        },
        {
          id: "include",
          title: "ข้อมูลที่ควรแนบ",
          body: (
            <ul>
              <li>อีเมลที่ใช้สมัครบัญชี และส่งจากอีเมลนั้นถ้าทำได้</li>
              <li>ปัญหาการสร้างภาพ: ชื่อเครื่องมือ วันเวลาโดยประมาณ และข้อความผิดพลาดที่เห็น</li>
              <li>ปัญหาการชำระเงิน: วันที่และจำนวนเงินจากใบเสร็จของ Stripe</li>
              <li><strong>ห้ามส่งเลขบัตร รหัสผ่าน หรือรหัส OTP</strong></li>
            </ul>
          ),
        },
        {
          id: "self-service",
          title: "ทำเองได้ทันที",
          body: (
            <ul>
              <li>ยกเลิกแพ็กเกจ เปลี่ยนบัตร ดูใบเสร็จ: <Link href="/account">หน้าบัญชี</Link></li>
              <li>ลบภาพ: <Link href="/gallery">Gallery</Link></li>
              <li>ลืมรหัสผ่าน: <Link href="/forgot-password">ตั้งรหัสผ่านใหม่</Link></li>
            </ul>
          ),
        },
      ]}
    />
  );
}
