import { Link } from 'react-router-dom'
import type { RecordSummary } from '../db/records'
import { bagFractionLabel, daysAfterSowing, METHOD_LABEL } from '../domain/record'
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
  // 発芽までの日数と定植先は年ごとの比較に効くので一覧にも出す
  const germ = summary.events.find((e) => e.type?.name === '発芽')?.event
  const transplant = summary.events.find((e) => e.type?.name === '定植')
  const latest = summary.events.at(-1)
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
        {summary.events.length > 0 && (
          <div className="record-progress">
            {germ && <span>発芽 {daysAfterSowing(r.sownAt, germ.date)}日{germ.rating && ` ${germ.rating}`}</span>}
            {transplant && (
              <span>
                定植 {daysAfterSowing(r.sownAt, transplant.event.date)}日{transplant.transplantField && ` → ${transplant.transplantField.name}`}
              </span>
            )}
            {latest && latest.event !== germ && latest !== transplant && (
              <span>
                最新: {latest.type?.name} {daysAfterSowing(r.sownAt, latest.event.date)}日
              </span>
            )}
          </div>
        )}
      </Link>
    </li>
  )
}
