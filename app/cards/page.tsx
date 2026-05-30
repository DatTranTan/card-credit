"use client";
import Link from "next/link";
import { useState, useEffect } from "react";

// Hàm hỗ trợ format tiền và ngày tháng
const formatCurrency = (amount: number | string) => {
    if (!amount) return "0";
    return Number(amount).toLocaleString("vi-VN");
};

const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return "Chưa thiết lập";
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
};

export default function CardsPage() {
    const [cards, setCards] = useState<any[]>([]);
    const [banks, setBanks] = useState<any[]>([]);
    const [cardTypes, setCardTypes] = useState<any[]>([]);
    
    // State quản lý bộ lọc Người sở hữu
    const [selectedOwner, setSelectedOwner] = useState<string>("");
    
    // States cho Modal Thêm/Sửa và Notifications
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
    const [cardToDelete, setCardToDelete] = useState<any>(null);

    const [formData, setFormData] = useState({
        bank: "",
        name: "",
        type: "",
        owner: "", // Bổ sung trường owner vào form
        imageUrl: "",
        annualFee: "",
    });

    useEffect(() => {
        fetchCards();
        fetchMasterData();
    }, []);

    const fetchCards = async () => {
        const res = await fetch(`/api/cards?timestamp=${new Date().getTime()}`, { cache: "no-store" });
        const data = await res.json();
        setCards(data);
    };

    const fetchMasterData = async () => {
        try {
            const [banksRes, typesRes] = await Promise.all([
                fetch("/api/banks"),
                fetch("/api/cardtypes"),
            ]);
            const banksData = await banksRes.json();
            const typesData = await typesRes.json();
            setBanks(banksData);
            setCardTypes(typesData);
        } catch (error) {
            console.error("Lỗi khi tải dữ liệu masterdata", error);
        }
    };

    const showToast = (message: string, type: "success" | "error" = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    // Tự động trích xuất danh sách tất cả người sở hữu duy nhất từ mảng cards để làm bộ lọc
    const uniqueOwners = Array.from(
        new Set(cards.map(c => c.owner?.trim()).filter(Boolean))
    );

    // Lọc danh sách thẻ dựa theo người sở hữu được chọn
    const filteredCards = selectedOwner
        ? cards.filter(c => c.owner?.trim() === selectedOwner)
        : cards;

    // Lọc lịch nhắc nợ dựa theo người sở hữu đang được chọn lọc
    const upcomingPayments = filteredCards
        .filter(c => c.paymentDueDate && !c.isPaidThisMonth)
        .sort((a, b) => new Date(a.paymentDueDate).getTime() - new Date(b.paymentDueDate).getTime());

    const handleTogglePaid = async (isChecked: boolean, card: any) => {
        const updatedCard = { ...card, isPaidThisMonth: isChecked };
        setCards(cards.map(c => c._id === card._id ? updatedCard : c));

        const res = await fetch(`/api/cards/${card._id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedCard),
        });

        if (res.ok) {
            showToast(isChecked ? "Đã đánh dấu thanh toán xong!" : "Đã hủy đánh dấu thanh toán!", "success");
        } else {
            showToast("Lỗi khi cập nhật trạng thái thanh toán!", "error");
        }
    };

    const openCreateModal = () => {
        setEditingId(null);
        setFormData({ bank: "", name: "", type: "", owner: "Tôi", imageUrl: "", annualFee: "" });
        setIsModalOpen(true);
    };

    const openEditModal = (card: any) => {
        setEditingId(card._id);
        setFormData({
            bank: card.bank,
            name: card.name,
            type: card.type,
            owner: card.owner || "Tôi",
            imageUrl: card.imageUrl,
            annualFee: card.annualFee.toString(),
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setTimeout(() => {
            setEditingId(null);
            setFormData({ bank: "", name: "", type: "", owner: "", imageUrl: "", annualFee: "" });
        }, 200);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.bank || !formData.type) {
            showToast("Vui lòng chọn Ngân hàng và Loại thẻ từ danh sách!", "error");
            return;
        }

        setIsSubmitting(true);
        const url = editingId ? `/api/cards/${editingId}` : "/api/cards";
        const method = editingId ? "PUT" : "POST";

        const res = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ...formData,
                owner: formData.owner.trim() || "Tôi",
                annualFee: Number(formData.annualFee),
            }),
        });

        const result = await res.json();
        setIsSubmitting(false);

        if (!res.ok) {
            showToast(result.message || "Có lỗi xảy ra khi lưu!", "error");
            return;
        }

        closeModal();
        fetchCards();
        showToast(editingId ? "Cập nhật thẻ thành công!" : "Đã thêm thẻ mới!", "success");
    };

    const confirmDelete = (card: any) => {
        setCardToDelete(card);
    };

    const executeDelete = async () => {
        if (!cardToDelete) return;
        await fetch(`/api/cards/${cardToDelete._id}`, { method: "DELETE" });
        fetchCards();
        setCardToDelete(null);
        showToast("Đã xóa thẻ khỏi hệ thống!", "success");
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                showToast("Kích thước ảnh quá lớn! Vui lòng chọn ảnh dưới 2MB.", "error");
                e.target.value = "";
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData({ ...formData, imageUrl: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-10 px-4 md:px-8 relative">
            {/* COMPONENT THÔNG BÁO NỔI */}
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
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Thẻ Tín Dụng</h1>
                        <p className="text-gray-500 mt-1">Số lượng thẻ đang hiển thị: {filteredCards?.length} / {cards?.length}</p>
                    </div>
                    
                    {/* KHU VỰC BỘ LỌC TÊN NGƯỜI SỞ HỮU */}
                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">Thẻ của:</label>
                            <select 
                                className="p-2.5 bg-gray-50 text-gray-900 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm cursor-pointer min-w-[160px]"
                                value={selectedOwner}
                                onChange={(e) => setSelectedOwner(e.target.value)}
                            >
                                <option value="">Tất cả thành viên</option>
                                {uniqueOwners.map((ownerStr, idx) => (
                                    <option key={idx} value={ownerStr}>{ownerStr}</option>
                                ))}
                            </select>
                        </div>
                        
                        <button onClick={openCreateModal} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-sm flex items-center gap-2 w-full sm:w-auto justify-center text-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                            Thêm thẻ mới
                        </button>
                    </div>
                </div>

                {/* KHU VỰC LỊCH NHẮC NỢ */}
                {upcomingPayments.length > 0 && (
                    <div className="mb-8 bg-orange-50 border border-orange-200 rounded-2xl p-5 shadow-sm">
                        <h2 className="text-lg font-bold text-orange-800 mb-4 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Lịch nhắc nợ sắp đến hạn {selectedOwner && `của [${selectedOwner}]`}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {upcomingPayments.map(card => (
                                <div key={card._id} className="bg-white p-4 rounded-xl border border-orange-100 flex justify-between items-center shadow-sm">
                                    <div>
                                        <p className="font-bold text-gray-900 text-sm line-clamp-1">{card.name}</p>
                                        <div className="flex gap-2 items-center mt-0.5">
                                            <span className="text-xs text-gray-500">{card.bank}</span>
                                            <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-bold">Thẻ: {card.owner || "Tôi"}</span>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0 ml-2">
                                        <p className="font-bold text-red-600">{formatDateDisplay(card.paymentDueDate)}</p>
                                        <p className="text-xs font-bold text-gray-900">{formatCurrency(card.amountDueThisMonth)} ₫</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* DANH SÁCH THÈ */}
                {filteredCards.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
                        <p className="text-gray-500">Không có thẻ nào phù hợp với bộ lọc hiện tại.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredCards.map((card) => (
                            <Link href={`/cards/${card._id}`} key={card._id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100 group cursor-pointer block relative">
                                <div className="h-48 overflow-hidden bg-gray-100 relative">
                                    <img src={card.imageUrl} alt={card.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" />
                                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur text-xs font-bold px-3 py-1 rounded-full shadow-sm text-gray-700">
                                        {card.type}
                                    </div>
                                </div>
                                
                                <div className="p-5">
                                    {/* HIỂN THỊ TAG NGƯỜI SỞ HỮU THẺ */}
                                    <div className="mb-2">
                                        <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-md border border-blue-100 inline-block">
                                            👤 Thẻ của: {card.owner || "Tôi"}
                                        </span>
                                    </div>

                                    <p className="text-sm font-medium text-gray-500 mb-1">{card.bank}</p>
                                    <h3 className="font-bold text-medium text-gray-900 mb-3 line-clamp-1">{card.name}</h3>
                                    
                                    <div className="flex flex-col border-t border-gray-100 pt-4 mt-2 gap-3">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-500">Hạn thanh toán:</span>
                                            <span className="font-bold text-red-500">{formatDateDisplay(card.paymentDueDate)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-500">Tiền cần thanh toán:</span>
                                            <span className="font-bold text-gray-900">{formatCurrency(card.amountDueThisMonth)} ₫</span>
                                        </div>

                                        <div className="flex justify-between items-center mt-2 border-t border-gray-50 pt-3">
                                            <label className="flex items-center gap-2 cursor-pointer z-10" onClick={(e) => e.stopPropagation()}>
                                                <input type="checkbox" className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                                                    checked={card.isPaidThisMonth || false}
                                                    onChange={(e) => handleTogglePaid(e.target.checked, card)}
                                                />
                                                <span className={`text-xs font-bold ${card.isPaidThisMonth ? 'text-emerald-600 line-through' : 'text-gray-500'}`}>
                                                    Đã thanh toán
                                                </span>
                                            </label>

                                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                                <button onClick={(e) => { e.preventDefault(); openEditModal(card); }} className="text-gray-400 hover:text-blue-600 transition-colors p-2 rounded-md hover:bg-blue-50" title="Sửa thẻ">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                </button>
                                                <button onClick={(e) => { e.preventDefault(); confirmDelete(card); }} className="text-gray-400 hover:text-red-600 transition-colors p-2 rounded-md hover:bg-red-50" title="Xóa thẻ">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {/* MODAL THÊM / SỬA THẺ */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
                            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <h3 className="text-lg font-bold text-gray-900">{editingId ? "Cập nhật thẻ tín dụng" : "Thêm thẻ tín dụng mới"}</h3>
                                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-sm font-medium text-gray-900 mb-1">Ngân hàng</label>
                                        <select required className="w-full p-2.5 bg-white text-gray-900 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                            value={formData.bank} onChange={(e) => setFormData({ ...formData, bank: e.target.value })}>
                                            <option value="" disabled>Chọn ngân hàng</option>
                                            {banks.map((b) => <option key={b._id} value={b.shortname}>{b.shortname}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-sm font-medium text-gray-900 mb-1">Loại thẻ</label>
                                        <select required className="w-full p-2.5 bg-white text-gray-900 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                            value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                                            <option value="" disabled>Chọn loại thẻ</option>
                                            {cardTypes.map((t) => <option key={t._id} value={t.name}>{t.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                
                                {/* Ô NHẬP TÊN NGƯỜI SỞ HỮU */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 mb-1">Chủ sở hữu thẻ</label>
                                    <input required placeholder="VD: Tôi, Mẹ, Anh Hai, Bạn Duy..." className="w-full p-2.5 bg-white text-gray-900 placeholder-gray-400 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                        value={formData.owner} onChange={(e) => setFormData({ ...formData, owner: e.target.value })} />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-900 mb-1">Tên thẻ</label>
                                    <input required placeholder="VD: StepUP Cashback" className="w-full p-2.5 bg-white text-gray-900 placeholder-gray-400 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                        value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 mb-1">Phí thường niên (VNĐ)</label>
                                    <input required type="number" placeholder="VD: 500000" className="w-full p-2.5 bg-white text-gray-900 placeholder-gray-400 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                        value={formData.annualFee} onChange={(e) => setFormData({ ...formData, annualFee: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 mb-1">Hình ảnh thẻ</label>
                                    <div className="flex items-center gap-4">
                                        <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
                                        {formData.imageUrl && (
                                            <div className="shrink-0">
                                                <img src={formData.imageUrl} alt="Preview" className="w-20 h-12 object-cover rounded-md border border-gray-200 shadow-sm" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100">
                                    <button type="button" onClick={closeModal} className="px-5 py-2.5 text-gray-900 font-medium hover:bg-gray-100 rounded-lg transition-colors">Hủy bỏ</button>
                                    <button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-70 flex items-center gap-2">
                                        {isSubmitting ? "Đang xử lý..." : editingId ? "Cập nhật" : "Lưu thẻ"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* MODAL XÁC NHẬN XÓA */}
                {cardToDelete && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center transform transition-all">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Xác nhận xóa thẻ?</h3>
                            <p className="text-gray-500 mb-6 text-sm">
                                Bạn có chắc chắn muốn xóa thẻ <strong className="text-gray-800">{cardToDelete.name}</strong> không? Hành động này không thể hoàn tác.
                            </p>
                            <div className="flex gap-3 justify-center">
                                <button onClick={() => setCardToDelete(null)} className="px-5 py-2.5 text-gray-700 font-medium bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors w-full">Hủy bỏ</button>
                                <button onClick={executeDelete} className="px-5 py-2.5 text-white font-medium bg-red-600 hover:bg-red-700 rounded-lg transition-colors w-full">Đồng ý xóa</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}