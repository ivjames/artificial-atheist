import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseOptions } from "@/lib/quiz";

// GET /api/questions?category=&difficulty=  — carries forward the original
// backend's list endpoint. correctIndex is included here as an authoring/admin
// surface (the quiz UI uses the sanitized server-component payload instead).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") ?? undefined;
  const difficulty = searchParams.get("difficulty") ?? undefined;

  const questions = await prisma.question.findMany({
    where: {
      ...(category ? { category } : {}),
      ...(difficulty ? { difficulty } : {}),
    },
  });

  return NextResponse.json(
    questions.map((q) => ({ ...q, options: parseOptions(q.options) })),
  );
}

// POST /api/questions — create a question. Mirrors the validation from the
// original backend/routes/questions.js.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { text, options, correctIndex, category, difficulty, explanation } =
    (body ?? {}) as Record<string, unknown>;

  const errors: string[] = [];
  if (typeof text !== "string" || !text.trim()) errors.push("text is required");
  if (!Array.isArray(options) || options.length < 2)
    errors.push("options must be an array of at least 2 items");
  else if (!options.every((o) => typeof o === "string"))
    errors.push("all options must be strings");
  if (
    typeof correctIndex !== "number" ||
    !Number.isInteger(correctIndex) ||
    correctIndex < 0 ||
    (Array.isArray(options) && correctIndex >= options.length)
  )
    errors.push("correctIndex must be a valid option index");

  if (errors.length > 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  const created = await prisma.question.create({
    data: {
      text: text as string,
      options: JSON.stringify(options),
      correctIndex: correctIndex as number,
      category: typeof category === "string" ? category : undefined,
      difficulty: typeof difficulty === "string" ? difficulty : undefined,
      explanation: typeof explanation === "string" ? explanation : undefined,
    },
  });

  return NextResponse.json(
    { ...created, options: parseOptions(created.options) },
    { status: 201 },
  );
}
