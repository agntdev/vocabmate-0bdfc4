import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { registerMainMenuItem, inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { data, dueCards } from "../vocab.js";
registerMainMenuItem({ label: "Progress", data: "stats:open", order: 40 });
const composer = new Composer<Ctx>();
function stats(ctx: Ctx) { const d = data(ctx); const reviewed = d.cards.filter((card) => card.repetitions > 0).length; return `You have ${d.cards.length} card${d.cards.length === 1 ? "" : "s"}.\n${dueCards(d).length} due for review.\n${reviewed} reviewed at least once.\nCurrent streak: ${d.streakCount} day${d.streakCount === 1 ? "" : "s"}.\nSessions this week: ${d.sessionsThisWeek.length}.`; }
function markup() { return inlineKeyboard([[inlineButton("Review due cards", "review:resume")], [inlineButton("Back to menu", "menu:main")]]); }
composer.command("stats", async (ctx) => { await ctx.reply(stats(ctx), { reply_markup: markup() }); });
composer.callbackQuery("stats:open", async (ctx) => { await ctx.answerCallbackQuery(); await ctx.editMessageText(stats(ctx), { reply_markup: markup() }); });
export default composer;
