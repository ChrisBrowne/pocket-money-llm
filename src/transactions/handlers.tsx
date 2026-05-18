import { Elysia } from "elysia";
import type { Database } from "bun:sqlite";
import type { Config } from "../config";
import { sessionMiddleware } from "../auth/session-middleware";
import { parsePence } from "../shared/types";
import { isErr, isSome } from "../shared/result";
import { deposit, withdraw, getChildDetail } from "./commands";
import {
  ChildDetailPage,
  BalanceDisplay,
  TransactionItem,
  TransactionError,
} from "./views";
import { NotFoundPage } from "../shared/not-found";

export function transactionHandlers(db: Database, config: Config) {
  return new Elysia({ name: "transaction-handlers" })
    .use(sessionMiddleware(config))
    .get("/children/:name", ({ params, session, set }) => {
      const childName = decodeURIComponent(params.name);
      const detail = getChildDetail(db, childName);
      if (!isSome(detail)) {
        set.status = 404;
        return (
          <NotFoundPage
            sessionName={session.name}
            message={`No child named "${childName}" exists in your vault.`}
          />
        );
      }
      return (
        <ChildDetailPage
          sessionName={session.name}
          child={detail.value.child}
          transactions={detail.value.transactions}
          defaultNote={config.defaultNote}
        />
      );
    })
    .post("/children/:name/deposit", ({ params, body, session }) => {
      const childName = decodeURIComponent(params.name);
      const { amount: rawAmount, note } = body as {
        amount?: string;
        note?: string;
      };
      const parsed = parsePence(rawAmount ?? "");

      if (isErr(parsed)) {
        return (
          <template>
            <TransactionError
              formId="deposit-errors"
              message={parsed.error.message}
            />
          </template>
        );
      }

      const result = deposit(
        db,
        childName as any,
        parsed.value,
        note ?? "",
        session.email,
      );
      if (isErr(result)) {
        return (
          <template>
            <TransactionError
              formId="deposit-errors"
              message={result.error.message}
            />
          </template>
        );
      }

      // Return updated detail: new transaction + OOB balance update + clear errors
      const detail = getChildDetail(db, childName);
      if (!isSome(detail)) return "";

      const latestTx = detail.value.transactions[0];
      return (
        <>
          {latestTx ? <TransactionItem tx={latestTx} /> : null}
          <template>
            <BalanceDisplay balance={detail.value.child.balance} oob={true} />
          </template>
          <template>
            <div
              id="deposit-errors"
              hx-swap-oob="true"
              data-testid="deposit-errors"
            ></div>
          </template>
        </>
      );
    })
    .post("/children/:name/withdraw", ({ params, body, session }) => {
      const childName = decodeURIComponent(params.name);
      const { amount: rawAmount, note } = body as {
        amount?: string;
        note?: string;
      };
      const parsed = parsePence(rawAmount ?? "");

      if (isErr(parsed)) {
        return (
          <template>
            <TransactionError
              formId="withdraw-errors"
              message={parsed.error.message}
            />
          </template>
        );
      }

      const result = withdraw(
        db,
        childName as any,
        parsed.value,
        note ?? "",
        session.email,
      );
      if (isErr(result)) {
        return (
          <template>
            <TransactionError
              formId="withdraw-errors"
              message={result.error.message}
            />
          </template>
        );
      }

      const detail = getChildDetail(db, childName);
      if (!isSome(detail)) return "";

      const latestTx = detail.value.transactions[0];
      return (
        <>
          {latestTx ? <TransactionItem tx={latestTx} /> : null}
          <template>
            <BalanceDisplay balance={detail.value.child.balance} oob={true} />
          </template>
          <template>
            <div
              id="withdraw-errors"
              hx-swap-oob="true"
              data-testid="withdraw-errors"
            ></div>
          </template>
        </>
      );
    });
}
