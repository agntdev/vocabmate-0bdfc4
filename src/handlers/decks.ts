import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { registerMainMenuItem, inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { data, menuBack, starterDecks } from "../vocab.js";
registerMainMenuItem({ label: "My decks", data: "decks:open", order: 30 });
const composer = new Composer<Ctx>();
function showDecks(ctx: Ctx, edit = false) {
  const d = data(ctx); const decks = starterDecks(d);
  const text = decks.map((deck) => `${deck.title} — ${deck.cardIds.length} cards`).join("\n") || "No decks yet — add a card to create your first deck.";
  const markup = inlineKeyboard([...decks.map((deck) => [inlineButton(`${deck.title} (${deck.cardIds.length})`, `decks:view:${deck.id}`)]), [inlineButton("Add a card", "add:open"), inlineButton("Back to menu", "menu:main")]]);
  return edit ? ctx.editMessageText(text, { reply_markup: markup }) : ctx.reply(text, { reply_markup: markup });
}
composer.command("decks", (ctx) => showDecks(ctx));
composer.callbackQuery("decks:open", async (ctx) => { await ctx.answerCallbackQuery(); await showDecks(ctx, true); });
composer.on("callback_query:data", async (ctx, next) => { const m = /^decks:view:([a-z0-9]+)$/.exec(ctx.callbackQuery.data); if (!m) return next(); await ctx.answerCallbackQuery(); const d = data(ctx); const deck = d.decks.find((item) => item.id === m[1]); if (!deck) { await ctx.editMessageText("That deck is no longer available.", { reply_markup: menuBack() }); return; } const cards = d.cards.filter((card) => card.deckId === deck.id); const listing = cards.length ? cards.map((card) => `${card.prompt} — ${card.translation}`).join("\n") : "No cards yet — tap Add a card to create one."; await ctx.editMessageText(`${deck.title}\n${deck.description}\n\n${listing}`, { reply_markup: inlineKeyboard([[inlineButton("Add a card", "add:open")], [inlineButton("All decks", "decks:open")]]) }); });
export default composer;
