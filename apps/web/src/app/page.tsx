import Link from "next/link";

export default function HomePage() {
  return (
    <div style={{ display: "grid", gap: 24 }}>
      <section>
        <h1 style={{ fontSize: 28, marginBottom: 8 }}>
          Multi-Agent Code Reviewer
        </h1>
        <p style={{ maxWidth: 640, color: "#9ca3af", fontSize: 14 }}>
          Run a full multi-agent review pipeline (static checks, LLM review,
          security, bug detection, fix generation, evaluation) on your code.
          Choose how you want to provide input below.
        </p>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 16
        }}
      >
        <HomeCard
          title="Code Editor"
          description="Paste or type code directly. Best for small snippets and quick experiments."
          href="/local"
        />
        <HomeCard
          title="File Upload"
          description="Upload a local file. We’ll review it and generate a fixed version you can download."
          href="/upload"
        />
        <HomeCard
          title="GitHub Repo"
          description="Point to a repo and file path. We’ll review it and you can later open a PR."
          href="/github"
        />
      </section>
    </div>
  );
}

function HomeCard({
  title,
  description,
  href
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "block",
        padding: 16,
        borderRadius: 12,
        border: "1px solid rgba(148, 163, 184, 0.3)",
        background: "rgba(15, 23, 42, 0.9)",
        textDecoration: "none",
        color: "#e5e7eb"
      }}
    >
      <h2 style={{ fontSize: 18, marginBottom: 8 }}>{title}</h2>
      <p style={{ fontSize: 14, color: "#9ca3af" }}>{description}</p>
    </Link>
  );
}