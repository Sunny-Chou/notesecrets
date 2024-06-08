// script.js
document.addEventListener('DOMContentLoaded', () => {
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

    let selectedPrompts = [];
    let currentCard = null;

    let redCardsTotal = 0;
    let blueCardsTotal = 0;
    let redCardsRevealed = 0;
    let blueCardsRevealed = 0;

    // Read the first file and generate cards
    fetch('data1.txt')
        .then(response => response.text())
        .then(data => {
            const lines = data.split('\n').map(line => line.trim()).filter(line => line !== '');
            console.log(lines)
            const selectedLines = [];
            while (selectedLines.length < 20) {
                const randomIndex = Math.floor(Math.random() * lines.length);
                if (!selectedLines.includes(lines[randomIndex])) {
                    selectedLines.push(lines[randomIndex]);
                }
            }

            const redCount = Math.floor(Math.random() * 2) + 7;
            const blueCount = 15 - redCount;
            redCardsTotal = redCount;
            blueCardsTotal = blueCount;

            const colors = Array(5).fill('white').concat(Array(redCount).fill('red'), Array(blueCount).fill('blue'));
            shuffleArray(colors);

            selectedLines.forEach((line, index) => {
                const [visibleText, hiddenText] = line.split(':');
                const card = document.createElement('div');
                card.classList.add('card');
                card.textContent = visibleText;
                card.dataset.color = colors[index];
                card.dataset.hiddenText = hiddenText;
                card.addEventListener('click', () => {
                    dialogText.textContent = hiddenText;
                    dialog.style.display = 'flex';
                    currentCard = card;
                });
                cardContainer.appendChild(card);
            });
        });

    // Read the second file and generate prompt buttons
    fetch('data2.txt')
        .then(response => response.text())
        .then(data => {
            const lines = data.split('\n').map(line => line.trim()).filter(line => line !== '');
            lines.forEach((text, index) => {
                const button = document.createElement('div');
                button.classList.add('prompt-button');
                button.textContent = text;
                button.addEventListener('click', () => {
                    if (selectedPrompts.includes(text)) {
                        selectedPrompts = selectedPrompts.filter(item => item !== text);
                        button.classList.remove('selected');
                    } else if (selectedPrompts.length < 3) {
                        selectedPrompts.push(text);
                        button.classList.add('selected');
                    }
                });
                promptButtonsContainer.appendChild(button);
            });
        });

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
        selectedPrompts = [];
        document.querySelectorAll('.prompt-button').forEach(button => button.classList.remove('selected'));
    });

    // Submit prompt selection
    submitSelection.addEventListener('click', () => {
        if (selectedPrompts.length > 0) {
            const confirmSelection = confirm(`您選擇了: ${selectedPrompts.join(', ')}\n是否確定?`);
            if (confirmSelection) {
                alert(`您選擇了: ${selectedPrompts.join(', ')}`);
                promptDialog.style.display = 'none';
                selectedPrompts = [];
                document.querySelectorAll('.prompt-button').forEach(button => button.classList.remove('selected'));
            }
        } else {
            alert('請選擇至少一個提示卡');
        }
    });

    // Reveal card color
    revealButton.addEventListener('click', () => {
        if (currentCard) {
            const color = currentCard.dataset.color;
            currentCard.style.backgroundColor = color;
            if (color === 'red') {
                redCardsRevealed++;
                currentCard.style.color = "white";
            } else if (color === 'blue') {
                blueCardsRevealed++;
                currentCard.style.color = "white";
            }
            checkForWinner();
            dialog.style.display = 'none';
        }
    });

    // Check for winner
    function checkForWinner() {
        if (redCardsRevealed === redCardsTotal) {
            alert('紅色卡片全部翻開，紅色獲勝！');
        } else if (blueCardsRevealed === blueCardsTotal) {
            alert('藍色卡片全部翻開，藍色獲勝！');
        }
    }

    // Shuffle array helper function
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
});
