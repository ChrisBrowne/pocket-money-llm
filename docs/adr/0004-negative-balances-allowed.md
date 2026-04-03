# ADR-0004: Negative balances allowed

**Status**: Accepted

**Context**: The app tracks real pocket money. Normally you can't withdraw what you don't have, but the user wants to be able to "sub" their kids — effectively lending against future pocket money.

**Decision**: No constraint on withdrawals driving a balance negative. Any positive amount can be withdrawn regardless of current balance.

**Consequences**:
- Simpler withdrawal logic — no balance check needed
- A child's balance can be negative, which the UI should display clearly
- No concept of "debt limit" in v1
