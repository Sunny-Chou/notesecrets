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
const dialogText = document.getElementById('dialogText');
const promptDialog = document.getElementById('promptDialog');
const closePromptDialog = document.getElementById('closePromptDialog');
const submitSelection = document.getElementById('submitSelection');
const promptButtonsContainer = document.getElementById('promptButtonsContainer');
const quizForm = document.getElementById('quizForm');
const quizDialog = document.getElementById('quizDialog');
const submitBtn = document.getElementById('submitBtn');
const p = document.getElementById('p');
const p2 = document.getElementById('p2');
const p3 = document.getElementById('p3');
const p4 = document.getElementById('p4');
const p5 = document.getElementById('p5');
const p6 = document.getElementById('p6');
const p7 = document.getElementById('p7');
const p8 = document.getElementById('p8');
const p9 = document.getElementById('p9');
const p10 = document.getElementById('p10');
const p11 = document.getElementById('p11');
const replay = document.getElementById("replay");
let redCardsTotal = 0;
let blueCardsTotal = 0;
let redCardsRevealed = 0;
let blueCardsRevealed = 0;
const ws = new WebSocket('wss://notesecrets.onrender.com');
ws.onopen = function (event) {
    if (sessionStorage.getItem('room') && sessionStorage.getItem('id')) {
        ws.send(JSON.stringify({ type: "更新教室", room: sessionStorage.getItem('room'), id: sessionStorage.getItem('id') }));
    } else {
        window.location.href = "index.html";
    }
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
                    p2.innerHTML = "A班";
                    p2.classList.add("red");
                    p3.innerHTML = "老師";
                    p4.innerHTML = "，請選擇";
                    p5.innerHTML = "紅色";
                    p5.classList.add("red");
                    p6.innerHTML = "考卷作為答案";
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
                        card.classList.add('card-' + gamecard.colors[index]);
                        if (gamecard.fliped[index]) {
                            card.classList.add('fliped');
                            card.addEventListener('click', () => {
                                dialogText.textContent = hiddenText;
                                dialog.style.display = 'flex';
                            });
                        } else {
                            if (gamecard.redanswer.includes(index.toString())) {
                                card.classList.add('selected');
                            }
                            card.addEventListener('click', function () {
                                if (gamecard.colors[this.dataset.index] == "red" && yourturn) {
                                    if (this.classList.contains("selected")) {
                                        this.classList.remove("selected");
                                    } else {
                                        this.classList.add("selected");
                                    }
                                }
                            });
                        }
                        cardContainer.appendChild(card);
                    });
                    promptButtonsContainer.innerHTML = "";
                    Object.keys(gamecard.prompt).forEach(category => {
                        const categoryDiv = document.createElement('div');
                        categoryDiv.classList.add('category-container');
                        const categoryTitle = document.createElement('h3');
                        categoryTitle.textContent = category;
                        gamecard.prompt[category].forEach(text => {
                            const button = document.createElement('div');
                            button.classList.add('prompt-button');
                            button.textContent = text;
                            button.dataset.category = category;
                            button.addEventListener('click', () => {
                                var selecteds = document.querySelectorAll('.prompt-button.selected');
                                if (button.classList.contains("selected")) {
                                    button.classList.remove('selected');
                                } else if (selecteds.length < 3) {
                                    button.classList.add('selected');
                                }
                            });
                            categoryDiv.appendChild(button);
                        });
                        promptButtonsContainer.appendChild(categoryTitle);
                        promptButtonsContainer.appendChild(categoryDiv);
                    });
                } else if (position == "B班老師") {
                    p2.innerHTML = "B班";
                    p2.classList.add("blue");
                    p3.innerHTML = "老師";
                    p4.innerHTML = "，請選擇";
                    p5.innerHTML = "藍色";
                    p5.classList.add("blue");
                    p6.innerHTML = "考卷作為答案";
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
                        card.classList.add('card-' + gamecard.colors[index]);
                        if (gamecard.fliped[index]) {
                            card.classList.add('fliped');
                            card.addEventListener('click', () => {
                                dialogText.textContent = hiddenText;
                                dialog.style.display = 'flex';
                            });
                        } else {
                            if (gamecard.blueanswer.includes(index.toString())) {
                                card.classList.add('selected');
                            }
                            card.addEventListener('click', function () {
                                if (gamecard.colors[this.dataset.index] == "blue" && yourturn) {
                                    if (this.classList.contains("selected")) {
                                        this.classList.remove("selected");
                                    } else {
                                        this.classList.add("selected");
                                    }
                                }
                            });
                        }
                        cardContainer.appendChild(card);
                    });
                    promptButtonsContainer.innerHTML = "";
                    Object.keys(gamecard.prompt).forEach(category => {
                        const categoryDiv = document.createElement('div');
                        categoryDiv.classList.add('category-container');
                        const categoryTitle = document.createElement('h3');
                        categoryTitle.textContent = category;
                        gamecard.prompt[category].forEach(text => {
                            const button = document.createElement('div');
                            button.classList.add('prompt-button');
                            button.textContent = text;
                            button.dataset.category = category;
                            button.addEventListener('click', () => {
                                var selecteds = document.querySelectorAll('.prompt-button.selected');
                                if (button.classList.contains("selected")) {
                                    button.classList.remove('selected');
                                } else if (selecteds.length < 3) {
                                    button.classList.add('selected');
                                }
                            });
                            categoryDiv.appendChild(button);
                        });
                        promptButtonsContainer.appendChild(categoryTitle);
                        promptButtonsContainer.appendChild(categoryDiv);
                    });
                } else if (position == "A班學生") {
                    p2.innerHTML = "A班";
                    p2.classList.add("red");
                    p3.innerHTML = "學生";
                    p4.innerHTML = "，請搶先翻滿" + gamecard.redCount + "張";
                    p5.innerHTML = "紅色";
                    p5.classList.add("red");
                    p6.innerHTML = "考卷";
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
                        card.textContent = visibleText;
                        if (gamecard.fliped[index]) {
                            card.classList.add('card-' + gamecard.colors[index]);
                            card.classList.add('fliped');
                            card.addEventListener('click', () => {
                                dialogText.textContent = hiddenText;
                                dialog.style.display = 'flex';
                            });
                        } else {
                            card.classList.add('card-white');
                            card.addEventListener('click', () => {
                                if (yourturn) {
                                    const confirmSelection = confirm("你是否翻開" + card.textContent + "？");
                                    if (confirmSelection) {
                                        ws.send(JSON.stringify({ type: "答題", flip: card.dataset.index }));
                                    }
                                }
                            });
                        }
                        cardContainer.appendChild(card);
                    });
                } else if (position == "B班學生") {
                    p2.innerHTML = "B班";
                    p2.classList.add("blue");
                    p3.innerHTML = "學生";
                    p4.innerHTML = "，請搶先翻滿" + gamecard.blueCount + "張";
                    p5.innerHTML = "藍色";
                    p5.classList.add("blue");
                    p6.innerHTML = "考卷";
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
                        card.textContent = visibleText;
                        if (gamecard.fliped[index]) {
                            card.classList.add('card-' + gamecard.colors[index]);
                            card.classList.add('fliped');
                            card.addEventListener('click', () => {
                                dialogText.textContent = hiddenText;
                                dialog.style.display = 'flex';
                            });
                        } else {
                            card.classList.add('card-white');
                            card.addEventListener('click', () => {
                                if (yourturn) {
                                    const confirmSelection = confirm("你是否翻開" + card.textContent + "？");
                                    if (confirmSelection) {
                                        ws.send(JSON.stringify({ type: "答題", flip: card.dataset.index }));
                                    }
                                }
                            });
                        }
                        cardContainer.appendChild(card);
                    });
                } else if (position == "學生") {
                    p7.innerHTML = "A";
                    p7.classList.add("red");
                    p8.innerHTML = "、";
                    p2.innerHTML = "B";
                    p2.classList.add("blue");
                    p3.innerHTML = "班學生";
                    p4.innerHTML = "，你的目標是同時搶先翻滿" + gamecard.redCount + "張";
                    p5.innerHTML = "紅色";
                    p5.classList.add("red");
                    p6.innerHTML = "考卷";
                    p9.innerHTML = "和" + gamecard.blueCount + "張";
                    p10.innerHTML = "藍色";
                    p10.classList.add("blue");
                    p11.innerHTML = "考卷";
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
                        card.textContent = visibleText;
                        if (gamecard.fliped[index]) {
                            card.classList.add('card-' + gamecard.colors[index]);
                            card.classList.add('fliped');
                            card.addEventListener('click', () => {
                                dialogText.textContent = hiddenText;
                                dialog.style.display = 'flex';
                            });
                        } else {
                            card.classList.add('card-white');
                            card.addEventListener('click', () => {
                                if (yourturn) {
                                    const confirmSelection = confirm("你是否翻開" + card.textContent + "？");
                                    if (confirmSelection) {
                                        ws.send(JSON.stringify({ type: "答題", flip: card.dataset.index }));
                                    }
                                }
                            });
                        }
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
                    var newchat = document.createElement('div');
                    if (data.chat[i].id != sessionStorage.getItem("id")) {
                        newchat.classList.add('message');
                        newchat.textContent = data.chat[i].id + "：";
                    } else {
                        var newchat = document.createElement('div');
                        newchat.classList.add('message-right');
                    }
                    var newchattext = document.createElement('div');
                    if (data.chat[i].type == '通知') {
                        newchattext.classList.add('notify-text');
                    } else if (data.chat[i].position.includes("A班")) {
                        newchattext.classList.add('message-text-red');
                    } else if (data.chat[i].position.includes("B班")) {
                        newchattext.classList.add('message-text-blue');
                    } else {
                        newchattext.classList.add('message-text-red-blue');
                    }
                    newchattext.textContent = data.chat[i].chat
                    newchat.appendChild(newchattext);
                    chatbody.appendChild(newchat);
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
                        card.classList.add('card-' + gamecard.colors[index]);
                        if (gamecard.fliped[index]) {
                            card.classList.add('fliped');
                            card.addEventListener('click', () => {
                                dialogText.textContent = hiddenText;
                                dialog.style.display = 'flex';
                            });
                        } else {
                            if (gamecard.redanswer.includes(index.toString())) {
                                card.classList.add('selected');
                            }
                            card.addEventListener('click', function () {
                                if (gamecard.colors[this.dataset.index] == "red" && yourturn) {
                                    if (this.classList.contains("selected")) {
                                        this.classList.remove("selected");
                                    } else {
                                        this.classList.add("selected");
                                    }
                                }
                            });
                        }
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
                        card.classList.add('card-' + gamecard.colors[index]);
                        if (gamecard.fliped[index]) {
                            card.classList.add('fliped');
                            card.addEventListener('click', () => {
                                dialogText.textContent = hiddenText;
                                dialog.style.display = 'flex';
                            });
                        } else {
                            if (gamecard.blueanswer.includes(index.toString())) {
                                card.classList.add('selected');
                            }
                            card.addEventListener('click', function () {
                                if (gamecard.colors[this.dataset.index] == "blue" && yourturn) {
                                    if (this.classList.contains("selected")) {
                                        this.classList.remove("selected");
                                    } else {
                                        this.classList.add("selected");
                                    }
                                }
                            });
                        }
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
                        card.textContent = visibleText;
                        if (gamecard.fliped[index]) {
                            card.classList.add('card-' + gamecard.colors[index]);
                            card.classList.add('fliped');
                            card.addEventListener('click', () => {
                                dialogText.textContent = hiddenText;
                                dialog.style.display = 'flex';
                            });
                        } else {
                            card.classList.add('card-white');
                            card.addEventListener('click', () => {
                                if (yourturn) {
                                    const confirmSelection = confirm("你是否翻開" + card.textContent + "？");
                                    if (confirmSelection) {
                                        ws.send(JSON.stringify({ type: "答題", flip: card.dataset.index }));
                                    }
                                }
                            });
                        }
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
                        card.textContent = visibleText;
                        if (gamecard.fliped[index]) {
                            card.classList.add('card-' + gamecard.colors[index]);
                            card.classList.add('fliped');
                            card.addEventListener('click', () => {
                                dialogText.textContent = hiddenText;
                                dialog.style.display = 'flex';
                            });
                        } else {
                            card.classList.add('card-white');
                            card.addEventListener('click', () => {
                                if (yourturn) {
                                    const confirmSelection = confirm("你是否翻開" + card.textContent + "？");
                                    if (confirmSelection) {
                                        ws.send(JSON.stringify({ type: "答題", flip: card.dataset.index }));
                                    }
                                }
                            });
                        }
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
                        card.textContent = visibleText;
                        if (gamecard.fliped[index]) {
                            card.classList.add('card-' + gamecard.colors[index]);
                            card.classList.add('fliped');
                            card.addEventListener('click', () => {
                                dialogText.textContent = hiddenText;
                                dialog.style.display = 'flex';
                            });
                        } else {
                            card.classList.add('card-white');
                            card.addEventListener('click', () => {
                                if (yourturn) {
                                    const confirmSelection = confirm("你是否翻開" + card.textContent + "？");
                                    if (confirmSelection) {
                                        ws.send(JSON.stringify({ type: "答題", flip: card.dataset.index }));
                                    }
                                }
                            });
                        }
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
                    var newchat = document.createElement('div');
                    if (data.chat[i].id != sessionStorage.getItem("id")) {
                        newchat.classList.add('message');
                        newchat.textContent = data.chat[i].id + "：";
                    } else {
                        var newchat = document.createElement('div');
                        newchat.classList.add('message-right');
                    }
                    var newchattext = document.createElement('div');
                    if (data.chat[i].type == '通知') {
                        newchattext.classList.add('notify-text');
                    } else if (data.chat[i].position.includes("A班")) {
                        newchattext.classList.add('message-text-red');
                    } else if (data.chat[i].position.includes("B班")) {
                        newchattext.classList.add('message-text-blue');
                    } else {
                        newchattext.classList.add('message-text-red-blue');
                    }
                    newchattext.textContent = data.chat[i].chat
                    newchat.appendChild(newchattext);
                    chatbody.appendChild(newchat);
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
    } else if (!data.success) {
        alert(data.message);
    } else if (data.type == "join") {
        window.location.href = "waiting.html";
    }
}
// Open prompt dialog
promptCardButton.addEventListener('click', () => {
    promptDialog.style.display = 'flex';
});

