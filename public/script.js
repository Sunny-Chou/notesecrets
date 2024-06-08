// script.js
var ifnotifytesting = false;
var gamecard = [];
var chat = [];
var position;
var yourturn = false;
const cardContainer = document.getElementById('cardContainer');
const promptCardButton = document.getElementById('promptCardButton');
const dialog = document.getElementById('dialog');
const closeDialog = document.getElementById('closeDialog');
const revealButton = document.getElementById('revealButton');
const dialogText = document.getElementById('dialogText');
const promptDialog = document.getElementById('promptDialog');
const closePromptDialog = document.getElementById('closePromptDialog');
const submitSelection = document.getElementById('submitSelection');
const promptButtonsContainer = document.getElementById('promptButtonsContainer');
const quizForm = document.getElementById('quizForm');
const quizDialog = document.getElementById('quizDialog');
const submitBtn = document.getElementById('submitBtn');
const p = document.getElementById('p');
const replay = document.getElementById("replay");
let selectedPrompts = [];
let selectedCards = [];
let selectedCardsName = [];
let currentCard = null;
let redCardsTotal = 0;
let blueCardsTotal = 0;
let redCardsRevealed = 0;
let blueCardsRevealed = 0;
const ws = new WebSocket('ws://https://notesecrets.onrender.com');
ws.onopen = function (event) {
    ws.send(JSON.stringify({ type: "更新教室", room: sessionStorage.getItem('room'), id: sessionStorage.getItem('id') }));
}
ws.onmessage = function (event) {
    var data = JSON.parse(event.data.toString());
    console.log('Received server event:', data);
    if (data.type == "firstchat") {
        if (data.success) {
            if (data.position) {
                position = data.position;
            }
            if (data.gamecard) {
                gamecard = data.gamecard;
                gamecard.prompt = JSON.parse(gamecard.prompt);
                if (gamecard.ifnotify) {
                    ws.send(JSON.stringify({ type: "通知考試" }));
                }
                const you = data.clientlist.filter(item => item.id == sessionStorage.getItem("id"))[0];
                if (you.owner && data.ifgaming == 2) {
                    replay.classList.remove("hidden");
                } else {
                    replay.classList.add("hidden");
                }
                cardContainer.innerHTML = "";
                if (position == "A班老師") {
                    if (data.ifgaming == 1) {
                        if (gamecard.state < 3.5 && gamecard.state % 2 == 0) {
                            if (gamecard.redCount > gamecard.blueCount) {
                                yourturn = true;
                                p.textContent = "輪到你為A班學生提供筆記！";
                            }
                        } else if (gamecard.state > 3.5 && gamecard.state % 2 == 0) {
                            if (gamecard.redCount < gamecard.blueCount) {
                                yourturn = true;
                                p.textContent = "輪到你為A班學生提供筆記！";
                            }
                        }
                    }
                    gamecard.card.forEach((line, index) => {
                        const [visibleText, hiddenText] = line.split(':');
                        const card = document.createElement('div');
                        card.classList.add('card');
                        card.dataset.index = index;
                        card.textContent = visibleText;
                        if (gamecard.redanswer.includes(index)) {
                            card.classList.add('selected');
                        }
                        card.addEventListener('click', () => {
                            dialogText.textContent = hiddenText;
                            if (gamecard.colors[index] == "red" && yourturn && !gamecard.fliped[index]) {
                                revealButton.classList.remove("hidden");
                                if (card.classList.contains("selected")) {
                                    revealButton.textContent = "取消選擇";
                                } else {
                                    revealButton.textContent = "選擇";
                                }
                            } else {
                                revealButton.classList.add("hidden");
                            }
                            dialog.style.display = 'flex';
                            currentCard = card;
                        });
                        card.style.backgroundColor = gamecard.colors[index];
                        cardContainer.appendChild(card);
                    });
                    promptButtonsContainer.innerHTML = "";
                    console.log(prompt);
                    Object.keys(gamecard.prompt).forEach(category => {
                        const categoryDiv = document.createElement('div');
                        categoryDiv.classList.add('category-container');
                        const categoryTitle = document.createElement('h3');
                        categoryTitle.textContent = category;
                        categoryDiv.appendChild(categoryTitle);
                        gamecard.prompt[category].forEach(text => {
                            const button = document.createElement('div');
                            button.classList.add('prompt-button');
                            button.textContent = text;
                            button.dataset.category = category;
                            button.addEventListener('click', () => {
                                if (selectedPrompts.includes(text)) {
                                    selectedPrompts = selectedPrompts.filter(item => item !== text);
                                    button.classList.remove('selected');
                                } else if (selectedPrompts.length < 3) {
                                    selectedPrompts.push(text);
                                    button.classList.add('selected');
                                }
                            });
                            categoryDiv.appendChild(button);
                        });
                        promptButtonsContainer.appendChild(categoryDiv);
                    });
                } else if (position == "B班老師") {
                    if (data.ifgaming == 1) {
                        if (gamecard.state < 3.5 && gamecard.state % 2 == 0) {
                            if (gamecard.redCount < gamecard.blueCount) {
                                yourturn = true;
                                p.textContent = "輪到你為B班學生提供筆記！";
                            }
                        } else if (gamecard.state > 3.5 && gamecard.state % 2 == 0) {
                            if (gamecard.redCount > gamecard.blueCount) {
                                yourturn = true;
                                p.textContent = "輪到你為B班學生提供筆記！";
                            }
                        }
                    }
                    gamecard.card.forEach((line, index) => {
                        const [visibleText, hiddenText] = line.split(':');
                        const card = document.createElement('div');
                        card.classList.add('card');
                        card.dataset.index = index;
                        card.textContent = visibleText;
                        if (gamecard.redanswer.includes(index)) {
                            card.classList.add('selected');
                        }
                        card.addEventListener('click', () => {
                            dialogText.textContent = hiddenText;
                            if (gamecard.colors[index] == "blue" && yourturn && !gamecard.fliped[index]) {
                                revealButton.classList.remove("hidden");
                                if (card.classList.contains("selected")) {
                                    revealButton.textContent = "取消選擇";
                                } else {
                                    revealButton.textContent = "選擇";
                                }
                            } else {
                                revealButton.classList.add("hidden");
                            }
                            dialog.style.display = 'flex';
                            currentCard = card;
                        });
                        card.style.backgroundColor = gamecard.colors[index];
                        cardContainer.appendChild(card);
                    });
                    promptButtonsContainer.innerHTML = "";
                    Object.keys(gamecard.prompt).forEach(category => {
                        const categoryDiv = document.createElement('div');
                        categoryDiv.classList.add('category-container');
                        const categoryTitle = document.createElement('h3');
                        categoryTitle.textContent = category;
                        categoryDiv.appendChild(categoryTitle);
                        gamecard.prompt[category].forEach(text => {
                            const button = document.createElement('div');
                            button.classList.add('prompt-button');
                            button.textContent = text;
                            button.dataset.category = category;
                            button.addEventListener('click', () => {
                                if (selectedPrompts.includes(text)) {
                                    selectedPrompts = selectedPrompts.filter(item => item !== text);
                                    button.classList.remove('selected');
                                } else if (selectedPrompts.length < 3) {
                                    selectedPrompts.push(text);
                                    button.classList.add('selected');
                                }
                            });
                            categoryDiv.appendChild(button);
                        });
                        promptButtonsContainer.appendChild(categoryDiv);
                    });
                } else if (position == "A班學生") {
                    promptCardButton.classList.add("hidden");
                    if (data.ifgaming == 1) {
                        if (gamecard.state < 3.5 && gamecard.state % 2 == 1) {
                            if (gamecard.redCount > gamecard.blueCount) {
                                yourturn = true;
                                p.textContent = "輪到你們A班學生翻開老師指定考卷！";
                            }
                        } else if (gamecard.state > 3.5 && gamecard.state % 2 == 1) {
                            if (gamecard.redCount < gamecard.blueCount) {
                                yourturn = true;
                                p.textContent = "輪到你們A班學生翻開老師指定考卷！";
                            }
                        } else if ((gamecard.state == 7.5 || gamecard.state == 3.5) && gamecard.questionid == sessionStorage.getItem("id")) {
                            const q = document.getElementById('q');
                            const A = document.getElementById('At');
                            const B = document.getElementById('Bt');
                            const C = document.getElementById('Ct');
                            const D = document.getElementById('Dt');
                            q.textContent = gamecard.question.q;
                            A.innerHTML = "(A)" + gamecard.question.A;
                            B.innerHTML = "(B)" + gamecard.question.B;
                            C.innerHTML = "(C)" + gamecard.question.C;
                            D.innerHTML = "(D)" + gamecard.question.D;
                            quizDialog.showModal();
                        }
                    }
                    gamecard.card.forEach((line, index) => {
                        const [visibleText, hiddenText] = line.split(':');
                        const card = document.createElement('div');
                        card.classList.add('card');
                        card.dataset.index = index;
                        if (gamecard.fliped[index]) {
                            card.style.backgroundColor = gamecard.colors[index];
                        }
                        card.textContent = visibleText;
                        card.addEventListener('click', () => {
                            if (yourturn && !gamecard.fliped[index]) {
                                revealButton.classList.remove("hidden");
                            } else {
                                revealButton.classList.add("hidden");
                            }
                            dialogText.textContent = hiddenText;
                            dialog.style.display = 'flex';
                            currentCard = card;
                        });
                        cardContainer.appendChild(card);
                    });
                } else if (position == "B班學生") {
                    promptCardButton.classList.add("hidden");
                    if (data.ifgaming == 1) {
                        if (gamecard.state < 3.5 && gamecard.state % 2 == 1) {
                            if (gamecard.redCount < gamecard.blueCount) {
                                yourturn = true;
                                p.textContent = "輪到你們B班學生翻開老師指定考卷！";
                            }
                        } else if (gamecard.state > 3.5 && gamecard.state % 2 == 1) {
                            if (gamecard.redCount > gamecard.blueCount) {
                                yourturn = true;
                                p.textContent = "輪到你們B班學生翻開老師指定考卷！";
                            }
                        } else if ((gamecard.state == 7.5 || gamecard.state == 3.5) && gamecard.questionid == sessionStorage.getItem("id")) {
                            const q = document.getElementById('q');
                            const A = document.getElementById('At');
                            const B = document.getElementById('Bt');
                            const C = document.getElementById('Ct');
                            const D = document.getElementById('Dt');
                            q.textContent = gamecard.question.q;
                            A.innerHTML = "(A)" + gamecard.question.A;
                            B.innerHTML = "(B)" + gamecard.question.B;
                            C.innerHTML = "(C)" + gamecard.question.C;
                            D.innerHTML = "(D)" + gamecard.question.D;
                            quizDialog.showModal();
                        }
                    }
                    gamecard.card.forEach((line, index) => {
                        const [visibleText, hiddenText] = line.split(':');
                        const card = document.createElement('div');
                        card.classList.add('card');
                        card.dataset.index = index;
                        if (gamecard.fliped[index]) {
                            card.style.backgroundColor = gamecard.colors[index];
                        }
                        card.textContent = visibleText;
                        card.addEventListener('click', () => {
                            if (yourturn && !gamecard.fliped[index]) {
                                revealButton.classList.remove("hidden");
                            } else {
                                revealButton.classList.add("hidden");
                            }
                            dialogText.textContent = hiddenText;
                            dialog.style.display = 'flex';
                            currentCard = card;
                        });
                        cardContainer.appendChild(card);
                    });
                } else if (position == "學生") {
                    promptCardButton.classList.add("hidden");
                    if (data.ifgaming == 1) {
                        if (gamecard.state < 3.5 && gamecard.state % 2 == 1) {
                            yourturn = true;
                            if (gamecard.redCount < gamecard.blueCount) {
                                p.textContent = "輪到你翻開B班老師指定考卷！";
                            } else {
                                p.textContent = "輪到你翻開A班老師指定考卷！";
                            }
                        } else if (gamecard.state > 3.5 && gamecard.state % 2 == 1) {
                            yourturn = true;
                            if (gamecard.redCount > gamecard.blueCount) {
                                p.textContent = "輪到你翻開B班老師指定考卷！";
                            } else {
                                p.textContent = "輪到你翻開A班老師指定考卷！";
                            }
                        } else if ((gamecard.state == 7.5 || gamecard.state == 3.5) && gamecard.questionid == sessionStorage.getItem("id")) {
                            const q = document.getElementById('q');
                            const A = document.getElementById('At');
                            const B = document.getElementById('Bt');
                            const C = document.getElementById('Ct');
                            const D = document.getElementById('Dt');
                            q.textContent = gamecard.question.q;
                            A.innerHTML = "(A)" + gamecard.question.A;
                            B.innerHTML = "(B)" + gamecard.question.B;
                            C.innerHTML = "(C)" + gamecard.question.C;
                            D.innerHTML = "(D)" + gamecard.question.D;
                            quizDialog.showModal();
                        }
                    }
                    gamecard.card.forEach((line, index) => {
                        const [visibleText, hiddenText] = line.split(':');
                        const card = document.createElement('div');
                        card.classList.add('card');
                        card.dataset.index = index;
                        if (gamecard.fliped[index]) {
                            card.style.backgroundColor = gamecard.colors[index];
                        }
                        card.textContent = visibleText;
                        card.addEventListener('click', () => {
                            if (yourturn && !gamecard.fliped[index]) {
                                revealButton.classList.remove("hidden");
                            } else {
                                revealButton.classList.add("hidden");
                            }
                            dialogText.textContent = hiddenText;
                            dialog.style.display = 'flex';
                            currentCard = card;
                        });
                        cardContainer.appendChild(card);
                    });
                }
            }
            if (yourturn) {
                submitSelection.classList.remove("hidden");
                p.classList.remove("hidden");
            } else {
                submitSelection.classList.add("hidden");
                p.classList.add("hidden");
            }
            if (data.chat) {
                const chatbody = document.getElementById('chat-body');
                for (var i = chat.length; i < data.chat.length; i++) {
                    if (data.chat[i].id != sessionStorage.getItem("id")) {
                        var newchat = document.createElement('div');
                        newchat.classList.add('message');
                        newchat.textContent = data.chat[i].id + "：";
                        var newchattext = document.createElement('div');
                        newchattext.classList.add('message-text');
                        if (data.chat[i].type == '通知') {
                            newchattext.classList.add('notify');
                        }
                        newchattext.textContent = data.chat[i].chat
                        newchat.appendChild(newchattext);
                        chatbody.appendChild(newchat);
                    } else {
                        var newchat = document.createElement('div');
                        newchat.classList.add('message-right');
                        var newchattext = document.createElement('div');
                        newchattext.classList.add('message-text-right');
                        if (data.chat[i].type == '通知') {
                            newchattext.classList.add('notify-right');
                        }
                        newchattext.textContent = data.chat[i].chat
                        newchat.appendChild(newchattext);
                        chatbody.appendChild(newchat);
                    }
                }
                chat = data.chat;
            }
        } else {
            alert(data.message);
        }
    } else if (data.type == "chat") {
        if (data.success) {
            if (data.gamecard) {
                yourturn = false;
                gamecard = data.gamecard;
                const you = data.clientlist.filter(item => item.id == sessionStorage.getItem("id"))[0];
                if (you.owner && data.ifgaming == 2) {
                    replay.classList.remove("hidden");
                } else {
                    replay.classList.add("hidden");
                }
                cardContainer.innerHTML = "";
                if (position == "A班老師") {
                    if (data.ifgaming == 1) {
                        if (gamecard.state < 3.5 && gamecard.state % 2 == 0) {
                            if (gamecard.redCount > gamecard.blueCount) {
                                yourturn = true;
                                p.textContent = "輪到你為A班學生提供筆記！";
                            }
                        } else if (gamecard.state > 3.5 && gamecard.state % 2 == 0) {
                            if (gamecard.redCount < gamecard.blueCount) {
                                yourturn = true;
                                p.textContent = "輪到你為A班學生提供筆記！";
                            }
                        }
                    }
                    gamecard.card.forEach((line, index) => {
                        const [visibleText, hiddenText] = line.split(':');
                        const card = document.createElement('div');
                        card.classList.add('card');
                        card.dataset.index = index;
                        card.textContent = visibleText;
                        if (gamecard.redanswer.includes(index)) {
                            card.classList.add('selected');
                        }
                        card.addEventListener('click', () => {
                            dialogText.textContent = hiddenText;
                            if (gamecard.colors[index] == "red" && yourturn && !gamecard.fliped[index]) {
                                revealButton.classList.remove("hidden");
                                if (card.classList.contains("selected")) {
                                    revealButton.textContent = "取消選擇";
                                } else {
                                    revealButton.textContent = "選擇";
                                }
                            } else {
                                revealButton.classList.add("hidden");
                            }
                            dialog.style.display = 'flex';
                            currentCard = card;
                        });
                        card.style.backgroundColor = gamecard.colors[index];
                        cardContainer.appendChild(card);
                    });
                } else if (position == "B班老師") {
                    if (data.ifgaming == 1) {
                        if (gamecard.state < 3.5 && gamecard.state % 2 == 0) {
                            if (gamecard.redCount < gamecard.blueCount) {
                                yourturn = true;
                                p.textContent = "輪到你為B班學生提供筆記！";
                            }
                        } else if (gamecard.state > 3.5 && gamecard.state % 2 == 0) {
                            if (gamecard.redCount > gamecard.blueCount) {
                                yourturn = true;
                                p.textContent = "輪到你為B班學生提供筆記！";
                            }
                        }
                    }
                    gamecard.card.forEach((line, index) => {
                        const [visibleText, hiddenText] = line.split(':');
                        const card = document.createElement('div');
                        card.classList.add('card');
                        card.dataset.index = index;
                        card.textContent = visibleText;
                        if (gamecard.redanswer.includes(index)) {
                            card.classList.add('selected');
                        }
                        card.addEventListener('click', () => {
                            dialogText.textContent = hiddenText;
                            revealButton.classList.remove("hidden");
                            if (gamecard.colors[index] == "blue" && yourturn && !gamecard.fliped[index]) {
                                revealButton.classList.remove("hidden");
                                if (card.classList.contains("selected")) {
                                    revealButton.textContent = "取消選擇";
                                } else {
                                    revealButton.textContent = "選擇";
                                }
                            } else {
                                revealButton.classList.add("hidden");
                            }
                            dialog.style.display = 'flex';
                            currentCard = card;
                        });
                        card.style.backgroundColor = gamecard.colors[index];
                        cardContainer.appendChild(card);
                    });
                } else if (position == "A班學生") {
                    if (data.ifgaming == 1) {
                        if (gamecard.state < 3.5 && gamecard.state % 2 == 1) {
                            if (gamecard.redCount > gamecard.blueCount) {
                                yourturn = true;
                                p.textContent = "輪到你們A班學生翻開老師指定考卷！";
                            }
                        } else if (gamecard.state > 3.5 && gamecard.state % 2 == 1) {
                            if (gamecard.redCount < gamecard.blueCount) {
                                yourturn = true;
                                p.textContent = "輪到你們A班學生翻開老師指定考卷！";
                            }
                        }
                    }
                    gamecard.card.forEach((line, index) => {
                        const [visibleText, hiddenText] = line.split(':');
                        const card = document.createElement('div');
                        card.classList.add('card');
                        card.dataset.index = index;
                        if (gamecard.fliped[index]) {
                            card.style.backgroundColor = gamecard.colors[index];
                        }
                        card.textContent = visibleText;
                        card.addEventListener('click', () => {
                            if (yourturn && !gamecard.fliped[index]) {
                                revealButton.classList.remove("hidden");
                            } else {
                                revealButton.classList.add("hidden");
                            }
                            dialogText.textContent = hiddenText;
                            dialog.style.display = 'flex';
                            currentCard = card;
                        });
                        cardContainer.appendChild(card);
                    });
                } else if (position == "B班學生") {
                    if (data.ifgaming == 1) {
                        if (gamecard.state < 3.5 && gamecard.state % 2 == 1) {
                            if (gamecard.redCount < gamecard.blueCount) {
                                yourturn = true;
                                p.textContent = "輪到你們B班學生翻開老師指定考卷！";
                            }
                        } else if (gamecard.state > 3.5 && gamecard.state % 2 == 1) {
                            if (gamecard.redCount > gamecard.blueCount) {
                                yourturn = true;
                                p.textContent = "輪到你們B班學生翻開老師指定考卷！";
                            }
                        }
                    }
                    gamecard.card.forEach((line, index) => {
                        const [visibleText, hiddenText] = line.split(':');
                        const card = document.createElement('div');
                        card.classList.add('card');
                        card.dataset.index = index;
                        if (gamecard.fliped[index]) {
                            card.style.backgroundColor = gamecard.colors[index];
                        }
                        card.textContent = visibleText;
                        card.addEventListener('click', () => {
                            if (yourturn && !gamecard.fliped[index]) {
                                revealButton.classList.remove("hidden");
                            } else {
                                revealButton.classList.add("hidden");
                            }
                            dialogText.textContent = hiddenText;
                            dialog.style.display = 'flex';
                            currentCard = card;
                        });
                        cardContainer.appendChild(card);
                    });
                } else if (position == "學生") {
                    if (data.ifgaming == 1) {
                        if (gamecard.state < 3.5 && gamecard.state % 2 == 1) {
                            yourturn = true;
                            if (gamecard.redCount < gamecard.blueCount) {
                                p.textContent = "輪到你翻開B班老師指定考卷！";
                            } else {
                                p.textContent = "輪到你翻開A班老師指定考卷！";
                            }
                        } else if (gamecard.state > 3.5 && gamecard.state % 2 == 1) {
                            yourturn = true;
                            if (gamecard.redCount > gamecard.blueCount) {
                                p.textContent = "輪到你翻開B班老師指定考卷！";
                            } else {
                                p.textContent = "輪到你翻開A班老師指定考卷！";
                            }
                        }
                    }
                    gamecard.card.forEach((line, index) => {
                        const [visibleText, hiddenText] = line.split(':');
                        const card = document.createElement('div');
                        card.classList.add('card');
                        card.dataset.index = index;
                        if (gamecard.fliped[index]) {
                            card.style.backgroundColor = gamecard.colors[index];
                        }
                        card.textContent = visibleText;
                        card.addEventListener('click', () => {
                            if (yourturn && !gamecard.fliped[index]) {
                                revealButton.classList.remove("hidden");
                            } else {
                                revealButton.classList.add("hidden");
                            }
                            dialogText.textContent = hiddenText;
                            dialog.style.display = 'flex';
                            currentCard = card;
                        });
                        cardContainer.appendChild(card);
                    });
                }
            }
            if (yourturn) {
                submitSelection.classList.remove("hidden");
                p.classList.remove("hidden")
            } else {
                submitSelection.classList.add("hidden");
                p.classList.add("hidden")
            }
            if (data.chat) {
                const chatbody = document.getElementById('chat-body');
                for (var i = chat.length; i < data.chat.length; i++) {
                    if (data.chat[i].id != sessionStorage.getItem("id")) {
                        var newchat = document.createElement('div');
                        newchat.classList.add('message');
                        newchat.textContent = data.chat[i].id + "：";
                        var newchattext = document.createElement('div');
                        newchattext.classList.add('message-text');
                        if (data.chat[i].type == '通知') {
                            newchattext.classList.add('notify');
                        }
                        newchattext.textContent = data.chat[i].chat
                        newchat.appendChild(newchattext);
                        chatbody.appendChild(newchat);
                    } else {
                        var newchat = document.createElement('div');
                        newchat.classList.add('message-right');
                        var newchattext = document.createElement('div');
                        newchattext.classList.add('message-text-right');
                        if (data.chat[i].type == '通知') {
                            newchattext.classList.add('notify-right');
                        }
                        newchattext.textContent = data.chat[i].chat
                        newchat.appendChild(newchattext);
                        chatbody.appendChild(newchat);
                    }
                }
                chat = data.chat;
            }
        } else {
            alert(data.message);
        }
    } else if (data.type == "question") {
        const q = document.getElementById('q');
        const A = document.getElementById('At');
        const B = document.getElementById('Bt');
        const C = document.getElementById('Ct');
        const D = document.getElementById('Dt');
        q.textContent = data.question.q;
        A.innerHTML = "(A)" + data.question.A;
        B.innerHTML = "(B)" + data.question.B;
        C.innerHTML = "(C)" + data.question.C;
        D.innerHTML = "(D)" + data.question.D;
        quizDialog.showModal();
    } else if (data.type == "over") {
        window.location.href = "waiting.html";
    } else if (data.type.includes(".html")) {
        alert(data.message);
        window.location.href = data.type;
    } else {
        alert(data.message);
    }
}





