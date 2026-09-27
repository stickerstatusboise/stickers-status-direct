"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cart, newUid, type ArtFile, type CartItem } from "@/components/cart/cart-store";
import { StickerPreview } from "@/components/sticker/StickerPreview";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { canAdjustArt, clampFit, DEFAULT_FIT, FIT_LIMITS, isDefaultFit, RASTER_TYPES, type ArtFit } from "@/lib/artwork";
import { CATALOG, getMaterial, getProduct, getShape, type ShapeId } from "@/lib/catalog";
import { dimLabel, dims, newConfig, normalizeQty, type StickerConfig } from "@/lib/config";
import { fmtQty, fmtSize, money } from "@/lib/format";
import { calculatePrice, optionPriceCents } from "@/lib/pricing";
import { fileQuality, QualityBadge, QualityNote } from "./ArtQuality";

const SHAPE_ICONS: Record<ShapeId, React.ReactNode> = {
  diecut: <path d="M20 5c6 0 7 5 11 6s5 6 3 10 1 9-5 12-8 1-12 1-10-4-10-10 3-7 2-11 5-8 11-8z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeDasharray="3 2.5" />,
  circle: <circle cx="20" cy="20" r="15" fill="none" stroke="currentColor" strokeWidth="2.2" />,
  square: <rect x="6" y="6" width="28" height="28" rx="5" fill="none" stroke="currentColor" strokeWidth="2.2" />,
  rect: <rect x="3" y="11" width="34" height="19" rx="4" fill="none" stroke="currentColor" strokeWidth="2.2" />,
  oval: <ellipse cx="20" cy="20" rx="17" ry="12" fill="none" stroke="currentColor" strokeWidth="2.2" />,
};

const PREVIEW_TYPES = ["png", "jpg", "jpeg", "svg"];
/** Images up to this size get an on-screen preview. Real uploads to storage arrive with step 4. */
const PREVIEW_MAX_BYTES = 5e6;

const extOf = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";

function readPreview(f: File): Promise<string | null> {
  if (!PREVIEW_TYPES.includes(extOf(f.name)) || f.size >= PREVIEW_MAX_BYTES) return Promise.resolve(null);
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(typeof r.result === "string" ? r.result : null);
    r.onerror = () => resolve(null);
    r.readAsDataURL(f);
  });
}

/** Pixel size of a PNG/JPG, for the print-sharpness check. */
async function readImageSize(f: File): Promise<{ width?: number; height?: number }> {
  if (!RASTER_TYPES.includes(extOf(f.name)) || typeof createImageBitmap !== "function") return {};
  try {
    const bmp = await createImageBitmap(f);
    const size = { width: bmp.width, height: bmp.height };
    bmp.close();
    return size;
  } catch {
    return {};
  }
}

const KEY_STEP = 0.02;
const toConfig = (i: CartItem): StickerConfig => ({
  productId: i.productId,
  shape: i.shape,
  size: i.size,
  cw: i.cw,
  ch: i.ch,
  qty: i.qty,
  material: i.material,
  options: { ...i.options },
  designHelp: i.designHelp,
  enhance: !!i.enhance,
  designNotes: i.designNotes,
});

interface Props {
  productId: string;
  /** Cart item being edited, if any. */
  editing?: CartItem;
}

