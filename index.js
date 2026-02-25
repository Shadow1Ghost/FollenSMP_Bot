const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const http = require('http');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildPresences
    ] 
});

// HTTP сервер для Render
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running!');
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 HTTP сервер для проверки запущен на порту ${PORT}`);
});

// ========== НАСТРОЙКИ (переменные окружения) ==========
const TOKEN = process.env.TOKEN;
const ADMIN_KZ_ID = process.env.ADMIN_KZ_ID;
const ADMIN_RU_ID = process.env.ADMIN_RU_ID;
const CHANNEL_ID = process.env.CHANNEL_ID;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;
const DISCORDSRV_CHANNEL_ID = process.env.DISCORDSRV_CHANNEL_ID;
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

function loadOrders() {
    try {
        if (fs.existsSync(ORDERS_FILE)) {
            const data = fs.readFileSync(ORDERS_FILE, 'utf8');
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed)) {
                return new Map(parsed);
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки заказов:', error);
    }
    return new Map();
}

function saveOrders(orders) {
    try {
        const data = JSON.stringify([...orders], null, 2);
        fs.writeFileSync(ORDERS_FILE, data);
    } catch (error) {
        console.error('Ошибка сохранения заказов:', error);
    }
}

let orders = loadOrders();

// Список привилегий
const ranks = {
    'ultra': {
        name: 'Ultra',
        priceRUB: 10,
        priceKZT: 50,
        emoji: '💎',
        voucher: 'Ultra_rank'
    },
    'supreme': {
        name: 'SUPREME',
        priceRUB: 30,
        priceKZT: 80,
        emoji: '⚡',
        voucher: 'Supreme_rank'
    },
    'legend': {
        name: 'Legend',
        priceRUB: 50,
        priceKZT: 130,
        emoji: '👑',
        voucher: 'Legend_rank'
    },
    'dragon': {
        name: 'Драгон',
        priceRUB: 150,
        priceKZT: 300,
        emoji: '🐉',
        voucher: 'dragon_rank'
    }
};

// Список админов для проверки онлайна
const adminIds = [ADMIN_KZ_ID, ADMIN_RU_ID];

// Функция для получения количества админов онлайн
function getOnlineAdmins() {
    let onlineCount = 0;
    for (const adminId of adminIds) {
        const admin = client.users.cache.get(adminId);
        if (admin && admin.presence?.status !== 'offline' && admin.presence?.status !== undefined) {
            onlineCount++;
        }
    }
    return onlineCount;
}

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
    
    if (command === '!admins') {
        const onlineAdmins = getOnlineAdmins();
        const totalAdmins = adminIds.length;
        
        const adminText = 
            '👑 **Администрация FollenSMP**\n\n' +
            `🇰🇿 **Казахстан (тенге):** <@${ADMIN_KZ_ID}>\n` +
            `🇷🇺 **Россия (рубли):** Telegram @Motok_lu\n\n` +
            `📊 **Сейчас в сети:** ${onlineAdmins}/${totalAdmins} админов\n\n` +
            '📩 По вопросам оплаты пишите в личные сообщения админам.';
        
        return message.reply(adminText);
    }
    
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
        
        const orderId = Date.now().toString();
        
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
    
    // ===== ПОДТВЕРЖДЕНИЕ ОПЛАТЫ =====
    if (customId.startsWith('confirm_')) {
        const orderId = customId.replace('confirm_', '');
        const order = orders.get(orderId);
        
        if (!order) {
            return interaction.reply({ 
                content: '❌ Заказ не найден или уже обработан', 
                ephemeral: true 
            });
        }
        
        try {
            // Получаем канал
            const giveChannel = await client.channels.fetch(DISCORDSRV_CHANNEL_ID);
            
            // Формируем команду
            const rankKey = Object.keys(ranks).find(key => ranks[key].name === order.rank);
            const voucherName = rankKey ? ranks[rankKey].voucher : order.rank.toLowerCase() + '_rank';
            const command = `iv give ${order.username} ${voucherName} 1`;
            
            // ✅ ИСПОЛЬЗУЕМ ВЕБХУК ВМЕСТО ОБЫЧНОГО СООБЩЕНИЯ
            try {
                // Создаём вебхук
                const webhook = await giveChannel.createWebhook({
                    name: 'Console Command',
                    avatar: client.user.displayAvatarURL()
                });
                
                // Отправляем команду через вебхук
                await webhook.send(command);
                
                // Удаляем вебхук (чтобы не засорять)
                await webhook.delete();
                
                console.log(`✅ Команда отправлена через вебхук: ${command}`);
            } catch (webhookError) {
                console.log('❌ Ошибка при создании вебхука, пробую обычное сообщение:', webhookError);
                // Если вебхук не сработал, пробуем обычное сообщение
                await giveChannel.send(command);
                console.log(`✅ Команда отправлена обычным сообщением: ${command}`);
            }
            
            order.status = 'approved';
            orders.set(orderId, order);
            saveOrders(orders);
            
            await interaction.update({
                content: `✅ **ОПЛАТА ПОДТВЕРЖДЕНА!**\n` +
                        `━━━━━━━━━━━━━━━━━━━━━━━\n` +
                        `🎮 Игроку ${order.username} выдан ваучер ${order.rank}`,
                components: []
            });
            
            const buyer = await client.users.fetch(order.userId);
            if (buyer) {
                await buyer.send(
                    `✅ **Спасибо за покупку на FollenSMP!**\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `🎮 **Ник:** ${order.username}\n` +
                    `🏷 **Привилегия:** ${order.rank}\n` +
                    `💰 **Сумма:** ${order.amount}\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `✨ Вам выдан ваучер в игре! Нажмите ПКМ по нему, чтобы активировать статус.\n` +
                    `Если возникнут вопросы — пишите администраторам.`
                );
            }
            
        } catch (error) {
            console.log('❌ ПОДРОБНАЯ ОШИБКА:');
            console.log('Имя ошибки:', error.name);
            console.log('Сообщение:', error.message);
            console.log('Код ошибки:', error.code);
            console.log('Статус:', error.status);
            console.log('URL:', error.url);
            
            try {
                await interaction.reply({
                    content: '❌ Ошибка при выдаче привилегии. Проверьте логи Render.',
                    ephemeral: true
                });
            } catch (replyError) {
                console.log('❌ Не удалось отправить ответ:', replyError);
            }
        }
        return;
    }
    
    // ===== ОТМЕНА ЗАЯВКИ =====
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
        
        const buyer = await client.users.fetch(order.userId);
        if (buyer) {
            await buyer.send(
                `❌ **Ваша заявка на покупку была отменена.**\n` +
                `Свяжитесь с администратором для уточнения деталей.`
            );
        }
        return;
    }
    
    // ===== ВЫБОР СТРАНЫ =====
    if (parts[0] === 'country') {
        const country = parts[1];
        const orderId = parts[2];
        const rankKey = parts[3];
        
        const rank = ranks[rankKey];
        const countryName = country === 'kz' ? 'Казахстан' : 'Россия';
        const amount = country === 'kz' ? rank.priceKZT : rank.priceRUB;
        const currency = country === 'kz' ? '₸' : '₽';
        
        let paymentDetails;
        if (country === 'kz') {
            paymentDetails = 
                '💳 **Kaspi:** `7 707 582 1743`\n' +
                '💳 **Halyk:** `4003 0351 1953 1792`\n' +
                '👤 Получатель: Ерназар Дінмұхамед';
        } else {
            paymentDetails = 
                '💳 **Карта РФ:** `...` (свяжитесь с @Motok_lu)\n' +
                'Либо уточните реквизиты у администратора.';
        }
        
        let adminDisplay;
        let logAdminDisplay;
        
        if (country === 'kz') {
            adminDisplay = `<@${ADMIN_KZ_ID}>`;
            logAdminDisplay = `<@${ADMIN_KZ_ID}>`;
        } else {
            adminDisplay = '**@Motok_lu** (Telegram)';
            logAdminDisplay = '@Motok_lu (Telegram)';
        }
        
        const match = interaction.message.content.match(/Ник: ([^\n]+)/);
        const username = match ? match[1] : 'неизвестно';
        
        orders.set(orderId, {
            userId: interaction.user.id,
            username: username,
            rank: rank.name,
            country: country,
            amount: `${amount} ${currency}`,
            status: 'waiting'
        });
        
        saveOrders(orders);
        
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
        
        await interaction.update({
            content: `✅ Заявка создана!\n\n` +
                    `💰 **Сумма:** ${amount} ${currency}\n` +
                    `🏷 **Привилегия:** ${rank.name}\n` +
                    `🌍 **Страна:** ${countryName}\n\n` +
                    `${paymentDetails}\n\n` +
                    `📩 После перевода администратор подтвердит оплату и выдаст ваучер.`,
            components: []
        });
        
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

client.on('error', (error) => {
    console.error('❌ Ошибка клиента:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('❌ Необработанная ошибка:', error);
});

client.login(TOKEN);
