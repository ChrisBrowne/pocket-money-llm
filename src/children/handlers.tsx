import { Elysia } from "elysia";
import type { Database } from "bun:sqlite";
import type { Config } from "../config";
import { sessionMiddleware } from "../auth/session-middleware";
import { parseChildName } from "../shared/types";
import { isErr } from "../shared/result";
import { addChild, removeChild, listChildren } from "./commands";
import { HomePage, ChildrenList, AddChildError } from "./views";

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
    .post("/children", ({ body }) => {
      const raw = (body as { name?: string }).name ?? "";
      const parsed = parseChildName(raw);

      if (isErr(parsed)) {
        return (
          <>
            <ChildrenList children={listChildren(db)} />
            <template>
              <AddChildError message={parsed.error.message} />
            </template>
          </>
        );
      }

      const result = addChild(db, parsed.value);
      if (isErr(result)) {
        return (
          <>
            <ChildrenList children={listChildren(db)} />
            <template>
              <AddChildError message={result.error.message} />
            </template>
          </>
        );
      }

      // Success: return updated list + clear error area
      return (
        <>
          <ChildrenList children={listChildren(db)} />
          <template>
            <div
              id="add-child-errors"
              hx-swap-oob="true"
              data-testid="add-child-errors"
            ></div>
          </template>
        </>
      );
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
