const { Client, GatewayIntentBits } = require('discord.js');
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

// Хранилище заявок (в реальном проекте лучше использовать БД)
const orders = new Map();

client.once('ready', () => {
    console.log(`✅ Бот ${client.user.tag} запущен!`);
    console.log(`👑 Админ KZ: ${ADMIN_KZ_ID}`);
    console.log(`👑 Админ RU: ${ADMIN_RU_ID}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.channel.id !== CHANNEL_ID) return;
    
    const args = message.content.split(' ');
    const command = args[0].toLowerCase();
    
    // Команда !buy [ник]
    if (command === '!buy') {
        const username = args[1];
        if (!username) {
            return message.reply('❌ Укажи ник! Пример: `!buy PetHT1`');
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
                    label: '🇰🇿 Казахстан (тенге)',
                    custom_id: `country_kz_${orderId}`
                },
                {
                    type: 2,
                    style: 4,
                    label: '🇷🇺 Россия (рубли)',
                    custom_id: `country_ru_${orderId}`
                }
            ]
        };
        
        await message.reply({
            content: `🛒 **Новая покупка для ника: ${username}**\nВыберите страну для оплаты:`,
            components: [row]
        });
    }
});

// Обработка кнопок
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    
    const [action, country, orderId] = interaction.customId.split('_');
    
    // Выбор страны
    if (action === 'country') {
        const targetAdmin = country === 'kz' ? ADMIN_KZ_ID : ADMIN_RU_ID;
        const countryName = country === 'kz' ? 'Казахстан (тенге)' : 'Россия (рубли)';
        const adminMention = `<@${targetAdmin}>`;
        
        // Получаем ник из сообщения
        const match = interaction.message.content.match(/ник: ([^\n]+)/);
        const username = match ? match[1] : 'неизвестно';
        
        // Сохраняем заявку
        orders.set(orderId, {
            userId: interaction.user.id,
            username: username,
            country: country,
            status: 'waiting'
        });
        
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
        
        // Отправляем уведомление админу
        await interaction.update({
            content: `✅ Заявка создана! Администратор ${adminMention} скоро проверит.\nСтрана: ${countryName}`,
            components: []
        });
        
        // Отправляем уведомление в лог-канал
        const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
        await logChannel.send({
            content: `${adminMention} 🔔 **Новая заявка на оплату!**\n` +
                    `👤 Покупатель: <@${interaction.user.id}>\n` +
                    `🎮 Ник в игре: ${username}\n` +
                    `🌍 Страна: ${countryName}\n` +
                    `🆔 Заказ: ${orderId}`,
            components: [confirmRow]
        });
    }
    
    // Подтверждение оплаты
    if (action === 'confirm') {
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
            await giveChannel.send(`!sudo ${order.username} загрузчик`);
            
            order.status = 'approved';
            
            await interaction.update({
                content: `✅ Оплата подтверждена! Привилегия выдана игроку ${order.username}`,
                components: []
            });
            
            // Уведомляем покупателя (если нужно)
            const buyer = await client.users.fetch(order.userId);
            if (buyer) {
                await buyer.send(`✅ Ваша оплата подтверждена! Привилегия выдана на ник **${order.username}**`);
            }
            
        } catch (error) {
            console.error('Ошибка при выдаче:', error);
            await interaction.reply({
                content: '❌ Ошибка при выдаче привилегии. Проверьте логи.',
                ephemeral: true
            });
        }
    }
    
    // Отмена заявки
    if (action === 'cancel') {
        const order = orders.get(orderId);
        if (!order) {
            return interaction.reply({ 
                content: '❌ Заказ не найден', 
                ephemeral: true 
            });
        }
        
        orders.delete(orderId);
        
        await interaction.update({
            content: '❌ Заявка отменена',
            components: []
        });
        
        // Уведомляем покупателя
        const buyer = await client.users.fetch(order.userId);
        if (buyer) {
            await buyer.send(`❌ Ваша заявка на покупку была отменена. Свяжитесь с администратором для уточнения.`);
        }
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
