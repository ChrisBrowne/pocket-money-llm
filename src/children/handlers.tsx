import { Elysia } from "elysia";
import type { Database } from "bun:sqlite";
import type { Config } from "../config";
import { sessionMiddleware } from "../auth/session-middleware";
import { parseChildName } from "../shared/types";
import { isErr, isNone } from "../shared/result";
import { addChild, removeChild, listChildren } from "./commands";
import { getChildDetail } from "../transactions/commands";
import { HomePage, AddChildPage, ConfirmRemovePage } from "./views";
import { NotFoundPage } from "../shared/not-found";

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
      const childName = decodeURIComponent(params.name);
      const parsed = parseChildName(childName);
      if (isErr(parsed)) {
        set.status = 404;
        return (
          <NotFoundPage
            sessionName={session.name}
            message={`"${childName}" is not a valid child name.`}
          />
        );
      }

      const detail = getChildDetail(db, parsed.value);
      if (isNone(detail)) {
        set.status = 404;
        return (
          <NotFoundPage
            sessionName={session.name}
            message={`No child named "${childName}" exists in your vault.`}
          />
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
