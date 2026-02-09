"use client";

type SourceItem = {
  chunkId: string;
  text: string;
  score: number;
  metadata?: Record<string, unknown>;
};

type SourcesPanelProps = {
  sources: SourceItem[];
};

function formatScore(score: number): string {
  if (!Number.isFinite(score)) {
    return "n/a";
  }
  return score.toFixed(4);
}

function pickText(metadata: Record<string, unknown> | undefined, key: string): string {
  const value = metadata?.[key];
  return typeof value === "string" ? value : "-";
}

export function SourcesPanel({ sources }: SourcesPanelProps) {
  if (sources.length === 0) {
    return (
      <aside className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Fontes</h2>
        <p className="mt-2 text-sm text-slate-500">Sem fontes retornadas ainda.</p>
      </aside>
    );
  }

  return (
    <aside className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Fontes</h2>
      <div className="mt-3 space-y-3">
        {sources.map((source) => (
          <article key={source.chunkId} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-700">
              <strong>source:</strong> {pickText(source.metadata, "source")}
            </p>
            <p className="text-xs text-slate-700">
              <strong>title:</strong> {pickText(source.metadata, "title")}
            </p>
            <p className="text-xs text-slate-700">
              <strong>chunkId:</strong> {source.chunkId}
            </p>
            <p className="text-xs text-slate-700">
              <strong>score:</strong> {formatScore(source.score)}
            </p>
            <p className="mt-2 line-clamp-4 text-sm text-slate-800">{source.text}</p>
          </article>
        ))}
      </div>
    </aside>
  );
}
