
// 🎯 Vomfass - 레시피 재료 추출 헬퍼
function extractRecipeIngredients() {
    try {
        // DOM 로드 확인
        if (document.readyState === 'loading') return null;

        // 1. INGREDIENTS 텍스트가 있는 <p> 찾기
        const paragraphs = document.querySelectorAll('p');
        let ingredientsP = null;

        for (const p of paragraphs) {
            if (p.textContent.includes('INGREDIENTS')) {
                ingredientsP = p;
                break;
            }
        }

        if (!ingredientsP) return null;

        // 2. 다음 <ul> 요소 찾기 (최대 5번 시도)
        let ul = ingredientsP.nextElementSibling;
        let attempts = 0;

        while (ul && ul.tagName !== 'UL' && attempts < 5) {
            ul = ul.nextElementSibling;
            attempts++;
        }

        if (!ul || ul.tagName !== 'UL') return null;

        // 3. <a> 태그 있는 <li>만 추출
        const items = Array.from(ul.querySelectorAll('li'))
            .filter(li => li.querySelector('a'))
            .map(li => {
                const link = li.querySelector('a');
                return link.textContent.trim();
            })
            .filter(text => text.length > 0);

        return items.length > 0 ? items : null;

    } catch (error) {
        console.warn('Vomfass ingredient extraction failed:', error);
        return null;
    }
}

// 🎯 Vomfass 전용 메시지 매칭
export function getVomfassMessage(currentUrl) {
    if (currentUrl.includes('/blogs/recipes/')) {
        // Floating은 항상 고정
        const fixedFloating = "Wonder which products you need to make this recipe?";

        // 재료 추출 시도
        const ingredients = extractRecipeIngredients();

        if (ingredients && ingredients.length > 0) {
            // 재료 추출 성공 → 첫 번째 재료로 개인화 그리팅
            const firstIngredient = ingredients[0];

            return {
                floating: fixedFloating,
                greeting: `Is there anything you'd like to know about ${firstIngredient}?`
            };
        } else {
            // 재료 추출 실패 → Fallback 그리팅
            return {
                floating: fixedFloating,
                greeting: "I can help you find the perfect oils and vinegars for this recipe!"
            };
        }
    }
    return null;
}

// 🎯 BoostedUSA 전용 메시지 매칭
export function getBoostedUSAMessage(currentUrl) {
    if (currentUrl.includes('/collections/electric-bikes')) {
        return {
            floating: "Curious about the details about e-bikes? Ask me!",
            greeting: "Thinking about e-bikes? I can tell you which one's trending, what it includes, and all the specs — just ask."
        };
    }
    if (currentUrl.includes('/collections/evolve-skateboards')) {
        return {
            floating: "Want to know what makes each Evolve skateboard special?",
            greeting: "Let's find out together — we can talk about your performance needs or budget preferences."
        };
    }
    if (currentUrl.includes('/collections/onewheel-1')) {
        return {
            floating: "Wanna know what makes our Onewheels stand out?",
            greeting: "What kind of specs and parts are you looking for? I can tell you based on the product details."
        };
    }
    if (currentUrl.includes('/collections/electric-scooters')) {
        return {
            floating: "Curious about the details or what comes with each scooter? Ask me!",
            greeting: "Thinking about scooters? I can tell you which one's trending, what it includes, and all the specs — just ask."
        };
    }
    if (currentUrl.includes('/collections/kingsong-electric-unicycles')) {
        return {
            floating: "Wanna check out some amazing unicycles?",
            greeting: "They've got awesome specs and features. If there's anything you'd like to know more about, just tell me!"
        };
    }
    if (currentUrl.includes('/collections/protective-gear')) {
        return {
            floating: "Maximum safety means maximum confidence. Got any gear in mind?",
            greeting: "For a confident ride, protection is a must! What kind of gear are you looking for — helmet, wrist guards, or gloves?"
        };
    }
    if (currentUrl.includes('/pages/accessories')) {
        return {
            floating: "Want to upgrade your vehicle? I got you!",
            greeting: "Let's make your scooter stand out!\nI can also show you the accessories everyone's loving — just ask me!"
        };
    }
    if (currentUrl.includes('/collections/boosted-accessories')) {
        return {
            floating: "Need an upgrade or replacement? Tell me which vehicle it's for.",
            greeting: "What kind of accessory are you looking for?\nTell me about your vehicle and how you'll use it — I'll find the perfect match for you."
        };
    }
    if (currentUrl.includes('/collections/evolve-skateboard-accessories')) {
        return {
            floating: "Need an upgrade or replacement? Tell me which vehicle it's for.",
            greeting: "What kind of accessory are you looking for?\nTell me about your vehicle and how you'll use it — I'll find the perfect match for you."
        };
    }
    if (currentUrl.includes('/collections/minimotors-accessories')) {
        return {
            floating: "Need an upgrade or replacement? Tell me which vehicle it's for.",
            greeting: "What kind of accessory are you looking for?\nTell me about your vehicle and how you'll use it — I'll find the perfect match for you."
        };
    }
    if (currentUrl.includes('/collections/onewheel')) {
        return {
            floating: "Need an upgrade or replacement? Tell me which vehicle it's for.",
            greeting: "What kind of accessory are you looking for?\nTell me about your vehicle and how you'll use it — I'll find the perfect match for you."
        };
    }
    if (currentUrl.includes('/collections/segway-accessories')) {
        return {
            floating: "Need an upgrade or replacement? Tell me which vehicle it's for.",
            greeting: "What kind of accessory are you looking for?\nTell me about your vehicle and how you'll use it — I'll find the perfect match for you."
        };
    }
    if (currentUrl.includes('/collections/super73-accessories')) {
        return {
            floating: "Need an upgrade or replacement? Tell me which vehicle it's for.",
            greeting: "What kind of accessory are you looking for?\nTell me about your vehicle and how you'll use it — I'll find the perfect match for you."
        };
    }
    if (currentUrl.includes('/collections/zooz-accessories')) {
        return {
            floating: "Need an upgrade or replacement? Tell me which vehicle it's for.",
            greeting: "What kind of accessory are you looking for?\nTell me about your vehicle and how you'll use it — I'll find the perfect match for you."
        };
    }
    if (currentUrl.includes('/cart')) {
        return {
            floating: "Ready to make it yours? Your cart's looking good.",
            greeting: "If you'd like to know more, or find something that pairs well with this, just tell me — I'll show you."
        };
    }
    if (currentUrl.includes('/search')) {
        return {
            floating: "Searching for something? I can also help you with it.",
            greeting: "Tell me what you have in mind — the vibe, how it looks, or your situation. I'll find the right one for you."
        };
    }
    if (currentUrl.includes('/products/boosted-usa-gift-card')) {
        return {
            floating: "Great pick — They'll definitely love it!",
            greeting: "Giving it as a gift? That's really thoughtful. I'm sure they'll love it! Feel free to ask if you have any questions."
        };
    }
    return null;
}

