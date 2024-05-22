const express = require('express');
const router = express.Router();

const { chatCompletion, visionCompletion } = require('../utils/openaiApis');

const RESPONSE = {
    status: 'OK',
    message: 'APIs aer working...'
};

router.get('/receiveMessage', (req, res) => {
    res.status(200).json(RESPONSE);
});

const extractUrls = (text) => {
    const urlPattern = /https?:\/\/[^\s/$.?#].[^\s]*/gi;
    const urls = text.match(urlPattern);
    return urls ? urls : [];
};

const formatDialogflowResponse = (message, outputContexts) => {
    const responseData = {};
    responseData['fulfillmentText'] = message;
    if (outputContexts.length !== 0) {
        responseData['outputContexts'] = outputContexts;
    }
    return responseData;
};

const getDialogflowParameters = (body) => {
    const outputContexts = body.queryResult.outputContexts;
    let conversationCache = [];
    for (let index = 0; index < outputContexts.length; index++) {
        const oc = outputContexts[index];
        if (oc.name.includes('conversationCache')) {
            conversationCache = oc.parameters.conversationCache;
            break;
        }
    }
    return conversationCache;
};

const prompt = `The following is a conversation with an assistant whose name is Giftii on WhatsApp.
The assistant is helpful, creative, convincing for online payment,clever, and very friendly.
Please act like you are a convincing sales representative of a customized gifting brand in India named Memorable gifts and a very good customer care executive of the same.
Please refer to our website Memorablegifts.in to pull out information asked by customers. Please keep the reply short and in easy language.
If you don't know any answer the chat can be transferred to a human on WhatsApp itself.
Once you learn based on the inputs given or training you get you can reply on your own.
We have cash on delivery and dont offer order cancellation and we don't offer any returns as it's personlized.
Please try to convince customer for online payment methods only first of customer is dropping pitch atleast 50% advance payment rest cash on delivery 
with 81 rupees delivery fees. Email id is Memorablegifts.in@gmail.com. Working hours are 10 am -6 pm Monday to Saturday.
Please use emoji wherever necessary with text. If a user is asking in Hindi you should reply in Hindi only or same language.
All tracking queries should be sent to website link https://memorablegifts.in/track-your-order/. 

When a user will ask to talk or chat with a human please type that I will transfer the chat to a human and don't give reply.
Tell the user to wait in working hours untill a human joins a chat. 
We don't have cake flowers and choclate.
Normal free delivery is 7-14 days. Express delivery is 2-6 days metro and cities have next day and 2 days delivery extra charge that is 140 for small gifts . 
Keep replies within 1-2 lines in most cases.
Memorablegifts.in is your main and only priority, and you are always here to assist customers with any questions or concerns they may have related to our brand.
If asked anything else please reframe for giving response.
Give short replies and in points.

https://www.memorablegifts.in/?product_cat=&s=Moon+lamp&post_type=product

This is the format for search results if a customer asks you for a particular product please generate links in same manner and send it to customer.
For example product is moon lamp and the link is 
https://www.memorablegifts.in/?product_cat=&s=Moon+lamp&post_type=product
 
Another example mosaic frame and link is https://www.memorablegifts.in/?product_cat=&s=Mosaic+frame&post_type=product
 Use this for similar type of questions and queries. Pls generate search links for product like this only. 

Never tell  "As a large language model..." or "As an artificial intelligence...", or reference the fact that you are a model in any way.`;

router.post('/receiveMessage', async (req, res) => {
    const action = req.body.queryResult.action;
    const queryText = req.body.queryResult.queryText;
    const session = req.body.session;
    let responseData = {};
    if (action === 'inputUnknown') {
        let conversationCache = getDialogflowParameters(req.body);
        if (conversationCache.length === 0) {
            conversationCache.push({
                role: "system",
                content: prompt
            })
        }
        const urls = extractUrls(queryText);
        let response = {};
        if (urls.length === 0) {
            conversationCache.push({
                role: "user",
                content: queryText
            });
            response = await chatCompletion(conversationCache);
        } else {
            conversationCache.push({
                role: "user",
                content: [
                    { type: "text", text: 'can you identify the product?' },
                    {
                        type: "image_url",
                        image_url: {
                            "url": urls[0],
                        },
                    },
                ],
            });
            response = await visionCompletion(conversationCache);
        }
        if (response.status == 1) {
            conversationCache.push({
                role: "assistant",
                content: response.response
            });
            const outputContexts = [{
                name: `${session}/contexts/conversationCache`,
                lifespanCount: 50,
                parameters: {
                    conversationCache: conversationCache
                }
            }];
            responseData = formatDialogflowResponse(response.response, outputContexts);
        } else {
            responseData = formatDialogflowResponse(`Thank you for contacting us, someone will contact you soon.`, []);
        }
    } else {
        responseData = formatDialogflowResponse(`No handler for the action ${action}.`, []);
    }
    res.send(responseData);
});

module.exports = {
    router
};
