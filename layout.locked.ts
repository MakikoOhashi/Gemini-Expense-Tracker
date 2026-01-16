export const POS = {
  // 第一表
  firstTableCategory: { top: 210, left: 42, width: 150 },
  firstTableIncomeAmount: { top: 210, left: 250, width: 150 },
  firstTableSales: { top: 468, left: 298, width: 100 },

  // 第二表
  secondTableRent: { top: 150, left: 520, width: 100 },
  secondTableSalary: { top: 180, left: 520, width: 100 },
  secondTableSupplies: { top: 210, left: 520, width: 100 },
  secondTableCommunication: { top: 240, left: 520, width: 100 },
  secondTableTravel: { top: 340, left: 210, width: 100 },

  // 所得の内訳書
  incomeBreakdownTable: { top: 280, left: 300, width: 100 },

  // 収支内訳書1 - 収入欄
  incomeSales: { top: 191, left: 148, width: 100 },
  incomeHouseholdConsumption: { top: 208, left: 148, width: 100 },

  // 収支内訳書1 - 経費欄 (左列)
  expenseSalary: { top: 356, left: 148, width: 100 },
  expenseOutsourcing: { top: 373, left: 148, width: 100 },
  expenseDepreciation: { top: 390, left: 148, width: 100 },
  expenseBadDebt: { top: 406, left: 148, width: 100 },
  expenseRent: { top: 422, left: 148, width: 100 },
  expenseInterestDiscount: { top: 439, left: 148, width: 100 },
  expenseTaxes: { top: 456, left: 148, width: 100 },
  expenseShipping: { top: 472, left: 148, width: 100 },
  expenseUtilities: { top: 488, left: 148, width: 100 },

  // 収支内訳書1 - 経費欄 (右列)
  expenseTravel: { top: 190, left: 354, width: 100 },
  expenseCommunication: { top: 207, left: 354, width: 100 },
  expenseAdvertising: { top: 224, left: 354, width: 100 },
  expenseEntertainment: { top: 240, left: 354, width: 100 },
  expenseInsurance: { top: 257, left: 354, width: 100 },
  expenseRepair: { top: 274, left: 354, width: 100 },
  expenseSupplies: { top: 290, left: 354, width: 100 },
  expenseWelfare: { top: 306, left: 354, width: 100 },
  expenseMiscellaneous: { top: 406, left: 354, width: 100 },
  expenseTotal: { top: 440, left: 354, width: 100 },

  // 専従者控除欄
  dependentDeductionBefore: { top: 472, left: 354, width: 100 },
  dependentDeductionAfter: { top: 520, left: 350, width: 120 },

  // 既存の位置（後方互換性のため残す）
  incomeBeforeDeduction: { top: 456, left: 354, width: 100 },
  incomeAfterDeduction: { top: 489, left: 354, width: 100 },
} as const;
