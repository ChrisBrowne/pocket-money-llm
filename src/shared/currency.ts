export function formatPence(pence: number): string {
  const negative = pence < 0
  const absPence = Math.abs(pence)
  const pounds = Math.floor(absPence / 100)
  const remainder = absPence % 100
  return `${negative ? "-" : ""}£${pounds}.${String(remainder).padStart(2, "0")}`
}
