// index.js - Minecraft бот для Aternos 24/7
import http from 'http';
import mineflayer from 'mineflayer';

const server = http.createServer((req, res) => res.end('Bot OK'));
server.listen(0, '0.0.0.0', () => {
    console.log('🌐 Сервер запущен');
    console.log('🤖 Запуск PetHT1...');
    connect();
});

function connect() {
    const bot = mineflayer.createBot({
        host: 'FollenSMP.aternos.me',
        port: 38945,
        username: 'PetHT1',  // Можешь менять на PetHT2, PetHT3 и т.д.
        version: '1.21.1',
        viewDistance: 'tiny'
    });

    // Флаг, чтобы зарегистрироваться только один раз
    let hasRegistered = false;

    bot.once('spawn', () => {
        console.log('✅ PetHT1 в игре!');
        
        // Регистрация и логин — только ОДИН раз при заходе
        setTimeout(() => {
            bot.chat('/register pas1234 pas1234');
            console.log('📝 Отправлен /register (один раз)');
        }, 2000);
        
        setTimeout(() => {
            bot.chat('/login pas1234');
            console.log('🔑 Отправлен /login (один раз)');
            hasRegistered = true;
        }, 4000);
        
        // Анти-AFK - двигаемся каждые 2 секунды
        setInterval(() => {
            if (!bot.entity) return;
            
            // Прыгаем
            bot.setControlState('jump', true);
            setTimeout(() => bot.setControlState('jump', false), 100);
            
            // Смотрим по сторонам
            bot.look(Math.random() * Math.PI * 2, 0);
            
            console.log('👋 Движение');
        }, 2000);
    });

    // Смотрим сообщения от сервера
    bot.on('message', (msg) => {
        const text = msg.toString();
        console.log('💬', text);
        
        // Если сервер просит зарегистрироваться И мы ещё не регистрировались
        if (text.includes('register') && !hasRegistered) {
            bot.chat('/register pas1234 pas1234');
            console.log('📝 Повторный /register (возможно, нужен)');
            hasRegistered = true;
        }
        
        // Если сервер просит логин И мы ещё не залогинились
        if (text.includes('login') && !hasRegistered) {
            bot.chat('/login pas1234');
            console.log('🔑 Повторный /login');
            hasRegistered = true;
        }
    });

    // Перезапуск при отключении
    bot.on('end', () => {
        console.log('🔌 Отключен, перезапуск...');
        setTimeout(connect, 3000);
    });

    bot.on('error', (err) => {
        console.log('❌ Ошибка:', err.message);
    });
}
