// logger apis
export async function postChatUserId(userToken, udid = "", partnerId, chatUserId) {
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
        console.log('postChatUserId res.chatUserId', res.chatUserId);
        return res.chatUserId;
    } catch (error) {
        console.error(`Error while calling postChatUserId API: ${error}`)
    }
}

export async function sendEventLog(event, basicPayload = {}, customPayload = {}) {
    // if (!customPayload.referrerOrigin) return;
    
    const payload = {
        event,
        timestamp: Date.now(),
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
export async function getChatbotData(partnerId, chatUserId) {
    try {
        const response = await fetch(`${process.env.API_CHAT_BASE_URL}${process.env.API_CHATBOT_ENDPOINT}/${partnerId}?chatUserId=${chatUserId}`, {
            method: "GET",
            headers: {},
        });
        const res = await response.json();
        return res;
    } catch (error) {
        console.error(`Error while calling getChatbotData API: ${error}`);
    }
}

export async function getFloatingData(partnerId, displayLocation, itemId, chatUserId) {
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
        console.error(`Error while calling getFloatingData API: ${error}`);
    }
}

export async function getPartnerId(mallId) {
    try {
        const url = `${process.env.API_MAIN_BASE_URL}${process.env.API_PARTNERID_ENDPOINT}/${mallId}`;
        const response = await fetch(url, {
            method: "GET",
            headers: {}
        });
        const res = await response.json();
        return res.partnerId;
    } catch (error) {
        console.error(`Error while calling getPartnerId API: ${error}`)
    }
}

export async function getGodomallPartnerId(mallId) {
    try {
        const url = `${process.env.API_MAIN_BASE_URL}${process.env.API_GODOMALL_PARTNERID_ENDPOINT}/${mallId}`;
        const response = await fetch(url, {
            method: "GET",
            headers: {}
        });
        const res = await response.json();
        return res.partnerId;
    } catch (error) {
        console.error(`Error while calling getGodomallPartnerId API: ${error}`)
    }
}

export async function postChatEventLog(payload, isMobileDevice) {
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

export async function getBootConfig(chatUserId, currentUrl, displayLocation, itemId, partnerId) {
    try {
        const response = await fetch(`${process.env.API_CHAT_BASE_URL}${process.env.API_BOOTCONFIG_ENDPOINT}?chatUserId=${chatUserId}&url=${currentUrl}&displayLocation=${displayLocation}&itemId=${itemId}`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${partnerId}`,
            }
        });
        const res = await response.json();
        return res;
    } catch (error) {
        console.error(`Error while calling getBootConfig API: ${error}`);
    }
}

// imweb api
export async function getImwebPartnerId(mallId) {
    try {
        const url = `${process.env.API_MAIN_BASE_URL}${process.env.API_IMWEB_PARTNERID_ENDPOINT}/${mallId}`;
        const response = await fetch(url, {
            method: "GET",
            headers: {}
        });
        const res = await response.json();
        return res.partnerId;
    } catch (error) {
        console.error(`Error while calling getImwebPartnerId API: ${error}`)
    }
}

export function generateGuestUserToken(length = 16) {
    return 'guest' + Math.random().toString(36).substring(2, length);
}