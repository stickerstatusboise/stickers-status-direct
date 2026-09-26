I want you to design and build a functional first draft of an e-commerce website called **Sticker Status Direct**.

Sticker Status Direct is an extension of my existing automotive restyling and graphics company, **Sticker Status**. This new website will focus specifically on allowing customers to order custom printed stickers online.

The domain will be:

**StickerStatusDirect.com**

For this first version, focus on creating a polished, functional prototype. We can refine exact pricing, branding, product options, backend integrations, and other details later.

## PRIMARY GOAL

The website should make ordering custom stickers extremely simple.

The basic customer journey should be:

**Choose Sticker → Select Size → Select Quantity → Upload Artwork or Request Design Help → See Price → Add to Cart → Checkout → Receive Digital Proof → Approve or Request Changes → Production → Shipping → Delivery**

Use websites such as Sticker Mule and Sticker Giant as inspiration for the overall ordering experience and functionality, but DO NOT directly copy their design, branding, copy, or layout.

I want Sticker Status Direct to have its own recognizable identity.

---

# BRAND DIRECTION

The website should feel:

- Modern
- Premium
- Bold
- Clean
- Fast
- Slightly automotive/streetwear inspired
- Professional enough for businesses
- Fun enough for individual customers and enthusiasts

Sticker Status comes from the automotive wrap/custom car industry, so I want some of that personality carried into the brand without making the website feel like an automotive-only company.

The ordering experience itself should be extremely clean and easy to understand.

For this first draft, use a primarily:

- Black
- White
- Red accent

color palette.

Use large typography, clean cards, rounded elements where appropriate, subtle shadows, smooth animations, and high-quality product mockups/placeholders.

Make the site responsive and prioritize an excellent mobile experience.

---

# HOMEPAGE

Create a strong hero section.

Possible headline:

**CUSTOM STICKERS. MADE EASY.**

Supporting copy could communicate:

Upload your artwork, choose your size and quantity, approve your proof, and we'll handle the rest.

Primary CTA:

**ORDER STICKERS**

Secondary CTA:

**GET A QUOTE**

The homepage should quickly explain the ordering process.

Create a section such as:

### HOW IT WORKS

**1. Choose Your Stickers**
Pick your size, shape, quantity, material, and finish.

**2. Upload Your Artwork**
Upload your logo, artwork, illustration, or design.

**3. Approve Your Proof**
Our team prepares a digital proof before anything gets printed.

**4. We Print & Ship**
Once approved, the order moves into production and the customer can track its progress.

Also include sections for:

- Popular sticker products
- Why choose Sticker Status Direct
- Customer reviews/testimonials placeholders
- Examples/gallery of stickers
- Business/bulk ordering
- FAQ
- Strong final CTA

---

# STICKER PRODUCTS

For the first prototype, create product categories such as:

- Die Cut Stickers
- Circle Stickers
- Square Stickers
- Rectangle Stickers
- Oval Stickers
- Clear Stickers
- Holographic Stickers
- Reflective Stickers

Build the architecture so additional sticker products can easily be added later.

---

# CUSTOM STICKER ORDER BUILDER

This is one of the most important parts of the website.

When a customer selects a sticker product, take them into an interactive product configurator.

The customer should be able to select:

### Shape

Examples:

- Custom Die Cut
- Circle
- Square
- Rectangle
- Oval

### Size

Allow common preset sizes such as:

2"
3"
4"
5"
6"

Also include:

**Custom Size**

If Custom Size is selected, allow width and height to be entered.

### Quantity

Example quantity tiers:

50  
100  
250  
500  
1,000  
2,500  
5,000  
10,000

Build this in a way where exact quantities and pricing can easily be changed later.

### Material / Finish

Create placeholder options such as:

- Gloss
- Matte
- Clear
- Holographic
- Reflective

These can be refined later.

---

# LIVE PRICE CALCULATOR

I want the price to update dynamically as customers change:

- Sticker type
- Size
- Quantity
- Material
- Finish
- Additional options
- Design assistance

For the first prototype, create placeholder pricing logic.

Structure the code so I can easily replace the placeholder pricing with our actual pricing formula later.

Clearly display:

**Your Price**

and ideally:

**Price Per Sticker**

For example:

$149.00 Total  
$0.60 / sticker

The price should update instantly without refreshing the page.

---

# ARTWORK UPLOAD

After configuring the sticker, the customer needs to upload their artwork.

Create a large drag-and-drop upload area.

Something similar to:

**UPLOAD YOUR ARTWORK**

Drag & drop your file here  
or  
**Browse Files**

Support common artwork formats such as:

AI  
EPS  
SVG  
PDF  
PSD  
PNG  
JPG/JPEG

Allow the customer to see the uploaded filename and remove or replace the file.

Eventually this file needs to be connected to the customer's order.

---

# DESIGN HELP

Some customers will not have print-ready artwork.

Below the upload area, include a clear option:

☐ **I don't have print-ready artwork — I need design help.**

Selecting this should add a design fee to the order.

For the prototype, use a placeholder fee.

When selected, show a text field asking:

**Tell us what you need designed.**

Allow the customer to describe what they want.

They should still be able to upload reference images, logos, sketches, screenshots, etc.

---

# SHOPPING CART & CHECKOUT

Create a modern e-commerce cart.

The cart should clearly show:

- Sticker product
- Shape
- Dimensions
- Quantity
- Material
- Finish
- Design assistance
- Uploaded artwork filename
- Price

Include normal checkout information:

- Customer name
- Email
- Phone
- Shipping address
- Billing address
- Shipping method
- Payment

For the prototype, payment processing can be mocked or structured for later integration with something like Stripe.

