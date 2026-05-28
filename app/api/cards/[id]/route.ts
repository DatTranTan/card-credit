import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import CreditCard from "@/models/CreditCard";

// Định nghĩa kiểu dữ liệu cho context chứa params (kiểu Promise)
type RouteContext = {
  params: Promise<{ id: string }>;
};

// Cập nhật thẻ (Update)
export async function PUT(request: Request, context: RouteContext) {
  try {
    await connectToDatabase();

    const { id } = await context.params;
    const data = await request.json();

    // GIẢI PHÁP: Loại bỏ _id, createdAt, updatedAt để không bị lỗi ghi đè trường bất biến của MongoDB
    const { _id, createdAt, updatedAt, ...updateData } = data;

    const updatedCard = await CreditCard.findByIdAndUpdate(
      id,
      updateData, // Chỉ truyền dữ liệu "sạch" đã loại bỏ các trường hệ thống
      { returnDocument: "after" },
    );

    if (!updatedCard) {
      return NextResponse.json(
        { message: "Không tìm thấy thẻ" },
        { status: 404 },
      );
    }

    return NextResponse.json(updatedCard);
  } catch (error: any) {
    console.error("Lỗi cập nhật DB:", error);
    return NextResponse.json(
      { message: error.message || "Lỗi khi cập nhật thẻ" },
      { status: 500 },
    );
  }
}

// Xóa thẻ (Delete)
export async function DELETE(request: Request, context: RouteContext) {
  try {
    await connectToDatabase();

    // Bắt buộc phải await params trước khi lấy id
    const { id } = await context.params;

    await CreditCard.findByIdAndDelete(id);
    return NextResponse.json({ message: "Đã xóa thẻ thành công" });
  } catch (error) {
    return NextResponse.json({ message: "Lỗi khi xóa thẻ" }, { status: 500 });
  }
}
