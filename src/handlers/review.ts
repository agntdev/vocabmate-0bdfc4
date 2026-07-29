import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { registerMainMenuItem, inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { answerKeyboard, applySm2, data, displayCard, dueCards, ratingKeyboard, recordCompletedSession } from "../vocab.js";
registerMainMenuItem({ label: "Review due cards", data: "review:resume", order: 10 });
const composer = new Composer<Ctx>();

async function begin(ctx: Ctx, edit = false) {
  const d = data(ctx);
  const existing = d.flow.kind === "review" ? d.flow : undefined;
  const queue = existing?.queue.filter((id) => d.cards.some((card) => card.id === id)) ?? dueCards(d).map((card) => card.id);
  if (!queue.length) {
    const text = d.cards.length ? "You’re all caught up. Add a new card when you’re ready to keep learning." : "No cards are ready yet — add your first card to begin learning.";
    const extra = { reply_markup: inlineKeyboard([[inlineButton("Add a card", "add:open")], [inlineButton("Back to menu", "menu:main")]]) };
    if (edit) await ctx.editMessageText(text, extra); else await ctx.reply(text, extra);
    return;
  }
  d.flow = { kind: "review", queue, index: existing?.index ?? 0, revealed: false, completed: existing?.completed ?? 0 };
  const flow = d.flow; const card = d.cards.find((item) => item.id === flow.queue[flow.index]);
  if (!card) return begin(ctx, edit);
  if (edit) await ctx.editMessageText(displayCard(card), { reply_markup: answerKeyboard() }); else await ctx.reply(displayCard(card), { reply_markup: answerKeyboard() });
}
composer.command("review", (ctx) => begin(ctx));
composer.callbackQuery("review:resume", async (ctx) => { await ctx.answerCallbackQuery(); await begin(ctx, true); });
composer.callbackQuery("review:show", async (ctx) => { await ctx.answerCallbackQuery(); const d = data(ctx); const flow = d.flow; if (flow.kind !== "review") { await ctx.editMessageText("Your review session has ended. Start another when you’re ready.", { reply_markup: inlineKeyboard([[inlineButton("Review due cards", "review:resume")]]) }); return; } const card = d.cards.find((item) => item.id === flow.queue[flow.index]); if (!card) { await begin(ctx, true); return; } flow.revealed = true; const example = card.example ? `\nExample: ${card.example}` : ""; await ctx.editMessageText(`${card.prompt}\n${card.translation}${example}\n\nHow well did you remember it?`, { reply_markup: ratingKeyboard() }); });
composer.on("callback_query:data", async (ctx, next) => { const match = /^review:rate:([0345])$/.exec(ctx.callbackQuery.data); if (!match) return next(); await ctx.answerCallbackQuery(); const d = data(ctx); const flow = d.flow; if (flow.kind !== "review" || !flow.revealed) { await ctx.editMessageText("Show the answer before choosing a rating.", { reply_markup: inlineKeyboard([[inlineButton("Review due cards", "review:resume")]]) }); return; } const card = d.cards.find((item) => item.id === flow.queue[flow.index]); if (!card) { await begin(ctx, true); return; } applySm2(card, Number(match[1])); flow.index += 1; flow.completed += 1; if (flow.index < flow.queue.length) { flow.revealed = false; const nextCard = d.cards.find((item) => item.id === flow.queue[flow.index]); if (nextCard) await ctx.editMessageText(displayCard(nextCard), { reply_markup: answerKeyboard() }); return; } const result = recordCompletedSession(d); const count = flow.completed; d.flow = { kind: "idle" }; const milestone = result.milestone ? "\nExcellent work — you reached a seven-day streak milestone." : ""; await ctx.editMessageText(`Session complete. You reviewed ${count} card${count === 1 ? "" : "s"}. Your streak is ${result.streak} day${result.streak === 1 ? "" : "s"}.${milestone}`, { reply_markup: inlineKeyboard([[inlineButton("Back to menu", "menu:main")]]) }); });
composer.callbackQuery("review:pause", async (ctx) => { await ctx.answerCallbackQuery(); const d = data(ctx); if (d.flow.kind === "review") await ctx.editMessageText("Your review is paused. Come back whenever you’re ready.", { reply_markup: inlineKeyboard([[inlineButton("Resume review", "review:resume")], [inlineButton("Back to menu", "menu:main")]]) }); else await ctx.editMessageText("There isn’t a review session to pause.", { reply_markup: inlineKeyboard([[inlineButton("Review due cards", "review:resume")]]) }); });
export default composer;
