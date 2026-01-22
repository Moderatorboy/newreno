// netlify/functions/gemini-handler.js

exports.handler = async function(event, context) {
    // 1. CORS Headers (Sabse Important)
    const headers = {
        "Access-Control-Allow-Origin": "*", // Sabhi domains ko allow karein
        "Access-Control-Allow-Headers": "Content-Type", // Content-Type header allow karein
        "Access-Control-Allow-Methods": "POST, OPTIONS" // Sirf POST aur OPTIONS methods allow karein
    };

    // 2. Preflight Request Handle Karein (Browser check karta hai ki server ready hai ya nahi)
    if (event.httpMethod === "OPTIONS") {
        return {
            statusCode: 200,
            headers: headers,
            body: "OK"
        };
    }

    // 3. Sirf POST request allow karein
    if (event.httpMethod !== "POST") {
        return {
            statusCode: 405,
            headers: headers,
            body: JSON.stringify({ answer: "Method Not Allowed. Only POST requests are accepted." })
        };
    }

    try {
        // Body Parse karein
        let body;
        try {
            body = JSON.parse(event.body);
        } catch (e) {
            return {
                statusCode: 400,
                headers: headers,
                body: JSON.stringify({ answer: "Invalid JSON format in request body." })
            };
        }

        const userQuestion = body.question;

        // API Key Load karein
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error("API Key Missing in Server Logs");
            return {
                statusCode: 500, // Internal Server Error
                headers: headers,
                body: JSON.stringify({ answer: "Server Error: API Key configuration missing." })
            };
        }

        // Model aur URL
        const validModelName = "models/gemini-1.5-flash";
        const generateUrl = `https://generativelanguage.googleapis.com/v1beta/${validModelName}:generateContent?key=${apiKey}`;

        // Prompt Setup
        const promptText = `
            You are a friendly JEE/NEET Tutor. Answer in Hinglish (Hindi+English mix).
            Question: "${userQuestion}"
            Keep the answer concise (2-3 short paragraphs), clear, and strictly relevant to Physics/Chemistry/Maths.
        `;

        // Google API Call
        const genResp = await fetch(generateUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }]
            })
        });

        // Error Handling agar Google se error aaye
        if (!genResp.ok) {
            const errorText = await genResp.text();
            console.error("Gemini API Error:", errorText);
            return {
                statusCode: 200, // Frontend ko crash hone se bachane ke liye 200 bhej rahe hain
                headers: headers,
                body: JSON.stringify({ answer: `Error from AI Provider: ${genResp.status} - Please try again later.` })
            };
        }

        const genData = await genResp.json();

        // Answer Extract karna
        const answer = genData.candidates?.[0]?.content?.parts?.[0]?.text || "Maaf karna, mujhe iska jawab samajh nahi aaya. Dobara try karein.";

        // Success Response
        return {
            statusCode: 200,
            headers: headers,
            body: JSON.stringify({ answer: answer })
        };

    } catch (error) {
        console.error("Function Crash Error:", error);
        return {
            statusCode: 200, // Frontend par error dikhane ke liye 200 rakha hai
            headers: headers,
            body: JSON.stringify({ answer: "Server Error: Something went wrong internally." })
        };
    }
};