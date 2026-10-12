import { createFileRoute } from "@tanstack/react-router";

// Cover proxy: MangaDex blocks cover hotlinking from other sites. Only uploads.mangadex.org is allowed.
export const Route = createFileRoute("/api/public/mdimg")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const u = new URL(request.url).searchParams.get("u") ?? "";
        let target: URL;
        try { target = new URL(u); } catch { return new Response("Bad url", { status: 400 }); }
        if (target.protocol !== "https:" || target.hostname !== "uploads.mangadex.org") return new Response("Forbidden", { status: 403 });
        const res = await fetch(target, { headers: { "User-Agent": "MangaReaderApp/1.0" } });
        if (!res.ok) return new Response("Not found", { status: res.status });
        return new Response(res.body, { headers: { "Content-Type": res.headers.get("Content-Type") ?? "image/jpeg", "Cache-Control": "public, max-age=86400" } });
      },
    },
  },
});
