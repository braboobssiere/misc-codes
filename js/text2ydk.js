let errorLog = '';

function logError(message) {
    errorLog += message + '\n';
}

document.getElementById('converterForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const fileInput = document.getElementById('fileInput');
    const textInput = document.getElementById('textInput').value.trim();
    let inputText = '';

    // JSZip instance for multiple files
    const zip = new JSZip();
    let multipleFiles = fileInput.files.length > 1;

    // Hide YDKE URL container by default
    document.getElementById('ydkeUrlContainer').style.display = 'none';

    if (fileInput.files.length > 0) {
        const ydkPromises = [];

        for (const file of fileInput.files) {
            if (file.name.endsWith('.txt')) {
                const reader = new FileReader();
                const ydkPromise = new Promise((resolve, reject) => {
                    reader.onload = async (event) => {
                        inputText = event.target.result;
                        const ydkContent = await processInput(inputText, file.name);
                        resolve({ content: ydkContent, name: file.name.replace('.txt', '.ydk') });
                    };
                    reader.onerror = reject;
                    reader.readAsText(file);
                });
                ydkPromises.push(ydkPromise);
            } else {
                alert(`${file.name} is not a .txt file.`);
                logError(`${file.name} is not a .txt file.`);
                downloadLog();
            }
        }

        // Wait for all YDK files to be generated
        const ydkFiles = await Promise.all(ydkPromises);

        if (multipleFiles) {
            // Add all YDK files to the ZIP
            ydkFiles.forEach(file => {
                zip.file(file.name, file.content);
            });

            // Generate the ZIP and trigger download
            zip.generateAsync({ type: 'blob' }).then((blob) => {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'decks.zip';
                link.click();
            });
        } else {
            // Single file, download YDK directly
            createDownloadLink(ydkFiles[0].content, ydkFiles[0].name);

            // Only display YDKE URL for a single file
            const ydkContent = ydkFiles[0].content;
            const cardRequests = parseCardRequests(ydkContent);  // Get card requests from ydk content
            const ydkeUrl = generateYdkeUrl(cardRequests);
            displayYdkeUrl(ydkeUrl);
        }

    } else if (textInput) {
        // For text input, generate a single YDK
        inputText = textInput;
        const ydkContent = await processInput(inputText);
        createDownloadLink(ydkContent);

        // Only display YDKE URL for a single text input
        const cardRequests = parseCardRequests(ydkContent);
        const ydkeUrl = generateYdkeUrl(cardRequests);
        displayYdkeUrl(ydkeUrl);
    } else {
        alert('Please provide either a file or text input.');
        logError('No input provided.');
        downloadLog();
    }
});

// Function to parse card requests from YDK content (needed for generating YDKE URL)
function parseCardRequests(ydkContent) {
    const lines = ydkContent.split('\n');
    const cardRequests = [];

    for (const line of lines) {
        if (line && !line.startsWith('#') && !line.startsWith('!')) {
            cardRequests.push({ cardId: line });
        }
    }
    return cardRequests;
}

async function processInput(inputText, fileName = '') {
    const sections = inputText.split(/\n{2,}/).map(section => section.trim());
    const mainDeck = sections[0] ? sections[0].split('\n').map(line => line.trim()).filter(line => line) : [];
    const extraDeck = sections[1] ? sections[1].split('\n').map(line => line.trim()).filter(line => line) : [];
    const sideDeck = sections[2] ? sections[2].split('\n').map(line => line.trim()).filter(line => line) : [];

    const cardRequests = [
        ...mainDeck.map(line => {
            const [quantity, ...cardNameParts] = line.split(' ');
            return { quantity: parseInt(quantity), cardName: cardNameParts.join(' '), type: 'main' };
        }),
        ...extraDeck.map(line => {
            const [quantity, ...cardNameParts] = line.split(' ');
            return { quantity: parseInt(quantity), cardName: cardNameParts.join(' '), type: 'extra' };
        }),
        ...sideDeck.map(line => {
            const [quantity, ...cardNameParts] = line.split(' ');
            return { quantity: parseInt(quantity), cardName: cardNameParts.join(' '), type: 'side' };
        })
    ];

    const cardNames = cardRequests.map(card => encodeURIComponent(card.cardName)).join('|');
    const apiUrl = `https://db.ygoprodeck.com/api/v7/cardinfo.php?name=${cardNames}`;
    
    logError(`API Call: ${apiUrl}`);

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        logError(`API Response: ${JSON.stringify(data)}`);

        if (data && data.data && Array.isArray(data.data) && data.data.length > 0) {
            const ydkContent = generateYdkContent(data.data, cardRequests);
            return ydkContent;  // Return generated YDK content
        } else {
            const errorMessage = data && data.error ? data.error : 'Unknown error occurred.';
            alert('Error fetching card data: ' + errorMessage);
            logError('Error fetching card data: ' + errorMessage);
            downloadLog();
        }
    } catch (error) {
        console.error('Fetch error:', error);
        alert('Error fetching card data. Please try again.');
        logError('Fetch error: ' + error.message);
        downloadLog();
    }
}

