import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Sparkles, Search, Truck, ShieldCheck, ShieldAlert, Trophy, TrendingUp, Activity, Loader2 } from 'lucide-react';
import type { ProcurementRequest, Vendor, PurchaseOrder } from '@/lib/procurement/types';
import type { VendorAIScore } from '@/lib/procurement/aiTypes';
import { fetchVendorScores, runVendorEvaluation } from '@/lib/procurement/aiQueries';
import { CC, glass } from './ccTheme';

const CONFIDENCE_FLOOR = 0.5;
const STALE_MS = 48 * 60 * 60 * 1000;

type NodeState = 'done' | 'active' | 'queued' | 'nodata';

const DIMENSIONS: { key: keyof VendorAIScore; label: string; icon: ReactNode; color: string }[] = [
  { key: 'price_score', label: 'Price', icon: <TrendingUp size={13} />, color: CC.blue },
  { key: 'delivery_score', label: 'Delivery', icon: <Truck size={13} />, color: CC.cyan },
  { key: 'reliability_score', label: 'Reliability', icon: <ShieldCheck size={13} />, color: CC.green },
  { key: 'risk_score', label: 'Risk', icon: <ShieldAlert size={13} />, color: CC.violet },
  { key: 'performance_score', label: 'Performance', icon: <Activity size={13} />, color: CC.orange },
];

interface Props {
  requests: ProcurementRequest[];
  vendors: Vendor[];
  orders: PurchaseOrder[];
}

function PipelineNode({ icon, label, sub, state }: { icon: ReactNode; label: string; sub: string; state: NodeState }) {
  const done = state === 'done';
  const active = state === 'active';
  return (
    <div
      style={{
        flex: '0 0 auto',
        width: 100,
        textAlign: 'center',
        padding: '12px 8px',
        borderRadius: 12,
        background: CC.glassStrong,
        border: `1px solid ${done ? 'rgba(34,197,94,0.35)' : active ? 'rgba(34,211,238,0.5)' : CC.borderSoft}`,
      }}
    >
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: 8,
          margin: '0 auto 8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: done ? 'rgba(34,197,94,0.16)' : active ? 'rgba(34,211,238,0.18)' : 'rgba(255,255,255,0.06)',
          color: done ? CC.green : active ? CC.cyan : CC.textMid,
        }}
      >
        {icon}
      </div>
      <div style={{ fontSize: 10.5, fontWeight: 600, lineHeight: 1.3 }}>{label}</div>
      <div style={{ fontSize: 9.5, color: CC.textLo, marginTop: 3 }}>{sub}</div>
    </div>
  );
}

const Connector = () => (
  <div style={{ flex: '0 0 14px', height: 1, background: 'rgba(255,255,255,0.15)' }} />
);

function Metric({ label, value, color }: { label: string; value: number | null; color: string }) {
  return (
    <div>
      <div style={{ fontSize: 9.5, color: CC.textLo, marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: value === null ? CC.textLo : CC.textHi }}>
        {value === null ? 'No data' : `${Math.round(value * 100)}%`}
      </div>
      <div style={{ height: 3, borderRadius: 3, background: 'rgba(255,255,255,0.08)', marginTop: 6, overflow: 'hidden' }}>
        <span
          style={{
            display: 'block',
            height: '100%',
            borderRadius: 3,
            width: value === null ? '0%' : `${Math.round(value * 100)}%`,
            background: color,
          }}
        />
      </div>
    </div>
  );
}

