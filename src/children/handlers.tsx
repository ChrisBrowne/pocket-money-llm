import { Elysia } from "elysia";
import type { Database } from "bun:sqlite";
import type { Config } from "../config";
import { sessionMiddleware } from "../auth/session-middleware";
import { parseChildName } from "../shared/types";
import { isErr, isNone } from "../shared/result";
import { addChild, removeChild, listChildren } from "./commands";
import { getChildDetail } from "../transactions/commands";
import { HomePage, AddChildPage, ConfirmRemovePage } from "./views";
import { Layout } from "../shared/layout";

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
    .get("/children/:name/remove", ({ params, session, set }) => {
      const parsed = parseChildName(decodeURIComponent(params.name));
      if (isErr(parsed)) {
        set.status = 404;
        return (
          <Layout title="Not Found" sessionName={session.name}>
            <p class="text-dim">Child not found.</p>
          </Layout>
        );
      }

      const detail = getChildDetail(db, parsed.value);
      if (isNone(detail)) {
        set.status = 404;
        return (
          <Layout title="Not Found" sessionName={session.name}>
            <p class="text-dim">Child not found.</p>
          </Layout>
        );
      }

      return (
        <ConfirmRemovePage
          sessionName={session.name}
          child={detail.value.child}
          transactionCount={detail.value.transactions.length}
        />
      );
    })
    .post("/children/:name/remove", ({ params, set }) => {
      const parsed = parseChildName(decodeURIComponent(params.name));
      if (isErr(parsed)) {
        set.status = 302;
        set.headers["location"] = "/";
        return "";
      }

      removeChild(db, parsed.value);
      set.status = 302;
      set.headers["location"] = "/";
      return "";
    });
}