// 🎯 Paper Tree 전용 메시지 매칭
export function getPaperTreeMessage(currentUrl) {
    const messages = {
        '/blogs/blog': {
            floating: 'Curious about our half-century legacy and history?',
            greeting: 'We\'re a legacy origami brand founded in 1968 in Japantown. Want to know more about our story and products?'
        },
        '/collections/origami-paper': {
            floating: 'What kind of origami paper are you looking for?',
            greeting: 'Tell me about what you\'re trying to make — telling us the model that you are working on or folding level might help me find the right one.'
        },
        '/collections/books-origami': {
            floating: 'Tell me about your origami level — I\'ll get you the right one!',
            greeting: 'Share your folding experience or the model you want to make (ask me like: "books for Jack-in-the-Box"). I\'ll find the ones that fit your level.'
        },
        '/collections/origami-supplies': {
            floating: 'Great folding sometimes needs great supplies!',
            greeting: 'Looking for a specific supply? Ask me first if you\'d like help choosing the right one.'
        },
        '/collections/hand-cut-large-origami': {
            floating: 'This collection is our specialty — ask me about it!',
            greeting: 'These hand-cut large origami papers are our exclusives. Tell me what you\'re working on and what size you need.'
        },
        '/collections/yuzen-chiyogami': {
            floating: 'Looking for special patterns? These are pieces of art.',
            greeting: 'Are you looking for something bold and colorful, or soft and traditional? Ask me, like "colorful Yuzen Chiyogami."'
        },
        '/collections/nature-paper': {
            floating: 'Looking for natural papers? These are pieces of art.',
            greeting: 'These sheets are special. Are you looking for a specific paper? Ask me, like "natural paper with bamboo."'
        },
        '/collections/marbled-papers': {
            floating: 'All sheets are unique — discover these amazing papers.',
            greeting: 'All marbled, ombre, and tie-dye papers are one-of-a-kind. If you have something specific in mind, ask me, like "marbled paper with gold marbling."'
        },
        '/collections/unryu': {
            floating: 'Looking for something soft and natural? Unryu papers are the ones!',
            greeting: 'Unryu papers have a unique, airy texture. Ask me anything — I can help you find the right one.'
        },
        '/collections/solid-color-kozo': {
            floating: 'Curious about our kozo papers and treatments?',
            greeting: 'These papers can be treated with methyl cellulose. Ask me if the kozo type can be treated — I\'ll explain more.'
        },
        '/collections/metallic-papers': {
            floating: 'Looking for Tissue Foils? These are great for folding.',
            greeting: 'Ask me about the metallic paper type and size — I can help you find the right one.'
        },
        '/collections/scenery': {
            floating: 'These are real art pieces — look around and hit me up anytime.',
            greeting: 'Crafting, decoration, thoughtful gifts… what kind of Scenery paper are you looking for? Tell me what you want to make, and I\'ll guide you.'
        },
        '/collections/books-other': {
            floating: 'These books are our selection — want to explore them?',
            greeting: 'Looking for a specific title or theme? Tell me roughly what you\'re after, and I\'ll find it for you.'
        },
        '/collections/calligraphy': {
            floating: 'Looking for calligraphy supplies? Take a look around!',
            greeting: 'Let me know your level or style — I\'ll match you with the right brush and ink.'
        },
        '/collections/writing-drawing': {
            floating: 'Do you like drawing? I\'ll find you the perfect match!',
            greeting: 'Are you looking for a specific brand or utensil? Tell me what you have in mind — I can find it for you. Feel free to ask about any details, too.'
        },
        '/collections/gifts': {
            floating: 'Looking for a gift with the spirit of Japan and San Francisco?',
            greeting: 'Looking for something special?\nThese are our collections — each piece carries the charm of Japan and the heart of San Francisco. It\'ll make a wonderful gift.'
        },
        '/collections/cards-mikis-signature-cards': {
            floating: 'Looking for something heartfelt? Check out Miki\'s Cards.',
            greeting: 'Each card is hand-designed — simple, elegant, and full of warmth. Want to find one that fits your message?'
        },
        '/collections/sale': {
            floating: 'Love a great find? You might spot something special here.',
            greeting: 'Some of our signature pieces are marked down — great for gifting or collecting. Want to take a look?'
        },
        '/collections/frontpage': {
            floating: 'Love a great find? You might spot something special here.',
            greeting: 'Some of our signature pieces are here — great for gifting or collecting. Want to take a look?'
        },
        '/pages/services': {
            floating: 'Curious about classes with Origami expert Linda?',
            greeting: 'Linda and her team teach everyone from beginners to advanced folders — even artists and companies. Whether for fun or something special, we have classes for you. Want to see what\'s available?'
        },
        '/pages/events-page': {
            floating: 'Curious about origami events with Paper Tree?',
            greeting: 'From our annual Palooza to live demos and community gatherings — come explore the world of origami with us! Want me to tell you about the upcoming events?'
        }
    };

    // 매칭되는 경로 찾기 (olivethisolivethat과 동일 방식)
    const matchedPath = Object.keys(messages).find(
        path => currentUrl.includes(path)
    );

    return matchedPath ? messages[matchedPath] : null;
}

