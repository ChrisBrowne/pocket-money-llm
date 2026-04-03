# ADR-0014: Currency stored as integer pence

## Status

Accepted

## Context

The app tracks real money (GBP). Floating-point arithmetic introduces rounding errors that are unacceptable for financial data, even at pocket money scale. The question is how to represent and store monetary amounts.

## Decision

Store all amounts as integer pence (pennies). £5.00 is stored as `500`. All arithmetic operates on integers. Formatting to pounds and pence happens only at the display layer.

## Consequences
- No floating-point errors — ever
- Arithmetic is simple integer addition/subtraction
- The parsed `Amount` type at the boundary converts user input (e.g. "5.00") to pence and rejects invalid values
- Display formatting (pence → "£5.00") is a pure function at the view layer
- The currency is GBP throughout — no multi-currency support needed
