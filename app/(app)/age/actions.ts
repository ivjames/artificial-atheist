"use server";

import { redirect } from "next/navigation";
import { setAgeConfirmed } from "@/lib/age";

// 18+: record the self-declaration and proceed into the chat.
export async function confirmAdult(): Promise<void> {
  await setAgeConfirmed();
  redirect("/chat");
}

// Under 18: never set the cookie, never touch the contact/chat gate —
// straight to the quiz instead (§4a).
export async function divertMinor(): Promise<void> {
  redirect("/quiz");
}
