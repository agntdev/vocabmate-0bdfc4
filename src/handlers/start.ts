import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { mainMenuKeyboard, inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { data, starterDecks } from "../vocab.js";

// The /start handler renders the bot's MAIN MENU — the primary way users operate
// a button-first bot. A feature adds its own button by calling
// `registerMainMenuItem(...)` in its own `src/handlers/<slug>.ts`; this handler
// renders whatever is registered (plus a Help button), so you do NOT edit this
// file to add a feature. Send ONE message — no placeholder line above the menu.
const composer = new Composer<Ctx>();

const WELCOME = "Welcome to VocabSprint. Build a steady vocabulary habit, one review at a time.";

composer.command("start", async (ctx) => {
  const d = data(ctx);
  if (d.decks.length === 0) {
    await ctx.reply(`${WELCOME}\n\nStart with a deck, then add your first card.`, {
      reply_markup: inlineKeyboard([
        [inlineButton("Use starter decks", "start:starters")],
        [inlineButton("Open menu", "menu:main")],
      ]),
    });
    return;
  }
  await ctx.reply(WELCOME, { reply_markup: mainMenuKeyboard() });
});

composer.callbackQuery("start:starters", async (ctx) => {
  await ctx.answerCallbackQuery();
  starterDecks(data(ctx));
  await ctx.editMessageText("Your starter decks are ready. Choose an action to begin.", { reply_markup: mainMenuKeyboard() });
});

// "Back to menu" — re-render the main menu in place from any sub-view.
composer.callbackQuery("menu:main", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(WELCOME, { reply_markup: mainMenuKeyboard() });
});

export default composer;
