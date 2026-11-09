require("dotenv").config();

const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const commands = [
    new SlashCommandBuilder()
        .setName("setcode")
        .setDescription("Tạo mã code nhận role")
        .addStringOption(option =>
            option.setName("ma")
                .setDescription("Nhập mã code")
                .setRequired(true)
        )
        .addRoleOption(option =>
            option.setName("role")
                .setDescription("Role muốn cấp")
                .setRequired(true)
        )
        .toJSON()
];

const rest = new REST({ version: "10" })
    .setToken(process.env.TOKEN);

(async () => {
    try {
        await rest.put(
            Routes.applicationGuildCommands(
                process.env.CLIENT_ID,
                process.env.GUILD_ID
            ),
            { body: commands }
        );

        console.log("Đã đăng ký lệnh thành công!");
    } catch (error) {
        console.error(error);
    }
})();