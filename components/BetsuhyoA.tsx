import React from 'react';
import { POS } from '../layout.locked';
import { TEXT, Language } from '../src/i18n/text';

interface BetsuhyoAProps {
  data: {
    雑費?: number;
    福利厚生費?: number;
    修繕費?: number;
    損害保険料?: number;
    接待交際費?: number;
    広告宣伝費?: number;
    水道光熱費?: number;
    外注工賃?: number;
    家事消費?: number;
    その他の収入?: number;
    給料?: number;
    減価償却費?: number;
    租税公課?: number;
    荷造運賃?: number;
    売上: number;
    経費合計: number;
    所得金額: number;
    地代家賃: number;
    給与賃金: number;
    消耗品費: number;
    通信費: number;
    旅費交通費: number;
    所得の内訳: Record<string, { 種目: string; 収入金額: number; 源泉徴収税額: number }>;
  };
  t: any;
  language: Language;
}

const TOOLTIP_CLASSES = `
  pointer-events-none
  absolute z-[9999]
  left-1/2 top-full mt-2 -translate-x-1/2
  whitespace-nowrap
  rounded-md bg-black/90 px-3 py-1.5
  text-xs text-white
  opacity-0
  transition-all duration-150
  group-hover:opacity-100 group-hover:scale-100
`.trim();

