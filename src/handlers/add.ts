import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { registerMainMenuItem, inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { data, handleFlowText, makeId, menuBack, starterDecks } from "../vocab.js";
import { scheduleDailyReminder } from "../reminders.js";

registerMainMenuItem({ label: "Add a card", data: "add:open", order: 20 });
const composer = new Composer<Ctx>();

function deckPicker(ctx: Ctx) {
  const d = data(ctx);
  const decks = starterDecks(d);
  return ctx.reply("Choose the deck for this card.", { reply_markup: inlineKeyboard([...decks.map((deck) => [inlineButton(deck.title, `add:deck:${deck.id}`)]), [inlineButton("Import word pairs", "add:import")], [inlineButton("Back to menu", "menu:main")]]) });
}

composer.command("add", deckPicker);
composer.callbackQuery("add:open", async (ctx) => { await ctx.answerCallbackQuery(); await ctx.editMessageText("Choose the deck for this card.", { reply_markup: inlineKeyboard([...starterDecks(data(ctx)).map((deck) => [inlineButton(deck.title, `add:deck:${deck.id}`)]), [inlineButton("Import word pairs", "add:import")], [inlineButton("Back to menu", "menu:main")]]) }); });
composer.callbackQuery("add:import", async (ctx) => { await ctx.answerCallbackQuery(); await ctx.editMessageText("Choose a deck, then send one pair per line as word - translation.", { reply_markup: inlineKeyboard(starterDecks(data(ctx)).map((deck) => [inlineButton(deck.title, `add:importdeck:${deck.id}`)])) }); });
composer.on("callback_query:data", async (ctx, next) => { const match = /^add:importdeck:([a-z0-9]+)$/.exec(ctx.callbackQuery.data); if (!match) return next(); await ctx.answerCallbackQuery(); data(ctx).flow = { kind: "importing", deckId: match[1] }; await ctx.editMessageText("Send your pairs now, one per line as word - translation."); });
composer.on("callback_query:data", async (ctx, next) => {
  const match = /^add:deck:([a-z0-9]+)$/.exec(ctx.callbackQuery.data);
  if (!match) return next();
  await ctx.answerCallbackQuery();
  data(ctx).flow = { kind: "adding_prompt", deckId: match[1] };
  await ctx.editMessageText("Send the word or phrase you want to learn.");
});
composer.callbackQuery("add:skip", async (ctx) => {
  await ctx.answerCallbackQuery();
  const d = data(ctx); const f = d.flow;
  if (f.kind !== "adding_example") { await ctx.editMessageText("That card step has expired. Start again from Add a card.", { reply_markup: menuBack() }); return; }
  d.flow = { kind: "adding_confirm", deckId: f.deckId, prompt: f.prompt, translation: f.translation };
  await ctx.editMessageText(`Ready to save:\n${f.prompt} — ${f.translation}`, { reply_markup: inlineKeyboard([[inlineButton("Save card", "add:save"), inlineButton("Discard", "add:discard")]]) });
});
composer.callbackQuery("add:save", async (ctx) => {
  await ctx.answerCallbackQuery();
  const d = data(ctx); const f = d.flow;
  if (f.kind !== "adding_confirm") { await ctx.editMessageText("That card step has expired. Start again from Add a card.", { reply_markup: menuBack() }); return; }
  const deck = d.decks.find((item) => item.id === f.deckId);
  if (!deck) { d.flow = { kind: "idle" }; await ctx.editMessageText("That deck is no longer available. Choose a deck and try again.", { reply_markup: menuBack() }); return; }
  const card = { id: makeId("c", d), deckId: deck.id, prompt: f.prompt, translation: f.translation, example: f.example, interval: 0, ease: 2.5, repetitions: 0, dueDate: new Date(0).toISOString(), lapseCount: 0 };
  d.cards.push(card); deck.cardIds.push(card.id); d.flow = { kind: "idle" };
  await scheduleDailyReminder(ctx);
  await ctx.editMessageText(`Saved “${card.prompt}” in ${deck.title}. It’s ready for review.`, { reply_markup: inlineKeyboard([[inlineButton("Review now", "review:resume")], [inlineButton("Add another card", "add:open"), inlineButton("Back to menu", "menu:main")]]) });
});
composer.callbackQuery("add:discard", async (ctx) => { await ctx.answerCallbackQuery(); data(ctx).flow = { kind: "idle" }; await ctx.editMessageText("Card discarded. Your deck is unchanged.", { reply_markup: menuBack() }); });
composer.on("message:text", async (ctx, next) => {
  const d = data(ctx); const f = d.flow;
  if (f.kind === "importing") {
    const deck = d.decks.find((item) => item.id === f.deckId);
    const pairs = ctx.message.text.split("\n").map((line) => line.split(/\s+-\s+|\t/).map((part) => part.trim())).filter((parts) => parts.length === 2 && parts[0] && parts[1]);
    if (!deck || !pairs.length) { await ctx.reply("I couldn’t read those pairs. Use one line like hola - hello."); return; }
    for (const [prompt, translation] of pairs) { const card = { id: makeId("c", d), deckId: deck.id, prompt, translation, interval: 0, ease: 2.5, repetitions: 0, dueDate: new Date(0).toISOString(), lapseCount: 0 }; d.cards.push(card); deck.cardIds.push(card.id); }
    d.flow = { kind: "idle" }; await scheduleDailyReminder(ctx); await ctx.reply(`Imported ${pairs.length} card${pairs.length === 1 ? "" : "s"} into ${deck.title}. They’re ready for review.`); return;
  }
  if (!["adding_prompt", "adding_translation", "adding_example"].includes(f.kind)) return next();
  const response = handleFlowText(ctx, ctx.message.text);
  if (!response) return;
  const keyboard = f.kind === "adding_translation" ? inlineKeyboard([[inlineButton("Skip example", "add:skip")]]) : f.kind === "adding_example" ? inlineKeyboard([[inlineButton("Save card", "add:save"), inlineButton("Discard", "add:discard")]]) : undefined;
  await ctx.reply(response, keyboard ? { reply_markup: keyboard } : undefined);
});
export default composer;
