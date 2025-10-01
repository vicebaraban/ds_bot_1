require("dotenv").config();
const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const commands = [
    new SlashCommandBuilder()
        .setName("add_channel")
        .setDescription("Добавить канал для автосноса")
        .addChannelOption(option =>
            option.setName("channel").setDescription("Канал").setRequired(true))
        .addIntegerOption(option =>
            option.setName("minutes").setDescription("Время хранения в минутах").setRequired(true)),

    new SlashCommandBuilder()
        .setName("remove_channel")
        .setDescription("Удалить канал из настроек")
        .addChannelOption(option =>
            option.setName("channel").setDescription("Канал").setRequired(true)),

    new SlashCommandBuilder()
        .setName("list_channels")
        .setDescription("Список каналов с настройками"),

    new SlashCommandBuilder()
        .setName("exclude")
        .setDescription("Добавить сообщение в исключения")
        .addStringOption(option =>
            option.setName("message_id").setDescription("ID сообщения").setRequired(true)),

    new SlashCommandBuilder()
        .setName("unexclude")
        .setDescription("Убрать сообщение из исключений")
        .addStringOption(option =>
            option.setName("message_id").setDescription("ID сообщения").setRequired(true)),

    new SlashCommandBuilder()
        .setName("list_excluded")
        .setDescription("Список исключённых сообщений"),
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log("⏳ Регистрируем команды...");
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );
        console.log("✅ Команды зарегистрированы!");
    } catch (error) {
        console.error(error);
    }
})();
