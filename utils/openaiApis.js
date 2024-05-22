const { OpenAI } = require("openai");
require('dotenv').config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const chatCompletion = async (messages) => {
    const completion = await openai.chat.completions.create({
        messages: messages,
        model: "gpt-4o",
    });
    return {
        status: 1,
        response: completion.choices[0].message.content
    };
};

const visionCompletion = async (messages) => {
    const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: messages,
    });
    return {
        status: 1,
        response: completion.choices[0].message.content
    };
}

module.exports = {
    chatCompletion,
    visionCompletion
};
