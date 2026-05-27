import mongoose, { Schema, model, models } from "mongoose";

const CreditCardSchema = new Schema(
  {
    bank: { type: String, required: true }, // Ngân hàng (VD: Sacombank, VPBank)
    name: { type: String, required: true }, // Tên thẻ (VD: Visa Cashback, StepUP)
    type: { type: String, required: true }, // Loại thẻ (VD: Visa, Mastercard, Amex)
    imageUrl: { type: String, required: true }, // Hình ảnh thẻ
    annualFee: { type: Number, required: true }, // Phí thường niên
  },
  { timestamps: true }
);

// Tránh lỗi compile đè model trong Next.js
const CreditCard = models.CreditCard || model("CreditCard", CreditCardSchema);

export default CreditCard;