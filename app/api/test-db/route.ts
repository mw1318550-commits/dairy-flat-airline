import { NextResponse } from "next/server";
import getClientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await getClientPromise();
    const db = client.db("dairy_flat_airline");

    await db.collection("test").insertOne({
      message: "MongoDB connected successfully",
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: "MongoDB connected successfully",
    });
  } catch (error) {
    console.error("MongoDB connection error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "MongoDB connection failed",
        error: String(error),
      },
      { status: 500 }
    );
  }
}
