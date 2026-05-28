import mongoose, { Schema, model, models } from "mongoose";

const MonthDataSchema = new Schema({
  month: { type: Number, required: true },
  spend: { type: Number, default: 0 },         // Chi tiêu
  cashback: { type: Number, default: 0 },      // Tiền hoàn
  fee: { type: Number, default: 0 },           // Phụ phí (VD: Phí thanh toán dịch vụ/thanh toán hộ)
  otherInterest: { type: Number, default: 0 }, // Các lãi khác (VD: Lãi gửi tiết kiệm 1 tháng/1 tuần)
});

const CreditCardSchema = new Schema(
  {
    bank: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, required: true },
    imageUrl: { type: String, required: true },
    annualFee: { type: Number, required: true },
    targetSpendForWaiver: { type: Number, default: 0 }, // Doanh số cần đạt để miễn phí thường niên (Mới)
    
    // Mảng lưu 12 tháng, mặc định tạo sẵn 12 object từ tháng 1 đến 12
    monthlyData: {
      type: [MonthDataSchema],
      default: () => Array.from({ length: 12 }, (_, i) => ({
        month: i + 1, spend: 0, cashback: 0, fee: 0, otherInterest: 0
      }))
    }
  },
  { timestamps: true }
);

const CreditCard = models.CreditCard || model("CreditCard", CreditCardSchema);
export default CreditCard;