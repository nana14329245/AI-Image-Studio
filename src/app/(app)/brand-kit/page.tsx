import { redirect } from "next/navigation";
import BrandKitClient from "./BrandKitClient";
import { createClient } from "@/lib/supabase/server";
import { getBrandKit } from "@/lib/brandKit";

export default async function BrandKitPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const kit = await getBrandKit(supabase, user.id);

  return (
    <BrandKitClient
      initialLogoUrl={kit.logoUrl}
      initialPrimaryColor={kit.primaryColor}
      initialSecondaryColor={kit.secondaryColor}
    />
  );
}
