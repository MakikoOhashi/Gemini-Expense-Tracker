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
        <img src="/07.png" alt="別表A第二表" className="w-full shadow-lg rounded-lg" />
      </div>
      {/* 収支内訳書2 */}
      <div className="relative w-[800px] mx-auto">
        <img src="/07-.png" alt="別表A第二表" className="w-full shadow-lg rounded-lg" />
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