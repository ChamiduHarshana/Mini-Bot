const config = require('./config');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const yts = require('yt-search');
const fg = require('api-dylux');

async function msgHandler(conn, mek) {
    try {
        const from = mek.key.remoteJid;
        const type = Object.keys(mek.message)[0];
        const body = (type === 'conversation') ? mek.message.conversation : 
                     (type === 'extendedTextMessage') ? mek.message.extendedTextMessage.text : 
                     (type === 'imageMessage') ? mek.message.imageMessage.caption : '';
        
        const isCmd = body.startsWith('.');
        const command = isCmd ? body.slice(1).trim().split(' ')[0].toLowerCase() : '';
        const q = body.trim().split(/ +/).slice(1).join(' ');
        
        // 🛑 Owner Identification & Self-Chat Fix
        const ownerJid = config.ownerNumber + "@s.whatsapp.net"; 
        const isOwner = mek.key.participant?.includes(config.ownerNumber) || mek.key.fromMe;

        // ✅ Reply Helper (For Self-Chat & Groups)
        const reply = async (text) => {
            // තමන්ටම මැසේජ් කරනකොට කෙලින්ම Owner JID එකට යවනවා
            const target = mek.key.fromMe ? ownerJid : from;
            await conn.sendMessage(target, { text: text }, { quoted: mek });
        };

        // 🚀 Auto Functions
        if (config.alwaysOnline) await conn.sendPresenceUpdate('available', from);
        if (config.autoRead) await conn.readMessages([mek.key]);
        if (config.autoReact && isCmd) await conn.sendMessage(from, { react: { text: "⚡", key: mek.key } });

        if (isCmd) {
            console.log(`📡 Cmd: ${command}`);

            // ----------------------------------------
            // ⭐ 1. ALIVE / MENU (ASITHA MD Style)
            // ----------------------------------------
            if (command === "alive" || command === "menu") {
                // 1. Voice Note
                await conn.sendMessage(from, { 
                    audio: { url: config.aliveAudio }, 
                    mimetype: 'audio/mpeg', 
                    ptt: true 
                }, { quoted: mek });

                // 2. Image Menu
                let menuMsg = `
╭━━━〔 🤖 *${config.botName}* 〕━━━┈
┃ 👋 *Hello User!*
┃ 🚀 I am Online & Ready!
╰━━━━━━━━━━━━━━━━━━┈
📥 *MEDIA DOWNLOADER*
🎵 *.song* <Name>
🎬 *.video* <Name>
📘 *.fb* <Link>
💃 *.tiktok* <Link>

⚙️ *SYSTEM*
🔄 *.restart*
📶 *.ping*

> 💻 POWERED BY xCHAMi STUDIO
`;
                await conn.sendMessage(from, { 
                    image: { url: config.aliveImg }, 
                    caption: menuMsg 
                });
            }

            // 🎵 2. SONG DOWNLOAD
            if (command === "song" || command === "play") {
                if (!q) return reply("Please give me a song name!");
                const search = await yts(q);
                const data = search.videos[0];
                
                await conn.sendMessage(from, { image: { url: data.thumbnail }, caption: `⬇️ *Downloading:* ${data.title}` }, { quoted: mek });
                let down = await fg.yta(data.url);
                await conn.sendMessage(from, { audio: { url: down.dl_url }, mimetype: 'audio/mpeg' }, { quoted: mek });
            }

            // 🎬 3. VIDEO DOWNLOAD
            if (command === "video") {
                if (!q) return reply("Please give me a video name!");
                const search = await yts(q);
                const data = search.videos[0];
                let down = await fg.ytv(data.url);
                await conn.sendMessage(from, { video: { url: down.dl_url }, caption: `🎬 *${data.title}*` }, { quoted: mek });
            }

            // 📘 4. FACEBOOK
            if (command === "fb") {
                if (!q) return reply("Give me a FB Link!");
                try {
                    let data = await fg.fbdl(q);
                    await conn.sendMessage(from, { video: { url: data.videoUrl }, caption: "✅ FB Video" }, { quoted: mek });
                } catch { reply("❌ Error Downloading FB"); }
            }

            // 💃 5. TIKTOK
             if (command === "tiktok" || command === "tt") {
                if (!q) return reply("Give me a TikTok Link!");
                try {
                    let data = await fg.tiktok(q);
                    await conn.sendMessage(from, { video: { url: data.play }, caption: "✅ TikTok No-WM" }, { quoted: mek });
                } catch { reply("❌ Error Downloading TikTok"); }
            }

            // 🔄 6. RESTART
            if (command === "restart") {
                await reply("🔄 System Restarting...");
                process.exit();
            }

            // 📶 7. PING
            if (command === "ping") {
                await reply(`✅ *Pong!* Bot is faster than ever!`);
            }
        }
    } catch (e) {
        console.log("Error:", e);
    }
}
module.exports = { msgHandler };
