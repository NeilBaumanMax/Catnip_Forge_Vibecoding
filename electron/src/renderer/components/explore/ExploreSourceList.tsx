import React from 'react';
import type { SourceEvidence } from '../../../common/explore';

interface Props {
  sources: SourceEvidence[];
  savedUrls: ReadonlySet<string>;
  savingSourceUrl: string;
  label: string;
  onOpen: (url: string) => void;
  onSave: (source: SourceEvidence) => void;
}

const SOURCE_LABELS: Record<SourceEvidence['type'], string> = {
  zhihu: '知乎',
  web: 'Web',
  local: 'Local',
};

function sourceHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export default function ExploreSourceList({ sources, savedUrls, savingSourceUrl, label, onOpen, onSave }: Props) {
  if (!sources.length) return null;
  return (
    <section className="explore-source-section" aria-label={label}>
      <h5>{label}</h5>
      <div className="explore-source-list">
        {sources.map((source) => {
          const saved = savedUrls.has(source.url);
          const saving = savingSourceUrl === source.url;
          return (
            <article className="explore-source-row" key={source.url}>
              <div className="explore-source-heading">
                <span className={`explore-source-type explore-source-type--${source.type}`}>{SOURCE_LABELS[source.type]}</span>
                <div>
                  <strong>{source.title}</strong>
                  <small>{source.author ? `${source.author} · ` : ''}{sourceHost(source.url)}</small>
                </div>
              </div>
              <p className="explore-reading-copy">{source.excerpt}</p>
              <div className="explore-source-actions">
                <button className="explore-source-open" type="button" onClick={() => onOpen(source.url)}>
                  {source.type === 'zhihu' ? '打开知乎原文' : source.type === 'web' ? '打开 Web 原文' : '打开来源'} <span aria-hidden="true">↗</span>
                </button>
                <button type="button" disabled={saved || saving} onClick={() => onSave(source)}>
                  <span aria-hidden="true">{saved ? '✓' : '◇'}</span> {saved ? '已收藏' : saving ? '收藏中…' : '收藏到知识库'}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
