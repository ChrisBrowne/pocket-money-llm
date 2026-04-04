# Scenarios

Concrete examples of application behaviour, expressed as given/when/then sequences with real values. These complement the Allium spec (which defines rules abstractly) by showing what a parent actually experiences end-to-end.

Each scenario maps to at least one Playwright e2e test. Happy path scenarios are mandatory coverage; error scenarios verify that the correct user-facing feedback is shown.

**Conventions:**
- Amounts are written in pence (the storage unit) with a pound comment for readability
- Balances are always derived from the transaction ledger (ADR-0005), never set directly
- Scenario names use the domain vocabulary from `pocket-money.allium`

---

## Authentication

### AuthorisedParentLogsIn

A parent with a whitelisted email completes Google OAuth and lands on the home page, greeted by name.

```
given: config.allowed_emails = {"topher@example.com", "sarah@example.com"}
when:  GoogleAuthCallback(email: "topher@example.com", name: "Topher")
then:  SessionCreated(email: "topher@example.com", name: "Topher")
  and: viewer sees Home
  and: Home shows viewer.name = "Topher"
```

### UnauthorisedEmailRejected

Someone with a valid Google account but not in the whitelist is turned away at the door.

```
given: config.allowed_emails = {"topher@example.com", "sarah@example.com"}
when:  GoogleAuthCallback(email: "stranger@example.com")
then:  LoginRejected(email: "stranger@example.com")
  and: viewer does not see Home
```

### UnauthenticatedVisitorRedirected

A request without a valid session cookie is redirected to the Google OAuth login flow, not shown an error page.

```
given: no valid session cookie
when:  visitor requests Home
then:  redirect to Google OAuth
```

### ParentLogsOut

Logging out clears the session cookie and returns the parent to the login state.

```
given: SessionCreated(email: "topher@example.com", name: "Topher")
when:  ParentLogsOut(session)
then:  SessionDestroyed(session)
  and: subsequent requests redirect to Google OAuth
```

---

## Home — Viewing Children

### HomeShowsAllChildrenWithBalances

The home page lists every child with their current balance, derived from the transaction ledger.

```
given: Child("Alice", balance: 1500)                -- £15.00
       Child("Bob", balance: -200)                   -- -£2.00
when:  viewer sees Home
then:  Home shows Child("Alice", balance: "£15.00")
       Home shows Child("Bob", balance: "-£2.00")
```

### HomeShowsEmptyStateWhenNoChildren

A fresh app with no children should make it obvious that the first step is adding one.

```
given: no Children exist
when:  viewer sees Home
then:  Home shows no children
  and: ParentAddsChild action is available
```

---

## Home — Adding a Child

### AddChildWithEmptyBalance

A new child starts with zero balance (no transactions).

```
given: no Children exist
when:  ParentAddsChild(session, name: "Alice")
then:  Child("Alice") exists
  and: Child("Alice").balance = 0
  and: Child("Alice").transactions is empty
  and: Home shows Child("Alice", balance: "£0.00")
```

### AddChildRejectsDuplicateName

Child names are unique (ADR-0015). Attempting to add a duplicate shows an error without creating a second child.

```
given: Child("Alice") exists
when:  ParentAddsChild(session, name: "Alice")
then:  error shown: name already exists
  and: Children count unchanged
```

### AddChildRejectsEmptyName

The ChildName value type requires non-empty after trimming.

```
when: ParentAddsChild(session, name: "   ")
then: error shown: name is required
 and: no Child created
```

### AddChildTrimsWhitespace

Leading/trailing whitespace is normalised away, not rejected.

```
when: ParentAddsChild(session, name: "  Alice  ")
then: Child("Alice") exists
 and: Home shows Child("Alice")
```

---

## Child Detail — Viewing

### ViewChildDetailShowsBalanceAndHistory

The detail page shows the child's name, current balance, and full transaction history newest-first.

```
given: Child("Alice")
       Transaction(child: "Alice", kind: deposit,    amount: 500, note: "weekly pocket money", recorded_at: t1, recorded_by: "topher@example.com")
       Transaction(child: "Alice", kind: deposit,    amount: 500, note: "weekly pocket money", recorded_at: t2, recorded_by: "sarah@example.com")
       Transaction(child: "Alice", kind: withdrawal, amount: 300, note: "comic book",          recorded_at: t3, recorded_by: "topher@example.com")
when:  viewer sees ChildDetail("Alice")
then:  ChildDetail shows child.name = "Alice"
       ChildDetail shows child.balance = "£7.00"       -- (500 + 500 - 300) = 700 pence
       transactions shown in order: [t3, t2, t1]        -- newest first
       each transaction shows kind, amount, note, recorded_at, recorded_by
```

