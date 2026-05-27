import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import CreditCard from "@/models/CreditCard";

// Khai báo dòng này để báo cho Next.js biết đây là API động, không được lưu cache
export const dynamic = "force-dynamic";

export async function GET() {
  await connectToDatabase();
  const cards = await CreditCard.find().sort({ createdAt: -1 });
  return NextResponse.json(cards);
}

// Thêm thẻ mới (Create)
export async function POST(request: Request) {
  await connectToDatabase();
  const data = await request.json();
  const newCard = await CreditCard.create(data);
  return NextResponse.json(newCard, { status: 201 });
}
