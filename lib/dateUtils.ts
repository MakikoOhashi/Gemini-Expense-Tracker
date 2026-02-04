/**
 * JST基準で今日の日付文字列を取得する関数
 * @returns string - YYYY-MM-DD形式の日付文字列
 */
export function getTodayJSTString(): string {
  const now = new Date();
  const jstDate = new Date(now.getTime() + (now.getTimezoneOffset() + 9 * 60) * 60 * 1000);
  return jstDate.toISOString().split('T')[0];
}

/**
 * JST基準で現在の日時文字列を取得する関数
 * @returns string - YYYY-MM-DD HH:mm形式の日付文字列
 */
export function getTodayJSTDateTimeString(): string {
  const now = new Date();
  const jstDate = new Date(now.getTime() + (now.getTimezoneOffset() + 9 * 60) * 60 * 1000);
  const datePart = jstDate.toISOString().split('T')[0];
  const hours = String(jstDate.getHours()).padStart(2, '0');
  const minutes = String(jstDate.getMinutes()).padStart(2, '0');
  return `${datePart} ${hours}:${minutes}`;
}

/**
 * JST基準で現在の年を取得する関数
 * @returns number - JST基準の年
 */
export function getCurrentYearJST(): number {
  return Number(getTodayJSTString().slice(0, 4));
}
