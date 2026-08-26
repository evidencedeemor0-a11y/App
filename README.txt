VERDA WALLET — REDESIGNED UI
============================

The wallet has been rebuilt around the supplied Verda reference: soft white/green surfaces, rounded cards, compact quick actions, a green balance hero, linked-card presentation, spending insights, activity list, and a floating four-tab navigation bar (Home / Pay / Insights / Profile).

Existing functionality is preserved:
- Local balance and transaction state with LocalStorage persistence
- Send and receive flows with 4-digit passcode 1472
- Add money from a linked card
- Add credit/debit cards with live preview and 10s pending state
- International transfers with the same passcode + pending + success flow
- Pending transaction state and transaction detail screens
- Search and transaction filters
- Virtual card reveal controls
- Spending overview
- Notifications through the browser Notification API
- Full Profile page with display name, theme, currency, accent color, font and clear-history controls
- Pull-to-refresh and mobile-friendly animations

IMPORTANT:
This remains a front-end wallet interface. Account state is stored locally on the device. Real banking/payment connections require a secure backend and licensed providers.

Default passcode: 1472

Files:
- index.html
- style.css
- script.js
- manifest.json
- README.txt
