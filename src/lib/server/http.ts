import "server-only";
import { NextResponse } from "next/server";

export const ok = (data: unknown, init?: number) => NextResponse.json(data, { status: init ?? 200 });
export const fail = (message: string, status = 400, code?: string) =>
  NextResponse.json(code ? { error: message, code } : { error: message }, { status });

/** An error whose message is safe to show the client, with its own HTTP status. */
export class HttpError extends Error {
  constructor(
    message: string,
    public status = 400,
    /** Machine-readable reason for the client, e.g. "banned". */
    public code?: string,
  ) {
    super(message);
  }
}

export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof HttpError) return fail(e.message, e.status, e.code);
    console.error(e);
    return fail((e as Error).message || "Server xatosi", 500);
  }
}
