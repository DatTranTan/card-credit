import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import CardType from "@/models/CardType";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  try {
    await connectToDatabase();
    const { id } = await context.params;
    const data = await request.json();
    
    const updatedCardType = await CardType.findByIdAndUpdate(id, data, { returnDocument: 'after' });
    return NextResponse.json(updatedCardType);
  } catch (error) {
    return NextResponse.json({ message: "Lỗi khi cập nhật loại thẻ" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    await connectToDatabase();
    const { id } = await context.params;
    await CardType.findByIdAndDelete(id);
    return NextResponse.json({ message: "Đã xóa loại thẻ thành công" });
  } catch (error) {
    return NextResponse.json({ message: "Lỗi khi xóa loại thẻ" }, { status: 500 });
  }
}