"use client";
import { useState, useEffect } from "react";

export default function CardsPage() {
    const [cards, setCards] = useState<any[]>([]);
    
    // Thêm state để lưu dữ liệu Masterdata
    const [banks, setBanks] = useState<any[]>([]);
    const [cardTypes, setCardTypes] = useState<any[]>([]);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        bank: "",
        name: "",
        type: "", // Mặc định rỗng để ép người dùng phải chọn từ dropdown
        imageUrl: "",
        annualFee: "",
    });

    useEffect(() => {
        fetchCards();
        fetchMasterData(); // Gọi hàm lấy Masterdata khi vừa mở trang
    }, []);

    const fetchCards = async () => {
        const res = await fetch(`/api/cards?timestamp=${new Date().getTime()}`, {
            cache: "no-store",
        });
        const data = await res.json();
        setCards(data);
    };

    // Hàm lấy song song cả 2 Masterdata
    const fetchMasterData = async () => {
        try {
            const [banksRes, typesRes] = await Promise.all([
                fetch("/api/banks"),
                fetch("/api/cardtypes")
            ]);
            const banksData = await banksRes.json();
            const typesData = await typesRes.json();
            setBanks(banksData);
            setCardTypes(typesData);
        } catch (error) {
            console.error("Lỗi khi tải dữ liệu masterdata", error);
        }
    };

    const openCreateModal = () => {
        setEditingId(null);
        setFormData({ bank: "", name: "", type: "", imageUrl: "", annualFee: "" });
        setIsModalOpen(true);
    };

    const openEditModal = (card: any) => {
        setEditingId(card._id);
        setFormData({
            bank: card.bank,
            name: card.name,
            type: card.type,
            imageUrl: card.imageUrl,
            annualFee: card.annualFee.toString(),
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setTimeout(() => {
            setEditingId(null);
            setFormData({ bank: "", name: "", type: "", imageUrl: "", annualFee: "" });
        }, 200);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Kiểm tra xem người dùng đã chọn masterdata chưa
        if (!formData.bank || !formData.type) {
            alert("Vui lòng chọn Ngân hàng và Loại thẻ từ danh sách!");
            return;
        }

        setIsSubmitting(true);
        const url = editingId ? `/api/cards/${editingId}` : "/api/cards";
        const method = editingId ? "PUT" : "POST";

        const res = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...formData, annualFee: Number(formData.annualFee) }),
        });

        const result = await res.json();
        setIsSubmitting(false);

        if (!res.ok) {
            alert(result.message);
            return;
        }

        closeModal();
        fetchCards();
    };

    const handleDelete = async (id: string) => {
        if (confirm("Bạn có chắc chắn muốn xóa thẻ này?")) {
            await fetch(`/api/cards/${id}`, { method: "DELETE" });
            fetchCards();
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                alert("Kích thước ảnh quá lớn! Vui lòng chọn ảnh dưới 2MB.");
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
        <div className="min-h-screen bg-gray-50 py-10 px-4 md:px-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Thẻ Tín Dụng</h1>
                        <p className="text-gray-500 mt-1">Số lượng thẻ sở hữu: {cards?.length}</p>
                    </div>
                    <button
                        onClick={openCreateModal}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-all shadow-sm flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        Thêm thẻ mới
                    </button>
                </div>

                {cards.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
                        <p className="text-gray-500">Chưa có thẻ nào trong hệ thống.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {cards.map((card) => (
                            <div key={card._id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100 group">
                                <div className="h-48 overflow-hidden bg-gray-100 relative">
                                    <img src={card.imageUrl} alt={card.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" />
                                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur text-xs font-bold px-3 py-1 rounded-full shadow-sm text-gray-700">
                                        {card.type}
                                    </div>
                                </div>
                                <div className="p-5">
                                    <p className="text-sm font-medium text-gray-500 mb-1">{card.bank}</p>
                                    <h3 className="font-bold text-medium text-gray-900 mb-3 line-clamp-1">{card.name}</h3>
                                    <div className="flex justify-between items-center border-t border-gray-100 pt-4 mt-2">
                                        <div>
                                            <p className="text-xs text-gray-500">Phí thường niên</p>
                                            <p className="text-red-500 font-bold">{card.annualFee.toLocaleString("vi-VN")} ₫</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => openEditModal(card)} className="text-gray-400 hover:text-blue-600 transition-colors p-2 rounded-md hover:bg-blue-50" title="Sửa thẻ">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>
                                            <button onClick={() => handleDelete(card._id)} className="text-gray-400 hover:text-red-600 transition-colors p-2 rounded-md hover:bg-red-50" title="Xóa thẻ">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
                            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <h3 className="text-lg font-bold text-gray-900">
                                    {editingId ? "Cập nhật thẻ tín dụng" : "Thêm thẻ tín dụng mới"}
                                </h3>
                                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-sm font-medium text-gray-900 mb-1">Ngân hàng</label>
                                        {/* Đổi input thành select dựa vào Masterdata */}
                                        <select required className="w-full p-2.5 bg-white text-gray-900 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                            value={formData.bank} onChange={(e) => setFormData({ ...formData, bank: e.target.value })}>
                                            <option value="" disabled>Chọn ngân hàng</option>
                                            {banks.map((b) => (
                                                <option key={b._id} value={b.shortname}>{b.shortname}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-sm font-medium text-gray-900 mb-1">Loại thẻ</label>
                                        {/* Đổi select cũ thành select động dựa vào Masterdata */}
                                        <select required className="w-full p-2.5 bg-white text-gray-900 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                            value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                                            <option value="" disabled>Chọn loại thẻ</option>
                                            {cardTypes.map((t) => (
                                                <option key={t._id} value={t.name}>{t.name}</option>
                                            ))}
                                        </select>
                                    </div>
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
                                        <input type="file" accept="image/*" onChange={handleImageUpload}
                                            className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                                        />
                                        {formData.imageUrl && (
                                            <div className="shrink-0">
                                                <img src={formData.imageUrl} alt="Preview" className="w-20 h-12 object-cover rounded-md border border-gray-200 shadow-sm" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100">
                                    <button type="button" onClick={closeModal} className="px-5 py-2.5 text-gray-900 font-medium hover:bg-gray-100 rounded-lg transition-colors">
                                        Hủy bỏ
                                    </button>
                                    <button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2">
                                        {isSubmitting ? "Đang xử lý..." : editingId ? "Cập nhật" : "Lưu thẻ"}
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