### ViewChildDetailWithNoTransactions

A newly added child has no history yet.

```
given: Child("Alice") with no transactions
when:  viewer sees ChildDetail("Alice")
then:  ChildDetail shows child.balance = "£0.00"
       ChildDetail shows no transactions
```

---

## Child Detail — Deposits

### DepositIncreasesBalance

A deposit adds to the child's balance and appears at the top of the transaction history.

```
given: Child("Alice", balance: 500)                     -- £5.00
when:  ParentDeposits(session: "topher@example.com", child: "Alice", amount: 250, note: "weekly pocket money")
then:  Child("Alice").balance = 750                      -- £7.50
       new Transaction visible at top of ChildDetail("Alice"):
           kind: deposit
           amount: "£2.50"
           note: "weekly pocket money"
           recorded_by: "topher@example.com"
```

### DepositUsesDefaultNote

When the parent doesn't change the pre-filled note, the default is used.

```
when: ParentDeposits(session, child: "Alice", amount: 500, note: config.default_note)
then: new Transaction has note = "weekly pocket money"
```

### DepositWithCustomNote

The parent can replace the default note with something specific.

```
when: ParentDeposits(session, child: "Alice", amount: 1000, note: "birthday money from gran")
then: new Transaction has note = "birthday money from gran"
```

### DepositRejectsZeroAmount

The Pence value type requires amount > 0.

```
when: ParentDeposits(session, child: "Alice", amount: 0, note: "weekly pocket money")
then: error shown: amount must be greater than zero
 and: no Transaction created
```

### DepositRejectsNegativeAmount

Negative amounts are not valid. Withdrawals are a separate action.

```
when: ParentDeposits(session, child: "Alice", amount: -500, note: "weekly pocket money")
then: error shown: amount must be greater than zero
 and: no Transaction created
```

---

## Child Detail — Withdrawals

### WithdrawalDecreasesBalance

```
given: Child("Alice", balance: 500)                     -- £5.00
when:  ParentWithdraws(session: "topher@example.com", child: "Alice", amount: 200, note: "sweets")
then:  Child("Alice").balance = 300                      -- £3.00
       new Transaction visible at top of ChildDetail("Alice"):
           kind: withdrawal
           amount: "£2.00"
           note: "sweets"
           recorded_by: "topher@example.com"
```

### WithdrawalCanGoNegative

No floor on balance (ADR-0004). Parents can "sub" their kids.

```
given: Child("Alice", balance: 200)                     -- £2.00
when:  ParentWithdraws(session, child: "Alice", amount: 500, note: "advance on next week")
then:  Child("Alice").balance = -300                     -- -£3.00
       ChildDetail("Alice") shows balance as "-£3.00"
```

### WithdrawalFromZeroBalance

Even a zero balance doesn't block a withdrawal.

```
given: Child("Bob", balance: 0)
when:  ParentWithdraws(session, child: "Bob", amount: 100, note: "ice cream")
then:  Child("Bob").balance = -100                      -- -£1.00
```

---

## Child Detail — Correcting Mistakes

### CorrectMistakeWithOffsettingTransaction

Transactions are immutable (ADR-0020). A wrong withdrawal is fixed by depositing the same amount back with a note.

```
given: Child("Alice", balance: 300)                     -- £3.00
       -- Oops: parent recorded £5.00 withdrawal but it should have been £2.00
       Transaction(child: "Alice", kind: withdrawal, amount: 500, note: "shoes")
       -- Alice's balance is now -£2.00
when:  ParentDeposits(session, child: "Alice", amount: 500, note: "correction: shoes was £2 not £5")
  and: ParentWithdraws(session, child: "Alice", amount: 200, note: "shoes (corrected)")
then:  Child("Alice").balance = 100                      -- £1.00 (300 - 500 + 500 - 200)
       -- All three transactions visible in history — the mistake,
       -- the reversal, and the correct entry
```

---

## Child Detail — Removing a Child

### RemoveChildDeletesEverything

Hard delete (ADR-0006). Child and all transactions are gone.

```
given: Child("Bob")
       Transaction(child: "Bob", kind: deposit, amount: 500, note: "weekly pocket money")
when:  ParentRemovesChild(session, child: "Bob")
then:  not exists Child("Bob")
       Home does not show "Bob"
       no transactions for "Bob" exist in database
```

### RemoveChildWithNoTransactions

Removing a freshly added child (e.g. to fix a typo in the name).

```
given: Child("Boob") with no transactions               -- typo!
when:  ParentRemovesChild(session, child: "Boob")
then:  not exists Child("Boob")
  and: ParentAddsChild(session, name: "Bob")             -- re-add with correct name
  and: Child("Bob") exists with balance = 0
```

---

## Backup — Export

