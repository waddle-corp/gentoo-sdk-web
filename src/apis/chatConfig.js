export async function fetchChatUserId(userToken, udid = "", partnerId, chatUserId) {
    const convertedUserToken = (userToken && userToken !== 'null') ? String(userToken) : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const params = {
        externalKey: String(partnerId),
        userToken: convertedUserToken,
        udid: String(udid),
        chatUserId: chatUserId ? String(chatUserId) : null
    }

    try {
        const url = `${process.env.API_CHAT_BASE_URL}${process.env.API_AUTH_CAFE24_ENDPOINT}`;
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(params)
        });

        const res = await response.json();
        return res.chatUserId;
    } catch (error) {
        console.error(`Error while calling fetchChatUserId API: ${error}`)
    }
}

export async function sendEventLog(event, basicPayload = {}, customPayload = {}) {
    // if (!customPayload.referrerOrigin) return;
    
    const payload = {
        event,
        ...basicPayload,
        ...customPayload,
    }

    const url = `${process.env.API_TRACKER_BASE_URL}${process.env.API_USEREVENT_ENDPOINT}`;
    navigator.sendBeacon(
        url,
        JSON.stringify(payload)
    );
}