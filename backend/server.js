const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory Database simulating a production environment
const database = [
    { id: 1, email: "john.doe@example.com", phone: "+1234567890", identityHash: "john.doe@example.com|+1234567890" },
    { id: 2, email: "jane.smith@example.com", phone: "+0987654321", identityHash: "jane.smith@example.com|+0987654321" }
];

/**
 * Requirement Fulfillment:
 * 1. Design a system that identifies and classifies data as redundant or false positive.
 * 2. Implement a validation mechanism to check new data against existing data.
 */
function evaluateAndClassifyData(newData) {
    const email = newData.email ? newData.email.trim().toLowerCase() : "";
    const phone = newData.phone ? newData.phone.trim().replace(/\s+/g, '') : "";

    // Basic False Positive Validation Check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !phone || !emailRegex.test(email) || phone.length < 7) {
        return { status: "FALSE_POSITIVE", message: "Invalid formatting or dummy data detected." };
    }

    // Generate a deterministic unique constraint key
    const generatedHash = `${email}|${phone}`;

    // Validation check against existing database entries
    const isDuplicate = database.some(record => record.identityHash === generatedHash);

    if (isDuplicate) {
        return { status: "REDUNDANT", message: "Exact identical record already exists in the database." };
    }

    return { status: "UNIQUE", hash: generatedHash, sanitized: { email, phone } };
}

// Route: Get all verified database entries
app.get('/api/data', (req, res) => {
    res.status(200).json({ success: true, count: database.length, data: database });
});

// Route: Process and validate incoming entries
app.post('/api/data/submit', (req, res) => {
    const { email, phone } = req.body;

    const classification = evaluateAndClassifyData({ email, phone });

    // Handle Redundant or Invalid states safely without contaminating the DB
    if (classification.status === "FALSE_POSITIVE") {
        return res.status(400).json({
            success: false,
            classification: "False Positive",
            message: classification.message
        });
    }

    if (classification.status === "REDUNDANT") {
        return res.status(409).json({
            success: false,
            classification: "Redundant",
            message: classification.message
        });
    }

    /**
     * Requirement Fulfillment:
     * 3. Prevent duplicate data from being added.
     * 4. Append only unique and verified data entries to the database.
     */
    const newRecord = {
        id: database.length + 1,
        email: classification.sanitized.email,
        phone: classification.sanitized.phone,
        identityHash: classification.hash
    };

    database.push(newRecord);

    return res.status(201).json({
        success: true,
        classification: "Unique & Verified",
        message: "Data cleared validation benchmarks and was successfully written to DB.",
        record: newRecord
    });
});

app.listen(PORT, () => {
    console.log(`Cloud Computing System running seamlessly on http://localhost:${PORT}`);
});