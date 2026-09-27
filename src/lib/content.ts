/** Marketing copy from the prototype. Placeholder reviews and gallery are marked as such on the page. */
import type { ArtKey, MaterialId, ShapeId } from "./catalog";

export const FAQ: [q: string, a: string][] = [
  ["What file types can I upload?", "AI, EPS, SVG, PDF, PSD, PNG and JPG. Vector files (AI, EPS, SVG, PDF) print the sharpest. If you only have a photo or screenshot, upload it anyway and we will tell you if it needs work."],
  ["What if my artwork isn't print ready?", "Check the design help box when you order. Our designers clean it up, vectorize it, or build it from your sketch. You approve a proof before anything prints."],
  ["Will I receive a proof?", "Yes, every order. A real person checks your artwork and sends a digital proof to your account, usually within one business day. Nothing prints until you approve it."],
  ["Can I make changes to my proof?", "Yes. Click Request Changes, tell us what to fix, and we will send a revised proof. Revisions are free until you are happy."],
  ["How long does production take?", "Most orders print within 3 business days of proof approval. Rush production prints the next business day. Shipping time is added on top."],
  ["Are the stickers waterproof?", "Yes. We print on outdoor-rated vinyl, the same family of material we use on vehicle graphics. They handle rain, sun and the dishwasher top rack. Add scratch-guard laminate for extra protection."],
  ["Can I reorder previous stickers?", "Yes. Open your account, find the order, and hit Reorder. Your approved artwork, shape, size and material load automatically. Pick a new quantity and check out."],
  ["Do you offer bulk pricing?", "Always. The price per sticker drops as quantity goes up, and you see the savings live as you choose. For 10,000+ or multiple designs, request a quote."],
  ["What happens if I need someone to design my sticker?", "Add design help for a flat fee. Describe what you want and upload any logos, sketches or photos. A designer builds it and sends it to you as a proof."],
];

export const GALLERY: [art: ArtKey, shape: ShapeId, material: MaterialId, label: string][] = [
  ["bolt", "diecut", "gloss", "Die cut · Gloss · 3″"],
  ["peak", "circle", "holo", "Circle · Holographic · 2″"],
  ["sendit", "rect", "matte", "Rectangle · Matte · 4″×2.75″"],
  ["flame", "oval", "gloss", "Oval · Gloss · 3″×2″"],
  ["mono", "diecut", "clear", "Die cut · Clear · 3″"],
  ["star", "diecut", "holo", "Die cut · Holographic · 3″"],
  ["sun", "square", "matte", "Square · Matte · 3″"],
  ["fuel", "diecut", "gloss", "Die cut · Gloss · 3″"],
  ["peak", "diecut", "reflective", "Die cut · Reflective · 4″"],
  ["bolt", "circle", "holo", "Circle · Holographic · 2″"],
  ["sendit", "diecut", "gloss", "Die cut · Gloss · 5″"],
  ["flame", "diecut", "holo", "Die cut · Holographic · 4″"],
];

export const STEPS: [title: string, text: string][] = [
  ["Choose your stickers", "Pick your size, shape, quantity, material and finish. The price updates as you go."],
  ["Upload your artwork", "Drop in your logo, artwork, illustration or design. No art? Add design help."],
  ["Approve your proof", "Our team prepares a digital proof before anything gets printed. Ask for changes anytime."],
  ["We print & ship", "Once approved, your order goes into production and you can track every stage."],
];

export const WHY: [icon: "bolt" | "drop" | "eye" | "truck" | "stack" | "wrench", title: string, text: string][] = [
  ["bolt", "Professional print quality", "Printed on the same wide-format equipment we run for fleet graphics. Sharp edges, rich color."],
  ["drop", "Durable materials", "Outdoor-rated, waterproof vinyl built for sun, rain, car washes and water bottles."],
  ["eye", "Digital proof before printing", "A real person checks your file and sends a proof. Nothing prints until you say go."],
  ["truck", "Fast turnaround", "Most orders print within 3 business days of approval. Rush is next day."],
  ["stack", "Bulk pricing", "The more you order, the less each sticker costs. You see it live as you pick."],
  ["wrench", "Easy online ordering", "Order in minutes, track every step, and reorder past stickers in two clicks."],
];

export const REVIEWS: [quote: string, name: string, role: string][] = [
  ["Proof came back the same afternoon and the stickers look even better than the file. Ordering again for the whole crew.", "Placeholder customer", "Local business"],
  ["I had a napkin sketch. They turned it into a clean logo, and approving the proof in my account took one click.", "Placeholder customer", "Design help order"],
  ["Reflective die cuts on our trucks look great at night. Pricing at 1,000 was better than we expected.", "Placeholder customer", "Fleet order"],
];

export const TICKER = ["Digital proof before print", "Waterproof vinyl", "Ships in 3 business days", "Bulk pricing built in", "Made by Sticker Status", "Free revisions"];
