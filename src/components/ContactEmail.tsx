import { contactEmail } from "@/lib/legal";

/** The contact address as a mail link, or a visible placeholder until it is configured. */
export default function ContactEmail() {
  const email = contactEmail();
  if (!email) return <span className="font-mono">[อีเมลติดต่อ]</span>;
  return <a href={`mailto:${email}`} className="font-mono">{email}</a>;
}
