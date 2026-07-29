import type { Ctx } from "./bot.js";
import { remindAt, type WorkerEnv } from "./toolkit/session/durable.js";
import { inlineButton, inlineKeyboard } from "./toolkit/index.js";
import { data, dueCards, now } from "./vocab.js";

type WorkerContext = Ctx & { env?: WorkerEnv };

/** Schedule the next opted-in review nudge when the Worker runtime is available. */
export async function scheduleDailyReminder(ctx: Ctx): Promise<void> {
  const worker = ctx as WorkerContext;
  const d = data(ctx);
  if (!worker.env?.CHAT_DO || d.reminderCadence === "off" || !ctx.chat) return;
  const [hours, minutes] = d.notificationTime.split(":").map(Number);
  const at = new Date(now());
  at.setUTCHours(hours, minutes, 0, 0);
  if (at.getTime() <= now().getTime()) at.setUTCDate(at.getUTCDate() + 1);
  const count = dueCards(d).length;
  const copy = count === 1
    ? "You have 1 card ready for review. A quick session keeps your momentum going."
    : `You have ${count} cards ready for review. A quick session keeps your momentum going.`;
  await remindAt(worker.env, ctx.chat.id, at.getTime(), copy, {
    inline_keyboard: [[inlineButton("Review due cards", "review:resume")]],
  });
}
