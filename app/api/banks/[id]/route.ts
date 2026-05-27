import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Bank from "@/models/Bank";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  try {
    await connectToDatabase();
    const { id } = await context.params;
    const data = await request.json();
    
    const updatedBank = await Bank.findByIdAndUpdate(id, data, { returnDocument: 'after' });
    return NextResponse.json(updatedBank);
  } catch (error) {
    return NextResponse.json({ message: "Lỗi khi cập nhật ngân hàng" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    await connectToDatabase();
    const { id } = await context.params;
    await Bank.findByIdAndDelete(id);
    return NextResponse.json({ message: "Đã xóa ngân hàng thành công" });
  } catch (error) {
    return NextResponse.json({ message: "Lỗi khi xóa ngân hàng" }, { status: 500 });
  }
}