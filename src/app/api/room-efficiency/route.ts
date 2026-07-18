import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: "当前房间效率临时计算接口尚未接入后端。",
    },
    { status: 501 }
  );
}
