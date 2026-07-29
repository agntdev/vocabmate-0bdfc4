import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
// The review handler owns the shared review:resume callback. This composer keeps
// notification response tracking separate without competing for that callback.
const composer = new Composer<Ctx>();
composer.callbackQuery("reminder:seen", async (ctx) => {
  await ctx.answerCallbackQuery({ text: "Reminder noted" });
});
export default composer;
