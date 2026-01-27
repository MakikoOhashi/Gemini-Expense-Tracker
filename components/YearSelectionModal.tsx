import React from 'react';
import { XMarkIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import { TEXT, Language } from '../src/i18n/text';

interface YearSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectYear: (year: number) => void;
  availableYears: number[];
  type?: 'tax' | 'audit' | 'history';
  t: any;
}

const YearSelectionModal: React.FC<YearSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectYear,
  availableYears,
  type = 'tax',
  t
}) => {
  if (!isOpen) return null;

  const currentYear = new Date().getFullYear();
  const isAudit = type === 'audit';
  const isHistory = type === 'history';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <CalendarDaysIcon className="w-5 h-5 text-slate-900" />
            <h2 className="font-bold text-gray-800">
              {isAudit ? t.auditForecastYearSelection : isHistory ? t.historyYearSelection : t.taxReturnYearSelection}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition">
            <XMarkIcon className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="text-center mb-6">
            <p className="text-sm text-gray-600">
              {isAudit
                ? t.selectAuditYearDescription
                : isHistory
                ? t.selectHistoryYearDescription
                : t.selectTaxYearDescription
              }
            </p>
          </div>

          <div className="space-y-3">
            {availableYears.map(year => (
              <button
                key={year}
                onClick={() => onSelectYear(year)}
                className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                  year === currentYear
                    ? 'border-slate-900 bg-slate-50 text-slate-900'
                    : 'border-gray-200 bg-white hover:border-slate-300 hover:bg-slate-25 text-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-lg">
                      {year}{t.fiscalYear}
                      {year === currentYear && (
                        <span className="ml-2 text-xs bg-slate-900 text-white px-2 py-1 rounded-full">
                          {t.currentYear}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {t.yearRange.replace(/年/g, year.toString())}
                    </div>
                  </div>
                  {year === currentYear && (
                    <CalendarDaysIcon className="w-6 h-6 text-slate-700" />
                  )}
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-sm text-amber-800">
              <span className="font-bold">{t.attention}：</span>
              {isAudit
                ? t.yearSelectionNoteAudit
                : isHistory
                ? t.yearSelectionNoteHistory
                : t.yearSelectionNoteTax
              }
            </p>
          </div>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition shadow-sm"
          >
            {t.cancel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default YearSelectionModal;
