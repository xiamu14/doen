"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { siteConfig } from "@/config/site.config";
import { signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";

export default function Home() {
  const router = useRouter();
  const { data: session, isPending, error } = useSession();
  console.log(session, isPending, error);

  return (
    <div className="w-full pt-24 space-y-4">
      <h1 className="head-text-sm">{siteConfig.name}</h1>
      <p className="text-muted-foreground max-w-3xl">{siteConfig.description}</p>
      <div className="flex gap-2 items-center">
        <Button asChild>
          <Link href="/sign-in">Sign In</Link>
        </Button>
        <Button asChild>
          <Link href="/sign-up">Sign Up</Link>
        </Button>
        <Button onClick={async () => await signOut({
          fetchOptions: {
            onSuccess: () => {
              router.push("/sign-in");
            },
          },
        })}>
          Sign Out
        </Button>
      </div>
    </div >
  )
}
