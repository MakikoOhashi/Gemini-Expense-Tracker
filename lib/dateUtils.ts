/**
 * JST基準で今日の日付文字列を取得する関数
 * @returns string - YYYY-MM-DD形式の日付文字列
 */
export function getTodayJSTString(): string {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

/**
 * JST基準で現在の年を取得する関数
 * @returns number - JST基準の年
 */
export function getCurrentYearJST(): number {
  return Number(getTodayJSTString().slice(0, 4));
}
