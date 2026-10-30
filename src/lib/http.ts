import { NextResponse } from "next/server";
import { getIdentity } from "./identity";
import { getSql } from "./db";
export class ApiError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export const uuid = (value: unknown): string => {
  if (
    typeof value !== "string" ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
      value,
    )
  )
    throw new ApiError("Identificador inválido");
  return value;
};
export function text(value: unknown, max: number, min = 1) {
  if (
    typeof value !== "string" ||
    value.trim().length < min ||
    value.trim().length > max
  )
    throw new ApiError(`Use entre ${min} e ${max} caracteres`);
  return value.trim();
}
export async function member(circleId: string, userId: string, owner = false) {
  const rows =
    await getSql()`select role from circle_memberships where circle_id=${circleId}::uuid and user_id=${userId}::uuid`;
  if (!rows.length || (owner && rows[0].role !== "owner"))
    throw new ApiError("Você não tem acesso a este círculo", 403);
}
export async function endpoint(
  work: (
    me: NonNullable<Awaited<ReturnType<typeof getIdentity>>>,
  ) => Promise<unknown>,
) {
  try {
    const me = await getIdentity();
    if (!me) throw new ApiError("Entre na sua conta para continuar", 401);
    return NextResponse.json(await work(me), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    if (e instanceof SyntaxError)
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    if (e instanceof ApiError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(
      "Social request failed",
      e instanceof Error ? e.name : "Error",
    );
    return NextResponse.json(
      { error: "Não foi possível concluir. Tente novamente." },
      { status: 503 },
    );
  }
}
