"use client";
import { useState, useEffect, use } from "react";
import Link from "next/link";

// Hàm hỗ trợ format số tiền (VD: 1000000 -> 1.000.000)
const formatCurrency = (amount: number | string) => {
  if (amount === "" || amount === undefined) return "";
  return Number(amount).toLocaleString("vi-VN");
};

export default function CardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [card, setCard] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Trạng thái cho Modal sửa Tháng
  const [isMonthModalOpen, setIsMonthModalOpen] = useState(false);
  const [editingMonth, setEditingMonth] = useState<any>(null);

  // Trạng thái cho Modal sửa Thông tin chung
  const [isGeneralModalOpen, setIsGeneralModalOpen] = useState(false);
  const [generalData, setGeneralData] = useState({
    annualFee: 0,
    targetSpendForWaiver: 0,
  });

  useEffect(() => {
    fetchCardDetails();
  }, []);

  const fetchCardDetails = async () => {
    const res = await fetch(`/api/cards?timestamp=${new Date().getTime()}`, {
      cache: "no-store",
    });
    const data = await res.json();
    const currentCard = data.find((c: any) => c._id === resolvedParams.id);

    if (currentCard && !currentCard.monthlyData) {
      currentCard.monthlyData = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        spend: 0,
        cashback: 0,
        fee: 0,
        otherInterest: 0,
      }));
    }
    if (currentCard && currentCard.targetSpendForWaiver === undefined) {
      currentCard.targetSpendForWaiver = 0;
    }

    setCard(currentCard);
  };

  // --- XỬ LÝ MỞ/LƯU THÔNG TIN CHUNG ---
  const openGeneralEdit = () => {
    setGeneralData({
      annualFee: card.annualFee,
      targetSpendForWaiver: card.targetSpendForWaiver || 0,
    });
    setIsGeneralModalOpen(true);
  };

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const updatedCard = {
      ...card,
      annualFee: Number(generalData.annualFee) || 0,
      targetSpendForWaiver: Number(generalData.targetSpendForWaiver) || 0,
    };

    await fetch(`/api/cards/${card._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedCard),
    });

    setCard(updatedCard);
    setIsGeneralModalOpen(false);
    setIsSubmitting(false);
  };

  // --- XỬ LÝ MỞ/LƯU TỪNG THÁNG ---
  const openMonthEditModal = (monthData: any) => {
    setEditingMonth({ ...monthData });
    setIsMonthModalOpen(true);
  };

  const handleSaveMonth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Chuẩn hóa lại các trường thành số nguyên để tránh lưu chuỗi rỗng vào DB
    const payloadMonth = {
      ...editingMonth,
      spend: Number(editingMonth.spend) || 0,
      cashback: Number(editingMonth.cashback) || 0,
      fee: Number(editingMonth.fee) || 0,
      otherInterest: Number(editingMonth.otherInterest) || 0,
    };

    const updatedMonthlyData = card.monthlyData.map((m: any) =>
      m.month === payloadMonth.month ? payloadMonth : m,
    );

    const updatedCard = { ...card, monthlyData: updatedMonthlyData };

    await fetch(`/api/cards/${card._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedCard),
    });

    setCard(updatedCard);
    setIsMonthModalOpen(false);
    setIsSubmitting(false);
  };

  if (!card)
    return (
      <div className="min-h-screen p-10 flex justify-center text-gray-500">
        Đang tải dữ liệu...
      </div>
    );

  // TÍNH TOÁN CÁC CHỈ SỐ TỔNG
  const totalSpend = card.monthlyData.reduce(
    (sum: number, m: any) => sum + Number(m.spend || 0),
    0,
  );
  const totalCashback = card.monthlyData.reduce(
    (sum: number, m: any) => sum + Number(m.cashback || 0),
    0,
  );
  const totalFee = card.monthlyData.reduce(
    (sum: number, m: any) => sum + Number(m.fee || 0),
    0,
  );
  const totalOtherInterest = card.monthlyData.reduce(
    (sum: number, m: any) => sum + Number(m.otherInterest || 0),
    0,
  );

  const remainingSpend =
    card.targetSpendForWaiver > totalSpend
      ? card.targetSpendForWaiver - totalSpend
      : 0;

  const isWaved =
    totalSpend >= card.targetSpendForWaiver && card.targetSpendForWaiver > 0;
  const appliedAnnualFee = isWaved ? 0 : card.annualFee;
  const netProfit =
    totalCashback + totalOtherInterest - totalFee - appliedAnnualFee;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        <Link
          href="/cards"
          className="text-blue-600 hover:underline mb-6 inline-flex items-center gap-2 font-medium"
        >
          &larr; Quay lại danh sách thẻ
        </Link>

        {/* PHẦN 1: THÔNG TIN CHUNG */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-6">
            <h2 className="text-xl font-bold text-gray-900">Thông tin chung</h2>
            <button
              onClick={openGeneralEdit}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors text-sm flex items-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Sửa thông tin
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-1 flex flex-col items-center justify-center bg-gray-50 rounded-xl p-4 border border-gray-100">
              <img
                src={card.imageUrl}
                alt={card.name}
                className="h-24 object-contain mb-3"
              />
              <p className="text-sm font-semibold text-gray-500">{card.bank}</p>
              <h3 className="font-bold text-lg text-gray-900 text-center">
                {card.name}
              </h3>
              <span className="mt-2 bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-1 rounded-full">
                {card.type}
              </span>
            </div>

            <div className="md:col-span-3 grid grid-cols-2 lg:grid-cols-3 gap-4">
              <StatBox
                label="Phí thường niên (PTN)"
                value={formatCurrency(card.annualFee)}
                suffix="₫"
              />
              <StatBox
                label="Tổng chi tiêu hiện tại"
                value={formatCurrency(totalSpend)}
                suffix="₫"
                color="text-blue-600"
              />
              <StatBox
                label="Doanh số miễn PTN"
                value={formatCurrency(card.targetSpendForWaiver)}
                suffix="₫"
              />
              <StatBox
                label="Cần chi tiêu thêm"
                value={formatCurrency(remainingSpend)}
                suffix="₫"
                color="text-orange-500"
              />

              <StatBox
                label="Tổng tiền hoàn"
                value={formatCurrency(totalCashback)}
                suffix="₫"
                color="text-emerald-600"
              />
              <StatBox
                label="Tổng phụ phí (Quẹt thẻ...)"
                value={formatCurrency(totalFee)}
                suffix="₫"
                color="text-red-500"
              />
              <StatBox
                label="Tổng lãi khác (Gửi tiết kiệm...)"
                value={formatCurrency(totalOtherInterest)}
                suffix="₫"
                color="text-emerald-600"
              />

              <div className="col-span-2 lg:col-span-2 bg-gray-900 text-white rounded-xl p-4 shadow-sm flex justify-between items-center">
                <span className="text-gray-300 font-medium text-sm md:text-base">
                  Tổng kết thúc (Lãi/Lỗ)
                </span>
                <span
                  className={`text-xl md:text-2xl font-bold ${netProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}
                >
                  {netProfit > 0 ? "+" : ""}
                  {formatCurrency(netProfit)} ₫
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* PHẦN 2: CHI TIẾT TỪNG THÁNG */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900">
              Chi tiết 12 tháng
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-sm font-semibold">
                  <th className="p-4 text-center w-32">Tháng</th>
                  <th className="p-4">Chi tiêu</th>
                  <th className="p-4">Tiền hoàn</th>
                  <th className="p-4">Phụ phí</th>
                  <th className="p-4">Lãi khác</th>
                  <th className="p-4">Tổng số kết thúc</th>
                  <th className="p-4 text-center w-24">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {card.monthlyData.map((m: any) => {
                  const monthEnd =
                    Number(m.cashback) +
                    Number(m.otherInterest) -
                    Number(m.fee);
                  return (
                    <tr
                      key={m.month}
                      className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="p-4 text-center font-bold text-gray-900">
                        Tháng {m.month}
                      </td>
                      <td className="p-4 font-medium text-gray-700">
                        {formatCurrency(m.spend)}
                      </td>
                      <td className="p-4 font-medium text-emerald-600">
                        {formatCurrency(m.cashback)}
                      </td>
                      <td className="p-4 font-medium text-red-500">
                        {formatCurrency(m.fee)}
                      </td>
                      <td className="p-4 font-medium text-emerald-600">
                        {formatCurrency(m.otherInterest)}
                      </td>
                      <td
                        className={`p-4 font-bold ${monthEnd >= 0 ? "text-emerald-600" : "text-red-500"}`}
                      >
                        {monthEnd > 0 ? "+" : ""}
                        {formatCurrency(monthEnd)}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => openMonthEditModal(m)}
                          className="text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors text-sm font-medium"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL CẬP NHẬT THÔNG TIN CHUNG */}
        {isGeneralModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="text-lg font-bold text-gray-900">
                  Sửa thông tin chung
                </h3>
                <button
                  onClick={() => setIsGeneralModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleSaveGeneral} className="p-6 space-y-4">
                <InputNumberField
                  label="Phí thường niên (VNĐ)"
                  value={generalData.annualFee}
                  onChange={(val: any) =>
                    setGeneralData({ ...generalData, annualFee: val })
                  }
                />
                <InputNumberField
                  label="Doanh số miễn phí thường niên (VNĐ)"
                  value={generalData.targetSpendForWaiver}
                  onChange={(val: any) =>
                    setGeneralData({
                      ...generalData,
                      targetSpendForWaiver: val,
                    })
                  }
                />
                <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsGeneralModalOpen(false)}
                    className="px-5 py-2.5 text-gray-900 font-medium hover:bg-gray-100 rounded-lg"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium"
                  >
                    {isSubmitting ? "Đang lưu..." : "Cập nhật"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL CẬP NHẬT THÁNG */}
        {isMonthModalOpen && editingMonth && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="text-lg font-bold text-gray-900">
                  Cập nhật dữ liệu Tháng {editingMonth.month}
                </h3>
                <button
                  onClick={() => setIsMonthModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleSaveMonth} className="p-6 space-y-4">
                <InputNumberField
                  label="Chi tiêu (VNĐ)"
                  value={editingMonth.spend}
                  onChange={(val: any) =>
                    setEditingMonth({ ...editingMonth, spend: val })
                  }
                />
                <InputNumberField
                  label="Tiền hoàn (VNĐ)"
                  value={editingMonth.cashback}
                  onChange={(val: any) =>
                    setEditingMonth({ ...editingMonth, cashback: val })
                  }
                />
                <InputNumberField
                  label="Phụ phí (Phí quẹt thẻ...)"
                  value={editingMonth.fee}
                  onChange={(val: any) =>
                    setEditingMonth({ ...editingMonth, fee: val })
                  }
                />
                <InputNumberField
                  label="Các lãi khác (Gửi tiết kiệm...)"
                  value={editingMonth.otherInterest}
                  onChange={(val: any) =>
                    setEditingMonth({ ...editingMonth, otherInterest: val })
                  }
                />

                <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                  <span className="font-semibold text-gray-700">
                    Tổng kết thúc tháng:
                  </span>
                  <span
                    className={`font-bold text-lg ${(Number(editingMonth.cashback) || 0) + (Number(editingMonth.otherInterest) || 0) - (Number(editingMonth.fee) || 0) >= 0 ? "text-emerald-600" : "text-red-500"}`}
                  >
                    {formatCurrency(
                      (Number(editingMonth.cashback) || 0) +
                        (Number(editingMonth.otherInterest) || 0) -
                        (Number(editingMonth.fee) || 0),
                    )}{" "}
                    ₫
                  </span>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsMonthModalOpen(false)}
                    className="px-5 py-2.5 text-gray-900 font-medium hover:bg-gray-100 rounded-lg"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium"
                  >
                    {isSubmitting ? "Đang lưu..." : "Lưu tháng"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- SUB-COMPONENTS ---
const StatBox = ({ label, value, suffix, color = "text-gray-900" }: any) => (
  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
    <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
    <p className={`text-lg font-bold ${color}`}>
      {value} {suffix}
    </p>
  </div>
);

// Ô nhập liệu số đã được nâng cấp để hỗ trợ nhập số 0
const InputNumberField = ({ label, value, onChange }: any) => {
  // Cho phép chuỗi rỗng khi xóa, các trường hợp khác format tiền bình thường
  const displayValue =
    value === "" || value === undefined ? "" : formatCurrency(value);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-900 mb-1">
        {label}
      </label>
      <input
        required
        type="text"
        className="w-full p-2.5 bg-white text-gray-900 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-right font-medium"
        value={displayValue}
        onChange={(e) => {
          // Lọc bỏ toàn bộ chữ cái và ký tự đặc biệt, chỉ lấy số
          const rawValue = e.target.value.replace(/\D/g, "");
          // Nếu người dùng xóa hết, trả về chuỗi rỗng để ô trống. Ngược lại trả về số
          onChange(rawValue === "" ? "" : Number(rawValue));
        }}
        onBlur={() => {
          // Nếu người dùng xóa trống ô rồi click chuột ra ngoài (blur), tự gán lại bằng 0
          if (value === "") onChange(0);
        }}
        placeholder="0"
      />
    </div>
  );
};
