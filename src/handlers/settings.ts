import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { registerMainMenuItem, inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { data, menuBack } from "../vocab.js";
registerMainMenuItem({ label: "Settings", data: "settings:open", order: 50 });
const composer = new Composer<Ctx>();
function text(ctx: Ctx) { const d = data(ctx); return `Your daily new-card limit is ${d.dailyNewLimit}.\nReminder: ${d.reminderCadence === "off" ? "off" : `daily at ${d.notificationTime}`}.\nLearning language: ${d.language}.`; }
function keyboard() { return inlineKeyboard([[inlineButton("5 new cards", "settings:limit:5"), inlineButton("10 new cards", "settings:limit:10")], [inlineButton("20 new cards", "settings:limit:20")], [inlineButton("Turn reminders on", "settings:reminders:on"), inlineButton("Turn reminders off", "settings:reminders:off")], [inlineButton("Back to menu", "menu:main")]]); }
async function show(ctx: Ctx, edit = false) { if (edit) await ctx.editMessageText(text(ctx), { reply_markup: keyboard() }); else await ctx.reply(text(ctx), { reply_markup: keyboard() }); }
composer.command("settings", (ctx) => show(ctx));
composer.callbackQuery("settings:open", async (ctx) => { await ctx.answerCallbackQuery(); await show(ctx, true); });
composer.on("callback_query:data", async (ctx, next) => { const limit = /^settings:limit:(5|10|20)$/.exec(ctx.callbackQuery.data); if (limit) { await ctx.answerCallbackQuery(); data(ctx).dailyNewLimit = Number(limit[1]); await ctx.editMessageText(`You’ll see up to ${limit[1]} new cards each day.`, { reply_markup: keyboard() }); return; } const reminders = /^settings:reminders:(on|off)$/.exec(ctx.callbackQuery.data); if (!reminders) return next(); await ctx.answerCallbackQuery(); data(ctx).reminderCadence = reminders[1] === "on" ? "daily" : "off"; await ctx.editMessageText(reminders[1] === "on" ? "Daily review reminders are on at 09:00." : "Daily review reminders are off.", { reply_markup: keyboard() }); });
composer.callbackQuery("settings:back", async (ctx) => { await ctx.answerCallbackQuery(); await ctx.editMessageText("Your settings are saved.", { reply_markup: menuBack() }); });
export default composer;
