import { Elysia } from "elysia";
import type { Database } from "bun:sqlite";
import type { Config } from "../config";
import { sessionMiddleware } from "../auth/session-middleware";
import { parseChildName } from "../shared/types";
import { isErr } from "../shared/result";
import { addChild, removeChild, listChildren } from "./commands";
import { HomePage, AddChildPage } from "./views";

export function childrenHandlers(db: Database, config: Config) {
  return new Elysia({ name: "children-handlers" })
    .use(sessionMiddleware(config))
    .get("/", ({ session }) => {
      const children = listChildren(db);
      return (
        <HomePage
          sessionName={session.name}
          children={children}
          defaultNote={config.defaultNote}
        />
      );
    })
    .get("/add-child", ({ session }) => (
      <AddChildPage sessionName={session.name} />
    ))
    .post("/children", ({ body, session, set }) => {
      const raw = (body as { name?: string }).name ?? "";
      const parsed = parseChildName(raw);

      if (isErr(parsed)) {
        return (
          <AddChildPage
            sessionName={session.name}
            error={parsed.error.message}
            value={raw}
          />
        );
      }

      const result = addChild(db, parsed.value);
      if (isErr(result)) {
        return (
          <AddChildPage
            sessionName={session.name}
            error={result.error.message}
            value={raw}
          />
        );
      }

      set.status = 302;
      set.headers["location"] = "/";
      return "";
    })
    .delete("/children/:name", ({ params, set }) => {
      const parsed = parseChildName(decodeURIComponent(params.name));
      if (isErr(parsed)) {
        set.status = 200;
        return "Invalid child name";
      }

      removeChild(db, parsed.value);
      set.headers["hx-redirect"] = "/";
      return "";
    });
}
