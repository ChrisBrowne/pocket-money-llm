// Age — full years between a date of birth and `now`.
//
// The dob argument is the same ISO YYYY-MM-DD string carried by the Birthday
// branded type. Computation is calendar-aware: a child born 2015-04-12 turns
// 10 on 2025-04-12, not at any other point in 2025. Months and days both
// matter for the rollover, not just the year delta.
//
// `now` is injectable so unit tests can pin the clock; production callers
// pass nothing and get real time.

export function computeAge(dob: string, now: Date = new Date()): number {
  // Parse as UTC midnight to avoid local-timezone surprises (a dob in the
  // user's local Tuesday could otherwise be a different date in UTC).
  const [yearStr, monthStr, dayStr] = dob.split("-");
  const birthYear = Number(yearStr);
  const birthMonth = Number(monthStr);
  const birthDay = Number(dayStr);

  const nowYear = now.getUTCFullYear();
  const nowMonth = now.getUTCMonth() + 1; // getUTCMonth is 0-indexed
  const nowDay = now.getUTCDate();

  let age = nowYear - birthYear;
  const beforeBirthday =
    nowMonth < birthMonth || (nowMonth === birthMonth && nowDay < birthDay);
  if (beforeBirthday) age -= 1;

  return age;
}

// Pluralised display string. "1 year old" vs "0/2+ years old".
export function formatAgeWords(age: number): string {
  return age === 1 ? "1 year old" : `${age} years old`;
}