---

# CUSTOMER ACCOUNT

Customers should be able to create an account.

Their dashboard should show:

**Orders**

**Proofs**

**Order Status**

**Tracking**

**Reorder**

**Account Information**

A customer should be able to open an order and see everything associated with it.

---

# DIGITAL PROOFING SYSTEM

This is extremely important.

After an order is placed, Sticker Status Direct staff will review the artwork.

We then need the ability to upload/send the customer a digital proof.

The customer should receive a notification telling them:

**Your proof is ready!**

Inside their account they should see the proof image prominently displayed.

Give them two primary options:

**APPROVE PROOF**

or

**REQUEST CHANGES**

If they click Request Changes, provide a text box where they can explain the changes they want.

The request should go back to our team.

Our team should then be able to upload a revised proof.

The process repeats until the customer clicks:

**APPROVE PROOF**

Once approved, clearly record the date/time and lock that proof as the approved production artwork.

The order then automatically moves to:

**IN PRODUCTION**

---

# ORDER TRACKING EXPERIENCE

I want the order tracking experience to feel similar conceptually to the Domino's Pizza Tracker.

Create a visual progress tracker.

Possible stages:

**ORDER RECEIVED**

↓

**ARTWORK REVIEW**

↓

**PROOF READY**

↓

**PROOF APPROVED**

↓

**IN PRODUCTION**

↓

**QUALITY CHECK**

↓

**SHIPPED**

↓

**DELIVERED**

Make this visually exciting rather than just displaying plain status text.

Use a horizontal tracker on desktop and a vertical tracker on mobile if that creates a better experience.

Highlight completed stages and clearly show the current stage.

Customers should be able to log into their account at any time and immediately see where their stickers are in the process.

---

# SHIPPING

Once an order ships, allow our team or shipping integration to add:

- Carrier
- Tracking number
- Ship date
- Estimated delivery

Display this information in the customer's account.

Include a:

**TRACK PACKAGE**

button.

---

# REORDER FEATURE

Sticker customers frequently reorder the same artwork.

After an order is completed, include a prominent:

**REORDER**

button.

Clicking it should load the previous:

- Artwork
- Sticker configuration
- Size
- Material
- Finish

Then allow the customer to choose a new quantity and reorder quickly.

---

# ADMIN DASHBOARD

Create a basic internal admin dashboard prototype for Sticker Status Direct staff.

I want to be able to see orders grouped by status:

- New Orders
- Artwork Review
- Awaiting Customer Approval
- Changes Requested
- Approved
- In Production
- Quality Check
- Ready to Ship
- Shipped
- Completed

Each order should show useful information such as:

- Order number
- Customer
- Product
- Quantity
- Order total
- Artwork
- Current status
- Date ordered

Opening an order should allow our staff to:

- View customer information
- View order details
- Download artwork
- Upload proofs
- Read customer proof revisions
- Change order status
- Add internal notes
- Add tracking information

Design this so it could eventually become a real production management system.

---

# PRODUCTION QUEUE

Create a production dashboard where approved orders automatically appear.

Think of this almost like a job board for our print shop.

Show:

- Order #
- Customer
- Sticker type
- Size
- Quantity
- Due date
- Artwork thumbnail
- Production status

Eventually we may display this dashboard on a TV or computer in the production area, so make it easy to scan quickly.

---

# NAVIGATION

Main navigation could include:

**Shop Stickers**

**How It Works**

**Business / Bulk Orders**

**Sticker Gallery**

**FAQ**

**Track Order**

**Account**

Include a very visible:

**ORDER STICKERS**

CTA.

---

# TRUST ELEMENTS

Throughout the site, communicate things such as:

- Professional quality printing
- Durable materials
- Digital proof before printing
- Fast turnaround
- Easy online ordering
- Bulk pricing
- Made by Sticker Status

Use placeholder wording where necessary.

---

# FAQ

Create an FAQ covering questions such as:

What file types can I upload?

What if my artwork isn't print ready?

Will I receive a proof?

Can I make changes to my proof?

How long does production take?

Are the stickers waterproof?

Can I reorder previous stickers?

Do you offer bulk pricing?

What happens if I need someone to design my sticker?

---

# TECHNICAL DIRECTION

For this first build, prioritize creating a polished interactive prototype.

Use a modern web stack appropriate for a production e-commerce application.

Prefer reusable components and clean architecture.

The site should be:

- Responsive
- Mobile friendly
- Fast
- Accessible
- SEO friendly
- Easy to expand
- Easy to connect to a real database later

Where backend functionality is not currently available, create realistic mocked functionality so I can experience the complete customer journey.

Do NOT leave important pages as blank placeholders.

Build enough sample data so I can actually click through and test the experience.

---

# IMPORTANT UX PRINCIPLE

A customer who knows nothing about printing should still be able to order stickers without confusion.

Do not overwhelm customers with printing terminology.

Keep the ordering interface visual, simple, and guided.

The most important actions should always be obvious.

---

# FIRST VERSION GOAL

Do not try to perfect every feature yet.

I want you to build a strong Version 1 prototype that lets me evaluate:

1. The visual design
2. Homepage
3. Product selection
4. Sticker configurator
5. Artwork upload experience
6. Design-help option
7. Cart and checkout
8. Customer dashboard
9. Proof approval system
10. Domino's-style production tracker
11. Admin order dashboard
12. Production queue

Make reasonable design decisions where I haven't specified something.

Build the first version and make it visually impressive, but prioritize the customer ordering experience above everything else.

After creating the initial version, identify which portions are currently mocked versus functional and suggest the next highest-priority features or integrations needed to turn Sticker Status Direct into a production-ready website.