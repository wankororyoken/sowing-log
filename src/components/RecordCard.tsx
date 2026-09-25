import { Link } from 'react-router-dom'
import type { RecordSummary } from '../db/records'
import { bagFractionLabel, METHOD_LABEL } from '../domain/record'
import { formatDate } from '../lib/format'
import { recordSettingText } from '../lib/recordText'

export function RecordCard({ summary, showCrop = true }: { summary: RecordSummary; showCrop?: boolean }) {
  const r = summary.record
  const varieties = summary.seeds.map((s) => s.seed?.variety || '（品種不明）').join('・')
  const amount = summary.seeds
    .map((s) => bagFractionLabel(s.line.bagFraction))
    .filter(Boolean)
    .join('・')
  const w = r.weather
  return (
    <li>
      <Link to={`/records/${r.id}`} className="record-card">
        <div className="record-head">
          <span className="record-date">{formatDate(r.sownAt)}</span>
          <span className={`badge method-${r.method}`}>{METHOD_LABEL[r.method]}</span>
          {summary.field && <span className="record-field">{summary.field.name}</span>}
        </div>
        <div className="record-title">
          {showCrop && <span className="record-crop">{summary.crop?.name ?? '（作物未設定）'}</span>}
          {varieties && <span>{varieties}</span>}
        </div>
        <div className="record-setting">{recordSettingText(summary)}</div>
        {(amount || w.condition || w.tempC != null) && (
          <div className="record-meta">
            {amount && <span>播種量 {amount}</span>}
            {(w.condition || w.tempC != null) && (
              <span>
                {w.condition} {w.tempC != null && `${w.tempC}℃`}
              </span>
            )}
          </div>
        )}
      </Link>
    </li>
  )
}
