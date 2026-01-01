require('./keep_alive'); // Replit Off වීම නවතයි
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, Browsers } = require('@whiskeysockets/baileys');
const fs = require('fs-extra');
const P = require('pino');
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const { msgHandler } = require('./message_handler');

// Session Folder (Auto Fix සඳහා)
const authDir = './auth_session_ultra'; 

app.use(express.static('public'));

// Pairing Code API
app.get('/pair', async (req, res) => {
    let phone = req.query.phone;
    if (!phone) return res.json({ error: "Number Required" });
    await startBot(phone, res);
});

async function startBot(phoneNum = null, res = null) {
    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const { version } = await fetchLatestBaileysVersion();

    const conn = makeWASocket({
        logger: P({ level: 'silent' }),
        printQRInTerminal: false,
        auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, P({ level: "silent" })) },
        browser: Browsers.macOS("Chrome"), // Chrome ලෙස පෙනී සිටීම
        version
    });

    if (phoneNum && !conn.authState.creds.registered) {
        setTimeout(async () => {
            try {
                let code = await conn.requestPairingCode(phoneNum);
                res.json({ code: code });
            } catch { res.json({ error: "Invalid Number" }); }
        }, 3000);
    }

    conn.ev.on('creds.update', saveCreds);

    conn.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            let reason = lastDisconnect?.error?.output?.statusCode;
            
            // 🛠️ AUTO FIX SYSTEM
            if (reason === DisconnectReason.badSession || reason === DisconnectReason.connectionLost) {
                console.log("⚠️ Session Corrupted! Auto Fixing...");
                // නරක් වුන Session එක මකලා දානවා
                fs.rmSync(authDir, { recursive: true, force: true });
                process.exit(); // Restart
            } else if (reason === DisconnectReason.loggedOut) {
                console.log("⚠️ Device Logged Out. Please Relink.");
                fs.rmSync(authDir, { recursive: true, force: true });
                process.exit();
            } else {
                startBot();
            }
        } else if (connection === 'open') {
            console.log("✅ xCHAMi ULTRA Connected Successfully!");
            const config = require('./config');
            await conn.sendMessage(config.ownerNumber + "@s.whatsapp.net", { text: "🚀 *xCHAMi ULTRA SYSTEM STARTED!*" });
        }
    });

    conn.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            const mek = chatUpdate.messages[0];
            if (!mek.message) return;
            msgHandler(conn, mek);
        } catch (err) { console.log(err); }
    });
}

// Check & Start
if(fs.existsSync(authDir)) startBot();
app.listen(port, () => console.log(`Server running on Port ${port}`));
