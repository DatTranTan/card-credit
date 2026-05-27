import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import CardType from "@/models/CardType";

export const dynamic = "force-dynamic";

export async function GET() {
  await connectToDatabase();
  const cardTypes = await CardType.find().sort({ name: 1 }); // Xếp theo A-Z
  return NextResponse.json(cardTypes);
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const data = await request.json();

    // Kiểm tra trùng lặp tên loại thẻ (không phân biệt hoa/thường)
    const isExisting = await CardType.findOne({
      name: { $regex: new RegExp(`^${data.name.trim()}$`, "i") },
    });

    if (isExisting) {
      return NextResponse.json(
        { message: `Loại thẻ ${data.name} đã tồn tại trong hệ thống.` },
        { status: 400 }
      );
    }

    const newCardType = await CardType.create(data);
    return NextResponse.json(newCardType, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Lỗi máy chủ nội bộ" }, { status: 500 });
  }
}