// Open prompt dialog
promptCardButton.addEventListener('click', () => {
    promptDialog.style.display = 'flex';
});

// Close main dialog
closeDialog.addEventListener('click', () => {
    dialog.style.display = 'none';
    currentCard = null;
});

// Close prompt dialog
closePromptDialog.addEventListener('click', () => {
    promptDialog.style.display = 'none';
});

// Submit prompt selection
submitSelection.addEventListener('click', () => {
    if (selectedPrompts.length > 1) {
        const temp = document.querySelectorAll('.prompt-button.selected[data-category="四大分類"]');
        if (temp.length == 1) {
            if (selectedCards.length > 0) {
                const confirmSelection = confirm(`您選擇了筆記: ${selectedPrompts.join(', ')}\n以及答案：${selectedCardsName.join(', ')}\n是否確定?`);
                if (confirmSelection) {
                    promptDialog.style.display = 'none';
                    ws.send(JSON.stringify({ type: "筆記", prompt: selectedPrompts, answer: selectedCards }));
                    selectedPrompts = [];
                    selectedCards = [];
                    selectedCardsName = [];
                    document.querySelectorAll('.prompt-button').forEach(button => button.classList.remove('selected'));
                }
            } else {
                alert('請選擇至少選擇一個考卷作為答案');
            }
        } else if (temp.length > 1) {
            alert('請選擇至多一個四大分類筆記');
        } else {
            alert('請選擇一個四大分類筆記');
        }
    } else {
        alert('請選擇二到三個筆記(一個四大分類+其他)');
    }
});
submitBtn.addEventListener('click', (event) => {
    event.preventDefault();
    const selectedChoice = document.querySelector('input[name="choices"]:checked');
    if (selectedChoice) {
        const answer = selectedChoice.value;
        quizDialog.close();
        ws.send(JSON.stringify({ type: "回答", answer: answer }));
        quizForm.reset();
    } else {
        alert('請選擇一張考卷作為答案。');
    }
});
revealButton.addEventListener('click', () => {
    if (currentCard) {
        if (position.includes("老師") && yourturn) {
            if (currentCard.classList.contains("selected")) {
                currentCard.classList.remove("selected");
                selectedCards = selectedCards.filter(item => item != currentCard.dataset.index);
                selectedCardsName = selectedCardsName.filter(item => item != currentCard.textContent);
            } else {
                currentCard.classList.add("selected");
                selectedCards.push(currentCard.dataset.index);
                selectedCardsName.push(currentCard.textContent);
            }
        } else if (position.includes("學生") && yourturn) {
            ws.send(JSON.stringify({ type: "答題", flip: currentCard.dataset.index }));
        }
    }
    dialog.style.display = 'none';
});
function replays() {
    ws.send(JSON.stringify({ type: "重新考試" }));
}
function send() {
    ws.send(JSON.stringify({ type: "聊天", chat: document.getElementById('messageInput').value }));
}