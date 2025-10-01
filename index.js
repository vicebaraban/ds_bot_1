require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const fs = require("fs");

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

const SETTINGS_FILE = "channel_settings.json";
const EXCLUDED_FILE = "excluded_messages.json";

function loadJson(file, def) {
    return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : def;
}
function saveJson(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 4), "utf8");
}

let channelSettings = loadJson(SETTINGS_FILE, {});
let excludedMessages = new Set(loadJson(EXCLUDED_FILE, []));

// Автоснос каждые 60 секунд
setInterval(async () => {
    console.log("🕒 Entered cleanup interval");

    for (const [channelId, lifetime] of Object.entries(channelSettings)) {
        try {
            const channel = await client.channels.fetch(channelId);
            if (!channel || !channel.isTextBased()) {
                console.log(`⚠️ Канал ${channelId} не найден или не текстовый`);
                continue;
            }

            const messages = await channel.messages.fetch({ limit: 100 });
            console.log(`🔹 Обрабатываем канал ${channel.name} (${messages.size} сообщений)`);

            const now = Date.now();
            let deletedCount = 0;

            messages.forEach(msg => {
                if (excludedMessages.has(msg.id)) {
                    console.log(`— Пропущено (исключение) сообщение ${msg.id}`);
                    return;
                }
                if (msg.pinned) {
                    console.log(`— Пропущено (закреплено) сообщение ${msg.id}`);
                    return;
                }
                if ((now - msg.createdTimestamp) / 1000 > lifetime) {
                    msg.delete().catch(err => console.error(`Ошибка при удалении ${msg.id}:`, err));
                    deletedCount++;
                    console.log(`✅ Удалено сообщение ${msg.id}`);
                }
            });

            console.log(`✅ Завершено для канала ${channel.name}, удалено ${deletedCount} сообщений`);

        } catch (err) {
            console.error(`❌ Ошибка при обработке канала ${channelId}:`, err);
        }
    }
}, 60 * 1000);



client.on("clientReady", () => {
    console.log(`✅ Бот запущен как ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "add_channel") {
        const channel = interaction.options.getChannel("channel");
        const minutes = interaction.options.getInteger("minutes");
        channelSettings[channel.id] = minutes * 60;
        saveJson(SETTINGS_FILE, channelSettings);
        await interaction.reply(`✅ В ${channel} сообщения будут храниться ${minutes} секунд.`);
    }

    if (interaction.commandName === "remove_channel") {
        const channel = interaction.options.getChannel("channel");
        if (channelSettings[channel.id]) {
            delete channelSettings[channel.id];
            saveJson(SETTINGS_FILE, channelSettings);
            await interaction.reply(`❌ Канал ${channel} удалён из настроек.`);
        } else {
            await interaction.reply("⚠️ Этот канал не был настроен.");
        }
    }

    if (interaction.commandName === "list_channels") {
        if (Object.keys(channelSettings).length === 0) {
            return interaction.reply("⚠️ Нет настроенных каналов.");
        }
        let text = "📋 Настройки каналов:\n";
        for (const [cid, lifetime] of Object.entries(channelSettings)) {
            const ch = await client.channels.fetch(cid).catch(() => null);
            text += `- ${ch ? ch : cid}: ${lifetime} секунд\n`;
        }
        await interaction.reply(text);
    }

    if (interaction.commandName === "exclude") {
        const messageId = interaction.options.getString("message_id");
        excludedMessages.add(messageId);
        saveJson(EXCLUDED_FILE, [...excludedMessages]);
        await interaction.reply(`✅ Сообщение ${messageId} добавлено в исключения.`);
    }

    if (interaction.commandName === "unexclude") {
        const messageId = interaction.options.getString("message_id");
        excludedMessages.delete(messageId);
        saveJson(EXCLUDED_FILE, [...excludedMessages]);
        await interaction.reply(`❌ Сообщение ${messageId} убрано из исключений.`);
    }

    if (interaction.commandName === "list_excluded") {
        if (excludedMessages.size === 0) {
            return interaction.reply("⚠️ Нет исключённых сообщений.");
        }
        await interaction.reply("📋 Исключённые сообщения:\n" + [...excludedMessages].join("\n"));
    }
});

client.login(process.env.DISCORD_TOKEN);