### ExportBackupViaBrowser

Parent downloads a JSON backup file from the home page. The file contains all children and transactions.

```
given: Child("Alice", created_at: t1)
       Child("Bob", created_at: t2)
       Transaction(child: "Alice", kind: deposit, amount: 500, note: "weekly pocket money", recorded_at: t3, recorded_by: "topher@example.com")
when:  ParentExportsBackup(session)
then:  browser downloads file named "pocket-money-YYYY-MM-DDTHH-MM-SS.json"
  and: file contains BackupData:
           children: [
               {name: "Alice", created_at: t1},
               {name: "Bob", created_at: t2}
           ]
           transactions: [
               {child_name: "Alice", kind: deposit, amount: 500, note: "weekly pocket money", recorded_at: t3, recorded_by: "topher@example.com"}
           ]
           exported_at: now
```

### ExportBackupViaApiKey

The cron job (ADR-0008) calls the backup API with an API key.

```
given: config.backup_api_key = "secret-key-123"
when:  GET /api/backup with Authorization: "Bearer secret-key-123"
then:  200 OK with BackupData as JSON body
```

### ExportBackupApiRejectsInvalidKey

```
when: GET /api/backup with Authorization: "Bearer wrong-key"
then: 401 Unauthorized
```

### ExportBackupApiRejectsMissingKey

```
when: GET /api/backup with no Authorization header
then: 401 Unauthorized
```

---

## Backup — Restore

### RestoreShowsConfirmationBeforeExecuting

Restore is a two-step flow (destructive operation). Step 1: upload and parse. Step 2: confirm.

```
given: Child("Alice", balance: 500)                     -- existing data
       valid backup file containing Child("Bob") and 3 transactions
when:  parent uploads backup file on Home
then:  app shows restore summary:
           children: 1 (Bob)
           transactions: 3
           exported_at: <date from backup>
       existing data is NOT yet deleted
when:  parent confirms restore
then:  not exists Child("Alice")                         -- old data wiped
       Child("Bob") exists                               -- backup data restored
       3 transactions for "Bob" exist
```

### RestoreRejectsInvalidFile

A file that fails Zod parsing (ADR-0023) is rejected at the upload step — no confirmation, no data loss.

```
given: Child("Alice", balance: 500)
when:  parent uploads file with invalid JSON structure
then:  error shown: invalid backup file
       Child("Alice") still exists with balance unchanged
       no confirmation step shown
```

### RestoreRejectsExtraFields

Strict Zod parsing rejects unknown fields (no `.passthrough()`).

```
when: parent uploads backup with extra fields (e.g. "colour": "blue" on a child)
then: error shown: invalid backup file
```

### RestoreFromEmptyBackup

A valid backup with zero children and zero transactions wipes existing data and leaves the app empty.

```
given: Child("Alice", balance: 500)
  and: valid backup file with children: [], transactions: [], exported_at: t1
when:  parent uploads and confirms restore
then:  no Children exist
       no Transactions exist
       Home shows empty state
```

---

## Audit Trail

### TransactionRecordsWhichParentActed

Each parent's actions are distinguishable in the ledger.

```
given: Child("Alice")
when:  ParentDeposits(session: {email: "topher@example.com"}, child: "Alice", amount: 500, note: "weekly pocket money")
  and: ParentDeposits(session: {email: "sarah@example.com"}, child: "Alice", amount: 500, note: "weekly pocket money")
then:  ChildDetail("Alice") shows two transactions:
           transaction 1 (newest): recorded_by = "sarah@example.com"
           transaction 2 (oldest): recorded_by = "topher@example.com"
```

---

## Multi-Child Isolation

### TransactionsAreIsolatedPerChild

Depositing to one child doesn't affect another's balance.

```
given: Child("Alice", balance: 500)
       Child("Bob", balance: 300)
when:  ParentDeposits(session, child: "Alice", amount: 200, note: "bonus")
then:  Child("Alice").balance = 700
       Child("Bob").balance = 300                        -- unchanged
```

---

## Currency Display

### AmountsDisplayedAsPoundsAndPence

All user-facing amounts are formatted as £X.XX (ADR-0014). Pence is the storage unit; display formatting is a view concern.

```
given: Child("Alice")
       Transaction(child: "Alice", kind: deposit, amount: 50, note: "found in sofa")      -- £0.50
       Transaction(child: "Alice", kind: deposit, amount: 1000, note: "birthday")          -- £10.00
       Transaction(child: "Alice", kind: deposit, amount: 1525, note: "chores")            -- £15.25
when:  viewer sees ChildDetail("Alice")
then:  ChildDetail shows balance = "£25.75"
       transactions show amounts: "£15.25", "£10.00", "£0.50"
```