export const BetsuhyoA: React.FC<BetsuhyoAProps> = ({ data, t, language }) => {
  const getImageSrc = (baseName: string) => {
    return language === 'en' ? `/${baseName}e.png` : `/${baseName}.png`;
  };

  return (
    <div className="form-area space-y-8 p-4">

      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="font-bold text-red-800 mb-2">{t.attention}</h3>
        <p className="text-sm text-red-700">
        {t.attentionMessage}
        </p>
      </div>
      {/* 凡例 */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-slate-800 mb-2">{t.inputFields}</h3>
        <p className="text-sm text-slate-700">
          {t.inputFieldsDescription}
        </p>
      </div>


      {/* 収支内訳書1 */}
      <div className="relative w-[800px] mx-auto">
        <img src={getImageSrc("07")} alt="収支内訳書1" className="w-full shadow-lg rounded-lg" />
        {/* 収入 -売上欄 */}
        <div className="group absolute" style={POS.incomeSales}>
          <input
            type="number"
            value={data.売上 || 0}
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-right text-lg tracking-[0.10em] pr-0  [appearance:textfield] [&::-webkit-outer-spin-button]:hidden [&::-webkit-inner-spin-button]:hidden"
          />
          {/* Tooltip */}
          <div className={TOOLTIP_CLASSES}>
            売上：<br/>経費を引く前の<br/>売上合計を記入します
          </div>
        </div>
        {/* 収入 - 家事消費*/}
        <div className="group absolute" style={POS.incomeHouseholdConsumption}>
          <input
            type="number"
            value={data.家事消費 || 0}
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-right text-lg tracking-[0.10em] pr-0 [appearance:textfield] [&::-webkit-outer-spin-button]:hidden [&::-webkit-inner-spin-button]:hidden"
          />
          {/* Tooltip */}
          <div className={TOOLTIP_CLASSES}>
            家事消費：<br/>該当しない場合は 0 円のままにしてください。<br/>（飲食店・物販など、商品を私用で使う場合のみ記入）
          </div>
        </div>
        {/* 収入 - その他の収入*/}
        <div className="group absolute" style={POS.incomeOther}>
          <input
            type="number"
            value={data.その他の収入 || 0}
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-right text-lg tracking-[0.10em] pr-0 [appearance:textfield] [&::-webkit-outer-spin-button]:hidden [&::-webkit-inner-spin-button]:hidden"
          />
          {/* Tooltip */}
          <div className={TOOLTIP_CLASSES}>
            その他の収入：<br/>該当しない場合は 0 円のままにしてください。
          </div>
        </div>
         {/* 収入 - 収入小計*/}
         <div className="group absolute" style={POS.incomeTotal}>
          <input
            type="number"
            value={(data.売上 || 0) + (data.家事消費 || 0) + (data.その他の収入 || 0)}
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-right text-lg tracking-[0.10em] pr-0 [appearance:textfield] [&::-webkit-outer-spin-button]:hidden [&::-webkit-inner-spin-button]:hidden"
          />
          {/* Tooltip */}
          <div className={TOOLTIP_CLASSES}>
            収入計：<br/>収入金額合計です。
          </div>
        </div>
        {/* 経費 - 給料*/}
        <div className="group absolute" style={POS.expenseSalary}>
          <input
            type="number"
            value={data.給料 || 0}
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-right text-lg tracking-[0.10em] pr-0 [appearance:textfield] [&::-webkit-outer-spin-button]:hidden [&::-webkit-inner-spin-button]:hidden"
          />
          {/* Tooltip */}
          <div className={TOOLTIP_CLASSES}>
            給料：該当しない場合は<br/>0 円のままにしてください。<br/>（従業員に給料を支払った場合のみ記入）
          </div>
        </div>
        {/* 経費 - 外注工賃*/}
        <div className="group absolute" style={POS.expenseOutsourcing}>
          <input
            type="number"
            value={data.外注工賃 || 0}
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-right text-lg tracking-[0.10em] pr-0 [appearance:textfield] [&::-webkit-outer-spin-button]:hidden [&::-webkit-inner-spin-button]:hidden"
          />
          {/* Tooltip */}
          <div className={TOOLTIP_CLASSES}>
            外注工賃：フリーランス・業者への業務委託費用。<br/>※内容によっては源泉徴収が必要になる場合があります。
          </div>
        </div>
        {/* 経費 - 租税公課*/}
        <div className="group absolute" style={POS.expenseTaxes}>
          <input
            type="number"
            value={data.租税公課 || 0}
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-right text-lg tracking-[0.10em] pr-0 [appearance:textfield] [&::-webkit-outer-spin-button]:hidden [&::-webkit-inner-spin-button]:hidden"
          />
          {/* Tooltip */}
          <div className={TOOLTIP_CLASSES}>
            租税公課：該当しない場合は 0 円のままにしてください。<br/>（※印紙税・固定資産税の一部（家事按分したとき）など：<br/>※ 所得税・住民税・社会保険料はここに入れません）
          </div>
        </div>
        {/* 経費 - 荷造運賃*/}
        <div className="group absolute" style={POS.expenseShipping}>
          <input
            type="number"
            value={data.荷造運賃 || 0}
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-right text-lg tracking-[0.10em] pr-0 [appearance:textfield] [&::-webkit-outer-spin-button]:hidden [&::-webkit-inner-spin-button]:hidden"
          />
          {/* Tooltip */}
          <div className={TOOLTIP_CLASSES}>
            荷造運賃：<br/>送料など
          </div>
        </div>
        {/* 経費 - 水道光熱費*/}
        <div className="group absolute" style={POS.expenseUtilities}>
          <input
            type="number"
            value={data.水道光熱費 || 0}
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-right text-lg tracking-[0.10em] pr-0 [appearance:textfield] [&::-webkit-outer-spin-button]:hidden [&::-webkit-inner-spin-button]:hidden"
          />
          {/* Tooltip */}
          <div className={TOOLTIP_CLASSES}>
            水道光熱費：<br/>電気代など
          </div>
        </div>
        {/* 経費 - 広告宣伝費欄 */}
        <div className="group absolute" style={POS.expenseAdvertising}>
          <input
            type="number"
            value={data.広告宣伝費 || 0}
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-right text-lg tracking-[0.10em] pr-0 [appearance:textfield] [&::-webkit-outer-spin-button]:hidden [&::-webkit-inner-spin-button]:hidden"
          />
          {/* Tooltip */}
          <div className={TOOLTIP_CLASSES}>
            広告宣伝費：<br/>カテゴリの合計金額です
          </div>
        </div>
        {/* 経費 - 損害保険料欄 */}
        <div className="group absolute" style={POS.expenseInsurance}>
          <input
            type="number"
            value={data.損害保険料 || 0}
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-right text-lg tracking-[0.10em] pr-0 [appearance:textfield] [&::-webkit-outer-spin-button]:hidden [&::-webkit-inner-spin-button]:hidden"
          />
          {/* Tooltip */}
          <div className={TOOLTIP_CLASSES}>
            損害保険料：<br/>カテゴリの合計金額です<br/>（生命保険・医療保険はここに入れません）
          </div>
        </div>
        {/* 経費 - 修繕費欄 */}
        <div className="group absolute" style={POS.expenseRepair}>
          <input
            type="number"
            value={data.修繕費 || 0}
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-right text-lg tracking-[0.10em] pr-0 [appearance:textfield] [&::-webkit-outer-spin-button]:hidden [&::-webkit-inner-spin-button]:hidden"
          />
          {/* Tooltip */}
          <div className={TOOLTIP_CLASSES}>
            修繕費：<br/>カテゴリの合計金額です
          </div>
        </div>
        {/* 経費 - 福利厚生費欄 */}
        <div className="group absolute" style={POS.expenseWelfare}>
          <input
            type="number"
            value={data.福利厚生費 || 0}
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-right text-lg tracking-[0.10em] pr-0 [appearance:textfield] [&::-webkit-outer-spin-button]:hidden [&::-webkit-inner-spin-button]:hidden"
          />
          {/* Tooltip */}
          <div className={TOOLTIP_CLASSES}>
            福利厚生費：<br/>カテゴリの合計金額です
          </div>
        </div>
        {/* 経費 - 雑費欄 */}
        <div className="group absolute" style={POS.expenseMiscellaneous}>
          <input
            type="number"
            value={data.雑費 || 0}
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-right text-lg tracking-[0.10em] pr-0 [appearance:textfield] [&::-webkit-outer-spin-button]:hidden [&::-webkit-inner-spin-button]:hidden"
          />
          {/* Tooltip */}
          <div className={TOOLTIP_CLASSES}>
            雑費：<br/>雑費カテゴリの合計金額です
          </div>
        </div>
        {/* 経費 - 減価償却費*/}
        <div className="group absolute" style={POS.expenseDepreciation}>
          <input
            type="number"
            value={data.減価償却費 || 0}
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-right text-lg tracking-[0.10em] pr-0 [appearance:textfield] [&::-webkit-outer-spin-button]:hidden [&::-webkit-inner-spin-button]:hidden"
          />
          {/* Tooltip */}
          <div className={TOOLTIP_CLASSES}>
            減価償却費：<br/>パソコン・機械・設備など高額資産の<br/>今年分の経費額を記入します。<br/>購入額そのままではありません。
          </div>
        </div>
        {/* 経費 - 貸し倒れ金*/}
        <div className="group absolute" style={POS.expenseBadDebt}>
          <input
            type="number"
            value={0}
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-right text-lg tracking-[0.10em] pr-0 [appearance:textfield] [&::-webkit-outer-spin-button]:hidden [&::-webkit-inner-spin-button]:hidden"
          />
          {/* Tooltip */}
          <div className={TOOLTIP_CLASSES}>
            貸倒金：該当しない場合は<br/>0 円のままにしてください。<br/>（※通常、白色申告では使用しません）
          </div>
        </div>
        {/* 経費 - 地代家賃*/}
        <div className="group absolute" style={POS.expenseRent}>
          <input
            type="number"
            value={data.地代家賃 || 0}
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-right text-lg tracking-[0.10em] pr-0 [appearance:textfield] [&::-webkit-outer-spin-button]:hidden [&::-webkit-inner-spin-button]:hidden"
          />
          {/* Tooltip */}
          <div className={TOOLTIP_CLASSES}>
            地代家賃：<br/>※カフェ等の単発利用は会議費または雑費に分類してください<br/>※月額契約のコワーキング・事務所のみ対象
          </div>
        </div>
        {/* 経費 - 利子割引料*/}
        <div className="group absolute" style={POS.expenseInterestDiscount}>
          <input
            type="number"
            value={0}
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-right text-lg tracking-[0.10em] pr-0 [appearance:textfield] [&::-webkit-outer-spin-button]:hidden [&::-webkit-inner-spin-button]:hidden"
          />
          {/* Tooltip */}
          <div className={TOOLTIP_CLASSES}>
            利子割引料：該当しない場合は<br/>0 円のままにしてください。<br/>（※通常、白色申告では使用しません：<br/>手形・ファクタリングなど高度な取引をしている場合のみ使用）
          </div>
        </div>
        {/* 経費 - 租税公課*/}
        <div className="group absolute" style={POS.expenseTaxes}>
          <input
            type="number"
            value={data.租税公課 || 0}
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-right text-lg tracking-[0.10em] pr-0 [appearance:textfield] [&::-webkit-outer-spin-button]:hidden [&::-webkit-inner-spin-button]:hidden"
          />
          {/* Tooltip */}
          <div className={TOOLTIP_CLASSES}>
            租税公課：該当しない場合は 0 円のままにしてください。<br/>（※印紙税・固定資産税の一部（家事按分したとき）など：<br/>※ 所得税・住民税・社会保険料はここに入れません）
          </div>
        </div>
        {/* 経費 - 荷造運賃*/}
        <div className="group absolute" style={POS.expenseShipping}>
          <input
            type="number"
            value={data.荷造運賃 || 0}
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-right text-lg tracking-[0.10em] pr-0 [appearance:textfield] [&::-webkit-outer-spin-button]:hidden [&::-webkit-inner-spin-button]:hidden"
          />
          {/* Tooltip */}
          <div className={TOOLTIP_CLASSES}>
            荷造運賃：<br/>送料など
          </div>
        </div>
        {/* 経費 - 水道光熱費*/}
        <div className="group absolute" style={POS.expenseUtilities}>
          <input
            type="number"
            value={data.水道光熱費 || 0}
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-right text-lg tracking-[0.10em] pr-0 [appearance:textfield] [&::-webkit-outer-spin-button]:hidden [&::-webkit-inner-spin-button]:hidden"
          />
          {/* Tooltip */}
          <div className={TOOLTIP_CLASSES}>
            水道光熱費：<br/>電気代など
          </div>
        </div>
        {/* 経費 - 旅費交通費欄 */}
        <div className="group absolute" style={POS.expenseTravel}>
          <input
            type="number"
            value={data.旅費交通費 || 0}
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-right text-lg tracking-[0.10em] pr-0 [appearance:textfield] [&::-webkit-outer-spin-button]:hidden [&::-webkit-inner-spin-button]:hidden"
          />
          {/* Tooltip */}
          <div className={TOOLTIP_CLASSES}>
            旅費交通費：<br/>カテゴリの合計金額です
          </div>
        </div>
        {/* 経費 - 通信費欄 */}
        <div className="group absolute" style={POS.expenseCommunication}>
          <input
            type="number"
            value={data.通信費 || 0}
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-right text-lg tracking-[0.10em] pr-0 [appearance:textfield] [&::-webkit-outer-spin-button]:hidden [&::-webkit-inner-spin-button]:hidden"
          />
          {/* Tooltip */}
          <div className={TOOLTIP_CLASSES}>
            通信費：<br/>カテゴリの合計金額です
          </div>
        </div>
        {/* 経費 - 広告宣伝費欄 */}
        <div className="group absolute" style={POS.expenseAdvertising}>
          <input
            type="number"
            value={data.広告宣伝費 || 0}
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-right text-lg tracking-[0.10em] pr-0 [appearance:textfield] [&::-webkit-outer-spin-button]:hidden [&::-webkit-inner-spin-button]:hidden"
          />
          {/* Tooltip */}
          <div className={TOOLTIP_CLASSES}>
            広告宣伝費：<br/>カテゴリの合計金額です
          </div>
        </div>
        {/* 経費 - 接待交際費欄 */}
        <div className="group absolute" style={POS.expenseEntertainment}>
          <input
            type="number"
            value={data.接待交際費 || 0}
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-right text-lg tracking-[0.10em] pr-0 [appearance:textfield] [&::-webkit-outer-spin-button]:hidden [&::-webkit-inner-spin-button]:hidden"
          />
          {/* Tooltip */}
          <div className={TOOLTIP_CLASSES}>
            接待交際費：<br/>カテゴリの合計金額です
          </div>
        </div>
        {/* 経費 - 損害保険料欄 */}
        <div className="group absolute" style={POS.expenseInsurance}>
          <input
            type="number"
            value={data.損害保険料 || 0}
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-right text-lg tracking-[0.10em] pr-0 [appearance:textfield] [&::-webkit-outer-spin-button]:hidden [&::-webkit-inner-spin-button]:hidden"
          />
          {/* Tooltip */}
          <div className={TOOLTIP_CLASSES}>
            損害保険料：<br/>カテゴリの合計金額です<br/>（生命保険・医療保険はここに入れません）
          </div>
        </div>
        {/* 経費 - 修繕費欄 */}
        <div className="group absolute" style={POS.expenseRepair}>
          <input
            type="number"
            value={data.修繕費 || 0}
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-right text-lg tracking-[0.10em] pr-0 [appearance:textfield] [&::-webkit-outer-spin-button]:hidden [&::-webkit-inner-spin-button]:hidden"
          />
          {/* Tooltip */}
          <div className={TOOLTIP_CLASSES}>
            修繕費：<br/>カテゴリの合計金額です
          </div>
        </div>
        {/* 経費 - 消耗品費欄 */}
        <div className="group absolute" style={POS.expenseSupplies}>
          <input
            type="number"
            value={data.消耗品費 || 0}
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-right text-lg tracking-[0.10em] pr-0 [appearance:textfield] [&::-webkit-outer-spin-button]:hidden [&::-webkit-inner-spin-button]:hidden"
          />
          {/* Tooltip */}
          <div className={TOOLTIP_CLASSES}>
            消耗品費：<br/>カテゴリの合計金額です
          </div>
        </div>
        {/* 経費 - 福利厚生費欄 */}
        <div className="group absolute" style={POS.expenseWelfare}>
          <input
            type="number"
            value={data.福利厚生費 || 0}
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-right text-lg tracking-[0.10em] pr-0 [appearance:textfield] [&::-webkit-outer-spin-button]:hidden [&::-webkit-inner-spin-button]:hidden"
          />
          {/* Tooltip */}
          <div className={TOOLTIP_CLASSES}>
            福利厚生費：<br/>カテゴリの合計金額です
          </div>
        </div>
        {/* 経費 - 雑費欄 */}
        <div className="group absolute" style={POS.expenseMiscellaneous}>
          <input
            type="number"
            value={data.雑費 || 0}
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-right text-lg tracking-[0.10em] pr-0 [appearance:textfield] [&::-webkit-outer-spin-button]:hidden [&::-webkit-inner-spin-button]:hidden"
          />
          {/* Tooltip */}
          <div className={TOOLTIP_CLASSES}>
            雑費：<br/>雑費カテゴリの合計金額です
          </div>
        </div>
        {/* 経費 - その他の経費小計欄 */}
        <div className="group absolute" style={POS.expenseOtherTotal}>
          <input
            type="number"
            value={
              (data.租税公課 || 0) +
              (data.荷造運賃 || 0) +
              (data.水道光熱費 || 0) +
              (data.旅費交通費 || 0) +
              (data.通信費 || 0) +
              (data.広告宣伝費 || 0) +
              (data.接待交際費 || 0) +
              (data.損害保険料 || 0) +
              (data.修繕費 || 0) +
              (data.消耗品費 || 0) +
              (data.福利厚生費 || 0) +
              (data.雑費 || 0)
            }
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-right text-lg tracking-[0.10em] pr-0 [appearance:textfield] [&::-webkit-outer-spin-button]:hidden [&::-webkit-inner-spin-button]:hidden"
          />
          {/* Tooltip */}
          <div className={TOOLTIP_CLASSES}>
            その他の経費小計：<br/>その他の経費の小計金額です
          </div>
        </div>
        {/* 経費 - 経費合計欄 */}
        <div className="group absolute" style={POS.expenseTotal}>
          <input
            type="number"
            value={data.経費合計 || 0}
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-right text-lg tracking-[0.10em] pr-0 [appearance:textfield] [&::-webkit-outer-spin-button]:hidden [&::-webkit-inner-spin-button]:hidden"
          />
          {/* Tooltip */}
          <div className={TOOLTIP_CLASSES}>
          経費：<br/>経費カテゴリの合計金額です
          </div>
        </div>
        {/* 専従者控除前の所得金額欄 */}
        <div className="group absolute" style={POS.incomeBeforeDeduction}>
          <input
            type="number"
            value={data.所得金額 || 0}
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-right text-lg tracking-[0.10em] pr-0 [appearance:textfield] [&::-webkit-outer-spin-button]:hidden [&::-webkit-inner-spin-button]:hidden"
          />
          {/* Tooltip */}
          <div className={TOOLTIP_CLASSES}>
            専従者控除前所得金額：<br/>配偶者や親を事業に従事させている場合、<br/>
            その給与を経費として控除できます。<br/>
            この金額は、その控除『前』です
          </div>
        </div>
        {/* 専従者控除 */}
        <div className="group absolute" style={POS.dependentDeductionBefore}>
          <input
            type="number"
            value={0}
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-right text-lg tracking-[0.10em] pr-0 [appearance:textfield] [&::-webkit-outer-spin-button]:hidden [&::-webkit-inner-spin-button]:hidden"
          />
          {/* Tooltip */}
          <div className={TOOLTIP_CLASSES}>
            専従者控除：<br/>配偶者や親を事業に従事させている場合、<br/>
            その給与を経費として控除できます。<br/>
            専従者控除を使う場合記入してください<br/>
            記入した場合、<br/>下記の専従者控除後の所得金額欄 は各自再計算ください
          </div>
        </div>
        {/* 専従者控除後の所得金額欄 */}
        <div className="group absolute" style={POS.incomeAfterDeduction}>
          <input
            type="number"
            value={data.所得金額 || 0}
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-right text-lg tracking-[0.10em] pr-0 [appearance:textfield] [&::-webkit-outer-spin-button]:hidden [&::-webkit-inner-spin-button]:hidden"
          />
          {/* Tooltip */}
          <div className={TOOLTIP_CLASSES}>
            専従者控除後所得金額：<br/>配偶者や親を事業に従事させている場合、<br/>
            その給与を経費として控除できます。<br/>
            この金額は、その控除『後』です
          </div>
        </div>
        
        {/* 地代家賃 - 第二表の地代家賃欄
        <div className="group absolute" style={{ top: '150px', left: '520px', width: '100px' }} title="地代家賃カテゴリの合計金額です">
          <input
            type="number"
            value={data.地代家賃 || ''}
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-center"
          />
        </div>*/}
      </div>
      {/* 収支内訳書2 */}
      <div className="relative w-[800px] mx-auto">
        <img src={getImageSrc("07-")} alt="収支内訳書2" className="w-full shadow-lg rounded-lg" />

        {/* 所得の内訳 - 収支内訳書2に表示 */}
        {(() => {
          const incomeBreakdownEntries = Object.entries(data.所得の内訳 || {});
          const top4Income = incomeBreakdownEntries.slice(0, 4).reduce((sum, [, payerData]) => sum + ((payerData as { 種目: string; 収入金額: number; 源泉徴収税額: number }).収入金額 || 0), 0);
          const remainingIncome = incomeBreakdownEntries.slice(4).reduce((sum, [, payerData]) => sum + ((payerData as { 種目: string; 収入金額: number; 源泉徴収税額: number }).収入金額 || 0), 0);
          const totalDisplayedIncome = top4Income + remainingIncome;

          return (
            <>
              {/* 上位4件の個別表示 */}
              {incomeBreakdownEntries.slice(0, 4).map(([payerName, payerData], index) => (
                <div
                  key={payerName}
                  className="absolute text-xs font-bold text-red-600"
                  style={{
                    top: 100 + (index * 15),
                    left: 80,
                    width: 300
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div className="group flex-1 text-left truncate relative overflow-visible">
                      <span className="truncate block">{payerName}</span>
                      {/* Tooltip */}
                      <div className={TOOLTIP_CLASSES}>
                        支払人：会社名の後に<br/>住所や法人番号などを<br/>記載してください
                      </div>
                    </div>
                    <span className="w-24 text-right">{(payerData as { 種目: string; 収入金額: number; 源泉徴収税額: number }).収入金額?.toLocaleString() || '0'}</span>
                  </div>
                </div>
              ))}

              {/* 5件目以降の合計を「その他」として表示 */}
              {incomeBreakdownEntries.length > 4 && (
                <div
                  className="absolute text-xs font-bold text-red-600"
                  style={{
                    top: 100 + (4 * 15),
                    left: 80,
                    width: 300
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="flex-1 text-left"></span>
                    <span className="w-24 text-right">{remainingIncome.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* 6行目に1〜5行目のトータル金額を表示 */}
              <div
                className="absolute text-xs font-bold text-red-600"
                style={{
                  top: 100 + (5 * 15),
                  left: 80,
                  width: 300
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-left"></span>
                  <span className="w-24 text-right">{totalDisplayedIncome.toLocaleString()}</span>
                </div>
              </div>
            </>
          );
        })()}
      </div>



     {/* 第一表 */}
     <div className="relative w-[800px] mx-auto">
       <img src={getImageSrc("01")} alt="別表A第一表" className="w-full shadow-lg rounded-lg" />

        {/* 経費合計 - 第一表の経費合計欄 
        <div className="group absolute" style={{ top: '245px', left: '520px', width: '100px' }} title="すべての経費の合計金額です">
          <input
            type="number"
            value={data.経費合計 || ''}
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-center"
          />
        </div>*/}
        {/* 所得金額 - 第一表の所得金額 事業（営業等・農業）の区分欄*/}
        <div className="group absolute" style={POS.firstTableCategory}>
          <input
            type="number"
            value={'4'}
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-right text-xl tracking-[0.36em] pr-0 [appearance:textfield] [&::-webkit-outer-spin-button]:hidden [&::-webkit-inner-spin-button]:hidden"
          />
          {/* Tooltip */}
          <div className={TOOLTIP_CLASSES}>
            区分：<br/>本アプリは<br/>「日々の取引を簡易な方法で<br/>記帳している場合」<br/>に該当します。<br/>第一表の区分欄には 4 <br/>を記入してください。
          </div>
        </div>
        {/* 所得金額 - 第一表の所得金額欄 */}
        <div className="group absolute" style={POS.firstTableIncomeAmount}>
          <input
            type="number"
            value={data.所得金額 || 0}
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-right text-xl tracking-[0.36em] pr-0 [appearance:textfield] [&::-webkit-outer-spin-button]:hidden [&::-webkit-inner-spin-button]:hidden"
          />

          {/* Tooltip */}
          <div className={TOOLTIP_CLASSES}>
            所得金額：<br/>売上 − 経費合計 = 所得金額（第一表「ア」）
          </div>

        </div>
         {/* 売上 - 第一表の売上欄 */}
        <div className="group absolute" style={POS.firstTableSales}>
          <input
            type="number"
            value={data.売上 || 0}
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-right text-xl tracking-[0.36em] pr-0 [appearance:textfield] [&::-webkit-outer-spin-button]:hidden [&::-webkit-inner-spin-button]:hidden"
          />
          {/* Tooltip */}
          <div className={TOOLTIP_CLASSES}>
            売上：<br/>経費を引く前の売上合計を記入します
          </div>
        </div>

      </div>
      

      {/* 第二表 */}
      <div className="relative w-[800px] mx-auto">
        <img src={getImageSrc("02")} alt="別表A第二表" className="w-full shadow-lg rounded-lg" />

        {/* 所得の内訳 - 第二表の1件目〜4件目のみ表示 */}
        {Object.entries(data.所得の内訳 || {}).map(([payerName, payerData], index) =>
          index < 4 && (  // 1件目〜4件目のみ表示（0-indexedなのでindex < 4）
            <div
              key={payerName}
              className="absolute text-xs font-bold text-red-600"
              style={{
                top: POS.secondTableTravel.top + (index * 30),
                left: POS.secondTableTravel.left - 150,
                width: 340
              }}
            >
              <div className="flex items-center gap-2">
                <span className="w-8 text-left">事業</span>
                <span className="w-12 text-center">営業等</span>
                    <div className="group flex-1 text-center truncate relative overflow-visible">
                      <span className="truncate block">{payerName}</span>
                      {/* Tooltip */}
                      <div className={TOOLTIP_CLASSES}>
                        支払人：会社名の後に<br/>住所や法人番号などを<br/>記載してください
                      </div>
                    </div>
                <span className="w-16 text-right">{(payerData as { 種目: string; 収入金額: number; 源泉徴収税額: number }).収入金額?.toLocaleString() || '0'}</span>
                <span className="w-16 text-right">{(payerData as { 種目: string; 収入金額: number; 源泉徴収税額: number }).源泉徴収税額?.toLocaleString() || '0'}</span>
              </div>
            </div>
          )
        )}
      </div>

      {/* 所得の内訳書 - payerNameの種類が5件以上の場合のみ表示 */}
      {Object.keys(data.所得の内訳 || {}).length >= 5 && (
        <div className="relative w-[800px] mx-auto">
          <img src={getImageSrc("09")} alt="所得の内訳書" className="w-full shadow-lg rounded-lg" />

          {/* 所得の内訳 - 支払者5件目以降のみ縦方向に表示 */}
          {Object.entries(data.所得の内訳 || {}).map(([payerName, payerData], index) =>
            index >= 4 && (  // 5件目以降のみ表示（0-indexedなのでindex >= 4）
              <div
                key={payerName}
                className="absolute text-xs font-bold text-red-600"
                style={{
                  top: POS.incomeBreakdownTable.top + ((index - 4) * 40), // indexを調整して5件目から0として配置
                  left: POS.incomeBreakdownTable.left - 150,
                  width: 560
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="w-8 text-left">事業</span>
                  <span className="w-16 text-center">営業等</span>
                  <div className="group w-40 text-center truncate relative overflow-visible">
                    <span className="truncate block">{payerName}</span>
                    {/* Tooltip */}
                    <div className={TOOLTIP_CLASSES}>
                      支払人：会社名の後に<br/>住所や法人番号などを<br/>記載してください
                    </div>
                  </div>
                  <span className="w-4 text-center"></span>
                  <span className="w-28 text-right">{(payerData as { 種目: string; 収入金額: number; 源泉徴収税額: number }).収入金額?.toLocaleString() || '0'}</span>
                  <span className="w-16 text-right">{(payerData as { 種目: string; 収入金額: number; 源泉徴収税額: number }).源泉徴収税額?.toLocaleString() || '0'}</span>
                  <span className="w-4 text-center"></span>
                </div>
              </div>
            )
          )}
        </div>
      )}

    </div>
  );
};
