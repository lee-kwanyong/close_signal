import { NextResponse } from "next/server";

export function utf8Json(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");

  return new NextResponse(JSON.stringify(body), {
    ...init,
    headers,
  });
}