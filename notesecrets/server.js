const express = require('express');
const WebSocket = require('ws');
const ServerSocket = WebSocket.Server;
const app = express();
const fs = require('fs');
app.use(express.static('public'));
const PORT = process.env.PORT||80;
const server = app.listen(PORT, () => console.log(`[Server] Listening on https://localhost:${PORT}`));
const wss = new ServerSocket({ server });
var room = [];
var clientlist = [];
var clientlisttosend = [];
var ifgaming = [];
var gamecard = [];
var chat = [];
var question;
var prompt = {};
var ifnotify = [];
fs.readFile('data3.txt', 'utf8', (err, data) => {
    if (err) {
        console.error('讀課程小考檔案出錯:', err);
        return;
    }

    const qs = data.split('\n').map(line => line.trim()).filter(line => line !== '');
    question = qs.map(q => {
        const parts = q.split(/\([A-D]\)/);
        const questionText = parts[0].slice(1).trim(); // 提取問題並去掉前面的選項字母
        const options = parts.slice(1).map(option => option.trim()); // 提取選項

        return {
            q: questionText,
            A: options[0],
            B: options[1],
            C: options[2],
            D: options[3],
            answer: q.charAt(0) // 提取答案
        };
    });
});
fs.readFile('data2.txt', 'utf8', (err, data) => {
    if (err) {
        console.error('讀取筆記時出錯:', err);
        return;
    }
    const tempprompt = data.split('\n').map(line => line.trim()).filter(line => line !== '');
    var currentCategory = "";
    tempprompt.forEach(item => {
        if (item.endsWith("：")) {
            currentCategory = item.slice(0, -1);
            prompt[currentCategory] = [];
        } else {
            prompt[currentCategory].push(item);
        }
    });
    prompt = JSON.stringify(prompt);
});
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}
wss.on('connection', (ws, req) => {
    ws.on('message', async data => {
        data = JSON.parse(data.toString());
        console.log(`[Message from client ${ws.id}] data: `, data);
        if (data.type == "申請打開教室") {//room:房間號、id:自己id
            if (room.includes(data.room)) {
                ws.send(JSON.stringify({ type: "index.html", success: false, message: '該教室已存在' }))
                return;
            }
            ws.send(JSON.stringify({ type: "create", success: true }));
        } else if (data.type == "打開教室") {//room:房間號、id:自己id
            if (room.includes(data.room)) {
                ws.send(JSON.stringify({ type: "index.html", success: false, message: '該教室已存在' }))
                return;
            }
            room.push(data.room)
            ws.id = data.id;
            ws.room = data.room;
            ws.position = "A班老師";
            ws.owner = true;
            clientlist[data.room] = [ws];
            clientlisttosend[data.room] = [{ id: data.id, room: data.room, position: "A班老師", owner: true }];
            ifgaming[data.room] = 0;
            chat[data.room] = [];
            ifnotify[data.room] = false;
            clientlist[data.room].forEach(function (client) {
                client.send(JSON.stringify({ type: "join", success: true, clientlist: clientlisttosend[data.room], chat: chat[data.room], ifnotify: ifnotify[data.room] }));
            });
        } else if (data.type == "進入教室") {//room:房間號、id:自己id
            if (room.includes(data.room)) {
                if (ifgaming[data.room] > 0) {
                    ws.send(JSON.stringify({ type: "index.html", success: false, message: '該教室已開始考試' }))
                    return;
                }
                for (const client of clientlist[data.room]) {
                    if (client.id == data.id) {
                        ws.send(JSON.stringify({ type: "index.html", success: false, message: '該教室已存在該學生或老師' }))
                        return;
                    }
                }
                if (clientlist[data.room].length == 1) {
                    ws.id = data.id;
                    ws.room = data.room;
                    ws.position = "B班老師";
                    ws.owner = false;
                } else if (clientlist[data.room].length == 2) {
                    ws.id = data.id;
                    ws.room = data.room;
                    ws.position = "學生";
                    ws.owner = false;
                } else if (clientlist[data.room].length == 3) {
                    clientlist[data.room] = clientlist[data.room].map(item => {
                        if (item.position === "學生") {
                            item.position = "A班學生";
                        }
                        return item;
                    });
                    clientlisttosend[data.room] = clientlisttosend[data.room].map(item => {
                        if (item.position === "學生") {
                            item.position = "A班學生";
                        }
                        return item;
                    });
                    ws.id = data.id;
                    ws.room = data.room;
                    ws.position = "B班學生";
                    ws.owner = false;
                } else if (clientlist[data.room].length % 2 == 0) {
                    ws.id = data.id;
                    ws.room = data.room;
                    ws.position = "A班學生";
                    ws.owner = false;
                } else {
                    ws.id = data.id;
                    ws.room = data.room;
                    ws.position = "B班學生";
                    ws.owner = false;
                }
                clientlist[data.room].push(ws);
                clientlisttosend[data.room].push({ id: ws.id, room: ws.room, position: ws.position, owner: ws.owner });
                clientlist[data.room].forEach(function (client) {
                    client.send(JSON.stringify({ type: "join", success: true, clientlist: clientlisttosend[data.room], chat: chat[data.room], ifnotify: ifnotify[data.room] }));
                });
                return;
            }
            ws.send(JSON.stringify({ type: "index.html", success: false, message: '教室不存在' }));
        } else if (data.type == "交換請求") {//id:對方id
            if (!room.includes(ws.room)) {
                ws.send(JSON.stringify({ type: "index.html", success: false, message: "教室不存在" }));
                return;
            }
            if (ifgaming[ws.room] > 0) {
                ws.send(JSON.stringify({ type: "testing.html", success: false, message: '該教室已開始考試' }))
                return;
            }
            for (const client of clientlist[ws.room]) {
                if (client.id == data.id) {
                    client.send(JSON.stringify({ type: "ask", success: true, id: ws.id }));
                    return;
                }
            }
            ws.send(JSON.stringify({ type: "join", success: false, message: '該老師或學生不存在' }));
        } else if (data.type == "交換") {//id:對方id、change:是否同意
            if (!room.includes(ws.room)) {
                ws.send(JSON.stringify({ type: "index.html", success: false, message: "教室不存在" }));
                return;
            }
            if (ifgaming[ws.room] > 0) {
                ws.send(JSON.stringify({ type: "testing.html", success: false, message: '該教室已開始考試' }))
                return;
            }
            var client1 = clientlist[ws.room].findIndex(function (item) {
                return item.id === data.id;
            });
            var client2 = clientlist[ws.room].findIndex(function (item) {
                return item.id === ws.id;
            });
            if (data.change) {
                if (client1 !== -1 && client2 !== -1) {
                    var temp = clientlist[ws.room][client1];
                    clientlist[ws.room][client1] = clientlist[ws.room][client2];
                    clientlist[ws.room][client2] = temp;
                    var temp2 = clientlisttosend[ws.room][client1];
                    clientlisttosend[ws.room][client1] = clientlisttosend[ws.room][client2];
                    clientlisttosend[ws.room][client2] = temp2;
                    var tempPosition = clientlist[ws.room][client1].position;
                    clientlist[ws.room][client1].position = clientlist[ws.room][client2].position;
                    clientlist[ws.room][client2].position = tempPosition;
                    var tempPosition2 = clientlisttosend[ws.room][client1].position;
                    clientlisttosend[ws.room][client1].position = clientlisttosend[ws.room][client2].position;
                    clientlisttosend[ws.room][client2].position = tempPosition2;
                    clientlist[ws.room].forEach(function (client) {
                        client.send(JSON.stringify({ type: "join", success: true, clientlist: clientlisttosend[ws.room], chat: chat[ws.room], ifnotify: ifnotify[ws.room] }));
                    });
                } else if (client1 == -1 && client2 == -1) {
                    ws.send(JSON.stringify({ type: "index.html", success: false, message: '你與他皆不在教室' }));
                } else if (client2 == -1) {
                    ws.send(JSON.stringify({ type: "index.html", success: false, message: '你已不在教室' }));
                } else {
                    ws.send(JSON.stringify({ type: "waiting.html", success: false, message: '他已不在教室' }));
                }
            } else {
                if (client1 !== -1 && client2 !== -1) {
                    clientlist[ws.room][client1].send(JSON.stringify({ type: "waiting.html", success: false, message: '對方已拒絕交換身分要求' }));
                } else if (client1 == -1 && client2 == -1) {
                    ws.send(JSON.stringify({ type: "index.html", success: false, message: '你與他皆不在教室' }));
                } else if (client2 == -1) {
                    ws.send(JSON.stringify({ type: "index.html", success: false, message: '你已不在教室' }));
                } else {
                    ws.send(JSON.stringify({ type: "waiting.html", success: false, message: '他已不在教室' }));
                }
            }
        } else if (data.type == "開始考試") {
            if (!room.includes(ws.room)) {
                ws.send(JSON.stringify({ type: "index.html", success: false, message: "教室不存在" }));
                return;
            }
            if (ifgaming[ws.room] == 1) {
                ws.send(JSON.stringify({ type: "testing.html", success: false, message: "考試已開始" }));
                return;
            }
            if (ws.owner) {
                var card;
                const redCount = Math.floor(Math.random() * 2) + 7;
                const blueCount = 15 - redCount;
                const colors = Array(5).fill('white').concat(Array(redCount).fill('red'), Array(blueCount).fill('blue'));
                shuffleArray(colors);
                fs.readFile('data1.txt', 'utf8', (err, data) => {
                    if (err) {
                        console.error('讀取考卷時出錯:', err);
                        return;
                    }
                    card = data.split('\n').map(line => line.trim()).filter(line => line !== '');
                    shuffleArray(card);
                    card = card.slice(0, 20);
                    ifgaming[ws.room] = 1;
                    gamecard[ws.room] = { card: card, prompt: prompt, colors: colors, fliped: Array(20).fill(false), redCount: redCount, blueCount: blueCount, redFliped: 0, blueFliped: 0, state: 0, redremain: 0, blueremain: 0, redprompt: "", blueprompt: "", question: null, redanswer: [], blueanswer: [], questionid: "", nowFliped: 0, ifnotify: true, bluewrongtimes: 0, redwrongtimes: 0 };
                    ws.send(JSON.stringify({ type: "game", success: true }));
                });
                return;
            }
            ws.send(JSON.stringify({ type: "waiting.html", success: false, message: "你不是教室管理員" }));
        } else if (data.type == "通知考試") {
            if (ifgaming[ws.room] == 0) {
                ws.send(JSON.stringify({ type: "waiting.html", success: false, message: "考試還未開始" }));
                return;
            }
            if (ws.owner) {
                gamecard[ws.room].ifnotify = false;
                clientlist[ws.room].forEach(function (client) {
                    if (!client.owner)
                        client.send(JSON.stringify({ type: "game", success: true }));
                });
                return;
            }
            ws.send(JSON.stringify({ type: "waiting.html", success: false, message: "你不是教室管理員" }));
        } else if (data.type == "筆記") {//gamestate=0多數班老師，=1多數班學生，=2多數班老師，=3多數班學生，=4少數班老師，=5少數班學生，=6少數班老師，=7少數班學生
            if (!room.includes(ws.room)) {
                ws.send(JSON.stringify({ type: "index.html", success: false, message: "教室不存在" }));
                return;
            }
            if (ifgaming[ws.room] == 2) {
                ws.send(JSON.stringify({ type: "testing.html", success: false, message: "考試已結束" }));
                return;
            }
            if (ifgaming[ws.room] == 0) {
                ws.send(JSON.stringify({ type: "waiting.html", success: false, message: "考試還未開始" }));
                return;
            }
            if (gamecard[ws.room].state < 3.5 && gamecard[ws.room].state % 2 == 0) {
                if (gamecard[ws.room].redCount > gamecard[ws.room].blueCount && ws.position == 'A班老師') {
                    if (gamecard[ws.room].redremain == 0) {
                        var newp = "筆記：" + data.prompt.join(",") + " ";
                        gamecard[ws.room].redprompt = newp;
                        newp += data.answer.length + "張";
                        chat[ws.room].push({ chat: newp, id: ws.id, type: "通知" });
                        gamecard[ws.room].redanswer = data.answer;
                        gamecard[ws.room].redremain = data.answer.length;
                    } else {
                        chat[ws.room].push({ chat: gamecard[ws.room].redprompt, id: ws.id, type: "通知" });
                    }
                    gamecard[ws.room].state += 1;
                    clientlist[ws.room].forEach(function (client) {
                        client.send(JSON.stringify({ type: "chat", success: true, chat: chat[ws.room], gamecard: gamecard[ws.room], ifgaming: ifgaming[ws.room], clientlist: clientlisttosend[ws.room] }));
                    });
                    return;
                } else if (gamecard[ws.room].redCount < gamecard[ws.room].blueCount && ws.position == 'B班老師') {
                    if (gamecard[ws.room].blueremain == 0) {
                        var newp = "筆記：" + data.prompt.join(",") + " ";
                        gamecard[ws.room].blueprompt = newp;
                        newp += data.answer.length + "張";
                        chat[ws.room].push({ chat: newp, id: ws.id, type: "通知" });
                        gamecard[ws.room].blueanswer = data.answer;
                        gamecard[ws.room].blueremain = data.answer.length;
                    } else {
                        chat[ws.room].push({ chat: gamecard[ws.room].blueprompt, id: ws.id, type: "通知" });
                    }
                    gamecard[ws.room].state += 1;
                    clientlist[ws.room].forEach(function (client) {
                        client.send(JSON.stringify({ type: "chat", success: true, chat: chat[ws.room], gamecard: gamecard[ws.room], ifgaming: ifgaming[ws.room], clientlist: clientlisttosend[ws.room] }));
                    });
                    return;
                }
            } else if (gamecard[ws.room].state > 3.5 && gamecard[ws.room].state % 2 == 0) {
                if (gamecard[ws.room].redCount < gamecard[ws.room].blueCount && ws.position == 'A班老師') {
                    if (gamecard[ws.room].redremain == 0) {
                        var newp = "筆記：" + data.prompt.join(",") + " ";
                        gamecard[ws.room].redprompt = newp;
                        newp += data.answer.length + "張";
                        chat[ws.room].push({ chat: newp, id: ws.id, type: "通知" });
                        gamecard[ws.room].redanswer = data.answer;
                        gamecard[ws.room].redremain = data.answer.length;
                    } else {
                        chat[ws.room].push({ chat: gamecard[ws.room].redprompt, id: ws.id, type: "通知" });
                    }
                    gamecard[ws.room].state += 1;
                    clientlist[ws.room].forEach(function (client) {
                        client.send(JSON.stringify({ type: "chat", success: true, chat: chat[ws.room], gamecard: gamecard[ws.room], ifgaming: ifgaming[ws.room], clientlist: clientlisttosend[ws.room] }));
                    });
                    return;
                } else if (gamecard[ws.room].redCount > gamecard[ws.room].blueCount && ws.position == 'B班老師' && gamecard[ws.room].blueremain == 0) {
                    if (gamecard[ws.room].blueremain == 0) {
                        var newp = "筆記：" + data.prompt.join(",") + " ";
                        gamecard[ws.room].blueprompt = newp;
                        newp += data.answer.length + "張";
                        chat[ws.room].push({ chat: newp, id: ws.id, type: "通知" });
                        gamecard[ws.room].blueanswer = data.answer;
                        gamecard[ws.room].blueremain = data.answer.length;
                    } else {
                        chat[ws.room].push({ chat: gamecard[ws.room].blueprompt, id: ws.id, type: "通知" });
                    }
                    gamecard[ws.room].state += 1;
                    clientlist[ws.room].forEach(function (client) {
                        client.send(JSON.stringify({ type: "chat", success: true, chat: chat[ws.room], gamecard: gamecard[ws.room], ifgaming: ifgaming[ws.room], clientlist: clientlisttosend[ws.room] }));
                    });
                    return;
                }
            }
            ws.send(JSON.stringify({ type: "chat", success: false, message: "現在不是你的回合" }));
        } else if (data.type == "聊天") {
            if (room.includes(ws.room)) {
                chat[ws.room].push({ chat: data.chat, id: ws.id, type: "聊天" });
                if (ifgaming[ws.room] > 0) {
                    clientlist[ws.room].forEach(function (client) {
                        client.send(JSON.stringify({ type: "chat", success: true, chat: chat[ws.room], gamecard: gamecard[ws.room], ifgaming: ifgaming[ws.room], clientlist: clientlisttosend[ws.room] }));
                    });
                    return;
                }
                if (ifgaming[ws.room] == 0) {
                    clientlist[ws.room].forEach(function (client) {
                        client.send(JSON.stringify({ type: "join", success: true, clientlist: clientlisttosend[ws.room], chat: chat[ws.room], ifnotify: ifnotify[ws.room] }));
                    });
                    return;
                }

            }
            ws.send(JSON.stringify({ type: "index.html", success: false, message: "教室不存在" }));
        } else if (data.type == "答題") {
            if (!room.includes(ws.room)) {
                ws.send(JSON.stringify({ type: "index.html", success: false, message: "教室不存在" }));
                return;
            }
            if (ifgaming[ws.room] == 2) {
                ws.send(JSON.stringify({ type: "testing.html", success: false, message: "考試已結束" }));
                return;
            }
            if (ifgaming[ws.room] == 0) {
                ws.send(JSON.stringify({ type: "waiting.html", success: false, message: "考試還未開始" }));
                return;
            }
            if (gamecard[ws.room].fliped[data.flip]) {
                ws.send(JSON.stringify({ type: "chat", success: false, message: "這張考卷已經翻過了！" }));
                return;
            } else if (data.flip >= 20) {
                ws.send(JSON.stringify({ type: "chat", success: false, message: "這張考卷不存在！" }));
                return;
            }
            if (gamecard[ws.room].state < 3.5 && gamecard[ws.room].state % 2 == 1) {
                if (gamecard[ws.room].redCount > gamecard[ws.room].blueCount && (ws.position == 'A班學生' || ws.position == '學生')) {
                    chat[ws.room].push({ chat: "答題：" + gamecard[ws.room].card[data.flip].split(":")[0], id: ws.id, type: "通知" });
                    gamecard[ws.room].fliped[data.flip] = true;
                    if (gamecard[ws.room].colors[data.flip] == 'red') {
                        gamecard[ws.room].redFliped += 1;
                        if (gamecard[ws.room].redanswer.includes(data.flip)) {
                            gamecard[ws.room].redanswer.filter(item => item != data.flip);
                            gamecard[ws.room].redremain -= 1;
                            if (gamecard[ws.room].redremain <= 0) {
                                gamecard[ws.room].redwrongtimes = 0;
                                gamecard[ws.room].state += 1;
                            }
                            chat[ws.room].push({ chat: "回答正確！", id: clientlist[ws.room].filter(item => item.position == "A班老師")[0].id, type: "通知" });
                            if (gamecard[ws.room].redFliped == gamecard[ws.room].redCount) {
                                ifgaming[ws.room] = 2;
                                chat[ws.room].push({ chat: "A班翻滿" + gamecard[ws.room].redCount + "張考卷，A班獲勝！", id: clientlist[ws.room].filter(item => item.position == "A班老師")[0].id, type: "通知" });
                            }
                        } else {
                            chat[ws.room].push({ chat: "回答錯誤，回合結束！", id: clientlist[ws.room].filter(item => item.position == "A班老師")[0].id, type: "通知" });
                            gamecard[ws.room].state = 4;
                            gamecard[ws.room].redwrongtimes += 1;
                            if (ifgaming[ws.room] != 2 && gamecard[ws.room].redwrongtimes > 1) {
                                chat[ws.room].push({ chat: "連續答錯，翻開正確考卷：" + gamecard[ws.room].card[gamecard[ws.room].redanswer[0]].split(":")[0], id: clientlist[ws.room].filter(item => item.position == "A班老師")[0].id, type: "通知" });
                                gamecard[ws.room].fliped[gamecard[ws.room].redanswer[0]] = true;
                                gamecard[ws.room].redanswer.shift();
                                gamecard[ws.room].redremain -= 1;
                                gamecard[ws.room].redFliped += 1;
                                if (gamecard[ws.room].redremain <= 0) {
                                    gamecard[ws.room].redwrongtimes = 0;
                                }
                                if (gamecard[ws.room].redFliped == gamecard[ws.room].redCount) {
                                    ifgaming[ws.room] = 2;
                                    chat[ws.room].push({ chat: "A班翻滿" + gamecard[ws.room].redCount + "張考卷，A班獲勝！", id: clientlist[ws.room].filter(item => item.position == "A班老師")[0].id, type: "通知" });
                                }
                            }
                        }
                        if (ifgaming[ws.room] != 2 && gamecard[ws.room].state == 4) {
                            if (gamecard[ws.room].bluewrongtimes > 0) {
                                gamecard[ws.room].state += 1;
                                chat[ws.room].push({ chat: "需回答上一回合未完成題目，" + gamecard[ws.room].blueprompt+gamecard[ws.room].blueremain+"張", id: clientlist[ws.room].filter(item => item.position == "B班老師")[0].id, type: "通知" });
                            }
                        }
                        clientlist[ws.room].forEach(function (client) {
                            client.send(JSON.stringify({ type: "chat", success: true, chat: chat[ws.room], gamecard: gamecard[ws.room], ifgaming: ifgaming[ws.room], clientlist: clientlisttosend[ws.room] }));
                        });
                        return;
                    } else {
                        gamecard[ws.room].redwrongtimes += 1;
                        if (gamecard[ws.room].colors[data.flip] == 'blue') {
                            chat[ws.room].push({ chat: "回答錯誤，回合結束！", id: clientlist[ws.room].filter(item => item.position == "A班老師")[0].id, type: "通知" });
                            gamecard[ws.room].blueFliped += 1;
                            gamecard[ws.room].state = 4;
                            if (gamecard[ws.room].blueFliped == gamecard[ws.room].blueCount) {
                                ifgaming[ws.room] = 2;
                                chat[ws.room].push({ chat: "B班翻滿" + gamecard[ws.room].blueCount + "張考卷，B班獲勝！", id: clientlist[ws.room].filter(item => item.position == "B班老師")[0].id, type: "通知" });
                            }
                            if (ifgaming[ws.room] != 2 && gamecard[ws.room].bluewrongtimes > 0 && gamecard[ws.room].blueanswer.includes(data.flip)) {
                                gamecard[ws.room].blueanswer.shift();
                                gamecard[ws.room].blueremain -= 1;
                                if (gamecard[ws.room].blueremain <= 0) {
                                    gamecard[ws.room].bluewrongtimes = 0;
                                    chat[ws.room].push({ chat: "翻到B班上一回合未翻完的考卷，由於B班上一回合僅剩這張考卷未翻，下一回合B班老師可重新提供筆記", id: clientlist[ws.room].filter(item => item.position == "B班老師")[0].id, type: "通知" });
                                } else {
                                    chat[ws.room].push({ chat: "翻到B班上一回合未翻完的考卷，B班下回合可少回答一題", id: clientlist[ws.room].filter(item => item.position == "B班老師")[0].id, type: "通知" });
                                }
                            }
                            if (ifgaming[ws.room] != 2 && gamecard[ws.room].redwrongtimes > 1) {
                                chat[ws.room].push({ chat: "連續答錯，翻開正確考卷：" + gamecard[ws.room].card[gamecard[ws.room].redanswer[0]].split(":")[0], id: clientlist[ws.room].filter(item => item.position == "A班老師")[0].id, type: "通知" });
                                gamecard[ws.room].fliped[gamecard[ws.room].redanswer[0]] = true;
                                gamecard[ws.room].redanswer.shift();
                                gamecard[ws.room].redremain -= 1;
                                gamecard[ws.room].redFliped += 1;
                                if (gamecard[ws.room].redremain <= 0) {
                                    gamecard[ws.room].redwrongtimes = 0;
                                }
                                if (gamecard[ws.room].redFliped == gamecard[ws.room].redCount) {
                                    ifgaming[ws.room] = 2;
                                    chat[ws.room].push({ chat: "A班翻滿" + gamecard[ws.room].redCount + "張考卷，A班獲勝！", id: clientlist[ws.room].filter(item => item.position == "A班老師")[0].id, type: "通知" });
                                }
                            }
                            if (ifgaming[ws.room] != 2 && gamecard[ws.room].state == 4) {
                                if (gamecard[ws.room].bluewrongtimes > 0) {
                                    gamecard[ws.room].state += 1;
                                    chat[ws.room].push({ chat: "需回答上一回合未完成題目，" + gamecard[ws.room].blueprompt+gamecard[ws.room].blueremain+"張", id: clientlist[ws.room].filter(item => item.position == "B班老師")[0].id, type: "通知" });
                                }
                            }
                            clientlist[ws.room].forEach(function (client) {
                                client.send(JSON.stringify({ type: "chat", success: true, chat: chat[ws.room], gamecard: gamecard[ws.room], ifgaming: ifgaming[ws.room], clientlist: clientlisttosend[ws.room] }));
                            });
                            return;
                        } else if (gamecard[ws.room].colors[data.flip] == 'white') {
                            chat[ws.room].push({ chat: "回答錯誤，回合結束！", id: clientlist[ws.room].filter(item => item.position == "A班老師")[0].id, type: "通知" });
                            if (ifgaming[ws.room] != 2 && gamecard[ws.room].redwrongtimes > 1) {
                                chat[ws.room].push({ chat: "連續答錯，翻開正確考卷：" + gamecard[ws.room].card[gamecard[ws.room].redanswer[0]].split(":")[0], id: clientlist[ws.room].filter(item => item.position == "A班老師")[0].id, type: "通知" });
                                gamecard[ws.room].fliped[gamecard[ws.room].redanswer[0]] = true;
                                gamecard[ws.room].redanswer.shift();
                                gamecard[ws.room].redremain -= 1;
                                gamecard[ws.room].redFliped += 1;
                                if (gamecard[ws.room].redremain <= 0) {
                                    gamecard[ws.room].redwrongtimes = 0;
                                }
                                if (gamecard[ws.room].redFliped == gamecard[ws.room].redCount) {
                                    ifgaming[ws.room] = 2;
                                    chat[ws.room].push({ chat: "A班翻滿" + gamecard[ws.room].redCount + "張考卷，A班獲勝！", id: clientlist[ws.room].filter(item => item.position == "A班老師")[0].id, type: "通知" });
                                }
                            }
                            gamecard[ws.room].nowFliped = data.flip;
                            if (ifgaming[ws.room] != 2) {
                                gamecard[ws.room].state = 3.5;
                                shuffleArray(question);
                                chat[ws.room].push({ chat: "課程小考：" + question[0].q + "(A)" + question[0].A + "(B)" + question[0].B + "(C)" + question[0].C + "(D)" + question[0].D, id: clientlist[ws.room].filter(item => item.position == "A班老師")[0].id, type: "通知" });
                                gamecard[ws.room].question = question[0];
                                gamecard[ws.room].questionid = ws.id;
                            }
                            clientlist[ws.room].forEach(function (client) {
                                client.send(JSON.stringify({ type: "chat", success: true, chat: chat[ws.room], gamecard: gamecard[ws.room], ifgaming: ifgaming[ws.room], clientlist: clientlisttosend[ws.room] }));
                            });
                            ws.send(JSON.stringify({ type: "question", success: true, question: question[0] }));
                            return;
                        }
                    }
                } else if (gamecard[ws.room].redCount < gamecard[ws.room].blueCount && (ws.position == 'B班學生' || ws.position == '學生')) {
                    chat[ws.room].push({ chat: "答題：" + gamecard[ws.room].card[data.flip].split(":")[0], id: ws.id, type: "通知" });
                    gamecard[ws.room].fliped[data.flip] = true;
                    if (gamecard[ws.room].colors[data.flip] == 'blue') {
                        gamecard[ws.room].blueFliped += 1;
                        if (gamecard[ws.room].blueanswer.includes(data.flip)) {
                            gamecard[ws.room].blueanswer.filter(item => item != data.flip);
                            gamecard[ws.room].blueremain -= 1;
                            if (gamecard[ws.room].blueremain <= 0) {
                                gamecard[ws.room].bluewrongtimes = 0;
                                gamecard[ws.room].state += 1;
                            }
                            chat[ws.room].push({ chat: "回答正確！", id: clientlist[ws.room].filter(item => item.position == "B班老師")[0].id, type: "通知" });
                            if (gamecard[ws.room].blueFliped == gamecard[ws.room].blueCount) {
                                ifgaming[ws.room] = 2;
                                chat[ws.room].push({ chat: "B班翻滿" + gamecard[ws.room].blueCount + "張考卷，B班獲勝！", id: clientlist[ws.room].filter(item => item.position == "B班老師")[0].id, type: "通知" });
                            }
                        } else {
                            chat[ws.room].push({ chat: "回答錯誤，回合結束！", id: clientlist[ws.room].filter(item => item.position == "B班老師")[0].id, type: "通知" });
                            gamecard[ws.room].state = 4;
                            gamecard[ws.room].bluewrongtimes += 1;
                            if (ifgaming[ws.room] != 2 && gamecard[ws.room].bluewrongtimes > 1) {
                                chat[ws.room].push({ chat: "連續答錯，翻開正確考卷：" + gamecard[ws.room].card[gamecard[ws.room].blueanswer[0]].split(":")[0], id: clientlist[ws.room].filter(item => item.position == "B班老師")[0].id, type: "通知" });
                                gamecard[ws.room].fliped[gamecard[ws.room].blueanswer[0]] = true;
                                gamecard[ws.room].blueanswer.shift();
                                gamecard[ws.room].blueremain -= 1;
                                gamecard[ws.room].blueFliped += 1;
                                if (gamecard[ws.room].blueremain <= 0) {
                                    gamecard[ws.room].bluewrongtimes = 0;
                                }
                                if (gamecard[ws.room].blueFliped == gamecard[ws.room].blueCount) {
                                    ifgaming[ws.room] = 2;
                                    chat[ws.room].push({ chat: "B班翻滿" + gamecard[ws.room].blueCount + "張考卷，B班獲勝！", id: clientlist[ws.room].filter(item => item.position == "B班老師")[0].id, type: "通知" });
                                }
                            }
                        }
                        if (ifgaming[ws.room] != 2 && gamecard[ws.room].state == 4) {
                            if (gamecard[ws.room].redwrongtimes > 0) {
                                gamecard[ws.room].state += 1;
                                chat[ws.room].push({ chat: "需回答上一回合未完成題目，" + gamecard[ws.room].redprompt+gamecard[ws.room].redremain+"張", id: clientlist[ws.room].filter(item => item.position == "A班老師")[0].id, type: "通知" });
                            }
                        }
                        clientlist[ws.room].forEach(function (client) {
                            client.send(JSON.stringify({ type: "chat", success: true, chat: chat[ws.room], gamecard: gamecard[ws.room], ifgaming: ifgaming[ws.room], clientlist: clientlisttosend[ws.room] }));
                        });
                        return;
                    } else {
                        gamecard[ws.room].bluewrongtimes += 1;
                        if (gamecard[ws.room].colors[data.flip] == 'red') {
                            chat[ws.room].push({ chat: "回答錯誤，回合結束！", id: clientlist[ws.room].filter(item => item.position == "B班老師")[0].id, type: "通知" });
                            gamecard[ws.room].redFliped += 1;
                            gamecard[ws.room].state = 4;
                            if (gamecard[ws.room].redFliped == gamecard[ws.room].redCount) {
                                ifgaming[ws.room] = 2;
                                chat[ws.room].push({ chat: "A班翻滿" + gamecard[ws.room].redCount + "張考卷，A班獲勝！", id: clientlist[ws.room].filter(item => item.position == "A班老師")[0].id, type: "通知" });
                            }
                            if (ifgaming[ws.room] != 2 && gamecard[ws.room].redwrongtimes > 0 && gamecard[ws.room].redanswer.includes(data.flip)) {
                                gamecard[ws.room].redanswer.shift();
                                gamecard[ws.room].redremain -= 1;
                                if (gamecard[ws.room].redremain <= 0) {
                                    gamecard[ws.room].redwrongtimes = 0;
                                    chat[ws.room].push({ chat: "翻到A班上一回合未翻完的考卷，由於A班上一回合僅剩這張考卷未翻，下一回合A班老師可重新提供筆記", id: clientlist[ws.room].filter(item => item.position == "A班老師")[0].id, type: "通知" });
                                } else {
                                    chat[ws.room].push({ chat: "翻到A班上一回合未翻完的考卷，A班下回合可少回答一題", id: clientlist[ws.room].filter(item => item.position == "A班老師")[0].id, type: "通知" });
                                }
                            }
                            if (ifgaming[ws.room] != 2 && gamecard[ws.room].bluewrongtimes > 1) {
                                chat[ws.room].push({ chat: "連續答錯，翻開正確考卷：" + gamecard[ws.room].card[gamecard[ws.room].blueanswer[0]].split(":")[0], id: clientlist[ws.room].filter(item => item.position == "B班老師")[0].id, type: "通知" });
                                gamecard[ws.room].fliped[gamecard[ws.room].blueanswer[0]] = true;
                                gamecard[ws.room].blueanswer.shift();
                                gamecard[ws.room].blueremain -= 1;
                                gamecard[ws.room].blueFliped += 1;
                                if (gamecard[ws.room].blueremain <= 0) {
                                    gamecard[ws.room].bluewrongtimes = 0;
                                }
                                if (gamecard[ws.room].blueFliped == gamecard[ws.room].blueCount) {
                                    ifgaming[ws.room] = 2;
                                    chat[ws.room].push({ chat: "B班翻滿" + gamecard[ws.room].blueCount + "張考卷，B班獲勝！", id: clientlist[ws.room].filter(item => item.position == "B班老師")[0].id, type: "通知" });
                                }
                            }
                            if (ifgaming[ws.room] != 2 && gamecard[ws.room].state == 4) {
                                if (gamecard[ws.room].redwrongtimes > 0) {
                                    gamecard[ws.room].state += 1;
                                    chat[ws.room].push({ chat: "需回答上一回合未完成題目，" + gamecard[ws.room].redprompt+gamecard[ws.room].redremain+"張", id: clientlist[ws.room].filter(item => item.position == "A班老師")[0].id, type: "通知" });
                                }
                            }
                            clientlist[ws.room].forEach(function (client) {
                                client.send(JSON.stringify({ type: "chat", success: true, chat: chat[ws.room], gamecard: gamecard[ws.room], ifgaming: ifgaming[ws.room], clientlist: clientlisttosend[ws.room] }));
                            });
                            return;
                        } else if (gamecard[ws.room].colors[data.flip] == 'white') {
                            chat[ws.room].push({ chat: "回答錯誤，回合結束！", id: clientlist[ws.room].filter(item => item.position == "B班老師")[0].id, type: "通知" });
                            if (ifgaming[ws.room] != 2 && gamecard[ws.room].bluewrongtimes > 1) {
                                chat[ws.room].push({ chat: "連續答錯，翻開正確考卷：" + gamecard[ws.room].card[gamecard[ws.room].blueanswer[0]].split(":")[0], id: clientlist[ws.room].filter(item => item.position == "B班老師")[0].id, type: "通知" });
                                gamecard[ws.room].fliped[gamecard[ws.room].blueanswer[0]] = true;
                                gamecard[ws.room].blueanswer.shift();
                                gamecard[ws.room].blueremain -= 1;
                                gamecard[ws.room].blueFliped += 1;
                                if (gamecard[ws.room].blueremain <= 0) {
                                    gamecard[ws.room].bluewrongtimes = 0;
                                }
                                if (gamecard[ws.room].blueFliped == gamecard[ws.room].blueCount) {
                                    ifgaming[ws.room] = 2;
                                    chat[ws.room].push({ chat: "B班翻滿" + gamecard[ws.room].blueCount + "張考卷，B班獲勝！", id: clientlist[ws.room].filter(item => item.position == "B班老師")[0].id, type: "通知" });
                                }
                            }
                            gamecard[ws.room].nowFliped = data.flip;
                            if (ifgaming[ws.room] != 2) {
                                gamecard[ws.room].state = 3.5;
                                shuffleArray(question);
                                chat[ws.room].push({ chat: "課程小考：" + question[0].q + "(A)" + question[0].A + "(B)" + question[0].B + "(C)" + question[0].C + "(D)" + question[0].D, id: clientlist[ws.room].filter(item => item.position == "A班老師")[0].id, type: "通知" });
                                gamecard[ws.room].question = question[0];
                                gamecard[ws.room].questionid = ws.id;
                            }
                            clientlist[ws.room].forEach(function (client) {
                                client.send(JSON.stringify({ type: "chat", success: true, chat: chat[ws.room], gamecard: gamecard[ws.room], ifgaming: ifgaming[ws.room], clientlist: clientlisttosend[ws.room] }));
                            });
                            ws.send(JSON.stringify({ type: "question", success: true, question: question[0] }));
                            return;
                        }
                    }
                }
            } else if (gamecard[ws.room].state > 3.5 && gamecard[ws.room].state % 2 == 1) {
                if (gamecard[ws.room].redCount < gamecard[ws.room].blueCount && (ws.position == 'A班學生' || ws.position == '學生')) {
                    chat[ws.room].push({ chat: "答題：" + gamecard[ws.room].card[data.flip].split(":")[0], id: ws.id, type: "通知" });
                    gamecard[ws.room].fliped[data.flip] = true;
                    if (gamecard[ws.room].colors[data.flip] == 'red') {
                        gamecard[ws.room].redFliped += 1;
                        if (gamecard[ws.room].redanswer.includes(data.flip)) {
                            gamecard[ws.room].redanswer.filter(item => item != data.flip);
                            gamecard[ws.room].redremain -= 1;
                            if (gamecard[ws.room].redremain <= 0) {
                                gamecard[ws.room].redwrongtimes = 0;
                                if (gamecard[ws.room].state != 7) {
                                    gamecard[ws.room].state += 1;
                                } else {
                                    gamecard[ws.room].state = 0;
                                }
                            }
                            chat[ws.room].push({ chat: "回答正確！", id: clientlist[ws.room].filter(item => item.position == "A班老師")[0].id, type: "通知" });
                            if (gamecard[ws.room].redFliped == gamecard[ws.room].redCount) {
                                ifgaming[ws.room] = 2;
                                chat[ws.room].push({ chat: "A班翻滿" + gamecard[ws.room].redCount + "張考卷，A班獲勝！", id: clientlist[ws.room].filter(item => item.position == "A班老師")[0].id, type: "通知" });
                            }
                        } else {
                            chat[ws.room].push({ chat: "回答錯誤，回合結束！", id: clientlist[ws.room].filter(item => item.position == "A班老師")[0].id, type: "通知" });
                            gamecard[ws.room].state = 0;
                            gamecard[ws.room].redwrongtimes += 1;
                            if (ifgaming[ws.room] != 2 && gamecard[ws.room].redwrongtimes > 1) {
                                chat[ws.room].push({ chat: "連續答錯，翻開正確考卷：" + gamecard[ws.room].card[gamecard[ws.room].redanswer[0]].split(":")[0], id: clientlist[ws.room].filter(item => item.position == "A班老師")[0].id, type: "通知" });
                                gamecard[ws.room].fliped[gamecard[ws.room].redanswer[0]] = true;
                                gamecard[ws.room].redanswer.shift();
                                gamecard[ws.room].redremain -= 1;
                                gamecard[ws.room].redFliped += 1;
                                if (gamecard[ws.room].redremain <= 0) {
                                    gamecard[ws.room].redwrongtimes = 0;
                                }
                                if (gamecard[ws.room].redFliped == gamecard[ws.room].redCount) {
                                    ifgaming[ws.room] = 2;
                                    chat[ws.room].push({ chat: "A班翻滿" + gamecard[ws.room].redCount + "張考卷，A班獲勝！", id: clientlist[ws.room].filter(item => item.position == "A班老師")[0].id, type: "通知" });
                                }
                            }
                        }
                        if (ifgaming[ws.room] != 2 && gamecard[ws.room].state == 0) {
                            if (gamecard[ws.room].bluewrongtimes > 0) {
                                gamecard[ws.room].state += 1;
                                chat[ws.room].push({ chat: "需回答上一回合未完成題目，" + gamecard[ws.room].blueprompt+gamecard[ws.room].blueremain+"張", id: clientlist[ws.room].filter(item => item.position == "B班老師")[0].id, type: "通知" });
                            }
                        }
                        clientlist[ws.room].forEach(function (client) {
                            client.send(JSON.stringify({ type: "chat", success: true, chat: chat[ws.room], gamecard: gamecard[ws.room], ifgaming: ifgaming[ws.room], clientlist: clientlisttosend[ws.room] }));
                        });
                        return;
                    } else {
                        gamecard[ws.room].redwrongtimes += 1;
                        if (gamecard[ws.room].colors[data.flip] == 'blue') {
                            chat[ws.room].push({ chat: "回答錯誤，回合結束！", id: clientlist[ws.room].filter(item => item.position == "A班老師")[0].id, type: "通知" });
                            gamecard[ws.room].blueFliped += 1;
                            gamecard[ws.room].state = 0;
                            if (gamecard[ws.room].blueFliped == gamecard[ws.room].blueCount) {
                                ifgaming[ws.room] = 2;
                                chat[ws.room].push({ chat: "B班翻滿" + gamecard[ws.room].blueCount + "張考卷，B班獲勝！", id: clientlist[ws.room].filter(item => item.position == "B班老師")[0].id, type: "通知" });
                            }
                            if (ifgaming[ws.room] != 2 && gamecard[ws.room].bluewrongtimes > 0 && gamecard[ws.room].blueanswer.includes(data.flip)) {
                                gamecard[ws.room].blueanswer.shift();
                                gamecard[ws.room].blueremain -= 1;
                                if (gamecard[ws.room].blueremain <= 0) {
                                    gamecard[ws.room].bluewrongtimes = 0;
                                    chat[ws.room].push({ chat: "翻到B班上一回合未翻完的考卷，由於B班上一回合僅剩這張考卷未翻，下一回合B班老師可重新提供筆記", id: clientlist[ws.room].filter(item => item.position == "B班老師")[0].id, type: "通知" });
                                } else {
                                    chat[ws.room].push({ chat: "翻到B班上一回合未翻完的考卷，B班下回合可少回答一題", id: clientlist[ws.room].filter(item => item.position == "B班老師")[0].id, type: "通知" });
                                }
                            }
                            if (ifgaming[ws.room] != 2 && gamecard[ws.room].redwrongtimes > 1) {
                                chat[ws.room].push({ chat: "連續答錯，翻開正確考卷：" + gamecard[ws.room].card[gamecard[ws.room].redanswer[0]].split(":")[0], id: clientlist[ws.room].filter(item => item.position == "A班老師")[0].id, type: "通知" });
                                gamecard[ws.room].fliped[gamecard[ws.room].redanswer[0]] = true;
                                gamecard[ws.room].redanswer.shift();
                                gamecard[ws.room].redremain -= 1;
                                gamecard[ws.room].redFliped += 1;
                                if (gamecard[ws.room].redremain <= 0) {
                                    gamecard[ws.room].redwrongtimes = 0;
                                }
                                if (gamecard[ws.room].redFliped == gamecard[ws.room].redCount) {
                                    ifgaming[ws.room] = 2;
                                    chat[ws.room].push({ chat: "A班翻滿" + gamecard[ws.room].redCount + "張考卷，A班獲勝！", id: clientlist[ws.room].filter(item => item.position == "A班老師")[0].id, type: "通知" });
                                }
                            }
                            if (ifgaming[ws.room] != 2 && gamecard[ws.room].state == 0) {
                                if (gamecard[ws.room].bluewrongtimes > 0) {
                                    gamecard[ws.room].state += 1;
                                    chat[ws.room].push({ chat: "需回答上一回合未完成題目，" + gamecard[ws.room].blueprompt+gamecard[ws.room].blueremain+"張", id: clientlist[ws.room].filter(item => item.position == "B班老師")[0].id, type: "通知" });
                                }
                            }
                            clientlist[ws.room].forEach(function (client) {
                                client.send(JSON.stringify({ type: "chat", success: true, chat: chat[ws.room], gamecard: gamecard[ws.room], ifgaming: ifgaming[ws.room], clientlist: clientlisttosend[ws.room] }));
                            });
                            return;
                        } else if (gamecard[ws.room].colors[data.flip] == 'white') {
                            chat[ws.room].push({ chat: "回答錯誤，回合結束！", id: clientlist[ws.room].filter(item => item.position == "A班老師")[0].id, type: "通知" });
                            if (ifgaming[ws.room] != 2 && gamecard[ws.room].redwrongtimes > 1) {
                                chat[ws.room].push({ chat: "連續答錯，翻開正確考卷：" + gamecard[ws.room].card[gamecard[ws.room].redanswer[0]].split(":")[0], id: clientlist[ws.room].filter(item => item.position == "A班老師")[0].id, type: "通知" });
                                gamecard[ws.room].fliped[gamecard[ws.room].redanswer[0]] = true;
                                gamecard[ws.room].redanswer.shift();
                                gamecard[ws.room].redremain -= 1;
                                gamecard[ws.room].redFliped += 1;
                                if (gamecard[ws.room].redremain <= 0) {
                                    gamecard[ws.room].redwrongtimes = 0;
                                }
                                if (gamecard[ws.room].redFliped == gamecard[ws.room].redCount) {
                                    ifgaming[ws.room] = 2;
                                    chat[ws.room].push({ chat: "A班翻滿" + gamecard[ws.room].redCount + "張考卷，A班獲勝！", id: clientlist[ws.room].filter(item => item.position == "A班老師")[0].id, type: "通知" });
                                }
                            }
                            gamecard[ws.room].nowFliped = data.flip;
                            if (ifgaming[ws.room] != 2) {
                                gamecard[ws.room].state = 7.5;
                                shuffleArray(question);
                                chat[ws.room].push({ chat: "課程小考：" + question[0].q + "(A)" + question[0].A + "(B)" + question[0].B + "(C)" + question[0].C + "(D)" + question[0].D, id: clientlist[ws.room].filter(item => item.position == "A班老師")[0].id, type: "通知" });
                                gamecard[ws.room].question = question[0];
                                gamecard[ws.room].questionid = ws.id;
                            }
                            clientlist[ws.room].forEach(function (client) {
                                client.send(JSON.stringify({ type: "chat", success: true, chat: chat[ws.room], gamecard: gamecard[ws.room], ifgaming: ifgaming[ws.room], clientlist: clientlisttosend[ws.room] }));
                            });
                            ws.send(JSON.stringify({ type: "question", success: true, question: question[0] }));
                            return;
                        }
                    }
                } else if (gamecard[ws.room].redCount > gamecard[ws.room].blueCount && (ws.position == 'B班學生' || ws.position == '學生')) {
                    chat[ws.room].push({ chat: "答題：" + gamecard[ws.room].card[data.flip].split(":")[0], id: ws.id, type: "通知" });
                    gamecard[ws.room].fliped[data.flip] = true;
                    if (gamecard[ws.room].colors[data.flip] == 'blue') {
                        gamecard[ws.room].blueFliped += 1;
                        if (gamecard[ws.room].blueanswer.includes(data.flip)) {
                            gamecard[ws.room].blueanswer.filter(item => item != data.flip);
                            gamecard[ws.room].blueremain -= 1;
                            if (gamecard[ws.room].blueremain <= 0) {
                                gamecard[ws.room].bluewrongtimes = 0;
                                if (gamecard[ws.room].state != 7) {
                                    gamecard[ws.room].state += 1;
                                } else {
                                    gamecard[ws.room].state = 0;
                                }
                            }
                            chat[ws.room].push({ chat: "回答正確！", id: clientlist[ws.room].filter(item => item.position == "B班老師")[0].id, type: "通知" });
                            if (gamecard[ws.room].blueFliped == gamecard[ws.room].blueCount) {
                                ifgaming[ws.room] = 2;
                                chat[ws.room].push({ chat: "B班翻滿" + gamecard[ws.room].blueCount + "張考卷，B班獲勝！", id: clientlist[ws.room].filter(item => item.position == "B班老師")[0].id, type: "通知" });
                            }
                        } else {
                            chat[ws.room].push({ chat: "回答錯誤，回合結束！", id: clientlist[ws.room].filter(item => item.position == "B班老師")[0].id, type: "通知" });
                            gamecard[ws.room].state = 0;
                            gamecard[ws.room].bluewrongtimes += 1;
                            if (ifgaming[ws.room] != 2 && gamecard[ws.room].bluewrongtimes > 1) {
                                chat[ws.room].push({ chat: "連續答錯，翻開正確考卷：" + gamecard[ws.room].card[gamecard[ws.room].blueanswer[0]].split(":")[0], id: clientlist[ws.room].filter(item => item.position == "B班老師")[0].id, type: "通知" });
                                gamecard[ws.room].fliped[gamecard[ws.room].blueanswer[0]] = true;
                                gamecard[ws.room].blueanswer.shift();
                                gamecard[ws.room].blueremain -= 1;
                                gamecard[ws.room].blueFliped += 1;
                                if (gamecard[ws.room].blueremain <= 0) {
                                    gamecard[ws.room].bluewrongtimes = 0;
                                }
                                if (gamecard[ws.room].blueFliped == gamecard[ws.room].blueCount) {
                                    ifgaming[ws.room] = 2;
                                    chat[ws.room].push({ chat: "B班翻滿" + gamecard[ws.room].blueCount + "張考卷，B班獲勝！", id: clientlist[ws.room].filter(item => item.position == "B班老師")[0].id, type: "通知" });
                                }
                            }
                        }
                        if (ifgaming[ws.room] != 2 && gamecard[ws.room].state == 0) {
                            if (gamecard[ws.room].redwrongtimes > 0) {
                                gamecard[ws.room].state += 1;
                                chat[ws.room].push({ chat: "需回答上一回合未完成題目，" + gamecard[ws.room].redprompt+gamecard[ws.room].redremain+"張", id: clientlist[ws.room].filter(item => item.position == "A班老師")[0].id, type: "通知" });
                            }
                        }
                        clientlist[ws.room].forEach(function (client) {
                            client.send(JSON.stringify({ type: "chat", success: true, chat: chat[ws.room], gamecard: gamecard[ws.room], ifgaming: ifgaming[ws.room], clientlist: clientlisttosend[ws.room] }));
                        });
                        return;
                    } else {
                        gamecard[ws.room].bluewrongtimes += 1;
                        if (gamecard[ws.room].colors[data.flip] == 'red') {
                            chat[ws.room].push({ chat: "回答錯誤，回合結束！", id: clientlist[ws.room].filter(item => item.position == "B班老師")[0].id, type: "通知" });
                            gamecard[ws.room].redFliped += 1;
                            gamecard[ws.room].state = 0;
                            if (ifgaming[ws.room] != 2 && gamecard[ws.room].redwrongtimes > 0 && gamecard[ws.room].redanswer.includes(data.flip)) {
                                gamecard[ws.room].redanswer.shift();
                                gamecard[ws.room].redremain -= 1;
                                if (gamecard[ws.room].redremain <= 0) {
                                    gamecard[ws.room].redwrongtimes = 0;
                                    chat[ws.room].push({ chat: "翻到A班上一回合未翻完的考卷，由於A班上一回合僅剩這張考卷未翻，下一回合A班老師可重新提供筆記", id: clientlist[ws.room].filter(item => item.position == "A班老師")[0].id, type: "通知" });
                                } else {
                                    chat[ws.room].push({ chat: "翻到A班上一回合未翻完的考卷，A班下回合可少回答一題", id: clientlist[ws.room].filter(item => item.position == "A班老師")[0].id, type: "通知" });
                                }
                            }
                            if (ifgaming[ws.room] != 2 && gamecard[ws.room].bluewrongtimes > 1) {
                                chat[ws.room].push({ chat: "連續答錯，翻開正確考卷：" + gamecard[ws.room].card[gamecard[ws.room].blueanswer[0]].split(":")[0], id: clientlist[ws.room].filter(item => item.position == "B班老師")[0].id, type: "通知" });
                                gamecard[ws.room].fliped[gamecard[ws.room].blueanswer[0]] = true;
                                gamecard[ws.room].blueanswer.shift();
                                gamecard[ws.room].blueremain -= 1;
                                gamecard[ws.room].blueFliped += 1;
                                if (gamecard[ws.room].blueremain <= 0) {
                                    gamecard[ws.room].bluewrongtimes = 0;
                                }
                                if (gamecard[ws.room].blueFliped == gamecard[ws.room].blueCount) {
                                    ifgaming[ws.room] = 2;
                                    chat[ws.room].push({ chat: "B班翻滿" + gamecard[ws.room].blueCount + "張考卷，B班獲勝！", id: clientlist[ws.room].filter(item => item.position == "B班老師")[0].id, type: "通知" });
                                }
                            }
                            if (ifgaming[ws.room] != 2 && gamecard[ws.room].state == 0) {
                                if (gamecard[ws.room].redwrongtimes > 0) {
                                    gamecard[ws.room].state += 1;
                                    chat[ws.room].push({ chat: "需回答上一回合未完成題目，" + gamecard[ws.room].redprompt+gamecard[ws.room].redremain+"張", id: clientlist[ws.room].filter(item => item.position == "A班老師")[0].id, type: "通知" });
                                }
                            }
                            clientlist[ws.room].forEach(function (client) {
                                client.send(JSON.stringify({ type: "chat", success: true, chat: chat[ws.room], gamecard: gamecard[ws.room], ifgaming: ifgaming[ws.room], clientlist: clientlisttosend[ws.room] }));
                            });
                            return;
                        } else if (gamecard[ws.room].colors[data.flip] == 'white') {
                            chat[ws.room].push({ chat: "回答錯誤，回合結束！", id: clientlist[ws.room].filter(item => item.position == "B班老師")[0].id, type: "通知" });
                            if (ifgaming[ws.room] != 2 && gamecard[ws.room].bluewrongtimes > 1) {
                                chat[ws.room].push({ chat: "連續答錯，翻開正確考卷：" + gamecard[ws.room].card[gamecard[ws.room].blueanswer[0]].split(":")[0], id: clientlist[ws.room].filter(item => item.position == "B班老師")[0].id, type: "通知" });
                                gamecard[ws.room].fliped[gamecard[ws.room].blueanswer[0]] = true;
                                gamecard[ws.room].blueanswer.shift();
                                gamecard[ws.room].blueremain -= 1;
                                gamecard[ws.room].blueFliped += 1;
                                if (gamecard[ws.room].blueremain <= 0) {
                                    gamecard[ws.room].bluewrongtimes = 0;
                                }
                                if (gamecard[ws.room].blueFliped == gamecard[ws.room].blueCount) {
                                    ifgaming[ws.room] = 2;
                                    chat[ws.room].push({ chat: "B班翻滿" + gamecard[ws.room].blueCount + "張考卷，B班獲勝！", id: clientlist[ws.room].filter(item => item.position == "B班老師")[0].id, type: "通知" });
                                }
                            }
                            gamecard[ws.room].nowFliped = data.flip;
                            if (ifgaming[ws.room] != 2) {
                                gamecard[ws.room].state = 7.5;
                                shuffleArray(question);
                                chat[ws.room].push({ chat: "課程小考：" + question[0].q + "(A)" + question[0].A + "(B)" + question[0].B + "(C)" + question[0].C + "(D)" + question[0].D, id: clientlist[ws.room].filter(item => item.position == "A班老師")[0].id, type: "通知" });
                                gamecard[ws.room].question = question[0];
                                gamecard[ws.room].questionid = ws.id;
                                clientlist[ws.room].forEach(function (client) {
                                    client.send(JSON.stringify({ type: "chat", success: true, chat: chat[ws.room], gamecard: gamecard[ws.room], ifgaming: ifgaming[ws.room], clientlist: clientlisttosend[ws.room] }));
                                });
                            }
                            ws.send(JSON.stringify({ type: "question", success: true, question: question[0] }));
                            return;
                        }
                    }
                }
            }
            ws.send(JSON.stringify({ type: "chat", success: false, message: "現在不是你的回合" }));

        } else if (data.type == "回答") {
            if (!room.includes(ws.room)) {
                ws.send(JSON.stringify({ type: "index.html", success: false, message: "教室不存在" }));
                return;
            }
            if (ifgaming[ws.room] == 2) {
                ws.send(JSON.stringify({ type: "testing.html", success: false, message: "考試已結束" }));
                return;
            }
            if (ifgaming[ws.room] == 0) {
                ws.send(JSON.stringify({ type: "waiting.html", success: false, message: "考試還未開始" }));
                return;
            }
            if (gamecard[ws.room].state == 3.5) {
                if (gamecard[ws.room].questionid == ws.id) {
                    chat[ws.room].push({ chat: "答題：" + data.answer, id: ws.id, type: "通知" });
                    if (gamecard[ws.room].question.answer == data.answer) {
                        if (gamecard[ws.room].redCount > gamecard[ws.room].blueCount) {
                            chat[ws.room].push({ chat: "回答正確，該卷變成A卷！", id: clientlist[ws.room].filter(item => item.position == "A班老師")[0].id, type: "通知" });
                            gamecard[ws.room].redFliped += 1;
                            gamecard[ws.room].colors[gamecard[ws.room].nowFliped] = "red";
                            if (gamecard[ws.room].redFliped == gamecard[ws.room].redCount) {
                                ifgaming[ws.room] = 2;
                                chat[ws.room].push({ chat: "A班翻滿" + gamecard[ws.room].redCount + "張考卷，A班獲勝！", id: clientlist[ws.room].filter(item => item.position == "A班老師")[0].id, type: "通知" });
                            }
                            if (ifgaming[ws.room] != 2 && gamecard[ws.room].bluewrongtimes > 0) {
                                gamecard[ws.room].state = 5;
                                chat[ws.room].push({ chat: "需回答一回合未完成題目，" + gamecard[ws.room].blueprompt+gamecard[ws.room].blueremain+"張", id: clientlist[ws.room].filter(item => item.position == "B班老師")[0].id, type: "通知" });
                            } else {
                                gamecard[ws.room].state = 4;
                            }
                        } else {
                            chat[ws.room].push({ chat: "回答正確，該卷變成B卷！", id: clientlist[ws.room].filter(item => item.position == "B班老師")[0].id, type: "通知" });
                            gamecard[ws.room].blueFliped += 1;
                            gamecard[ws.room].colors[gamecard[ws.room].nowFliped] = "blue";
                            if (gamecard[ws.room].blueFliped == gamecard[ws.room].blueCount) {
                                ifgaming[ws.room] = 2;
                                chat[ws.room].push({ chat: "B班翻滿" + gamecard[ws.room].blueCount + "張考卷，B班獲勝！", id: clientlist[ws.room].filter(item => item.position == "B班老師")[0].id, type: "通知" });
                            }
                            if (ifgaming[ws.room] != 2 && gamecard[ws.room].redwrongtimes > 0) {
                                gamecard[ws.room].state = 5;
                                chat[ws.room].push({ chat: "需回答上一回合未完成題目，" + gamecard[ws.room].redprompt+gamecard[ws.room].redremain+"張", id: clientlist[ws.room].filter(item => item.position == "A班老師")[0].id, type: "通知" });
                            } else {
                                gamecard[ws.room].state = 4;
                            }
                        }
                    } else {
                        if (gamecard[ws.room].redCount > gamecard[ws.room].blueCount) {
                            chat[ws.room].push({ chat: "回答錯誤，該卷變成B卷！正確答案為" + gamecard[ws.room].question.answer, id: clientlist[ws.room].filter(item => item.position == "A班老師")[0].id, type: "通知" });
                            gamecard[ws.room].blueFliped += 1;
                            gamecard[ws.room].colors[gamecard[ws.room].nowFliped] = "blue";
                            if (gamecard[ws.room].redFliped == gamecard[ws.room].redCount) {
                                ifgaming[ws.room] = 2;
                                chat[ws.room].push({ chat: "A班翻滿" + gamecard[ws.room].redCount + "張考卷，A班獲勝！", id: clientlist[ws.room].filter(item => item.position == "A班老師")[0].id, type: "通知" });
                            }
                            if (ifgaming[ws.room] != 2 && gamecard[ws.room].bluewrongtimes > 0) {
                                gamecard[ws.room].state = 5;
                                chat[ws.room].push({ chat: "需回答上一回合未完成題目，" + gamecard[ws.room].blueprompt+gamecard[ws.room].blueremain+"張", id: clientlist[ws.room].filter(item => item.position == "B班老師")[0].id, type: "通知" });
                            } else {
                                gamecard[ws.room].state = 4;
                            }
                        } else {
                            chat[ws.room].push({ chat: "回答錯誤，該卷變成A卷！正確答案為" + gamecard[ws.room].question.answer, id: clientlist[ws.room].filter(item => item.position == "B班老師")[0].id, type: "通知" });
                            gamecard[ws.room].redFliped += 1;
                            gamecard[ws.room].colors[gamecard[ws.room].nowFliped] = "red";
                            if (gamecard[ws.room].blueFliped == gamecard[ws.room].blueCount) {
                                ifgaming[ws.room] = 2;
                                chat[ws.room].push({ chat: "B班翻滿" + gamecard[ws.room].blueCount + "張考卷，B班獲勝！", id: clientlist[ws.room].filter(item => item.position == "B班老師")[0].id, type: "通知" });
                            }
                            if (ifgaming[ws.room] != 2 && gamecard[ws.room].redwrongtimes > 0) {
                                gamecard[ws.room].state = 5;
                                chat[ws.room].push({ chat: "需回答上一回合未完成題目，" + gamecard[ws.room].redprompt+gamecard[ws.room].redremain+"張", id: clientlist[ws.room].filter(item => item.position == "A班老師")[0].id, type: "通知" });
                            } else {
                                gamecard[ws.room].state = 4;
                            }
                        }
                    }
                    clientlist[ws.room].forEach(function (client) {
                        client.send(JSON.stringify({ type: "chat", success: true, chat: chat[ws.room], gamecard: gamecard[ws.room], ifgaming: ifgaming[ws.room], clientlist: clientlisttosend[ws.room] }));
                    });
                    return;
                }
                ws.send(JSON.stringify({ type: "chat", success: false, message: "現在不是你的回合" }));
                return;
            } else if (gamecard[ws.room].state == 7.5) {
                if (gamecard[ws.room].questionid == ws.id) {
                    chat[ws.room].push({ chat: "答題：" + data.answer, id: ws.id, type: "通知" });
                    if (gamecard[ws.room].question.answer == data.answer) {
                        if (gamecard[ws.room].redCount < gamecard[ws.room].blueCount) {
                            chat[ws.room].push({ chat: "回答正確，該卷變成A卷！", id: clientlist[ws.room].filter(item => item.position == "A班老師")[0].id, type: "通知" });
                            gamecard[ws.room].redFliped += 1;
                            gamecard[ws.room].colors[gamecard[ws.room].nowFliped] = "red";
                            if (gamecard[ws.room].redFliped == gamecard[ws.room].redCount) {
                                ifgaming[ws.room] = 2;
                                chat[ws.room].push({ chat: "A班翻滿" + gamecard[ws.room].redCount + "張考卷，A班獲勝！", id: clientlist[ws.room].filter(item => item.position == "A班老師")[0].id, type: "通知" });
                            }
                            if (gamecard[ws.room].bluewrongtimes > 0) {
                                gamecard[ws.room].state = 1;
                                chat[ws.room].push({ chat: "需回答上一回合未完成題目，" + gamecard[ws.room].blueprompt+gamecard[ws.room].blueremain+"張", id: clientlist[ws.room].filter(item => item.position == "B班老師")[0].id, type: "通知" });
                            } else {
                                gamecard[ws.room].state = 0;
                            }
                        } else {
                            chat[ws.room].push({ chat: "回答正確，該卷變成B卷！", id: clientlist[ws.room].filter(item => item.position == "B班老師")[0].id, type: "通知" });
                            gamecard[ws.room].blueFliped += 1;
                            gamecard[ws.room].colors[gamecard[ws.room].nowFliped] = "blue";
                            if (gamecard[ws.room].blueFliped == gamecard[ws.room].blueCount) {
                                ifgaming[ws.room] = 2;
                                chat[ws.room].push({ chat: "B班翻滿" + gamecard[ws.room].blueCount + "張考卷，B班獲勝！", id: clientlist[ws.room].filter(item => item.position == "B班老師")[0].id, type: "通知" });
                            }
                            if (gamecard[ws.room].redwrongtimes > 0) {
                                gamecard[ws.room].state = 1;
                                chat[ws.room].push({ chat: "需回答上一回合未完成題目，" + gamecard[ws.room].redprompt+gamecard[ws.room].redremain+"張", id: clientlist[ws.room].filter(item => item.position == "A班老師")[0].id, type: "通知" });
                            } else {
                                gamecard[ws.room].state = 0;
                            }
                        }
                    } else {
                        if (gamecard[ws.room].redCount < gamecard[ws.room].blueCount) {
                            chat[ws.room].push({ chat: "回答錯誤，該卷變成B卷！正確答案為" + gamecard[ws.room].question.answer, id: clientlist[ws.room].filter(item => item.position == "A班老師")[0].id, type: "通知" });
                            gamecard[ws.room].blueFliped += 1;
                            gamecard[ws.room].colors[gamecard[ws.room].nowFliped] = "blue";
                            if (gamecard[ws.room].redFliped == gamecard[ws.room].redCount) {
                                ifgaming[ws.room] = 2;
                                chat[ws.room].push({ chat: "A班翻滿" + gamecard[ws.room].redCount + "張考卷，A班獲勝！", id: clientlist[ws.room].filter(item => item.position == "A班老師")[0].id, type: "通知" });
                            }
                            if (gamecard[ws.room].bluewrongtimes > 0) {
                                gamecard[ws.room].state = 1;
                                chat[ws.room].push({ chat: "需回答上一回合未完成題目，" + gamecard[ws.room].blueprompt+gamecard[ws.room].blueremain+"張", id: clientlist[ws.room].filter(item => item.position == "B班老師")[0].id, type: "通知" });
                            } else {
                                gamecard[ws.room].state = 0;
                            }
                        } else {
                            chat[ws.room].push({ chat: "回答錯誤，該卷變成A卷！正確答案為" + gamecard[ws.room].question.answer, id: clientlist[ws.room].filter(item => item.position == "B班老師")[0].id, type: "通知" });
                            gamecard[ws.room].redFliped += 1;
                            gamecard[ws.room].colors[gamecard[ws.room].nowFliped] = "red";
                            if (gamecard[ws.room].blueFliped == gamecard[ws.room].blueCount) {
                                ifgaming[ws.room] = 2;
                                chat[ws.room].push({ chat: "B班翻滿" + gamecard[ws.room].blueCount + "張考卷，B班獲勝！", id: clientlist[ws.room].filter(item => item.position == "B班老師")[0].id, type: "通知" });
                            }
                            if (gamecard[ws.room].redwrongtimes > 0) {
                                gamecard[ws.room].state = 1;
                                chat[ws.room].push({ chat: "需回答上一回合未完成題目，" + gamecard[ws.room].redprompt+gamecard[ws.room].redremain+"張", id: clientlist[ws.room].filter(item => item.position == "A班老師")[0].id, type: "通知" });
                            } else {
                                gamecard[ws.room].state = 0;
                            }
                        }
                    }
                    clientlist[ws.room].forEach(function (client) {
                        client.send(JSON.stringify({ type: "chat", success: true, chat: chat[ws.room], gamecard: gamecard[ws.room], ifgaming: ifgaming[ws.room], clientlist: clientlisttosend[ws.room] }));
                    });
                    return;
                }
                ws.send(JSON.stringify({ type: "chat", success: false, message: "現在不是你的回合" }));
                return;
            }
            ws.send(JSON.stringify({ type: "chat", success: false, message: "現在不是你的回合" }));
        } else if (data.type == "更新教室") {
            if (!room.includes(data.room)) {
                ws.send(JSON.stringify({ type: "index.html", success: false, message: "教室不存在" }));
                return;
            }
            if (ifgaming[data.room] == 0) {
                for (var i = 0; i < clientlist[data.room].length; i++) {
                    if (clientlist[data.room][i].id == data.id && clientlist[data.room][i].room == data.room) {
                        ws.id = clientlist[data.room][i].id;
                        ws.room = clientlist[data.room][i].room;
                        ws.position = clientlist[data.room][i].position;
                        ws.owner = clientlist[data.room][i].owner;
                        clientlist[data.room][i] = ws;
                        clientlisttosend[data.room][i] = { id: ws.id, room: ws.room, position: ws.position, owner: ws.owner };
                        ws.send(JSON.stringify({ type: "join", success: true, clientlist: clientlisttosend[ws.room], chat: chat[ws.room], ifnotify: ifnotify[ws.room] }));
                        return;
                    }
                }
            }
            if (ifgaming[data.room] > 0) {
                for (var i = 0; i < clientlist[data.room].length; i++) {
                    if (clientlist[data.room][i].id == data.id && clientlist[data.room][i].room == data.room) {
                        ws.id = clientlist[data.room][i].id;
                        ws.room = clientlist[data.room][i].room;
                        ws.position = clientlist[data.room][i].position;
                        ws.owner = clientlist[data.room][i].owner;
                        clientlist[data.room][i] = ws;
                        clientlisttosend[data.room][i] = { id: ws.id, room: ws.room, position: ws.position, owner: ws.owner };
                        ws.send(JSON.stringify({ type: "firstchat", success: true, chat: chat[ws.room], gamecard: gamecard[ws.room], position: ws.position, ifgaming: ifgaming[ws.room], clientlist: clientlisttosend[ws.room] }));
                        return;
                    }
                }
            }
            ws.send(JSON.stringify({ type: "index.html", success: false, message: "你不是該教室學生" }));
        } else if (data.type == "離開教室") {
            if (!room.includes(ws.room)) {
                ws.send(JSON.stringify({ type: "index.html", success: false, message: "教室不存在" }));
                return;
            }
            if (ifgaming[ws.room] == 1) {
                ws.send(JSON.stringify({ type: "testing.html", success: false, message: "考試已開始" }));
                return;
            }
            clientlist[ws.room] = clientlist[ws.room].filter(item => item.id != ws.id);
            clientlisttosend[ws.room] = clientlisttosend[ws.room].filter(item => item.id != ws.id);
            ws.send(JSON.stringify({ type: "index.html", success: false, message: "你離開了教室" }));
            if (clientlist[ws.room].length == 0) {
                room = room.filter(item => item != ws.room);
                clientlist[ws.room] = [];
                clientlisttosend[ws.room] = [];
                ifgaming[ws.room] = [];
                gamecard[ws.room] = [];
                chat[ws.room] = [];
                return;
            }
            if (ws.position == "A班老師") {
                if (clientlist[ws.room].length == 1) {
                    clientlist[ws.room][0].position = "A班老師";
                    clientlisttosend[ws.room][0].position = "A班老師";
                } else if (clientlist[ws.room].length == 2) {
                    clientlist[ws.room][0].position = "A班老師";
                    clientlist[ws.room][1].position = "B班老師";
                    clientlisttosend[ws.room][0].position = "A班老師";
                    clientlisttosend[ws.room][1].position = "B班老師";
                } else if (clientlist[ws.room].length == 3) {
                    clientlist[ws.room][1].position = "A班老師";
                    var temp = clientlist[ws.room][0];
                    clientlist[ws.room][0] = clientlist[ws.room][1];
                    clientlist[ws.room][1] = temp;
                    clientlist[ws.room][2].position = "學生";
                    clientlisttosend[ws.room][1].position = "A班老師";
                    var temp2 = clientlisttosend[ws.room][0];
                    clientlisttosend[ws.room][0] = clientlisttosend[ws.room][1];
                    clientlisttosend[ws.room][1] = temp2;
                    clientlisttosend[ws.room][2].position = "學生";
                } else if (clientlist[ws.room].length % 2 != 0) {
                    clientlist[ws.room][1].position = "A班老師";
                    clientlist[ws.room][clientlist[ws.room].length - 1].position = "A班學生";
                    var temp = clientlist[ws.room][0];
                    clientlist[ws.room][0] = clientlist[ws.room][1];
                    clientlist[ws.room][1] = temp;
                    clientlisttosend[ws.room][1].position = "A班老師";
                    clientlisttosend[ws.room][clientlisttosend[ws.room].length - 1].position = "A班學生";
                    var temp2 = clientlisttosend[ws.room][0];
                    clientlisttosend[ws.room][0] = clientlisttosend[ws.room][1];
                    clientlisttosend[ws.room][1] = temp2;
                    for (var i = 2; i < clientlist[ws.room].length - 1; i += 2) {
                        var temp = clientlist[ws.room][i];
                        clientlist[ws.room][i] = clientlist[ws.room][i + 1];
                        clientlist[ws.room][i + 1] = temp;
                        var temp2 = clientlisttosend[ws.room][i];
                        clientlisttosend[ws.room][i] = clientlisttosend[ws.room][i + 1];
                        clientlisttosend[ws.room][i + 1] = temp2;
                    }
                } else {
                    clientlist[ws.room][1].position = "A班老師";
                    var temp = clientlist[ws.room][0];
                    clientlist[ws.room][0] = clientlist[ws.room][1];
                    clientlist[ws.room][1] = temp;
                    clientlisttosend[ws.room][1].position = "A班老師";
                    var temp2 = clientlisttosend[ws.room][0];
                    clientlisttosend[ws.room][0] = clientlisttosend[ws.room][1];
                    clientlisttosend[ws.room][1] = temp2;
                    for (var i = 2; i < clientlist[ws.room].length - 1; i += 2) {
                        var temp = clientlist[ws.room][i];
                        clientlist[ws.room][i] = clientlist[ws.room][i + 1];
                        clientlist[ws.room][i + 1] = temp;
                        var temp2 = clientlisttosend[ws.room][i];
                        clientlisttosend[ws.room][i] = clientlisttosend[ws.room][i + 1];
                        clientlisttosend[ws.room][i + 1] = temp2;
                    }
                }
            } else if (ws.position == "B班老師") {
                if (clientlist[ws.room].length == 1) {

                } else if (clientlist[ws.room].length == 2) {
                    clientlist[ws.room][1].position = "B班老師";
                    clientlisttosend[ws.room][1].position = "B班老師";
                } else if (clientlist[ws.room].length == 3) {
                    clientlist[ws.room][2].position = "B班老師";
                    clientlist[ws.room][1].position = "學生";
                    var temp = clientlist[ws.room][1];
                    clientlist[ws.room][1] = clientlist[ws.room][2];
                    clientlist[ws.room][2] = temp;
                    clientlisttosend[ws.room][2].position = "B班老師";
                    clientlisttosend[ws.room][1].position = "學生";
                    var temp2 = clientlisttosend[ws.room][1];
                    clientlisttosend[ws.room][1] = clientlisttosend[ws.room][2];
                    clientlisttosend[ws.room][2] = temp2;
                } else if (clientlist[ws.room].length % 2 != 0) {
                    clientlist[ws.room][2].position = "B班老師";
                    var temp = clientlist[ws.room][1];
                    clientlist[ws.room][1] = clientlist[ws.room][2];
                    clientlist[ws.room][2] = temp;
                    clientlisttosend[ws.room][2].position = "B班老師";
                    var temp2 = clientlisttosend[ws.room][1];
                    clientlisttosend[ws.room][1] = clientlisttosend[ws.room][2];
                    clientlisttosend[ws.room][2] = temp2;
                    for (var i = 3; i < clientlist[ws.room].length - 1; i += 2) {
                        if (clientlist[ws.room][i].position != "B班學生") {
                            var temp = clientlist[ws.room][i];
                            clientlist[ws.room][i] = clientlist[ws.room][i + 1];
                            clientlist[ws.room][i + 1] = temp;
                            var temp2 = clientlisttosend[ws.room][i];
                            clientlisttosend[ws.room][i] = clientlisttosend[ws.room][i + 1];
                            clientlisttosend[ws.room][i + 1] = temp2;
                        }
                    }
                } else {
                    clientlist[ws.room][2].position = "B班老師";
                    clientlist[ws.room][clientlist[ws.room].length - 1].position = "B班學生";
                    var temp = clientlist[ws.room][1];
                    clientlist[ws.room][1] = clientlist[ws.room][2];
                    clientlist[ws.room][2] = temp;
                    clientlisttosend[ws.room][2].position = "B班老師";
                    clientlisttosend[ws.room][clientlisttosend[ws.room].length - 1].position = "B班學生";
                    var temp2 = clientlisttosend[ws.room][1];
                    clientlisttosend[ws.room][1] = clientlisttosend[ws.room][2];
                    clientlisttosend[ws.room][2] = temp2;
                    for (var i = 3; i < clientlist[ws.room].length - 1; i += 2) {
                        if (clientlist[ws.room][i].position != "B班學生") {
                            var temp = clientlist[ws.room][i];
                            clientlist[ws.room][i] = clientlist[ws.room][i + 1];
                            clientlist[ws.room][i + 1] = temp;
                            var temp2 = clientlisttosend[ws.room][i];
                            clientlisttosend[ws.room][i] = clientlisttosend[ws.room][i + 1];
                            clientlisttosend[ws.room][i + 1] = temp2;
                        }
                    }
                }
            } else if (ws.position == "A班學生") {
                if (clientlist[ws.room].length == 3) {
                    clientlist[ws.room][2].position = "學生";
                    clientlisttosend[ws.room][2].position = "學生";
                } else if (clientlist[ws.room] % 2 != 0) {
                    clientlist[ws.room][clientlist[ws.room].length - 1].position = "A班學生";
                    clientlisttosend[ws.room][clientlisttosend[ws.room].length - 1].position = "A班學生";
                }
                for (var i = 2; i < clientlist[ws.room].length - 1; i += 2) {
                    if (clientlist[ws.room][i].position != "A班學生") {
                        var temp = clientlist[ws.room][i];
                        clientlist[ws.room][i] = clientlist[ws.room][i + 1];
                        clientlist[ws.room][i + 1] = temp;
                        var temp2 = clientlisttosend[ws.room][i];
                        clientlisttosend[ws.room][i] = clientlisttosend[ws.room][i + 1];
                        clientlisttosend[ws.room][i + 1] = temp2;
                    }
                }
            } else if (ws.position == "B班學生") {
                if (clientlist[ws.room].length == 3) {
                    clientlist[ws.room][2].position = "學生";
                    clientlisttosend[ws.room][2].position = "學生";
                } else if (clientlist[ws.room] % 2 == 0) {
                    clientlist[ws.room][clientlist[ws.room].length - 1].position = "B班學生";
                    clientlisttosend[ws.room][clientlisttosend[ws.room].length - 1].position = "A班學生";
                }
                for (var i = 3; i < clientlist[ws.room].length - 1; i += 2) {
                    if (clientlist[ws.room][i].position != "B班學生") {
                        var temp = clientlist[ws.room][i];
                        clientlist[ws.room][i] = clientlist[ws.room][i + 1];
                        clientlist[ws.room][i + 1] = temp;
                        var temp2 = clientlisttosend[ws.room][i];
                        clientlisttosend[ws.room][i] = clientlisttosend[ws.room][i + 1];
                        clientlisttosend[ws.room][i + 1] = temp2;
                    }
                }
            }
            if (ws.owner) {
                clientlist[ws.room][0].owner = true;
                clientlisttosend[ws.room][0].owner = true;
            }
            clientlist[ws.room].forEach(function (client) {
                client.send(JSON.stringify({ type: "join", success: true, clientlist: clientlisttosend[ws.room], chat: chat[ws.room], ifnotify: ifnotify[ws.room] }));
            });

            ws.room = null;
            ws.position = null;
            ws.id = null;
            ws.owner = null;
        } else if (data.type == "請離教室") {
            if (!room.includes(ws.room)) {
                ws.send(JSON.stringify({ type: "index.html", success: false, message: "教室不存在" }));
                return;
            }
            if (ifgaming[ws.room] == 1) {
                ws.send(JSON.stringify({ type: "testing.html", success: false, message: "考試已開始" }));
                return;
            }
            if (!ws.owner) {
                ws.send(JSON.stringify({ type: "join", success: false, message: "你不是教室管理員" }));
                return;
            }
            var out = clientlist[ws.room].filter(item => item.id == data.id);
            out[0].send(JSON.stringify({ type: "index.html", success: false, message: "你已被教室管理員請離" }));
            clientlist[ws.room] = clientlist[ws.room].filter(item => item.id != data.id);
            clientlisttosend[ws.room] = clientlisttosend[ws.room].filter(item => item.id != data.id);
            if (clientlist[ws.room].length == 0) {
                room = room.filter(item => item != ws.room);
                clientlist[ws.room] = [];
                clientlisttosend[ws.room] = [];
                ifgaming[ws.room] = [];
                gamecard[ws.room] = [];
                chat[ws.room] = [];
                return;
            }
            if (out[0].position == "A班老師") {
                if (clientlist[ws.room].length == 1) {
                    clientlist[ws.room][0].position = "A班老師";
                    clientlisttosend[ws.room][0].position = "A班老師";
                } else if (clientlist[ws.room].length == 2) {
                    clientlist[ws.room][0].position = "A班老師";
                    clientlist[ws.room][1].position = "B班老師";
                    clientlisttosend[ws.room][0].position = "A班老師";
                    clientlisttosend[ws.room][1].position = "B班老師";
                } else if (clientlist[ws.room].length == 3) {
                    clientlist[ws.room][1].position = "A班老師";
                    var temp = clientlist[ws.room][0];
                    clientlist[ws.room][0] = clientlist[ws.room][1];
                    clientlist[ws.room][1] = temp;
                    clientlist[ws.room][2].position = "學生";
                    clientlisttosend[ws.room][1].position = "A班老師";
                    var temp2 = clientlisttosend[ws.room][0];
                    clientlisttosend[ws.room][0] = clientlisttosend[ws.room][1];
                    clientlisttosend[ws.room][1] = temp2;
                    clientlisttosend[ws.room][2].position = "學生";
                } else if (clientlist[ws.room].length % 2 != 0) {
                    clientlist[ws.room][1].position = "A班老師";
                    clientlist[ws.room][clientlist[ws.room].length - 1].position = "A班學生";
                    var temp = clientlist[ws.room][0];
                    clientlist[ws.room][0] = clientlist[ws.room][1];
                    clientlist[ws.room][1] = temp;
                    clientlisttosend[ws.room][1].position = "A班老師";
                    clientlisttosend[ws.room][clientlisttosend[ws.room].length - 1].position = "A班學生";
                    var temp2 = clientlisttosend[ws.room][0];
                    clientlisttosend[ws.room][0] = clientlisttosend[ws.room][1];
                    clientlisttosend[ws.room][1] = temp2;
                    for (var i = 2; i < clientlist[ws.room].length - 1; i += 2) {
                        var temp = clientlist[ws.room][i];
                        clientlist[ws.room][i] = clientlist[ws.room][i + 1];
                        clientlist[ws.room][i + 1] = temp;
                        var temp2 = clientlisttosend[ws.room][i];
                        clientlisttosend[ws.room][i] = clientlisttosend[ws.room][i + 1];
                        clientlisttosend[ws.room][i + 1] = temp2;
                    }
                } else {
                    clientlist[ws.room][1].position = "A班老師";
                    var temp = clientlist[ws.room][0];
                    clientlist[ws.room][0] = clientlist[ws.room][1];
                    clientlist[ws.room][1] = temp;
                    clientlisttosend[ws.room][1].position = "A班老師";
                    var temp2 = clientlisttosend[ws.room][0];
                    clientlisttosend[ws.room][0] = clientlisttosend[ws.room][1];
                    clientlisttosend[ws.room][1] = temp2;
                    for (var i = 2; i < clientlist[ws.room].length - 1; i += 2) {
                        var temp = clientlist[ws.room][i];
                        clientlist[ws.room][i] = clientlist[ws.room][i + 1];
                        clientlist[ws.room][i + 1] = temp;
                        var temp2 = clientlisttosend[ws.room][i];
                        clientlisttosend[ws.room][i] = clientlisttosend[ws.room][i + 1];
                        clientlisttosend[ws.room][i + 1] = temp2;
                    }
                }
            } else if (out[0].position == "B班老師") {
                if (clientlist[ws.room].length == 1) {

                } else if (clientlist[ws.room].length == 2) {
                    clientlist[ws.room][1].position = "B班老師";
                    clientlisttosend[ws.room][1].position = "B班老師";
                } else if (clientlist[ws.room].length == 3) {
                    clientlist[ws.room][2].position = "B班老師";
                    clientlist[ws.room][1].position = "學生";
                    var temp = clientlist[ws.room][1];
                    clientlist[ws.room][1] = clientlist[ws.room][2];
                    clientlist[ws.room][2] = temp;
                    clientlisttosend[ws.room][2].position = "B班老師";
                    clientlisttosend[ws.room][1].position = "學生";
                    var temp2 = clientlisttosend[ws.room][1];
                    clientlisttosend[ws.room][1] = clientlisttosend[ws.room][2];
                    clientlisttosend[ws.room][2] = temp2;
                } else if (clientlist[ws.room].length % 2 != 0) {
                    clientlist[ws.room][2].position = "B班老師";
                    var temp = clientlist[ws.room][1];
                    clientlist[ws.room][1] = clientlist[ws.room][2];
                    clientlist[ws.room][2] = temp;
                    clientlisttosend[ws.room][2].position = "B班老師";
                    var temp2 = clientlisttosend[ws.room][1];
                    clientlisttosend[ws.room][1] = clientlisttosend[ws.room][2];
                    clientlisttosend[ws.room][2] = temp2;
                    for (var i = 3; i < clientlist[ws.room].length - 1; i += 2) {
                        if (clientlist[ws.room][i].position != "B班學生") {
                            var temp = clientlist[ws.room][i];
                            clientlist[ws.room][i] = clientlist[ws.room][i + 1];
                            clientlist[ws.room][i + 1] = temp;
                            var temp2 = clientlisttosend[ws.room][i];
                            clientlisttosend[ws.room][i] = clientlisttosend[ws.room][i + 1];
                            clientlisttosend[ws.room][i + 1] = temp2;
                        }
                    }
                } else {
                    clientlist[ws.room][2].position = "B班老師";
                    clientlist[ws.room][clientlist[ws.room].length - 1].position = "B班學生";
                    var temp = clientlist[ws.room][1];
                    clientlist[ws.room][1] = clientlist[ws.room][2];
                    clientlist[ws.room][2] = temp;
                    clientlisttosend[ws.room][2].position = "B班老師";
                    clientlisttosend[ws.room][clientlisttosend[ws.room].length - 1].position = "B班學生";
                    var temp2 = clientlisttosend[ws.room][1];
                    clientlisttosend[ws.room][1] = clientlisttosend[ws.room][2];
                    clientlisttosend[ws.room][2] = temp2;
                    for (var i = 3; i < clientlist[ws.room].length - 1; i += 2) {
                        if (clientlist[ws.room][i].position != "B班學生") {
                            var temp = clientlist[ws.room][i];
                            clientlist[ws.room][i] = clientlist[ws.room][i + 1];
                            clientlist[ws.room][i + 1] = temp;
                            var temp2 = clientlisttosend[ws.room][i];
                            clientlisttosend[ws.room][i] = clientlisttosend[ws.room][i + 1];
                            clientlisttosend[ws.room][i + 1] = temp2;
                        }
                    }
                }
            } else if (out[0].position == "A班學生") {
                if (clientlist[ws.room].length == 3) {
                    clientlist[ws.room][2].position = "學生";
                    clientlisttosend[ws.room][2].position = "學生";
                } else if (clientlist[ws.room] % 2 != 0) {
                    clientlist[ws.room][clientlist[ws.room].length - 1].position = "A班學生";
                    clientlisttosend[ws.room][clientlisttosend[ws.room].length - 1].position = "A班學生";
                }
                for (var i = 2; i < clientlist[ws.room].length - 1; i += 2) {
                    if (clientlist[ws.room][i].position != "A班學生") {
                        var temp = clientlist[ws.room][i];
                        clientlist[ws.room][i] = clientlist[ws.room][i + 1];
                        clientlist[ws.room][i + 1] = temp;
                        var temp2 = clientlisttosend[ws.room][i];
                        clientlisttosend[ws.room][i] = clientlisttosend[ws.room][i + 1];
                        clientlisttosend[ws.room][i + 1] = temp2;
                    }
                }
            } else if (out[0].position == "B班學生") {
                if (clientlist[ws.room].length == 3) {
                    clientlist[ws.room][2].position = "學生";
                    clientlisttosend[ws.room][2].position = "學生";
                } else if (clientlist[ws.room] % 2 == 0) {
                    clientlist[ws.room][clientlist[ws.room].length - 1].position = "B班學生";
                    clientlisttosend[ws.room][clientlisttosend[ws.room].length - 1].position = "A班學生";
                }
                for (var i = 3; i < clientlist[ws.room].length - 1; i += 2) {
                    if (clientlist[ws.room][i].position != "B班學生") {
                        var temp = clientlist[ws.room][i];
                        clientlist[ws.room][i] = clientlist[ws.room][i + 1];
                        clientlist[ws.room][i + 1] = temp;
                        var temp2 = clientlisttosend[ws.room][i];
                        clientlisttosend[ws.room][i] = clientlisttosend[ws.room][i + 1];
                        clientlisttosend[ws.room][i + 1] = temp2;
                    }
                }
            }
            if (out[0].owner) {
                clientlist[ws.room][0].owner = true;
                clientlisttosend[ws.room][0].owner = true;
            }
            clientlist[ws.room].forEach(function (client) {
                client.send(JSON.stringify({ type: "join", success: true, clientlist: clientlisttosend[ws.room], chat: chat[ws.room], ifnotify: ifnotify[ws.room] }));
            });
            out[0].room = null;
            out[0].position = null;
            out[0].id = null;
            out[0].owner = null;
        } else if (data.type == "轉移教室管理員") {
            if (!room.includes(ws.room)) {
                ws.send(JSON.stringify({ type: "index.html", success: false, message: "教室不存在" }));
                return;
            }
            if (ifgaming[ws.room] == 1) {
                ws.send(JSON.stringify({ type: "testing.html", success: false, message: "考試已開始" }));
                return;
            }
            if (!ws.owner) {
                ws.send(JSON.stringify({ type: "join", success: false, message: "你不是教室管理員" }));
                return;
            }
            var newowner = clientlist[ws.room].filter(item => item.id == data.id);
            if (newowner[0]) {
                newowner[0].owner = true;
                ws.owner = false;
                clientlisttosend[ws.room].filter(item => item.id == data.id)[0].owner = true;
                clientlisttosend[ws.room].filter(item => item.id == ws.id)[0].owner = false;
            }
            clientlist[ws.room].forEach(function (client) {
                client.send(JSON.stringify({ type: "join", success: true, clientlist: clientlisttosend[ws.room], chat: chat[ws.room], ifnotify: ifnotify[ws.room] }));
            });
        } else if (data.type == "重新考試") {
            if (!room.includes(ws.room)) {
                ws.send(JSON.stringify({ type: "index.html", success: false, message: "教室不存在" }));
                return;
            }
            if (ifgaming[ws.room] == 0) {
                ws.send(JSON.stringify({ type: "testing.html", success: false, message: "考試還未開始" }));
                return;
            }
            if (ifgaming[ws.room] == 1) {
                ws.send(JSON.stringify({ type: "testing.html", success: false, message: "考試還未結束" }));
                return;
            }
            if (ws.owner) {
                ifgaming[ws.room] = 0;
                ifnotify[ws.room] = true;
                ws.send(JSON.stringify({ type: "over", success: true }));
                return;
            }
            ws.send(JSON.stringify({ type: "testing.html", success: false, message: "你不是教室管理員" }));
        } else if (data.type == "通知重新考試") {
            if (!room.includes(ws.room)) {
                ws.send(JSON.stringify({ type: "index.html", success: false, message: "教室不存在" }));
                return;
            }
            if (ifgaming[ws.room] > 0) {
                ws.send(JSON.stringify({ type: "testing.html", success: false, message: "考試還未結束" }));
                return;
            }
            if (ws.owner) {
                ifnotify[data.room] = false;
                clientlist[ws.room].forEach(function (client) {
                    if (!client.owner)
                        client.send(JSON.stringify({ type: "over", success: true }));
                });
                return;
            }
            ws.send(JSON.stringify({ type: "testing.html", success: false, message: "你不是教室管理員" }));
        }
    });
    ws.on('close', () => {
        for (const client of wss.clients) {
            if (client.room == ws.room) {
                return;
            }
        }
        room = room.filter(item => item != ws.room);
        clientlist[ws.room] = [];
        clientlisttosend[ws.room] = [];
        ifgaming[ws.room] = [];
        gamecard[ws.room] = [];
        chat[ws.room] = [];
    });
});