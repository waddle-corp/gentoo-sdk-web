# Cafe24 URL-filtered ScriptTag

Register `https://sdk.gentooai.com/sdk-cafe24-path.js?path_prefix=%2Fevent%2F` as a separate ScriptTag for the relevant Cafe24 screen types and PC and mobile skins. Keep the existing SDK ScriptTag in place. `PRODUCT_RECENT` covers the Medicube event pages sampled so far. A page must have a registered screen type for Cafe24 to deliver the loader.

The loader starts the existing Cafe24 SDK only when the current URL pathname starts with the configured directory, including its trailing slash. For example, `/event/list.html?product_no=2178` matches, while `/event-old/list.html` and `/shopinfo/membership.html?next=/event/list.html` do not. Other pages in a registered screen type still download the small loader.

For QA, use the same URL on `dev-sdk.gentooai.com`. The loader uses the Cafe24 bootstrap from the dev CDN. In Cafe24 QA, confirm that the ScriptTag retains `path_prefix`, that the target screen types and skins receive the loader, and that chat opens on eligible desktop and mobile pages. Verify an unrelated page with the same screen type and an existing chatbot page. Remove the separate ScriptTag to roll back.
