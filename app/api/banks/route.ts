import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Bank from "@/models/Bank";

export const dynamic = "force-dynamic"; 

export async function GET() {
  await connectToDatabase();
  // Sắp xếp theo tên viết tắt (A-Z) để dễ tìm kiếm
  const banks = await Bank.find().sort({ shortname: 1 });
  return NextResponse.json(banks);
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const data = await request.json();

    // Kiểm tra xem shortname đã tồn tại chưa (không phân biệt hoa thường)
    const isExisting = await Bank.findOne({
      shortname: { $regex: new RegExp(`^${data.shortname.trim()}$`, "i") },
    });

    if (isExisting) {
      return NextResponse.json(
        { message: `Ngân hàng có mã viết tắt ${data.shortname} đã tồn tại trong hệ thống.` },
        { status: 400 }
      );
    }

    const newBank = await Bank.create(data);
    return NextResponse.json(newBank, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Lỗi máy chủ nội bộ" }, { status: 500 });
  }
}