let errorLog = '';

function logError(message) {
    errorLog += message + '\n';
}

document.getElementById('converterForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById('fileInput');
    const textInput = document.getElementById('textInput').value.trim();
    let inputText = '';

    if (fileInput.files.length > 0) {
        const files = Array.from(fileInput.files);
        if (files.length > 1) {
            await processMultipleFiles(files);
        } else {
            const reader = new FileReader();
            reader.onload = async (event) => {
                inputText = event.target.result;
                await processInput(inputText);
            };
            reader.readAsText(files[0]);
        }
    } else if (textInput) {
        inputText = textInput;
        await processInput(inputText);
    } else {
        alert('Please provide either a file or text input.');
        logError('No input provided.');
        downloadLog();
    }
});

async function processMultipleFiles(files) {
    const ydkContents = [];
    for (const file of files) {
        const text = await readFileAsText(file);
        const ydkContent = await processInput(text, false); // No YDKE generation
        ydkContents.push({ name: file.name.replace('.txt', '.ydk'), content: ydkContent });
    }
    createZipDownload(ydkContents);
}

function readFileAsText(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result);
        reader.readAsText(file);
    });
}

async function processInput(inputText, createLink = true) {
    const sections = inputText.split(/\n{2,}/).map(section => section.trim());
    const mainDeck = sections[0] ? sections[0].split('\n').map(line => line.trim()).filter(line => line) : [];
    const extraDeck = sections[1] ? sections[1].split('\n').map(line => line.trim()).filter(line => line) : [];
    const sideDeck = sections[2] ? sections[2].split('\n').map(line => line.trim()).filter(line => line) : [];

    const cardRequests = [
        ...mainDeck.map(line => ({ quantity: parseInt(line.split(' ')[0]), cardName: line.split(' ').slice(1).join(' '), type: 'main' })),
        ...extraDeck.map(line => ({ quantity: parseInt(line.split(' ')[0]), cardName: line.split(' ').slice(1).join(' '), type: 'extra' })),
        ...sideDeck.map(line => ({ quantity: parseInt(line.split(' ')[0]), cardName: line.split(' ').slice(1).join(' '), type: 'side' }))
    ];

    const cardNames = cardRequests.map(card => encodeURIComponent(card.cardName)).join('|');
    const apiUrl = `https://db.ygoprodeck.com/api/v7/cardinfo.php?name=${cardNames}`;

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data && data.data && Array.isArray(data.data) && data.data.length > 0) {
            const ydkContent = generateYdkContent(data.data, cardRequests);
            if (createLink) createDownloadLink(ydkContent); // Create YDK link if single file

            const ydkeUrl = generateYdkeUrl(data.data, cardRequests); // Generate YDKE only for single file
            if (createLink) displayYdkeUrl(ydkeUrl);

            return ydkContent; // Return the YDK content
        } else {
            logError('Error fetching card data.');
            downloadLog();
        }
    } catch (error) {
        logError('Fetch error: ' + error.message);
        downloadLog();
    }
}

function generateYdkContent(cardData, cardRequests) {
    const ydkLines = [];
    ydkLines.push("#created by TCGPlayer Text to YDK Converter");
    
    // Main Deck
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
    
    // Extra Deck
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
    
    // Side Deck
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

function generateYdkeUrl(cardData, cardRequests) {
    const mainDeckIds = [];
    const extraDeckIds = [];
    const sideDeckIds = [];

    // Collect card IDs for YDKE URL
    cardRequests.filter(req => req.type === 'main').forEach(request => {
        const cardInfo = cardData.find(card => card.name === request.cardName);
        if (cardInfo) {
            for (let i = 0; i < request.quantity; i++) {
                mainDeckIds.push(cardInfo.id);
            }
        }
    });
    cardRequests.filter(req => req.type === 'extra').forEach(request => {
        const cardInfo = cardData.find(card => card.name === request.cardName);
        if (cardInfo) {
            for (let i = 0; i < request.quantity; i++) {
                extraDeckIds.push(cardInfo.id);
            }
        }
    });
    cardRequests.filter(req => req.type === 'side').forEach(request => {
        const cardInfo = cardData.find(card => card.name === request.cardName);
        if (cardInfo) {
            for (let i = 0; i < request.quantity; i++) {
                sideDeckIds.push(cardInfo.id);
            }
        }
    });

    // Convert to Uint32Array
    const mainDeckArray = new Uint32Array(mainDeckIds);
    const extraDeckArray = new Uint32Array(extraDeckIds);
    const sideDeckArray = new Uint32Array(sideDeckIds);

    // Convert to YDKE format
    const base64Main = passcodesToBase64(mainDeckArray);
    const base64Extra = passcodesToBase64(extraDeckArray);
    const base64Side = passcodesToBase64(sideDeckArray);
    
    return `ydke://${base64Main}!${base64Extra}!${base64Side}!`;
}

function passcodesToBase64(passcodes) {
    return btoa(String.fromCharCode.apply(null, new Uint8Array(passcodes.buffer)));
}

function displayYdkeUrl(ydkeUrl) {
    const ydkeUrlContainer = document.getElementById('ydkeUrlContainer');
    const ydkeUrlElement = document.getElementById('ydkeUrl');
    const copyFeedback = document.getElementById('copyFeedback');
    
    ydkeUrlElement.textContent = ydkeUrl;
    ydkeUrlContainer.style.display = 'block';

    // Copy to clipboard functionality
    document.getElementById('copyUrlButton').onclick = () => {
        navigator.clipboard.writeText(ydkeUrl).then(() => {
            copyFeedback.style.display = 'block';
        }).catch(err => {
            console.error('Could not copy text: ', err);
        });
    };
}

function createZipDownload(ydkContents) {
    const zip = new JSZip();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const zipFilename = `deck_${timestamp}.zip`;

    ydkContents.forEach(({ name, content }) => {
        zip.file(name, content);
    });

    zip.generateAsync({ type: "blob" }).then((content) => {
        const url = URL.createObjectURL(content);
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = zipFilename;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    });
}

function createDownloadLink(content) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const fileInput = document.getElementById('fileInput');
    let filename;

        if (fileInput.files.length > 0) {
        // Get the file name without the .txt extension
        const uploadedFileName = fileInput.files[0].name.replace('.txt', '');
        filename = `${uploadedFileName}.ydk`;
    } else {
        // Fallback to using timestamp if no file is uploaded
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        filename = `deck_${timestamp}.ydk`;
    }

    const downloadLink = document.getElementById('downloadLink');
    downloadLink.href = url;
    downloadLink.download = filename; // Set the download attribute with the appropriate filename
    document.getElementById('downloadLinkContainer').style.display = 'block';
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
