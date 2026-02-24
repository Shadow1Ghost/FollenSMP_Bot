const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ] 
});

// ========== НАСТРОЙКИ (переменные окружения) ==========
const TOKEN = process.env.TOKEN;
const ADMIN_KZ_ID = process.env.ADMIN_KZ_ID;      // Твой Discord ID
const ADMIN_RU_ID = process.env.ADMIN_RU_ID;      // ID друга в России
const CHANNEL_ID = process.env.CHANNEL_ID;        // Канал для команд !buy
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID; // Канал для уведомлений
const DISCORDSRV_CHANNEL_ID = process.env.DISCORDSRV_CHANNEL_ID; // Канал DiscordSRV
// ====================================================

// Проверка наличия всех переменных
const requiredEnv = ['TOKEN', 'ADMIN_KZ_ID', 'ADMIN_RU_ID', 'CHANNEL_ID', 'LOG_CHANNEL_ID', 'DISCORDSRV_CHANNEL_ID'];
for (const env of requiredEnv) {
    if (!process.env[env]) {
        console.error(`❌ Ошибка: переменная ${env} не задана!`);
        process.exit(1);
    }
}

// ========== РАБОТА С ФАЙЛОМ ЗАКАЗОВ ==========
const ORDERS_FILE = path.join(__dirname, 'orders.json');

