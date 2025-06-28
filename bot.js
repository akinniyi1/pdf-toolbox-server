import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';

// Load env variables
dotenv.config();

// Your bot token from BotFather
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// Your deployed frontend link
const WEBAPP_URL = 'https://pdf-toolbox-client.onrender.com';

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId, "Welcome to PDF Toolbox Bot. Tap the button below to open the WebApp.", {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "Open PDF Toolbox",
            web_app: {
              url: WEBAPP_URL
            }
          }
        ]
      ]
    }
  });
});
