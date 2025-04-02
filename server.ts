import { serveDir } from "@std/http/file-server";

Deno.serve((req) => serveDir(req, {
  fsRoot: "static",
}));
