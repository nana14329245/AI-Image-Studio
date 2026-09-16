import { redirect } from "next/navigation";
import BrandKitClient from "./BrandKitClient";
import { createClient } from "@/lib/supabase/server";
import { getBrandKit } from "@/lib/brandKit";
import { signStoragePaths } from "@/lib/signedUrls";

export default async function BrandKitPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const kit = await getBrandKit(supabase, user.id);
  const [logoUrl] = kit.logoPath ? await signStoragePaths([kit.logoPath]) : [null];

  return (
    <BrandKitClient
      initialLogoUrl={logoUrl}
      initialPrimaryColor={kit.primaryColor}
      initialSecondaryColor={kit.secondaryColor}
    />
  );
}
