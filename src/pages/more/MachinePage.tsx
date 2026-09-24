import { useState } from 'react'
import { Page } from '../../components/Layout'
import { SpacingPicker } from '../../components/SpacingPicker'
import { useCombos, useMachines, useRolls, useSpacingEntries } from '../../db/queries'

export function MachinePage() {
  const machines = useMachines()
  const machine = machines?.[0]
  const combos = useCombos(machine?.id)
  const entries = useSpacingEntries(machine?.id)
  const rolls = useRolls(machine?.id)
  const [rollId, setRollId] = useState('')
  const [customHoles, setCustomHoles] = useState('')

  if (!machine || !combos || !entries) return <Page title="播種機" back="/more">{null}</Page>

  const holesList = [...new Set(entries.map((e) => e.holes))].sort((a, b) => a - b)
  const cell = (comboId: string, holes: number) => entries.find((e) => e.comboId === comboId && e.holes === holes)?.spacingCm
  const roll = rolls?.find((r) => r.id === rollId)
  const holes = roll ? roll.holes : Number(customHoles)

  return (
    <Page title={machine.name} back="/more">
      <section className="card">
        <div className="detail-title">{machine.model}</div>
        <div className="muted">{machine.maker}</div>
        {machine.memo && <p className="small">{machine.memo}</p>}
      </section>

      <section className="card">
        <h2>株間を確認</h2>
        <div className="grid2">
          <label className="field">
            <span>ロール</span>
            <select value={rollId} onChange={(e) => setRollId(e.target.value)}>
              <option value="">直接入力</option>
              {rolls?.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}（{r.holes}穴）
                </option>
              ))}
            </select>
          </label>
          {!roll && (
            <label className="field">
              <span>穴数</span>
              <input inputMode="numeric" value={customHoles} onChange={(e) => setCustomHoles(e.target.value)} placeholder="例: 5" />
            </label>
          )}
        </div>
        {Number.isInteger(holes) && holes > 0 && <SpacingPicker machine={machine} holes={holes} />}
      </section>

      <section className="card">
        <h2>点播間隔目安表（cm）</h2>
        <div className="table-scroll">
          <table className="spacing-table">
            <thead>
              <tr>
                <th>ロール側</th>
                {combos.map((c) => (
                  <th key={c.id}>{c.rollTeeth}</th>
                ))}
              </tr>
              <tr>
                <th>車輪側</th>
                {combos.map((c) => (
                  <th key={c.id}>{c.wheelTeeth}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {holesList.map((h) => (
                <tr key={h}>
                  <th>{h}穴</th>
                  {combos.map((c) => (
                    <td key={c.id}>{cell(c.id, h) ?? ''}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small">
          メーカー公表値。土質や速度により間隔が変わる場合があります。表にない穴数は
          「株間 ≒ {machine.spacingCoefficient} × ロール側歯数 ÷ 車輪側歯数 ÷ 穴数」で計算します。
        </p>
      </section>
    </Page>
  )
}