// Загружаем заказы из файла при запуске
function loadOrders() {
    try {
        if (fs.existsSync(ORDERS_FILE)) {
            const data = fs.readFileSync(ORDERS_FILE, 'utf8');
            const parsed = JSON.parse(data);
            // Проверяем, что parsed - это массив, и конвертируем в Map
            if (Array.isArray(parsed)) {
                return new Map(parsed);
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки заказов:', error);
    }
    return new Map();
}

// Сохраняем заказы в файл
function saveOrders(orders) {
    try {
        const data = JSON.stringify([...orders], null, 2);
        fs.writeFileSync(ORDERS_FILE, data);
    } catch (error) {
        console.error('Ошибка сохранения заказов:', error);
    }
}

// Хранилище заказов
let orders = loadOrders();
// =============================================

// Список привилегий
const ranks = {
    'ultra': {
        name: 'Ultra',
        priceRUB: 10,
        priceKZT: 50,
        emoji: '💎'
    },
    'supreme': {
        name: 'SUPREME',
        priceRUB: 30,
        priceKZT: 80,
        emoji: '⚡'
    },
    'legend': {
        name: 'Legend',
        priceRUB: 50,
        priceKZT: 130,
        emoji: '👑'
    },
    'dragon': {
        name: 'Драгон',
        priceRUB: 150,
        priceKZT: 300,
        emoji: '🐉'
    }
};

client.once('ready', () => {
    console.log(`✅ Бот ${client.user.tag} запущен!`);
    console.log(`👑 Админ KZ: ${ADMIN_KZ_ID}`);
    console.log(`👑 Админ RU: ${ADMIN_RU_ID} (Telegram: @Motok_lu)`);
    console.log(`📦 Загружено заказов: ${orders.size}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.channel.id !== CHANNEL_ID) return;
    
    const args = message.content.split(' ');
    const command = args[0].toLowerCase();
    
    // Команда !help
    if (command === '!help') {
        const helpText = 
            '📋 **Доступные команды:**\n\n' +
            '`!price` - показать цены на привилегии\n' +
            '`!buy [ник] [привилегия]` - купить привилегию\n' +
            '   Пример: `!buy PetHT1 ultra`\n' +
            '`!admins` - контакты администраторов\n' +
            '`!support` - связаться с поддержкой\n' +
            '`!status [номер заказа]` - проверить статус';
        
        return message.reply(helpText);
    }
    
    // Команда !price
    if (command === '!price') {
        let priceText = '💰 **Прайс-лист привилегий:**\n\n';
        
        for (const [key, rank] of Object.entries(ranks)) {
            priceText += `${rank.emoji} **${rank.name}**\n`;
            priceText += `   🇷🇺 ${rank.priceRUB} руб.\n`;
            priceText += `   🇰🇿 ${rank.priceKZT} тенге\n\n`;
        }
        
        priceText += '📝 Для покупки: `!buy [ник] [название]`\n';
        priceText += 'Пример: `!buy PetHT1 ultra`';
        
        return message.reply(priceText);
    }
    
    // Команда !admins
    if (command === '!admins') {
        const adminText = 
            '👑 **Администрация FollenSMP**\n\n' +
            `🇰🇿 **Казахстан (тенге):** <@${ADMIN_KZ_ID}>\n` +
            `🇷🇺 **Россия (рубли):** Telegram @Motok_lu\n\n` +
            '📩 По вопросам оплаты пишите в личные сообщения админам.';
        
        return message.reply(adminText);
    }
    
    // Команда !support
    if (command === '!support') {
        const supportText = 
            '🆘 **Техническая поддержка**\n\n' +
            `🇰🇿 Казахстан: <@${ADMIN_KZ_ID}>\n` +
            `🇷🇺 Россия: Telegram @Motok_lu\n\n` +
            '📝 **Что писать:**\n' +
            '• Ваш ник в игре\n' +
            '• Проблема (не выдали привилегию, не прошла оплата и т.д.)\n' +
            '• Скриншот оплаты (если есть)';
        
        return message.reply(supportText);
    }
    
    // Команда !status
    if (command === '!status') {
        const orderId = args[1];
        if (!orderId) {
            return message.reply('❌ Укажите номер заказа! Пример: `!status 1740412345678`');
        }
        
        const order = orders.get(orderId);
        if (!order) {
            return message.reply('❌ Заказ с таким номером не найден');
        }
        
        const statusText = 
            `📦 **Заказ #${orderId}**\n\n` +
            `👤 Покупатель: <@${order.userId}>\n` +
            `🎮 Ник: ${order.username}\n` +
            `🏷 Привилегия: ${order.rank}\n` +
            `🌍 Страна: ${order.country === 'kz' ? '🇰🇿 Казахстан' : '🇷🇺 Россия'}\n` +
            `💰 Сумма: ${order.amount}\n` +
            `📊 Статус: ${order.status === 'waiting' ? '⏳ Ожидает оплаты' : '✅ Подтверждён'}`;
        
        return message.reply(statusText);
    }
    
    // Команда !buy [ник] [привилегия]
    if (command === '!buy') {
        const username = args[1];
        const rankKey = args[2]?.toLowerCase();
        
        if (!username || !rankKey) {
            return message.reply('❌ Укажи ник и привилегию! Пример: `!buy PetHT1 ultra`\n\nСписок привилегий: ultra, supreme, legend, dragon');
        }
        
        const rank = ranks[rankKey];
        if (!rank) {
            return message.reply('❌ Неверная привилегия! Доступны: ultra, supreme, legend, dragon');
        }
        
        // Создаём заявку
        const orderId = Date.now().toString();
        
        // Кнопки выбора страны
        const row = {
            type: 1,
            components: [
                {
                    type: 2,
                    style: 3,
                    label: `🇰🇿 Казахстан (${rank.priceKZT}₸)`,
                    custom_id: `country_kz_${orderId}_${rankKey}`
                },
                {
                    type: 2,
                    style: 4,
                    label: `🇷🇺 Россия (${rank.priceRUB}₽)`,
                    custom_id: `country_ru_${orderId}_${rankKey}`
                }
            ]
        };
        
        await message.reply({
            content: `🛒 **Покупка привилегии ${rank.name}**\n👤 Ник: ${username}\nВыберите страну для оплаты:`,
            components: [row]
        });
    }
});

// Обработка кнопок
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    
    const customId = interaction.customId;
    const parts = customId.split('_');
    
    // Подтверждение оплаты (кнопка с форматом confirm_123456789)
    if (customId.startsWith('confirm_')) {
        const orderId = customId.replace('confirm_', '');
        
        const order = orders.get(orderId);
        if (!order) {
            return interaction.reply({ 
                content: '❌ Заказ не найден или уже обработан', 
                ephemeral: true 
            });
        }
        
        // Отправляем команду в канал DiscordSRV
        try {
            const giveChannel = await client.channels.fetch(DISCORDSRV_CHANNEL_ID);
            await giveChannel.send(`!sudo ${order.username} ${order.rank.toLowerCase()}`);
            
            order.status = 'approved';
            orders.set(orderId, order);
            saveOrders(orders);
            
            await interaction.update({
                content: `✅ **ОПЛАТА ПОДТВЕРЖДЕНА!**\n` +
                        `━━━━━━━━━━━━━━━━━━━━━━━\n` +
                        `🎮 Игроку ${order.username} выдана привилегия ${order.rank}`,
                components: []
            });
            
            // Уведомляем покупателя
            const buyer = await client.users.fetch(order.userId);
            if (buyer) {
                await buyer.send(
                    `✅ **Ваша оплата подтверждена!**\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `🎮 **Ник:** ${order.username}\n` +
                    `🏷 **Привилегия:** ${order.rank}\n` +
                    `💰 **Сумма:** ${order.amount}\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `Спасибо за покупку на FollenSMP!`
                );
            }
            
        } catch (error) {
            console.error('Ошибка при выдаче:', error);
            await interaction.reply({
                content: '❌ Ошибка при выдаче привилегии. Проверьте логи.',
                ephemeral: true
            });
        }
        return;
    }
    
    // Отмена заявки
    if (customId.startsWith('cancel_')) {
        const orderId = customId.replace('cancel_', '');
        
        const order = orders.get(orderId);
        if (!order) {
            return interaction.reply({ 
                content: '❌ Заказ не найден', 
                ephemeral: true 
            });
        }
        
        orders.delete(orderId);
        saveOrders(orders);
        
        await interaction.update({
            content: '❌ **Заявка отменена**',
            components: []
        });
        
        // Уведомляем покупателя
        const buyer = await client.users.fetch(order.userId);
        if (buyer) {
            await buyer.send(
                `❌ **Ваша заявка на покупку была отменена.**\n` +
                `Свяжитесь с администратором для уточнения деталей.`
            );
        }
        return;
    }
    
    // Выбор страны (остаётся как есть)
    if (parts[0] === 'country') {
        const country = parts[1];
        const orderId = parts[2];
        const rankKey = parts[3];
        
        const rank = ranks[rankKey];
        const countryName = country === 'kz' ? 'Казахстан' : 'Россия';
        const amount = country === 'kz' ? rank.priceKZT : rank.priceRUB;
        const currency = country === 'kz' ? '₸' : '₽';
        
        // Определяем, как показывать админа
        let adminDisplay;
        let logAdminDisplay;
        
        if (country === 'kz') {
            adminDisplay = `<@${ADMIN_KZ_ID}>`;
            logAdminDisplay = `<@${ADMIN_KZ_ID}>`;
        } else {
            adminDisplay = '**@Motok_lu** (Telegram)';
            logAdminDisplay = '@Motok_lu (Telegram)';
        }
        
        // Получаем ник из сообщения
        const match = interaction.message.content.match(/Ник: ([^\n]+)/);
        const username = match ? match[1] : 'неизвестно';
        
        // Сохраняем заявку
        orders.set(orderId, {
            userId: interaction.user.id,
            username: username,
            rank: rank.name,
            country: country,
            amount: `${amount} ${currency}`,
            status: 'waiting'
        });
        
        // Сохраняем в файл
        saveOrders(orders);
        
        // Кнопки подтверждения для админа
        const confirmRow = {
            type: 1,
            components: [
                {
                    type: 2,
                    style: 3,
                    label: '✅ Подтвердить оплату',
                    custom_id: `confirm_${orderId}`
                },
                {
                    type: 2,
                    style: 4,
                    label: '❌ Отменить',
                    custom_id: `cancel_${orderId}`
                }
            ]
        };
        
        // Отправляем уведомление пользователю
        await interaction.update({
            content: `✅ Заявка создана! ${adminDisplay} скоро проверит.\n` +
                    `🌍 Страна: ${countryName}\n` +
                    `💰 Сумма: ${amount} ${currency}\n` +
                    `🏷 Привилегия: ${rank.name}`,
            components: []
        });
        
        // Отправляем уведомление в лог-канал
        const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
        await logChannel.send({
            content: `${logAdminDisplay} 🔔 **НОВАЯ ЗАЯВКА НА ОПЛАТУ!**\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `👤 **Покупатель:** <@${interaction.user.id}>\n` +
                    `🎮 **Ник в игре:** ${username}\n` +
                    `🏷 **Привилегия:** ${rank.name}\n` +
                    `🌍 **Страна:** ${countryName}\n` +
                    `💰 **Сумма:** ${amount} ${currency}\n` +
                    `🆔 **Номер заказа:** ${orderId}\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `✅ После подтверждения оплаты нажмите кнопку ниже`,
            components: [confirmRow]
        });
    }
});

// Обработка ошибок
client.on('error', (error) => {
    console.error('❌ Ошибка клиента:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('❌ Необработанная ошибка:', error);
});

client.login(TOKEN);
