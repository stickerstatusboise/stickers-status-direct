import Link from "next/link";

/** Honest placeholder for pages whose backend isn't built yet. */
export function ComingSoon({ title, lede, children }: { title: string; lede: string; children?: React.ReactNode }) {
  return (
    <div className="wrap soon">
      <div className="page-hd">
        <h1>{title}</h1>
        <p className="lede" style={{ marginTop: 12 }}>
          {lede}
        </p>
      </div>
      <div className="card">
        {children}
        <div className="row" style={{ marginTop: 16 }}>
          <Link className="btn btn-red" href="/stickers">
            Order Stickers
          </Link>
          <Link className="btn btn-line" href="/#faq">
            Read the FAQ
          </Link>
        </div>
      </div>
    </div>
  );
}