export function Configurator({ productId, editing }: Props) {
  const router = useRouter();
  const toast = useToast();
  const product = getProduct(editing?.productId ?? productId);

  const [cfg, setCfg] = useState<StickerConfig>(() => (editing ? toConfig(editing) : newConfig(product.id)));
  const [files, setFiles] = useState<ArtFile[]>(editing?.files ?? []);
  const [fit, setFit] = useState<ArtFit>(editing?.artFit ?? DEFAULT_FIT);
  const [err, setErr] = useState("");
  const [customQty, setCustomQty] = useState(CATALOG.quantities.includes(cfg.qty) ? "" : String(cfg.qty));
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const replaceIdx = useRef<number | null>(null);
  const artworkRef = useRef<HTMLElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const drag = useRef<{ px: number; py: number; start: ArtFit; perX: number; perY: number } | null>(null);

  // Lift toasts above the fixed mobile price bar while on this page
  useEffect(() => {
    document.body.classList.add("has-mbar");
    return () => document.body.classList.remove("has-mbar");
  }, []);

  const set = (patch: Partial<StickerConfig>) => setCfg((c) => ({ ...c, ...patch }));
  const price = calculatePrice(cfg);
  const d = dims(cfg);
  const sq = cfg.shape === "circle" || cfg.shape === "square";
  const art = files.find((f) => f.url);
  const adjustable = !!art && canAdjustArt(cfg.shape);

  const rasterFiles = files.filter((f) => RASTER_TYPES.includes(f.type));
  const enhanceRecommended = rasterFiles.some((f) => {
    const q = fileQuality(f, d, cfg.shape, f === art ? fit : undefined);
    return q && q.level !== "good";
  });

  /** Replace the file list; start the placement over when the artwork on the preview changes. */
  function updateFiles(next: ArtFile[]) {
    if (next.find((f) => f.url)?.url !== art?.url) setFit(DEFAULT_FIT);
    // Nothing left to enhance: don't charge for it
    if (!next.some((f) => RASTER_TYPES.includes(f.type))) set({ enhance: false });
    setFiles(next);
  }

  async function addFiles(list: FileList | File[]) {
    const arr = [...list];
    const ok = arr.filter((f) => CATALOG.uploadTypes.includes(extOf(f.name)));
    const bad = arr.filter((f) => !ok.includes(f));
    if (bad.length) toast("That file type isn't supported", `${bad.map((f) => f.name).join(", ")}. Use AI, EPS, SVG, PDF, PSD, PNG or JPG.`);
    if (!ok.length) return;
    const out: ArtFile[] = await Promise.all(
      ok.map(async (f) => ({ name: f.name, size: f.size, type: extOf(f.name), url: await readPreview(f), ...(await readImageSize(f)) })),
    );
    const at = replaceIdx.current;
    replaceIdx.current = null;
    updateFiles(at != null && files[at] ? [...files.slice(0, at), ...out, ...files.slice(at + 1)] : [...files, ...out]);
    setErr("");
    toast(out.length > 1 ? `${out.length} files added` : "Artwork added", out.map((f) => f.name).join(", "), "ok");
  }

  function addToCart() {
    const hasArt = files.length > 0;
    if (!hasArt && !cfg.designHelp) {
      setErr('Upload your artwork, or check "I need design help".');
      artworkRef.current?.scrollIntoView({ block: "center" });
      return;
    }
    if (cfg.designHelp && !hasArt && !cfg.designNotes.trim()) {
      setErr("Tell us what you need designed, or upload a reference.");
      artworkRef.current?.scrollIntoView({ block: "center" });
      return;
    }
    const item: CartItem = {
      ...cfg,
      qty: normalizeQty(cfg.qty),
      uid: editing?.uid ?? newUid(),
      files,
      artFit: adjustable && !isDefaultFit(fit) ? fit : undefined,
    };
    cart.upsert(item);
    router.push("/cart");
    toast(editing ? "Cart updated" : "Added to cart", `${fmtQty(item.qty)} ${product.name.toLowerCase()} · ${money(calculatePrice(item).totalCents)}`, "ok");
  }

  return (
    <div className="wrap">
      <div style={{ paddingTop: 28 }}>
        <div className="crumbs">
          <Link href="/">Home</Link>
          <span>/</span>
          <Link href="/stickers">Shop</Link>
          <span>/</span>
          <span>{product.name}</span>
        </div>
      </div>
      <div className="cfg">
        <div className="cfg-left">
          <div
            className={`stage ${adjustable ? "can-drag" : ""}`}
            {...(adjustable
              ? {
                  tabIndex: 0,
                  role: "group",
                  "aria-label": "Artwork position. Drag, or use the arrow keys, to move your artwork.",
                  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
                    const svg = e.currentTarget.querySelector<SVGSVGElement>("svg.stk");
                    if (!svg) return;
                    const r = svg.getBoundingClientRect();
                    const vb = svg.viewBox.baseVal;
                    drag.current = {
                      px: e.clientX,
                      py: e.clientY,
                      start: fit,
                      perX: (r.width * (vb.width - 36)) / vb.width,
                      perY: (r.height * (vb.height - 36)) / vb.height,
                    };
                    e.currentTarget.setPointerCapture(e.pointerId);
                  },
                  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
                    const g = drag.current;
                    if (!g) return;
                    setFit(clampFit({ ...g.start, x: g.start.x + (e.clientX - g.px) / g.perX, y: g.start.y + (e.clientY - g.py) / g.perY }));
                  },
                  onPointerUp: () => (drag.current = null),
                  onPointerCancel: () => (drag.current = null),
                  onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => {
                    const moves: Record<string, Partial<ArtFit>> = {
                      ArrowLeft: { x: fit.x - KEY_STEP },
                      ArrowRight: { x: fit.x + KEY_STEP },
                      ArrowUp: { y: fit.y - KEY_STEP },
                      ArrowDown: { y: fit.y + KEY_STEP },
                      "+": { scale: fit.scale + 0.05 },
                      "=": { scale: fit.scale + 0.05 },
                      "-": { scale: fit.scale - 0.05 },
                    };
                    if (!moves[e.key]) return;
                    e.preventDefault();
                    setFit(clampFit({ ...fit, ...moves[e.key] }));
                  },
                }
              : {})}
          >
            <StickerPreview
              art={art ? undefined : product.art}
              url={art?.url}
              fit={fit}
              shape={cfg.shape}
              material={cfg.material}
              w={d.w}
              h={d.h}
              label="Live preview of your sticker"
            />
            <span className="stage-dim mono">{dimLabel(cfg)}</span>
            <div className="stage-meta">
              <span>
                {getShape(cfg.shape).name} · {getMaterial(cfg.material).name}
              </span>
              <span>{art ? "Your artwork" : "Sample art"}</span>
            </div>
          </div>
          <p className="stage-note">The preview shown here is ONLY a guide. The proof you will receive will show proper sizing and cut lines before we print.</p>
          {adjustable ? (
            <div className="art-adjust">
              <div className="row">
                <label htmlFor="art-scale">Artwork size</label>
                <span className="mono small">{Math.round(fit.scale * 100)}%</span>
              </div>
              <input
                id="art-scale"
                type="range"
                min={FIT_LIMITS.minScale * 100}
                max={FIT_LIMITS.maxScale * 100}
                step={5}
                value={Math.round(fit.scale * 100)}
                onChange={(e) => setFit(clampFit({ ...fit, scale: e.target.valueAsNumber / 100 }))}
              />
              <div className="row">
                <span className="small muted">Drag your artwork on the preview to move it.</span>
                <button className="reset" onClick={() => setFit(DEFAULT_FIT)} disabled={isDefaultFit(fit)}>
                  Reset
                </button>
              </div>
            </div>
          ) : art ? (
            <p className="stage-note">Die cut stickers are cut around your artwork, so it always fills the sticker.</p>
          ) : null}
          <QualityNote file={art} sticker={d} shape={cfg.shape} fit={fit} enhance={cfg.enhance} />
          <div className="spec-mini">
            <div>
              <span>Size</span>
              <b>{dimLabel(cfg)}</b>
            </div>
            <div>
              <span>Quantity</span>
              <b>{fmtQty(price.qty)}</b>
            </div>
            <div>
              <span>Material</span>
              <b>{getMaterial(cfg.material).name}</b>
            </div>
          </div>
        </div>

        <div>
          <div className="cfg-title">
            <h1>{product.name}</h1>
            <p>{product.blurb} Pick your options below. Your price updates instantly.</p>
          </div>

          <section className="step" aria-labelledby="st-shape">
            <div className="step-hd">
              <span className="sn">01</span>
              <h2 id="st-shape">Shape</h2>
            </div>
            <div className="tiles tiles-5">
              {CATALOG.shapes.map((s) => (
                <button key={s.id} className="tile" aria-pressed={cfg.shape === s.id} onClick={() => set({ shape: s.id })}>
                  <svg className="shape" viewBox="0 0 40 40" aria-hidden="true">
                    {SHAPE_ICONS[s.id]}
                  </svg>
                  <span className="tl">{s.name}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="step" aria-labelledby="st-size">
            <div className="step-hd">
              <span className="sn">02</span>
              <h2 id="st-size">Size</h2>
              <span className="hint">
                {cfg.shape === "rect" || cfg.shape === "oval" ? "Width shown, height follows your shape" : cfg.shape === "diecut" ? "Longest side" : ""}
              </span>
            </div>
            <div className="tiles tiles-6">
              {CATALOG.sizes.map((s) => (
                <button key={s} className="tile" aria-pressed={cfg.size === s} onClick={() => set({ size: s })}>
                  <span className="tile-size">{s}″</span>
                </button>
              ))}
              <button
                className="tile"
                aria-pressed={cfg.size === "custom"}
                onClick={() => {
                  if (cfg.size === "custom") return;
                  const cur = dims({ ...cfg, size: typeof cfg.size === "number" ? cfg.size : 3 });
                  set({ size: "custom", cw: cur.w, ch: cur.h });
                }}
              >
                <span className="tile-size" style={{ fontSize: 19, paddingBlock: 20 }}>
                  Custom
                </span>
              </button>
            </div>
            {cfg.size === "custom" ? (
              <div className="custom-dims">
                <div className="field" style={{ width: 130 }}>
                  <label htmlFor="cw">{sq ? "Size" : "Width"} (in)</label>
                  <input id="cw" className="inp" type="number" min={0.5} max={24} step={0.25} inputMode="decimal" value={cfg.cw} onChange={(e) => set({ cw: e.target.valueAsNumber || 0 })} />
                </div>
                {sq ? null : (
                  <>
                    <span style={{ paddingBottom: 12 }}>×</span>
                    <div className="field" style={{ width: 130 }}>
                      <label htmlFor="ch">Height (in)</label>
                      <input id="ch" className="inp" type="number" min={0.5} max={24} step={0.25} inputMode="decimal" value={cfg.ch} onChange={(e) => set({ ch: e.target.valueAsNumber || 0 })} />
                    </div>
                  </>
                )}
                <span className="small muted" style={{ paddingBottom: 12 }}>
                  0.5″ to 24″
                </span>
              </div>
            ) : null}
          </section>

          <section className="step" aria-labelledby="st-qty">
            <div className="step-hd">
              <span className="sn">03</span>
              <h2 id="st-qty">Quantity</h2>
              <span className="hint">More stickers, lower price each</span>
            </div>
            <div className="qty-grid">
              {CATALOG.quantities.map((q) => {
                const p = calculatePrice({ ...cfg, qty: q });
                return (
                  <button
                    key={q}
                    className="qtile"
                    aria-pressed={cfg.qty === q}
                    onClick={() => {
                      set({ qty: q });
                      setCustomQty("");
                    }}
                  >
                    {p.savePct >= 5 ? <span className="sv">-{p.savePct}%</span> : null}
                    <span className="q">{fmtQty(q)}</span>
                    <span className="p num">{money(p.totalCents)}</span>
                    <span className="pe num">{money(p.perCents)} / ea</span>
                  </button>
                );
              })}
            </div>
            <div className="qty-custom">
              <label htmlFor="qty-custom">Need a different amount?</label>
              <input
                id="qty-custom"
                className="inp"
                type="number"
                min={CATALOG.minQty}
                step={1}
                inputMode="numeric"
                placeholder="e.g. 750"
                value={customQty}
                onChange={(e) => {
                  setCustomQty(e.target.value);
                  const v = parseInt(e.target.value, 10);
                  if (v >= CATALOG.minQty) set({ qty: v });
                }}
                onBlur={() => {
                  const v = parseInt(customQty, 10);
                  if (customQty && !(v >= CATALOG.minQty)) {
                    setCustomQty("");
                    toast(`Minimum order is ${CATALOG.minQty} stickers`);
                  }
                }}
              />
              <span className="small">Minimum {CATALOG.minQty}</span>
            </div>
          </section>

          <section className="step" aria-labelledby="st-mat">
            <div className="step-hd">
              <span className="sn">04</span>
              <h2 id="st-mat">Material &amp; finish</h2>
            </div>
            <div className="tiles tiles-5">
              {CATALOG.materials.map((m) => (
                <button key={m.id} className="tile" aria-pressed={cfg.material === m.id} onClick={() => set({ material: m.id })}>
                  <span className={`swatch sw-${m.id}`} />
                  <span className="tl">{m.name}</span>
                  <span className="ts">{m.hint}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="step" aria-labelledby="st-extras">
            <div className="step-hd">
              <span className="sn">05</span>
              <h2 id="st-extras">Extras</h2>
              <span className="hint">Optional</span>
            </div>
            {CATALOG.options.map((o) => (
              <label key={o.id} className="opt">
                <input type="checkbox" checked={cfg.options[o.id]} onChange={(e) => set({ options: { ...cfg.options, [o.id]: e.target.checked } })} />
                <div>
                  <b>{o.name}</b>
                  <span>{o.hint}</span>
                </div>
                <span className="price-add">+{money(optionPriceCents(cfg, o.pct))}</span>
              </label>
            ))}
          </section>

          <section className="step" id="artwork" ref={artworkRef} aria-labelledby="st-art">
            <div className="step-hd">
              <span className="sn">06</span>
              <h2 id="st-art">Artwork</h2>
            </div>
            <div
              className={`drop ${dragOver ? "is-over" : ""}`}
              onDragEnter={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragOver={(e) => e.preventDefault()}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
              }}
            >
              <Icon name="upload" size={34} />
              <h3>Upload your artwork</h3>
              <p className="muted">Drag &amp; drop your file here</p>
              <span className="or">or</span>
              <button className="btn btn-ink" onClick={() => fileInput.current?.click()}>
                Browse files
              </button>
              <input
                ref={fileInput}
                className="sr-only"
                type="file"
                multiple
                tabIndex={-1}
                aria-label="Choose artwork files"
                accept={CATALOG.uploadTypes.map((t) => "." + t).join(",")}
                onChange={(e) => {
                  if (e.target.files) addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <div className="fmts">
                {CATALOG.uploadTypes.map((t) => (
                  <span key={t} className="fmt">
                    {t.toUpperCase()}
                  </span>
                ))}
              </div>
              <p className="art-tip">
                For the sharpest print, upload your original logo file (AI, EPS, SVG or PDF) or a large, high-quality image. Small or low-quality
                images, like screenshots or pictures saved from social media, can print blurry.
              </p>
            </div>
            <div className="files">
              {files.map((f, i) => (
                <div key={`${f.name}-${i}`} className="file">
                  <span className="thumb">
                    {f.url ? (
                      // eslint-disable-next-line @next/next/no-img-element -- local data: URL preview
                      <img src={f.url} alt="" />
                    ) : (
                      <Icon name="file" size={22} />
                    )}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div className="fname">{f.name}</div>
                    <div className="fmeta">
                      {f.type.toUpperCase()} · {fmtSize(f.size)}
                      {f.width && f.height ? ` · ${f.width} × ${f.height} px` : ""}
                      <QualityBadge file={f} sticker={d} shape={cfg.shape} fit={f === art ? fit : undefined} enhance={cfg.enhance} />
                    </div>
                  </div>
                  <div className="acts">
                    <button
                      onClick={() => {
                        replaceIdx.current = i;
                        fileInput.current?.click();
                      }}
                    >
                      Replace
                    </button>
                    <button onClick={() => updateFiles(files.filter((_, j) => j !== i))} aria-label={`Remove ${f.name}`}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {err ? (
              <div className="form-err" role="alert" style={{ marginTop: 12 }}>
                {err}
              </div>
            ) : null}
            {rasterFiles.length ? (
              <label className="opt design-help">
                <input type="checkbox" checked={cfg.enhance} onChange={(e) => set({ enhance: e.target.checked })} />
                <div>
                  <b>
                    Enhance my image for a sharper print
                    {enhanceRecommended ? <span className="rec-tag">Recommended</span> : null}
                  </b>
                  <span>
                    We enlarge your image and sharpen the details with professional software before printing. Great for small photos,
                    screenshots and logos saved from the web. You&apos;ll see the result on your proof.
                  </span>
                </div>
                <span className="price-add">+{money(CATALOG.enhanceFee * 100)}</span>
              </label>
            ) : null}
            <label className="opt design-help">
              <input
                type="checkbox"
                checked={cfg.designHelp}
                onChange={(e) => {
                  set({ designHelp: e.target.checked });
                  setErr("");
                  if (e.target.checked) requestAnimationFrame(() => notesRef.current?.focus({ preventScroll: true }));
                }}
              />
              <div>
                <b>I don&apos;t have print-ready artwork. I need design help.</b>
                <span>A designer builds or cleans up your art. You still approve a proof.</span>
              </div>
              <span className="price-add">+{money(CATALOG.designFee * 100)}</span>
            </label>
            {cfg.designHelp ? (
              <div className="dh-body field">
                <label htmlFor="dh-notes">Tell us what you need designed.</label>
                <textarea
                  id="dh-notes"
                  ref={notesRef}
                  value={cfg.designNotes}
                  onChange={(e) => set({ designNotes: e.target.value })}
                  placeholder="Example: Turn my logo into a round sticker with our website underneath. Colors: black and red."
                />
                <span className="small muted">Upload logos, sketches, photos or screenshots above as reference.</span>
              </div>
            ) : null}
          </section>

          <div className="price-box" aria-live="polite">
            <span className="yp">Your price</span>
            <div key={price.totalCents} className="price-total num flash">
              {money(price.totalCents)}
            </div>
            <div className="price-per num">
              {money(price.perCents)} / sticker{price.savePct >= 5 ? ` · you save ${price.savePct}%` : ""}
            </div>
            <div className="price-lines">
              {price.lines.map((l) => (
                <div key={l.label}>
                  <span>{l.label}</span>
                  <span className="mono">{money(l.cents)}</span>
                </div>
              ))}
              <div>
                <span>Digital proof</span>
                <span className="mono">FREE</span>
              </div>
            </div>
            {err ? <div className="form-err">{err}</div> : null}
            <button className="btn btn-red btn-lg btn-block" onClick={addToCart}>
              <Icon name="cart" size={18} /> {editing ? "Update cart" : "Add to cart"}
            </button>
            <p className="price-foot">
              {cfg.options.rush ? "Rush: prints next business day after approval." : "Prints within 3 business days of proof approval."} Placeholder
              pricing.
            </p>
          </div>
        </div>
      </div>
      <div className="mbar">
        <div>
          <div className="t num">{money(price.totalCents)}</div>
          <div className="pe num">
            {money(price.perCents)} / sticker · {fmtQty(price.qty)}
          </div>
        </div>
        <button className="btn btn-red" onClick={addToCart}>
          {editing ? "Update" : "Add to cart"}
        </button>
      </div>
    </div>
  );
}
