import { siteConfig } from "@/config/site.config";

export default function Home() {
  return (
    <div className="w-full pt-24">
      <h1 className="head-text-sm">{siteConfig.name}</h1>
      <p className="text-muted-foreground max-w-3xl">{siteConfig.description}</p>
    </div>
  )
}