function createDownloadLink(content, fileName = 'deck.ydk') {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = fileName;
    downloadLink.click();
}

function generateYdkContent(cardData, cardRequests) {
    const ydkLines = [];
    ydkLines.push("#created by TCGPlayer Text to YDK Converter");

    ydkLines.push("#main");
    cardRequests.filter(req => req.type === 'main').forEach(request => {
        const cardInfo = cardData.find(card => card.name === request.cardName);
        if (cardInfo) {
            for (let i = 0; i < request.quantity; i++) {
                ydkLines.push(cardInfo.id.toString());
            }
        } else {
            logError(`Card not found in main deck: ${request.cardName}`);
        }
    });

    ydkLines.push("#extra");
    cardRequests.filter(req => req.type === 'extra').forEach(request => {
        const cardInfo = cardData.find(card => card.name === request.cardName);
        if (cardInfo) {
            for (let i = 0; i < request.quantity; i++) {
                ydkLines.push(cardInfo.id.toString());
            }
        } else {
            logError(`Card not found in extra deck: ${request.cardName}`);
        }
    });

    ydkLines.push("!side");
    cardRequests.filter(req => req.type === 'side').forEach(request => {
        const cardInfo = cardData.find(card => card.name === request.cardName);
        if (cardInfo) {
            for (let i = 0; i < request.quantity; i++) {
                ydkLines.push(cardInfo.id.toString());
            }
        } else {
            logError(`Card not found in side deck: ${request.cardName}`);
        }
    });

    return ydkLines.join('\n').trim();
}

function generateYdkeUrl(cardRequests) {
    const mainDeckIds = cardRequests.map(request => request.cardId);
    const base64Main = passcodesToBase64(new Uint32Array(mainDeckIds));
    return `ydke://${base64Main}!!`;
}

function passcodesToBase64(passcodes) {
    return btoa(String.fromCharCode.apply(null, new Uint8Array(passcodes.buffer)));
}

function displayYdkeUrl(ydkeUrl) {
    const ydkeUrlContainer = document.getElementById('ydkeUrlContainer');
    const ydkeUrlElement = document.getElementById('ydkeUrl');
    const copyFeedback = document.getElementById('copyFeedback');
    
    ydkeUrlElement.textContent = ydkeUrl;
    ydkeUrlContainer.style.display = 'block';  // Show the YDKE URL container

    // Copy to clipboard functionality
    document.getElementById('copyUrlButton').onclick = () => {
        navigator.clipboard.writeText(ydkeUrl).then(() => {
            // Show feedback text when copied successfully
            copyFeedback.style.display = 'block';
            setTimeout(() => {
                copyFeedback.style.display = 'none';
            }, 2000);
        }).catch(err => {
            console.error('Could not copy text: ', err);
        });
    };
}

function downloadLog() {
    if (errorLog) {
        const logBlob = new Blob([errorLog], { type: 'text/plain' });
        const logUrl = URL.createObjectURL(logBlob);
        const logDownloadLink = document.getElementById('logDownloadLink');
        logDownloadLink.href = logUrl;
        document.getElementById('logDownloadContainer').style.display = 'block';
    }

}
