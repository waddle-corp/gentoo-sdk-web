const ENV_CONFIG = {
    dev: {
      apiDomain: {
        auth: 'https://dev-api.gentooai.com/chat/api/v1/user',
        log: 'https://dev-api.gentooai.com/chat/api/v1/event/userEvent',
        chatbot: 'https://dev-api.gentooai.com/chat/api/v1/chat/chatbot',
        floating: 'https://dev-api.gentooai.com/chat/api/v1/chat/floating',
        partnerId: 'https://dev-api.gentooai.com/app/api/partner/v1/cafe24/mall',
      },
      hostSrc: "https://dev-demo.gentooai.com",
    },
    stage: {
      apiDomain: {
        auth: "https://stage-api.gentooai.com/chat/api/v1/user",
        log: "https://stage-api.gentooai.com/chat/api/v1/event/userEvent",
        chatbot: "https://stage-api.gentooai.com/chat/api/v1/chat/chatbot",
        floating: "https://stage-api.gentooai.com/chat/api/v1/chat/floating",
        partnerId: "https://stage-api.gentooai.com/app/api/partner/v1/cafe24/mall",
      },
      hostSrc: "https://stage-demo.gentooai.com",
    },
    prod: {
      apiDomain: {
        auth: 'https://api.gentooai.com/chat/api/v1/user',
        log: 'https://api.gentooai.com/chat/api/v1/event/userEvent',
        chatbot: 'https://api.gentooai.com/chat/api/v1/chat/chatbot',
        floating: 'https://api.gentooai.com/chat/api/v1/chat/floating',
        partnerId: 'https://api.gentooai.com/app/api/partner/v1/cafe24/mall',
      },
      hostSrc: "https://demo.gentooai.com",
    },
  };
  
  export default ENV_CONFIG;