// 🎯 DualtronUSA 전용 메시지 매칭
export function getDualtronUSAMessage(currentUrl) {
    if (currentUrl.includes('/collections/electric-scooters')) {
        return {
            floating: "Curious about the details or what comes with each scooter? Ask me!",
            greeting: "Thinking about scooters? I can tell you which one's trending, what it includes, and all the specs — just ask."
        };
    }
    if (currentUrl.includes('/collections/spare-parts')) {
        return {
            floating: "Need a repair or replacement? I can help you out!",
            greeting: "Let me know your scooter model and what spare you're looking for.\nHit us up at [415-273-9870](tel:4152739870) or [support@dualtronusa.com](mailto:support@dualtronusa.com) — we'll get you sorted fast."
        };
    }
    if (currentUrl.includes('/collections/minimotors-accessories')) {
        return {
            floating: "Want to upgrade your scooter? I got you!",
            greeting: "Let's make your scooter stand out!\nI can also show you the accessories everyone's loving — just ask me!"
        };
    }
    if (currentUrl.includes('/collections/sale')) {
        return {
            floating: "This sale's a great chance for you!\nCurious about anything?",
            greeting: "Feel free to ask me anything!\nWant to see what's on sale? Just ask **What's on sale?** I'll walk you through everything!"
        };
    }
    if (currentUrl.includes('/search')) {
        return {
            floating: "Searching for something? I can also help you with it.",
            greeting: "Tell me what you have in mind — the vibe, how it looks, or your situation. I'll find the right one for you."
        };
    }
    if (currentUrl.includes('/cart')) {
        return {
            floating: "Ready to make it yours? Your cart's looking good.",
            greeting: "If you'd like to know more, or find something that pairs well with this, just tell me — I'll show you."
        };
    }
    return null; // 매칭 실패
}

export function checkExperimentTarget() {
    const experimentStores = [
        '0qjyz1-uj.myshopify.com',
        'olivethisolivethat.com',
        'dualtronusa.com',
        'boostedusa.com',
        'vomfassghirardellisquare.com',
        'paper-tree.com',
        'saranghello.com',
        'sftequilashop.com',
        'biondivino.com',
        // LOCAL_DEV_SKIP_EXPERIMENT_CHECK
        // '127.0.0.1',
        // 'localhost'
    ];
    const currentHostname = window.location.hostname;
    const isTarget = experimentStores.some(store => currentHostname.includes(store));
    return isTarget;
}