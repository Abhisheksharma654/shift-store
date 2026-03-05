# SHIFT Store 🛍

A modern, minimal e-commerce frontend built with pure HTML, CSS, and JavaScript.  
No frameworks. No build tools. Just open in VS Code and run.

---

## 📁 Project Structure

```
shift-store/
├── index.html              ← Main storefront (homepage)
├── pages/
│   ├── login.html          ← Sign in / Sign up with OTP
│   ├── product.html        ← Product detail page
│   ├── payment.html        ← Checkout & payment
│   ├── account.html        ← Customer profile & order tracking
│   └── admin.html          ← Admin dashboard
├── js/
│   └── security.js         ← Shared security module (reference copy)
├── css/                    ← Add your custom stylesheets here
├── assets/                 ← Add images, icons, fonts here
├── .vscode/
│   ├── settings.json       ← Editor & Live Server config
│   └── extensions.json     ← Recommended extensions
└── README.md
```

---

## 🚀 Getting Started in VS Code

### 1. Install Recommended Extensions
When you open this folder in VS Code, you'll see a prompt:
> *"Do you want to install the recommended extensions?"*

Click **Install All**. The key one is **Live Server** by Ritwick Dey.

### 2. Launch with Live Server
- Right-click `index.html` in the Explorer panel
- Select **"Open with Live Server"**
- Your browser opens at `http://127.0.0.1:5500`

### 3. Navigate Between Pages
All pages link to each other. Start from `index.html`.

| URL | Page |
|-----|------|
| `http://127.0.0.1:5500/index.html` | Storefront |
| `http://127.0.0.1:5500/pages/login.html` | Login / Sign Up |
| `http://127.0.0.1:5500/pages/product.html` | Product Detail |
| `http://127.0.0.1:5500/pages/payment.html` | Checkout |
| `http://127.0.0.1:5500/pages/account.html` | My Account |
| `http://127.0.0.1:5500/pages/admin.html` | Admin Panel |

---

## 🔐 Demo Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@shift.com` | `Admin@123` |
| Customer | `user@shift.com` | `User@123!` |

> After login, a demo OTP will be shown in a toast notification (bottom of screen).  
> In production, this OTP must be sent by your backend via SMS/email — never generated client-side.

---

## 🔒 Security Features (Client-Side)

| Feature | Details |
|---------|---------|
| CSRF Tokens | Auto-injected into all forms via `ShiftSecurity` |
| Brute Force Protection | Account locked for 15 min after 5 failed logins |
| Rate Limiting | Max 10 login attempts per minute |
| OTP Verification | SHA-256 hashed, 5-minute expiry |
| Input Sanitization | All user inputs sanitized before use |
| Session Management | 30-min auto-expiry with activity refresh |
| Password Strength | Live 4-bar strength meter |
| CAPTCHA | Math challenge on login form |
| Luhn Validation | Card number checksum verification |
| Audit Logging | All key actions logged to sessionStorage |

> ⚠️ **All client-side security must be replicated server-side before going live.**  
> The browser can always be bypassed — never trust it for real auth.

---

## 💳 Payment Integration (Production)

For real payments, integrate one of these instead of the demo form:

- **[Razorpay](https://razorpay.com/docs/)** — Best for India (UPI, cards, netbanking)
- **[Stripe](https://stripe.com/docs)** — International cards
- **[PayU](https://devguide.payu.in/)** — Alternative for India

Never handle raw card data yourself — use their hosted fields or SDKs.

---

## 🧩 Pages Overview

### `index.html` — Storefront
- Dynamic product grid with category filter pills
- Sort by price / name
- Light / Dark mode toggle (remembered in localStorage)
- Add to cart with toast notifications
- Search modal

### `pages/login.html` — Authentication
- Sign In + Sign Up tabs
- CAPTCHA, brute force lockout, rate limiting
- OTP 6-digit verification flow
- Password strength meter
- Social login placeholders (Google, Apple)

### `pages/product.html` — Product Detail
- Image gallery with thumbnails
- Size & colour variant selectors
- Quantity control + Add to Cart / Buy Now
- Description / Specs / Reviews tabs
- Related products grid

### `pages/payment.html` — Checkout
- Contact + Shipping address forms
- Delivery method selection
- 3 payment methods: Card (with live preview), UPI, Cash on Delivery
- Coupon code (try `SHIFT10`)
- Animated order placement + success screen

### `pages/account.html` — My Account
- Order history with live tracking timeline
- Wishlist management
- Saved addresses
- Profile settings + notification preferences
- Security settings (2FA toggle, sessions, delete account)

### `pages/admin.html` — Admin Dashboard
- Revenue stats, order counts, conversion rate
- 7-day revenue bar chart
- Recent orders table with status badges
- Top products by revenue
- Inventory stock levels with restock alerts
- Activity feed
- Add Product modal

---

## 🛠 Customisation Tips

### Change the Brand Name
Search and replace `SHIFT` with your brand name across all files.

### Add Real Products
In `index.html`, find the `PRODUCTS` array in the `<script>` section:
```js
const PRODUCTS = [
  { id:1, cat:'clothing', emoji:'🧥', name:'Your Product', price:999, ... },
  ...
];
```
Replace emoji with `<img>` tags pointing to your `/assets/` folder.

### Change the Accent Color
Each file uses CSS variables. Find `:root` or `[data-theme="dark"]` and change:
```css
--accent: #e8f55e;   /* Change this to your brand color */
--accent-fg: #0c0c0c; /* Text on top of accent color */
```

### Connect a Backend
Replace the demo auth logic in `login.html` with a real `fetch()` call:
```js
const res = await fetch('/api/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': ShiftSecurity.getCSRFToken() },
  body: JSON.stringify({ email, password })
});
```

---

## 📦 Recommended Backend Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js + Express or Python + FastAPI |
| Database | PostgreSQL or MongoDB |
| Auth | JWT + bcrypt + OTP (Twilio / MSG91) |
| Payments | Razorpay SDK |
| Storage | AWS S3 or Cloudinary (for product images) |
| Hosting | Vercel / Railway / Render |

---

## 📄 License

Free to use for personal and commercial projects.  
Built with ❤️ using pure HTML, CSS & JavaScript.
