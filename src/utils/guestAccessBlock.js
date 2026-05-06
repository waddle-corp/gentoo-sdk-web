export const isGuestAccessBlocked = (context) => {
    return context?.userType === 'guest'
        && Boolean(context?.memberOnlyAccessActivated);
};

export const buildGuestAccessBlockView = (loginUrl, options = {}) => {
    const { isSmallResolution = false, lang = 'ko' } = options;

    const wrapper = document.createElement('div');
    wrapper.className = `guest-access-block${isSmallResolution ? ' guest-access-block-md' : ''}`;
    wrapper.setAttribute('data-gentoo-sdk', 'true');

    const title = document.createElement('p');
    title.className = 'guest-access-block-title';
    title.innerText = lang === 'ko' ? '로그인 후 사용 가능합니다' : 'Login required';

    const description = document.createElement('p');
    description.className = 'guest-access-block-description';
    description.innerText = lang === 'ko'
        ? '로그인하시면 AI 챗봇을 이용하실 수 있어요.'
        : 'Log in to use the AI chatbot.';

    const loginButton = document.createElement('button');
    loginButton.type = 'button';
    loginButton.className = 'guest-access-block-login-button';
    loginButton.innerText = lang === 'ko' ? '로그인 하기' : 'Log in';
    loginButton.addEventListener('click', () => {
        window.location.href = loginUrl || window.location.href;
    });

    wrapper.appendChild(title);
    wrapper.appendChild(description);
    wrapper.appendChild(loginButton);

    return wrapper;
};
