// logger apis
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

// floating button apis
export async function fetchChatbotData(partnerId, chatUserId) {
    try {
        const response = await fetch(`${process.env.API_CHAT_BASE_URL}${process.env.API_CHATBOT_ENDPOINT}/${partnerId}?chatUserId=${chatUserId}`, {
            method: "GET",
            headers: {},
        });
        const res = await response.json();
        return res;
    } catch (error) {
        console.error(`Error while calling fetchChatbotId API: ${error}`);
    }
}

export async function fetchFloatingData(partnerId, displayLocation, itemId, chatUserId) {
    try {
        const response = await fetch(
            `${process.env.API_CHAT_BASE_URL}${process.env.API_FLOATING_ENDPOINT}/${partnerId}?displayLocation=${displayLocation}&itemId=${itemId}&chatUserId=${chatUserId}`,
            {
                method: "GET",
                headers: {},
            }
        );

        const res = await response.json();
        return res;
    } catch (error) {
        console.error(`Error while calling fetchFloatingData API: ${error}`);
    }
}

export async function fetchPartnerId(mallId) {
    try {
        const url = `${process.env.API_MAIN_BASE_URL}${process.env.API_PARTNERID_ENDPOINT}/${mallId}`;
        const response = await fetch(url, {
            method: "GET",
            headers: {}
        });
        const res = await response.json();
        return res.partnerId;
    } catch (error) {
        console.error(`Error while calling fetchPartnerId API: ${error}`)
    }
}

export async function sendChatEventLog(payload, isMobileDevice) {
    try {
        const params = {
            eventCategory: String(payload.eventCategory),
            chatUserId: String(payload.chatUserId),
            partnerId: String(payload.partnerId),
            channelId: isMobileDevice ? "mobile" : "web",
            products: payload?.products,
        };

        const response = await fetch(`${process.env.API_CHAT_BASE_URL}${process.env.API_CHATEVENT_ENDPOINT}/${payload.partnerId}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(params),
        });

        const res = await response.json(); // JSON 형태의 응답 데이터 파싱
        return res;
    } catch (error) {
        console.error(`Error while calling logEvent API: ${error}`);
    }
}