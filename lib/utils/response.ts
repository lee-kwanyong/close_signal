import { NextResponse } from "next/server";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
      meta: {
        generated_at: new Date().toISOString()
      }
    },
    { status }
  );
}

export function fail(code: string, message: string, status = 400, details: Record<string, unknown> = {}) {
  return NextResponse.json(
    {
      success: false,
      error: { code, message, details },
      meta: { generated_at: new Date().toISOString() }
    },
    { status }
  );
}

export async function routeGuard<T>(handler: () => Promise<T>) {
  try {
    const data = await handler();
    return ok(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return fail("INTERNAL_ERROR", message, 500);
  }
}
