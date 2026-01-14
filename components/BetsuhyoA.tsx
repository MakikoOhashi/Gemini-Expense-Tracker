import React from 'react';

interface BetsuhyoAProps {
  data: {
    売上: number;
    経費合計: number;
    所得金額: number;
    地代家賃: number;
    給与賃金: number;
    消耗品費: number;
    通信費: number;
    旅費交通費: number;
  };
}

export const BetsuhyoA: React.FC<BetsuhyoAProps> = ({ data }) => {
  return (
    <div className="space-y-8 p-4">

    <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-2xl mx-auto">
        <h3 className="font-bold text-red-800 mb-2">⚠️注意⚠️</h3>
        <p className="text-sm text-red-700">
        本画面に表示されている数値は、
        このアプリに登録された取引のみを集計した結果です。

        ここに含まれていない収入・経費がある場合は、
        国税庁の申告書上で必ず加算・修正してください。

        最終的な合計金額は、申告書上で計算した数値を使用してください。
        </p>
      </div>
     {/* 凡例 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl mx-auto">
        <h3 className="font-bold text-blue-800 mb-2">入力欄について</h3>
        <p className="text-sm text-blue-700">
          赤字で表示されている金額は、Google Sheetsから取得した取引データを集計したものです。
          マウスをホバーすると、各項目の説明が表示されます。
        </p>
      </div>
      {/* 第一表 */}
      <div className="relative w-[800px] mx-auto">
        <img src="/01.png" alt="別表A第一表" className="w-full shadow-lg rounded-lg" />

        {/* 以下 px指定の座標部分 は変更してはいけません */}

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
        <div className="group absolute" style={{ top: '210px', left: '60px', width: '150px' }} title="本アプリは「日々の取引を簡易な方法で記帳している場合」に該当します。第一表の区分欄には 4 を記入してください。">
          <input
            type="number"
            value='4'
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-right text-xl tracking-[0.36em] pr-0"
          />
        </div>
        {/* 所得金額 - 第一表の所得金額欄 */}
        <div className="group absolute" style={{ top: '210px', left: '266px', width: '150px' }} title="売上 - 経費合計 = 所得金額 ← ここが「ア」です">
          <input
            type="number"
            value={data.所得金額 || ''}
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-right text-xl tracking-[0.36em] pr-0"
          />
        </div>
         {/* 売上 - 第一表の売上欄 */}
        <div className="group absolute" style={{ top: '468px', left: '314px', width: '100px' }} title="経費を引く前の売上合計を記入します">
          <input
            type="number"
            value={data.売上 || ''}
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-right text-xl tracking-[0.36em] pr-0"
          />
        </div>

      </div>
      

      {/* 第二表 */}
      <div className="relative w-[800px] mx-auto">
        <img src="/02.png" alt="別表A第二表" className="w-full shadow-lg rounded-lg" />

        {/* 地代家賃 - 第二表の地代家賃欄 */}
        <div className="group absolute" style={{ top: '150px', left: '520px', width: '100px' }} title="地代家賃カテゴリの合計金額です">
          <input
            type="number"
            value={data.地代家賃 || ''}
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-center"
          />
        </div>

        {/* 給与賃金 - 第二表の給与賃金欄 */}
        <div className="group absolute" style={{ top: '180px', left: '520px', width: '100px' }} title="給与賃金カテゴリの合計金額です">
          <input
            type="number"
            value={data.給与賃金 || ''}
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-center"
          />
        </div>

        {/* 消耗品費 - 第二表の消耗品費欄 */}
        <div className="group absolute" style={{ top: '210px', left: '520px', width: '100px' }} title="消耗品費カテゴリの合計金額です">
          <input
            type="number"
            value={data.消耗品費 || ''}
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-center"
          />
        </div>

        {/* 通信費 - 第二表の通信費欄 */}
        <div className="group absolute" style={{ top: '240px', left: '520px', width: '100px' }} title="通信費カテゴリの合計金額です">
          <input
            type="number"
            value={data.通信費 || ''}
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-center"
          />
        </div>

        {/* 旅費交通費 - 第二表の旅費交通費欄 */}
        <div className="group absolute" style={{ top: '270px', left: '520px', width: '100px' }} title="旅費交通費カテゴリの合計金額です">
          <input
            type="number"
            value={data.旅費交通費 || ''}
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-center"
          />
        </div>
      </div>

      {/* 収支内訳書1 */}
      <div className="relative w-[800px] mx-auto">
        <img src="/07.png" alt="収支内訳書1" className="w-full shadow-lg rounded-lg" />
        {/* 収入 -売上欄 */}
        <div className="group absolute" style={{ top: '191px', left: '162px', width: '100px' }} title="経費を引く前の売上合計を記入します">
          <input
            type="number"
            value={data.売上 || ''}
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-right text-lg tracking-[0.10em] pr-0"
          />
        </div>
        {/* 収入 - 家事消費*/}
        <div className="group absolute" style={{ top: '208px', left: '162px', width: '100px' }} title="家事消費：該当しない場合は 0 円のままにしてください。（飲食店・物販など、商品を私用で使う場合のみ記入）">
          <input
            type="number"
            value={data.家事消費 ||'0'}
            readOnly
            className="w-full border-none bg-transparent font-bold text-yellow-600 text-right text-lg tracking-[0.10em] pr-0"
          />
        </div>
        {/* 経費 - 給料*/}
        <div className="group absolute" style={{ top: '354px', left: '162px', width: '100px' }} title="給料：該当しない場合は 0 円のままにしてください。（従業員に給料を支払った場合のみ記入）">
          <input
            type="number"
            value={data.給料 || '0'}
            readOnly
            className="w-full border-none bg-transparent font-bold text-yellow-600 text-right text-lg tracking-[0.10em] pr-0"
          />
        </div>
        {/* 経費 - 外注工賃*/}
        <div className="group absolute" style={{ top: '373px', left: '162px', width: '100px' }} title="外注工賃：フリーランス・業者への業務委託費用。※内容によっては源泉徴収が必要になる場合があります。">
          <input
            type="number"
            value={data.外注工賃 || '0'}
            readOnly
            className="w-full border-none bg-transparent font-bold text-yellow-600 text-right text-lg tracking-[0.10em] pr-0"
          />
        </div>
        {/* 経費 - 減価償却費*/}
        <div className="group absolute" style={{ top: '390px', left: '162px', width: '100px' }} title="減価償却費：パソコン・機械・設備など高額資産の今年分の経費額を記入します。購入額そのままではありません。">
          <input
            type="number"
            value={data.減価償却費 || '0'}
            readOnly
            className="w-full border-none bg-transparent font-bold text-yellow-600 text-right text-lg tracking-[0.10em] pr-0"
          />
        </div>
        {/* 経費 - 貸し倒れ金*/}
        <div className="group absolute" style={{ top: '406px', left: '162px', width: '100px' }} title="貸倒金：該当しない場合は 0 円のままにしてください。（※通常、白色申告では使用しません）">
          <input
            type="number"
            value={'0'}
            readOnly
            className="w-full border-none bg-transparent font-bold text-yellow-600 text-right text-lg tracking-[0.10em] pr-0"
          />
        </div>
        {/* 経費 - 地代家賃*/}
        <div className="group absolute" style={{ top: '422px', left: '162px', width: '100px' }} title="地代家賃：※カフェ等の単発利用は会議費または雑費に分類してください※月額契約のコワーキング・事務所のみ対象">
          <input
            type="number"
            value={data.減価償却費 || '0'}
            readOnly
            className="w-full border-none bg-transparent font-bold text-yellow-600 text-right text-lg tracking-[0.10em] pr-0"
          />
        </div>
        {/* 経費 - 利子割引料*/}
        <div className="group absolute" style={{ top: '439px', left: '162px', width: '100px' }} title="利子割引料：該当しない場合は 0 円のままにしてください。（※通常、白色申告では使用しません：手形・ファクタリングなど高度な取引をしている場合のみ使用）">
          <input
            type="number"
            value={'0'}
            readOnly
            className="w-full border-none bg-transparent font-bold text-yellow-600 text-right text-lg tracking-[0.10em] pr-0"
          />
        </div>
        {/* 経費 - 租税公課*/}
        <div className="group absolute" style={{ top: '454px', left: '162px', width: '100px' }} title="租税公課：該当しない場合は 0 円のままにしてください。（※印紙税・固定資産税の一部（家事按分したとき）など：※ 所得税・住民税・社会保険料はここに入れません）">
          <input
            type="number"
            value={data.租税公課 || '0'}
            readOnly
            className="w-full border-none bg-transparent font-bold text-yellow-600 text-right text-lg tracking-[0.10em] pr-0"
          />
        </div>
        {/* 経費 - 荷造運賃*/}
        <div className="group absolute" style={{ top: '472px', left: '162px', width: '100px' }} title="荷造運賃：送料など">
          <input
            type="number"
            value={data.荷造運賃 || '0'}
            readOnly
            className="w-full border-none bg-transparent font-bold text-yellow-600 text-right text-lg tracking-[0.10em] pr-0"
          />
        </div>
        {/* 経費 - 水道光熱費*/}
        <div className="group absolute" style={{ top: '488px', left: '162px', width: '100px' }} title="水道光熱費：電気代など">
          <input
            type="number"
            value={data.水道光熱費 || '0'}
            readOnly
            className="w-full border-none bg-transparent font-bold text-yellow-600 text-right text-lg tracking-[0.10em] pr-0"
          />
        </div>
        {/* 経費 - 旅費交通費欄 */}
        <div className="group absolute" style={{ top: '190px', left: '367px', width: '100px' }} title="旅費交通費カテゴリの合計金額です">
          <input
            type="number"
            value={data.旅費交通費 || '0'}
            readOnly
            className="w-full border-none bg-transparent font-bold text-yellow-600 text-right text-lg tracking-[0.10em] pr-0"
          />
        </div>
        {/* 経費 - 通信費欄 */}
        <div className="group absolute" style={{ top: '207px', left: '367px', width: '100px' }} title="通信費カテゴリの合計金額です">
          <input
            type="number"
            value={data.通信費 || '0'}
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-right text-lg tracking-[0.10em] pr-0"
          />
        </div>
        {/* 経費 - 広告宣伝費欄 */}
        <div className="group absolute" style={{ top: '224px', left: '367px', width: '100px' }} title="広告宣伝費カテゴリの合計金額です">
          <input
            type="number"
            value={data.広告宣伝費 || '0'}
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-right text-lg tracking-[0.10em] pr-0"
          />
        </div>
        {/* 経費 - 接待交際費欄 */}
        <div className="group absolute" style={{ top: '240px', left: '367px', width: '100px' }} title="接待交際費カテゴリの合計金額です">
          <input
            type="number"
            value={data.接待交際費 || '0'}
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-right text-lg tracking-[0.10em] pr-0"
          />
        </div>
        {/* 経費 - 損害保険料欄 */}
        <div className="group absolute" style={{ top: '257px', left: '367px', width: '100px' }} title="損害保険料カテゴリの合計金額です（生命保険・医療保険はここに入れません）">
          <input
            type="number"
            value={data.損害保険料 || '0'}
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-right text-lg tracking-[0.10em] pr-0"
          />
        </div>
        {/* 経費 - 修繕費欄 */}
        <div className="group absolute" style={{ top: '274px', left: '367px', width: '100px' }} title="修繕費カテゴリの合計金額です">
          <input
            type="number"
            value={data.修繕費 || '0'}
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-right text-lg tracking-[0.10em] pr-0"
          />
        </div>
        {/* 経費 - 消耗品費欄 */}
        <div className="group absolute" style={{ top: '290px', left: '367px', width: '100px' }} title="消耗品費カテゴリの合計金額です">
          <input
            type="number"
            value={data.消耗品費 || '0'}
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-right text-lg tracking-[0.10em] pr-0"
          />
        </div>
        {/* 経費 - 福利厚生費欄 */}
        <div className="group absolute" style={{ top: '306px', left: '367px', width: '100px' }} title="福利厚生費カテゴリの合計金額です">
          <input
            type="number"
            value={data.福利厚生費 || '0'}
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-right text-lg tracking-[0.10em] pr-0"
          />
        </div>
        {/* 経費 - 雑費欄 */}
        <div className="group absolute" style={{ top: '406px', left: '367px', width: '100px' }} title="雑費カテゴリの合計金額です">
          <input
            type="number"
            value={data.雑費 || '0'}
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-right text-lg tracking-[0.10em] pr-0"
          />
        </div>
        {/* 経費 - 経費合計欄 */}
        <div className="group absolute" style={{ top: '440px', left: '367px', width: '100px' }} title="雑費カテゴリの合計金額です">
          <input
            type="number"
            value={data.経費合計 || ''}
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-right text-lg tracking-[0.10em] pr-0"
          />
        </div>
        {/* 専従者控除前の所得金額欄 */}
        <div className="group absolute" style={{ top: '456px', left: '367px', width: '100px' }} title="専従者控除前の所得金額です">
          <input
            type="number"
            value={data.所得金額 || ''}
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-right text-lg tracking-[0.10em] pr-0"
          />
        </div>
        {/* 専従者控除後の所得金額欄 */}
        <div className="group absolute" style={{ top: '489px', left: '367px', width: '100px' }} title="専従者控除後の所得金額です">
          <input
            type="number"
            value={data.所得金額 || ''}
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-right text-lg tracking-[0.10em] pr-0"
          />
        </div>
        {/* 旅費交通費 - 第二表の旅費交通費欄 
        <div className="group absolute" style={{ top: '270px', left: '520px', width: '100px' }} title="旅費交通費カテゴリの合計金額です">
          <input
            type="number"
            value={data.旅費交通費 || ''}
            readOnly
            className="w-full border-none bg-transparent font-bold text-red-600 text-center"
          />
        </div>*/}
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
        <img src="/07-.png" alt="収支内訳書2" className="w-full shadow-lg rounded-lg" />
      </div>

      <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-2xl mx-auto">
        <h3 className="font-bold text-red-800 mb-2">⚠️注意点⚠️</h3>
        <p className="text-sm text-red-700">
        本画面に表示されている数値は、
        このアプリに登録された取引のみを集計した結果です。

        ここに含まれていない収入・経費がある場合は、
        国税庁の申告書上で必ず加算・修正してください。

        最終的な合計金額は、申告書上で計算した数値を使用してください。
        </p>
      </div>
    </div>
  );
};