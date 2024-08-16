async function deriveKey(password, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        "raw",
        enc.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveBits", "deriveKey"]
    );

    return window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: 100000,
            hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-CBC", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}

async function encrypt(plaintext, password) {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(16));
    const key = await deriveKey(password, salt);

    const enc = new TextEncoder();
    const paddedPlaintext = pad(plaintext);
    const ciphertext = await window.crypto.subtle.encrypt(
        {
            name: "AES-CBC",
            iv: iv
        },
        key,
        enc.encode(paddedPlaintext)
    );

    return {
        salt: Array.from(salt),
        iv: Array.from(iv),
        ciphertext: Array.from(new Uint8Array(ciphertext))
    };
}

async function decrypt(encryptedData, password) {
    const salt = new Uint8Array(encryptedData.salt);
    const iv = new Uint8Array(encryptedData.iv);
    const ciphertext = new Uint8Array(encryptedData.ciphertext);
    const key = await deriveKey(password, salt);

    const decrypted = await window.crypto.subtle.decrypt(
        {
            name: "AES-CBC",
            iv: iv
        },
        key,
        ciphertext
    );

    const dec = new TextDecoder();
    return unpad(dec.decode(decrypted));
}

function pad(plaintext) {
    const blockSize = 16;
    const padding = blockSize - (plaintext.length % blockSize);
    return plaintext + String.fromCharCode(padding).repeat(padding);
}

function unpad(padded) {
    const padding = padded.charCodeAt(padded.length - 1);
    return padded.slice(0, padded.length - padding);
}

document.getElementById("encryptButton").addEventListener("click", async () => {
    const markdownInput = document.getElementById("markdownInput").value;
    const passwordInput = document.getElementById("passwordInput").value;

    if (!isStrongPassword(passwordInput)) {
        alert("Password does not meet the strength requirements.");
        return;
    }

    const encryptedData = await encrypt(markdownInput, passwordInput);
    document.getElementById("output").value = JSON.stringify(encryptedData);
});

document.getElementById("decryptButton").addEventListener("click", async () => {
    const encryptedData = JSON.parse(document.getElementById("output").value);
    const passwordInput = document.getElementById("passwordInput").value;

    try {
        const decryptedText = await decrypt(encryptedData, passwordInput);
        document.getElementById("output").value = decryptedText;
    } catch (error) {
        alert("Decryption failed. Please check your password and try again.");
    }
});

document.getElementById("exportButton").addEventListener("click", () => {
    const encryptedData = document.getElementById("output").value;
    const blob = new Blob([encryptedData], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "encrypted_data.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

function isStrongPassword(password) {
    const strongPasswordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*(),.?":{}|<>]).{12,}$/;
    return strongPasswordRegex.test(password);
}