// Close main dialog
closeDialog.addEventListener('click', () => {
    dialog.style.display = 'none';
});

closePromptDialog.addEventListener('click', () => {
    promptDialog.style.display = 'none';
});

submitSelection.addEventListener('click', () => {
    const selecteds = Array.from(document.querySelectorAll('.prompt-button.selected')).map(item => item = item.textContent);
    const selectedsCard = Array.from(document.querySelectorAll('.card.selected')).map(item => item = item.textContent);
    const selectedsCardindex = Array.from(document.querySelectorAll('.card.selected')).map(item => item = item.dataset.index);
    if (selecteds.length > 1) {
        const temp = document.querySelectorAll('.prompt-button.selected[data-category="四大分類（必選一）"]');
        if (temp.length == 1) {
            if (selectedsCard.length > 0) {
                const confirmSelection = confirm(`您選擇了筆記: ${selecteds.join(', ')}\n以及答案：${selectedsCard.join(', ')}\n是否確定?`);
                if (confirmSelection) {
                    promptDialog.style.display = 'none';
                    ws.send(JSON.stringify({ type: "筆記", prompt: selecteds, answer: selectedsCardindex }));
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
        selectedChoice.checked = false;
    } else {
        alert('請選擇一個選項作為答案。');
    }
});
function replays() {
    ws.send(JSON.stringify({ type: "重新考試" }));
}
function send() {
    if (document.getElementById('messageInput').value !== "") {
        ws.send(JSON.stringify({ type: "聊天", chat: document.getElementById('messageInput').value }));
        document.getElementById('messageInput').value = '';
    }
}
document.addEventListener('DOMContentLoaded', (event) => {
    const input = document.getElementById('messageInput');
    input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            send();
        }
    });
});