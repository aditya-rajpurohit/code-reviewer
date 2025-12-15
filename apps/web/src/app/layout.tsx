import type { ReactNode } from "react";
import Link from "next/link";

export const metadata = {
  title: "Code Reviewer",
  description: "Multi-agent code review and refactoring tool.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          background: "#000",
          color: "#f5f5f5"
        }}
      >
        <header
          style={{
            borderBottom: "1px solid #333",
            padding: "10px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "sticky",
            top: 0,
            zIndex: 10,
            background: "#050505",
            backdropFilter: "blur(6px)"
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 16 }}>
            Code Reviewer</div>
          <nav style={{ display: "flex", gap: 16, fontSize: 14 }}>
            <Link href="/" style={navLinkStyle}>
              Home
            </Link>
            <Link href="/local" style={navLinkStyle}>
              Code Editor
            </Link>
            <Link href="/upload" style={navLinkStyle}>
              File Upload
            </Link>
            <Link href="/github" style={navLinkStyle}>
              GitHub Repo
            </Link>
          </nav>
        </header>
        <main style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
          {children}
        </main>
      </body>
    </html>
  );
}

const navLinkStyle: React.CSSProperties = {
  textDecoration: "none",
  color: "#e5e7eb"
};
