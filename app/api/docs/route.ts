import { NextResponse } from "next/server";
import spec from "@/lib/openapi";

export const dynamic = "force-static";

export function GET() {
  return NextResponse.json(spec);
}
