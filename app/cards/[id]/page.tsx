"use client";
import { useState, useEffect, use } from "react";
import Link from "next/link";

// Hàm hỗ trợ format số tiền (VD: 1000000 -> 1.000.000)
const formatCurrency = (amount: number | string) => {
  if (amount === "" || amount === undefined) return "";
  return Number(amount).toLocaleString("vi-VN");
};

// Hàm hỗ trợ format hiển thị ngày từ YYYY-MM-DD sang DD/MM/YYYY
const formatDateDisplay = (dateStr: string) => {
  if (!dateStr) return "Chưa thiết lập";
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
};

export default function CardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [card, setCard] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State cho Notification (Toast)
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Trạng thái cho Modal sửa Tháng
  const [isMonthModalOpen, setIsMonthModalOpen] = useState(false);
  const [editingMonth, setEditingMonth] = useState<any>(null);

  // Trạng thái cho Modal sửa Thông tin chung
  const [isGeneralModalOpen, setIsGeneralModalOpen] = useState(false);
  const [generalData, setGeneralData] = useState({ 
    annualFee: 0, 
    targetSpendForWaiver: 0,
    statementDate: "",
    paymentDueDate: "",
    amountDueThisMonth: 0
  });

  useEffect(() => {
    fetchCardDetails();
  }, []);

  const fetchCardDetails = async () => {
    const res = await fetch(`/api/cards?timestamp=${new Date().getTime()}`, { cache: "no-store" });
    const data = await res.json();
    const currentCard = data.find((c: any) => c._id === resolvedParams.id);
    
    // Tương thích ngược dữ liệu cũ
    if (currentCard) {
      if (!currentCard.monthlyData) {
        currentCard.monthlyData = Array.from({ length: 12 }, (_, i) => ({
          month: i + 1, spend: 0, cashback: 0, fee: 0, otherInterest: 0
        }));
      }
      if (currentCard.targetSpendForWaiver === undefined) currentCard.targetSpendForWaiver = 0;
      if (currentCard.statementDate === undefined) currentCard.statementDate = "";
      if (currentCard.paymentDueDate === undefined) currentCard.paymentDueDate = "";
      if (currentCard.amountDueThisMonth === undefined) currentCard.amountDueThisMonth = 0;
    }

    setCard(currentCard);
  };

  // Hàm gọi Notification (Tự tắt sau 3 giây)
  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- XỬ LÝ MỞ/LƯU THÔNG TIN CHUNG ---
  const openGeneralEdit = () => {
    setGeneralData({
      annualFee: card.annualFee,
      targetSpendForWaiver: card.targetSpendForWaiver || 0,
      statementDate: card.statementDate || "",
      paymentDueDate: card.paymentDueDate || "",
      amountDueThisMonth: card.amountDueThisMonth || 0
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
      statementDate: generalData.statementDate,
      paymentDueDate: generalData.paymentDueDate,
      amountDueThisMonth: Number(generalData.amountDueThisMonth) || 0
    };

    const res = await fetch(`/api/cards/${card._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedCard),
    });

    const result = await res.json();
    setIsSubmitting(false);

    if (!res.ok) {
      showToast(result.message || "Không thể lưu thông tin chung!", "error");
      return;
    }

    setCard(updatedCard);
    setIsGeneralModalOpen(false);
    showToast("Cập nhật thông tin chung thành công!", "success");
  };

  // --- XỬ LÝ MỞ/LƯU TỪNG THÁNG ---
  const openMonthEditModal = (monthData: any) => {
    setEditingMonth({ ...monthData });
    setIsMonthModalOpen(true);
  };

  const handleSaveMonth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payloadMonth = {
      ...editingMonth,
      spend: Number(editingMonth.spend) || 0,
      cashback: Number(editingMonth.cashback) || 0,
      fee: Number(editingMonth.fee) || 0,
      otherInterest: Number(editingMonth.otherInterest) || 0,
    };

    const updatedMonthlyData = card.monthlyData.map((m: any) => 
      m.month === payloadMonth.month ? payloadMonth : m
    );

    const updatedCard = { ...card, monthlyData: updatedMonthlyData };

    const res = await fetch(`/api/cards/${card._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedCard),
    });

    const result = await res.json();
    setIsSubmitting(false);

    if (!res.ok) {
      showToast(result.message || "Không thể lưu dữ liệu tháng!", "error");
      return;
    }

    setCard(updatedCard);
    setIsMonthModalOpen(false);
    showToast(`Cập nhật dữ liệu Tháng ${payloadMonth.month} thành công!`, "success");
  };

  if (!card) return <div className="min-h-screen p-10 flex justify-center text-gray-500">Đang tải dữ liệu...</div>;

  // TÍNH TOÁN CÁC CHỈ SỐ TỔNG
  const totalSpend = card.monthlyData.reduce((sum: number, m: any) => sum + Number(m.spend || 0), 0);
  const totalCashback = card.monthlyData.reduce((sum: number, m: any) => sum + Number(m.cashback || 0), 0);
  const totalFee = card.monthlyData.reduce((sum: number, m: any) => sum + Number(m.fee || 0), 0);
  const totalOtherInterest = card.monthlyData.reduce((sum: number, m: any) => sum + Number(m.otherInterest || 0), 0);
  
  const remainingSpend = card.targetSpendForWaiver > totalSpend ? card.targetSpendForWaiver - totalSpend : 0;
  
  const isWaved = totalSpend >= card.targetSpendForWaiver && card.targetSpendForWaiver > 0;
  const appliedAnnualFee = isWaved ? 0 : card.annualFee;
  const netProfit = (totalCashback + totalOtherInterest) - totalFee - appliedAnnualFee;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 md:px-8 relative">
      {/* COMPONENT THÔNG BÁO NỔI (TOAST NOTIFICATION) */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[100] px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 text-white font-medium transition-all duration-300 transform translate-y-0 opacity-100 ${toast.type === "success" ? "bg-emerald-600" : "bg-red-600"}`}>
          {toast.type === "success" ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          )}
          {toast.message}
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        <Link href="/cards" className="text-blue-600 hover:underline mb-6 inline-flex items-center gap-2 font-medium">
          &larr; Quay lại danh sách thẻ
        </Link>

        {/* PHẦN 1: THÔNG TIN CHUNG */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-6">
            <h2 className="text-xl font-bold text-gray-900">Thông tin chung</h2>
            <button 
              onClick={openGeneralEdit} 
              className="bg-blue-50 hover:bg-blue-100 text-blue-600 px-4 py-2 rounded-lg font-medium transition-colors text-sm flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Sửa thông tin thẻ
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-1 flex flex-col items-center justify-center bg-gray-50 rounded-xl p-4 border border-gray-100">
              <img src={card.imageUrl} alt={card.name} className="h-24 object-contain mb-3" />
              <p className="text-sm font-semibold text-gray-500">{card.bank}</p>
              <h3 className="font-bold text-lg text-gray-900 text-center">{card.name}</h3>
              <span className="mt-2 bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-1 rounded-full">{card.type}</span>
            </div>

            <div className="md:col-span-3 grid grid-cols-2 lg:grid-cols-3 gap-4">
              <StatBox label="Phí thường niên (PTN)" value={formatCurrency(card.annualFee)} suffix="₫" />
              <StatBox label="Doanh số miễn PTN" value={formatCurrency(card.targetSpendForWaiver)} suffix="₫" />
              <StatBox label="Cần chi tiêu thêm" value={formatCurrency(remainingSpend)} suffix="₫" color="text-orange-500" />
              
              {/* Hiển thị 3 Trường mới bổ sung */}
              <StatBox label="Ngày sao kê" value={formatDateDisplay(card.statementDate)} suffix="" color="text-gray-900 font-semibold" />
              <StatBox label="Hạn thanh toán" value={formatDateDisplay(card.paymentDueDate)} suffix="" color="text-red-600 font-semibold" />
              <StatBox label="Tiền thanh toán tháng này" value={formatCurrency(card.amountDueThisMonth)} suffix="₫" color="text-red-600" />

              <StatBox label="Tổng chi tiêu lũy kế" value={formatCurrency(totalSpend)} suffix="₫" color="text-blue-600" />
              <StatBox label="Tổng tiền hoàn" value={formatCurrency(totalCashback)} suffix="₫" color="text-emerald-600" />
              <StatBox label="Tổng phụ phí quẹt thẻ" value={formatCurrency(totalFee)} suffix="₫" color="text-red-500" />
              
              <div className="bg-gray-100 rounded-xl p-4 border border-gray-200">
                <p className="text-xs font-medium text-gray-500 mb-1">Tổng lãi gửi ngắn hạn</p>
                <p className="text-lg font-bold text-emerald-600">{formatCurrency(totalOtherInterest)} ₫</p>
              </div>

              <div className="col-span-2 bg-gray-900 text-white rounded-xl p-4 shadow-sm flex justify-between items-center">
                <span className="text-gray-300 font-medium text-sm md:text-base">Tổng kết thúc (Lãi/Lỗ ròng)</span>
                <span className={`text-xl md:text-2xl font-bold ${netProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {netProfit > 0 ? "+" : ""}{formatCurrency(netProfit)} ₫
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* PHẦN 2: CHI TIẾT TỪNG THÁNG */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900">Chi tiết 12 tháng</h2>
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
                  const monthEnd = (Number(m.cashback) + Number(m.otherInterest)) - Number(m.fee);
                  return (
                    <tr key={m.month} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 text-center font-bold text-gray-900 w-32 min-w-[120px]">Tháng {m.month}</td>
                      <td className="p-4 font-medium text-gray-700">{formatCurrency(m.spend)}</td>
                      <td className="p-4 font-medium text-emerald-600">{formatCurrency(m.cashback)}</td>
                      <td className="p-4 font-medium text-red-500">{formatCurrency(m.fee)}</td>
                      <td className="p-4 font-medium text-emerald-600">{formatCurrency(m.otherInterest)}</td>
                      <td className={`p-4 font-bold ${monthEnd >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                        {monthEnd > 0 ? "+" : ""}{formatCurrency(monthEnd)}
                      </td>
                      <td className="p-4 text-center">
                        <button onClick={() => openMonthEditModal(m)} className="text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors text-sm font-medium">
                          Sửa
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
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 sticky top-0 bg-white z-10">
                <h3 className="text-lg font-bold text-gray-900">Sửa thông tin chung</h3>
                <button onClick={() => setIsGeneralModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <form onSubmit={handleSaveGeneral} className="p-6 space-y-4">
                <InputNumberField 
                  label="Phí thường niên (VNĐ)" 
                  value={generalData.annualFee} 
                  onChange={(val: any) => setGeneralData({ ...generalData, annualFee: val })} 
                />
                <InputNumberField 
                  label="Doanh số miễn phí thường niên (VNĐ)" 
                  value={generalData.targetSpendForWaiver} 
                  onChange={(val: any) => setGeneralData({ ...generalData, targetSpendForWaiver: val })} 
                />

                {/* Ô chọn ngày sao kê */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Ngày sao kê</label>
                  <input 
                    type="date" 
                    className="w-full p-2.5 bg-white text-gray-900 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    value={generalData.statementDate}
                    onChange={(e) => setGeneralData({ ...generalData, statementDate: e.target.value })}
                  />
                </div>

                {/* Ô chọn hạn thanh toán */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Hạn thanh toán</label>
                  <input 
                    type="date" 
                    className="w-full p-2.5 bg-white text-gray-900 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    value={generalData.paymentDueDate}
                    onChange={(e) => setGeneralData({ ...generalData, paymentDueDate: e.target.value })}
                  />
                </div>

                {/* Ô nhập số tiền thanh toán (Hỗ trợ số 0 phân tách dấu phẩy) */}
                <InputNumberField 
                  label="Tiền thanh toán tháng này (VNĐ)" 
                  value={generalData.amountDueThisMonth} 
                  onChange={(val: any) => setGeneralData({ ...generalData, amountDueThisMonth: val })} 
                />

                <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button type="button" onClick={() => setIsGeneralModalOpen(false)} className="px-5 py-2.5 text-gray-900 font-medium hover:bg-gray-100 rounded-lg">
                    Hủy
                  </button>
                  <button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium">
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
                <h3 className="text-lg font-bold text-gray-900">Cập nhật dữ liệu Tháng {editingMonth.month}</h3>
                <button onClick={() => setIsMonthModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <form onSubmit={handleSaveMonth} className="p-6 space-y-4">
                <InputNumberField 
                  label="Chi tiêu (VNĐ)" 
                  value={editingMonth.spend} 
                  onChange={(val: any) => setEditingMonth({ ...editingMonth, spend: val })} 
                />
                <InputNumberField 
                  label="Tiền hoàn (VNĐ)" 
                  value={editingMonth.cashback} 
                  onChange={(val: any) => setEditingMonth({ ...editingMonth, cashback: val })} 
                />
                <InputNumberField 
                  label="Phụ phí (Phí quẹt thẻ...)" 
                  value={editingMonth.fee} 
                  onChange={(val: any) => setEditingMonth({ ...editingMonth, fee: val })} 
                />
                <InputNumberField 
                  label="Các lãi khác (Gửi tiết kiệm...)" 
                  value={editingMonth.otherInterest} 
                  onChange={(val: any) => setEditingMonth({ ...editingMonth, otherInterest: val })} 
                />
                
                <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                  <span className="font-semibold text-gray-700">Tổng kết thúc tháng:</span>
                  <span className={`font-bold text-lg ${((Number(editingMonth.cashback) || 0) + (Number(editingMonth.otherInterest) || 0)) - (Number(editingMonth.fee) || 0) >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {formatCurrency(((Number(editingMonth.cashback) || 0) + (Number(editingMonth.otherInterest) || 0)) - (Number(editingMonth.fee) || 0))} ₫
                  </span>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsMonthModalOpen(false)} className="px-5 py-2.5 text-gray-900 font-medium hover:bg-gray-100 rounded-lg">
                    Hủy
                  </button>
                  <button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium">
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
    <p className={`text-lg font-bold ${color}`}>{value} {suffix}</p>
  </div>
);

const InputNumberField = ({ label, value, onChange }: any) => {
  const displayValue = (value === "" || value === undefined) ? "" : formatCurrency(value);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-900 mb-1">{label}</label>
      <input
        required
        type="text"
        className="w-full p-2.5 bg-white text-gray-900 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-right font-medium"
        value={displayValue}
        onChange={(e) => {
          const rawValue = e.target.value.replace(/\D/g, "");
          onChange(rawValue === "" ? "" : Number(rawValue));
        }}
        onBlur={() => {
          if (value === "") onChange(0);
        }}
        placeholder="0"
      />
    </div>
  );
};