export default function VendorEvaluationWorkspace({ requests, vendors, orders }: Props) {
  const [selectedId, setSelectedId] = useState<string>('');
  const [scores, setScores] = useState<VendorAIScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Same eligibility rule as the AI Evaluation tab: approved and no PO yet.
  const withPO = new Set(orders.map(o => o.procurement_request_id).filter(Boolean));
  const eligible = requests.filter(r => r.status === 'approved' && !withPO.has(r.id));
  const requestId = eligible.find(r => r.id === selectedId)?.id ?? eligible[0]?.id ?? '';
  const request = eligible.find(r => r.id === requestId);
  const activeVendors = vendors.filter(v => v.status === 'active');

  const loadScores = async (id: string) => {
    if (!id) {
      setScores([]);
      return;
    }
    setLoading(true);
    try {
      setScores(await fetchVendorScores(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scores');
    }
    setLoading(false);
  };

  useEffect(() => {
    setError(null);
    loadScores(requestId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  const handleRun = async () => {
    if (!requestId) return;
    setEvaluating(true);
    setError(null);
    try {
      const result = await runVendorEvaluation(requestId);
      if (!result.success) setError(result.error || 'Evaluation could not run');
      await loadScores(requestId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Evaluation failed');
    }
    setEvaluating(false);
  };

  const hasScores = scores.length > 0;
  const dimState = (key: keyof VendorAIScore): NodeState => {
    if (evaluating) return 'active';
    if (!hasScores) return 'queued';
    return scores.some(s => s[key] !== null && s[key] !== undefined) ? 'done' : 'nodata';
  };
  const stateLabel = (s: NodeState) =>
    s === 'done' ? 'Complete' : s === 'active' ? 'Running' : s === 'nodata' ? 'No data' : 'Queued';

  const evaluatedAt = scores[0]?.evaluated_at;
  const stale = evaluatedAt ? Date.now() - new Date(evaluatedAt).getTime() > STALE_MS : false;

  return (
    <section style={glass({ padding: 20 })}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={15} color={CC.cyan} />
            Vendor evaluation workspace
          </div>
          <div style={{ fontSize: 11.5, color: CC.textLo, marginTop: 2 }}>
            {request ? `${request.request_number}: ${request.title}` : 'No request selected'}
          </div>
        </div>
        {eligible.length > 0 && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={requestId}
              onChange={e => setSelectedId(e.target.value)}
              style={{
                background: CC.glassStrong,
                color: CC.textHi,
                border: `1px solid ${CC.border}`,
                borderRadius: 9,
                padding: '7px 10px',
                fontSize: 12,
                maxWidth: 220,
              }}
            >
              {eligible.map(r => (
                <option key={r.id} value={r.id} style={{ color: '#000' }}>
                  {r.request_number}: {r.title}
                </option>
              ))}
            </select>
            <button
              onClick={handleRun}
              disabled={evaluating}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                border: 'none',
                borderRadius: 9,
                padding: '8px 13px',
                fontSize: 12.5,
                fontWeight: 600,
                background: `linear-gradient(135deg, ${CC.violet}, ${CC.blue})`,
                color: '#fff',
                cursor: evaluating ? 'default' : 'pointer',
                opacity: evaluating ? 0.6 : 1,
              }}
            >
              {evaluating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {hasScores ? 'Re-run evaluation' : 'Run evaluation'}
            </button>
          </div>
        )}
      </div>

      {eligible.length === 0 ? (
        <p style={{ fontSize: 12.5, color: CC.textMid, padding: '18px 0' }}>
          No approved requests are waiting on a vendor decision. Approve a request in the Requests section and it appears here.
        </p>
      ) : (
        <>
          {error && (
            <p style={{ fontSize: 12, color: '#FF9E9E', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 9, padding: '8px 12px', marginBottom: 12 }}>
              {error}
            </p>
          )}

          <div style={{ display: 'flex', alignItems: 'center', overflowX: 'auto', paddingBottom: 6 }}>
            <PipelineNode
              icon={<Search size={13} />}
              label="Candidate vendors"
              sub={`${activeVendors.length} active`}
              state={activeVendors.length > 0 ? 'done' : 'nodata'}
            />
            {DIMENSIONS.map(d => {
              const st = dimState(d.key);
              return (
                <div key={d.label} style={{ display: 'flex', alignItems: 'center' }}>
                  <Connector />
                  <PipelineNode icon={d.icon} label={d.label} sub={stateLabel(st)} state={st} />
                </div>
              );
            })}
            <Connector />
            <PipelineNode
              icon={<Trophy size={13} />}
              label="Ranking"
              sub={evaluating ? 'Running' : hasScores ? 'Complete' : 'Queued'}
              state={evaluating ? 'active' : hasScores ? 'done' : 'queued'}
            />
          </div>

          {loading ? (
            <p style={{ fontSize: 12, color: CC.textLo, marginTop: 14 }}>Loading scores...</p>
          ) : !hasScores ? (
            <p style={{ fontSize: 12.5, color: CC.textMid, marginTop: 14 }}>
              No evaluation yet for this request. Run the evaluation to score and rank your active vendors.
            </p>
          ) : (
            <>
              {stale && (
                <p style={{ fontSize: 11.5, color: CC.orange, marginTop: 12 }}>
                  This evaluation is more than 48 hours old. Re-run it before relying on the ranking.
                </p>
              )}
              {scores.map(s => {
                const top = s.rank === 1;
                const lowConfidence = Number(s.confidence) < CONFIDENCE_FLOOR;
                return (
                  <div
                    key={s.id}
                    style={{
                      border: `1px solid ${top ? 'rgba(139,92,246,0.4)' : CC.borderSoft}`,
                      borderRadius: 14,
                      padding: '14px 15px',
                      marginTop: 10,
                      background: top ? 'rgba(139,92,246,0.08)' : 'rgba(255,255,255,0.025)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontWeight: 700, fontSize: 13 }}>
                        <span
                          style={{
                            minWidth: 21,
                            height: 21,
                            padding: '0 4px',
                            borderRadius: 7,
                            fontSize: 10.5,
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: top ? `linear-gradient(135deg, ${CC.violet}, ${CC.cyan})` : 'rgba(255,255,255,0.08)',
                            color: top ? '#fff' : CC.textMid,
                          }}
                        >
                          {s.rank ?? '–'}
                        </span>
                        {s.vendor?.name ?? 'Unknown vendor'}
                        <span style={{ fontSize: 11, fontWeight: 400, color: CC.textLo }}>
                          Composite {Math.round(Number(s.composite_score) * 100)}%
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {lowConfidence && (
                          <span
                            style={{
                              fontSize: 10.5,
                              fontWeight: 600,
                              padding: '3px 8px',
                              borderRadius: 7,
                              background: 'rgba(251,146,60,0.14)',
                              color: '#FFC896',
                              border: '1px solid rgba(251,146,60,0.32)',
                            }}
                          >
                            Manual review required
                          </span>
                        )}
                        <span style={{ fontSize: 10.5, color: top ? CC.violet : CC.textLo }}>
                          {Math.round(Number(s.confidence) * 100)}% confidence ({s.dimensions_scored}/5 scored)
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: 10, marginTop: 12 }}>
                      {DIMENSIONS.map(d => (
                        <Metric key={d.label} label={d.label} value={s[d.key] as number | null} color={d.color} />
                      ))}
                    </div>
                  </div>
                );
              })}
              <p style={{ fontSize: 11, color: CC.textLo, marginTop: 12 }}>
                Dimensions with no evidence are left out of the score, not counted as zero, and lower the confidence instead.
              </p>
            </>
          )}
        </>
      )}
    </section>
  );
}
