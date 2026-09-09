import cron from 'node-cron';
import User from '../models/User.js';
import Board from '../models/Board.js';
import { sendTelegramNotification } from './telegramBot.js';

export const initCronJobs = () => {
  // Check every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    try {
      console.log('⏰ Running Telegram notification cron job...');
      const now = new Date();
      
      // Get all users who have registered a telegramChatId
      const usersWithTelegram = await User.find({ telegramChatId: { $ne: null } });

      for (const user of usersWithTelegram) {
        // Find their boards
        const boards = await Board.find({ user: user._id });

        let expiringCardsCount = 0;
        let messages = [];

        boards.forEach(board => {
          board.columns.forEach(col => {
            col.cards.forEach(card => {
              if (card.dueDate) {
                const due = new Date(card.dueDate);
                const diffMs = due - now;
                const diffHours = diffMs / (1000 * 60 * 60);

                // If task is due in 0 to 24 hours
                if (diffHours > 0 && diffHours <= 24) {
                  expiringCardsCount++;
                  messages.push(`- *${card.title}* in Board _${board.title}_ (Due in ${Math.round(diffHours)} hours)`);
                }
              }
            });
          });
        });

        if (expiringCardsCount > 0) {
          const alertMessage = `⚠️ *NovaKanban Alert*\n\nYou have ${expiringCardsCount} task(s) expiring within the next 24 hours:\n\n${messages.join('\n')}\n\n_Stay productive!_`;
          sendTelegramNotification(user.telegramChatId, alertMessage);
        }
      }
    } catch (error) {
      console.error('Cron Job Error:', error);
    }
  });

  console.log('✅ Cron scheduler initialized.');
};
