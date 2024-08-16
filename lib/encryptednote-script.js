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
        alert("Password does not meet the strength requirements:\n" +
              "- At least 16 characters long\n" +
              "- At least 3 of the following:\n" +
              "  - Uppercase letters\n" +
              "  - Lowercase letters\n" +
              "  - Numbers\n" +
              "  - Special characters (except space)");
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

document.getElementById("exportButton").addEventListener("click", async () => {
    const outputValue = document.getElementById("output").value;
    const passwordInput = document.getElementById("passwordInput").value;
    let dataToExport;

    // Check if the output is encrypted data
    try {
        const encryptedData = JSON.parse(outputValue);
        if (encryptedData.salt && encryptedData.iv && encryptedData.ciphertext) {
            // Output is encrypted data
            dataToExport = outputValue;
        } else {
            throw new Error("Not encrypted data");
        }
    } catch (error) {
        // Output is not encrypted, check if input is encrypted
        const markdownInput = document.getElementById("markdownInput").value;
        try {
            const inputEncryptedData = JSON.parse(markdownInput);
            if (inputEncryptedData.salt && inputEncryptedData.iv && inputEncryptedData.ciphertext) {
                // Input is encrypted data
                dataToExport = JSON.stringify(inputEncryptedData);
            } else {
                // Neither output nor input is encrypted, encrypt the input
                dataToExport = JSON.stringify(await encrypt(markdownInput, passwordInput));
            }
        } catch (error) {
            // If input is not valid JSON, encrypt the input
            dataToExport = JSON.stringify(await encrypt(markdownInput, passwordInput));
        }
    }

    // Create a timestamp for the file name
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-'); // Replace colons and dots for valid filename
    const fileName = `encrypted_data_${timestamp}.txt`;

    // Create a blob and download the data
    const blob = new Blob([dataToExport], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName; // Use the timestamped file name
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

function isStrongPassword(password) {
    // Check for minimum length
    if (password.length < 16) {
        return false;
    }

    // Initialize counters for character types
    let hasUppercase = false;
    let hasLowercase = false;
    let hasNumber = false;
    let hasSpecialChar = false;

    // Define the regex for special characters
    const specialCharRegex = /[!@#$%^&*()_+\-=$$$${};':"\\|,.<>\/?~`•^°]/;

    // Check each character in the password
    for (let char of password) {
        if (/[A-Z]/.test(char)) {
            hasUppercase = true;
        } else if (/[a-z]/.test(char)) {
            hasLowercase = true;
        } else if (/[0-9]/.test(char)) {
            hasNumber = true;
        } else if (specialCharRegex.test(char)) {
            hasSpecialChar = true;
        }
    }

    // Count how many character types are present
    const characterTypesCount = [hasUppercase, hasLowercase, hasNumber, hasSpecialChar].filter(Boolean).length;

    // Return true if at least 3 character types are present
    return characterTypesCount >= 3;
}
