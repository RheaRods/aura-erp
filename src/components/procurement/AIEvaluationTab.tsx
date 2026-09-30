import { useEffect, useState } from 'react';
import {
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  Trophy,
  ShieldAlert,
  Clock,
  History,
} from 'lucide-react';
import type { ProcurementRequest, Vendor, PurchaseOrder } from '@/lib/procurement/types';
import type { VendorQuote, VendorAIScore, AIAuditEntry } from '@/lib/procurement/aiTypes';
import {
  fetchVendorQuotes,
  upsertVendorQuote,
  runVendorEvaluation,
  fetchVendorScores,
  fetchAITimeline,
} from '@/lib/procurement/aiQueries';
import { createPurchaseOrder } from '@/lib/procurement/queries';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/procurement/format';

// Below this confidence (fraction of the 5 dimensions that actually had
// evidence), the UI will not offer an auto-accept action -- it shows the
// scored data and requires a manual decision instead.
const CONFIDENCE_FLOOR = 0.5;

// How old a vendor's score can be before it must be re-evaluated rather
// than reused for a rejection fallback (#2 / #3 in the ranking).
const STALENESS_WINDOW_MS = 48 * 60 * 60 * 1000;

interface Props {
  requests: ProcurementRequest[];
  vendors: Vendor[];
  orders: PurchaseOrder[];
  onChanged: () => void;
}

export default function AIEvaluationTab({ requests, vendors, orders, onChanged }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Approved requests that don't already have a PO are the only ones
  // eligible for evaluation -- once a PO exists, the manual Orders tab
  // is where things continue.
  const requestIdsWithPO = new Set(orders.map(o => o.procurement_request_id).filter(Boolean));
  const eligibleRequests = requests.filter(
    r => r.status === 'approved' && !requestIdsWithPO.has(r.id)
  );

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-600" />
          <h2 className="text-xl font-bold text-slate-900">AI Vendor Evaluation</h2>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Scores active vendors against real data on file and recommends one. A human still
          has to click "Generate Draft PO" and later approve/send it — this only ever writes
          its own scores, never a PO directly.
        </p>
      </div>

      {eligibleRequests.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm bg-white rounded-xl border border-slate-200">
          No approved requests are waiting on a vendor decision right now. Approve a request in
          the Requests tab first.
        </div>
      ) : (
        <div className="space-y-3">
          {eligibleRequests.map(req => {
            const expanded = expandedId === req.id;
            return (
              <div key={req.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div
                  className="flex items-center gap-4 p-4 cursor-pointer hover:bg-slate-50 transition"
                  onClick={() => setExpandedId(expanded ? null : req.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-slate-400">{req.request_number}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700">
                        approved
                      </span>
                    </div>
                    <h3 className="text-sm font-medium text-slate-900">{req.title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {req.product_name} • Qty: {req.quantity} • Needed: {formatDate(req.required_date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-slate-900">
                      {formatCurrency(req.total_estimate)}
                    </div>
                  </div>
                  {expanded ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </div>

                {expanded && (
                  <RequestEvaluationPanel
                    request={req}
                    vendors={vendors}
                    onChanged={onChanged}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RequestEvaluationPanel({
  request,
  vendors,
  onChanged,
}: {
  request: ProcurementRequest;
  vendors: Vendor[];
  onChanged: () => void;
}) {
  const [quotes, setQuotes] = useState<VendorQuote[]>([]);
  const [scores, setScores] = useState<VendorAIScore[]>([]);
  const [timeline, setTimeline] = useState<AIAuditEntry[]>([]);
  const [quoteInputs, setQuoteInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [generatingRank, setGeneratingRank] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const activeVendors = vendors.filter(v => v.status === 'active');

  const loadPanelData = async () => {
    setLoading(true);
    try {
      const [q, s, t] = await Promise.all([
        fetchVendorQuotes(request.id),
        fetchVendorScores(request.id),
        fetchAITimeline(request.id),
      ]);
      setQuotes(q);
      setScores(s);
      setTimeline(t);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load evaluation data');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPanelData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request.id]);

  const handleSaveQuote = async (vendorId: string) => {
    const raw = quoteInputs[vendorId];
    const value = parseFloat(raw);
    if (!raw || isNaN(value) || value < 0) return;
    setError(null);
    try {
      await upsertVendorQuote(request.id, vendorId, value);
      await loadPanelData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save quote');
    }
  };

  const handleRunEvaluation = async () => {
    setEvaluating(true);
    setError(null);
    setNotice(null);
    try {
      await runVendorEvaluation(request.id);
      await loadPanelData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Evaluation failed');
    }
    setEvaluating(false);
  };

  const isStale = (evaluatedAt: string) =>
    Date.now() - new Date(evaluatedAt).getTime() > STALENESS_WINDOW_MS;

  const handleGenerateDraftPO = async (score: VendorAIScore) => {
    if (isStale(score.evaluated_at)) {
      setError('This evaluation is more than 48 hours old. Re-run the evaluation before generating a PO from it.');
      return;
    }
    setGeneratingRank(score.rank ?? 0);
    setError(null);
    setNotice(null);
    try {
      const quote = quotes.find(q => q.vendor_id === score.vendor_id);
      const unitPrice = quote
        ? quote.quoted_price
        : request.quantity
        ? request.total_estimate / request.quantity
        : request.total_estimate;

      // This calls the exact same function the manual "Create PO" button
      // in the Orders tab calls -- the AI panel never writes a PO itself,
      // it only pre-fills the human-triggered action.
      await createPurchaseOrder({
        vendor_id: score.vendor_id,
        procurement_request_id: request.id,
        lines: [
          {
            item_description: request.product_name || request.title,
            quantity: request.quantity || 1,
            unit_price: unitPrice,
          },
        ],
      });
      setNotice(`Draft PO created for ${score.vendor?.name || 'the recommended vendor'}. Send and approve it from the Purchase Orders tab.`);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate draft PO');
    }
    setGeneratingRank(null);
  };

  const dimensionCell = (value: number | null) =>
    value === null ? <span className="text-slate-300">—</span> : `${Math.round(value * 100)}%`;

  return (
    <div className="border-t border-slate-100 px-4 py-4 bg-slate-50/50">
      {error && (
        <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
      {notice && (
        <div className="mb-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          {notice}
        </div>
      )}

      {/* Step 1: optional quotes */}
      <div className="mb-4">
        <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
          Vendor Quotes (optional — only quoted vendors get a Price score)
        </h4>
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-slate-600">Vendor</th>
                <th className="text-left px-3 py-2 font-medium text-slate-600">Source</th>
                <th className="text-left px-3 py-2 font-medium text-slate-600">Verified</th>
                <th className="text-right px-3 py-2 font-medium text-slate-600">Quoted Price</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {activeVendors.map(v => {
                const existing = quotes.find(q => q.vendor_id === v.id);
                return (
                  <tr key={v.id}>
                    <td className="px-3 py-2 text-slate-700">{v.name}</td>
                    <td className="px-3 py-2 text-slate-500">{v.source_type}</td>
                    <td className="px-3 py-2 text-slate-500">{v.is_verified ? 'Yes' : 'No'}</td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder={existing ? String(existing.quoted_price) : 'No quote'}
                        value={quoteInputs[v.id] ?? ''}
                        onChange={e => setQuoteInputs({ ...quoteInputs, [v.id]: e.target.value })}
                        className="w-24 px-2 py-1 border border-slate-300 rounded text-xs text-right"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => handleSaveQuote(v.id)}
                        disabled={!quoteInputs[v.id]}
                        className="text-xs px-2 py-1 bg-slate-700 text-white rounded hover:bg-slate-600 disabled:opacity-40"
                      >
                        Save
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Step 2: run evaluation */}
      <div className="mb-4">
        <button
          onClick={handleRunEvaluation}
          disabled={evaluating}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-500 transition disabled:opacity-50"
        >
          {evaluating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {scores.length > 0 ? 'Re-run AI Evaluation' : 'Run AI Evaluation'}
        </button>
      </div>

      {/* Step 3: results */}
      {loading ? (
        <p className="text-xs text-slate-400">Loading...</p>
      ) : scores.length > 0 ? (
        <div className="mb-4">
          <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
            Ranking (evaluated {formatDateTime(scores[0]?.evaluated_at)})
          </h4>
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-slate-600">Rank</th>
                  <th className="text-left px-3 py-2 font-medium text-slate-600">Vendor</th>
                  <th className="text-right px-3 py-2 font-medium text-slate-600">Price</th>
                  <th className="text-right px-3 py-2 font-medium text-slate-600">Delivery</th>
                  <th className="text-right px-3 py-2 font-medium text-slate-600">Reliability</th>
                  <th className="text-right px-3 py-2 font-medium text-slate-600">Risk</th>
                  <th className="text-right px-3 py-2 font-medium text-slate-600">Performance</th>
                  <th className="text-right px-3 py-2 font-medium text-slate-600">Composite</th>
                  <th className="text-right px-3 py-2 font-medium text-slate-600">Confidence</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {scores.map(s => {
                  const confident = s.confidence >= CONFIDENCE_FLOOR;
                  const stale = isStale(s.evaluated_at);
                  return (
                    <tr key={s.id} className={s.rank === 1 ? 'bg-indigo-50/50' : ''}>
                      <td className="px-3 py-2 text-slate-500">
                        {s.rank === 1 ? (
                          <span className="inline-flex items-center gap-1 text-indigo-600 font-semibold">
                            <Trophy className="w-3.5 h-3.5" /> #1
                          </span>
                        ) : (
                          `#${s.rank}`
                        )}
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-900">{s.vendor?.name}</td>
                      <td className="px-3 py-2 text-right">{dimensionCell(s.price_score)}</td>
                      <td className="px-3 py-2 text-right">{dimensionCell(s.delivery_score)}</td>
                      <td className="px-3 py-2 text-right">{dimensionCell(s.reliability_score)}</td>
                      <td className="px-3 py-2 text-right">{dimensionCell(s.risk_score)}</td>
                      <td className="px-3 py-2 text-right">{dimensionCell(s.performance_score)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-900">
                        {Math.round(s.composite_score * 100)}%
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span
                          className={`px-1.5 py-0.5 rounded font-medium ${
                            confident ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {Math.round(s.confidence * 100)}% ({s.dimensions_scored}/5)
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        {!confident ? (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                            <ShieldAlert className="w-3.5 h-3.5" /> Manual review required
                          </span>
                        ) : stale ? (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                            <Clock className="w-3.5 h-3.5" /> Stale — re-run
                          </span>
                        ) : (
                          <button
                            onClick={() => handleGenerateDraftPO(s)}
                            disabled={generatingRank !== null}
                            className="text-xs px-2.5 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-500 disabled:opacity-50"
                          >
                            {generatingRank === s.rank ? (
                              <Loader2 className="w-3 h-3 animate-spin inline" />
                            ) : s.rank === 1 ? (
                              'Generate Draft PO'
                            ) : (
                              'Use this vendor instead'
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Price only shows for vendors you entered a quote for. Reliability, delivery and
            performance only show for vendors with at least one entry in Vendor Evaluations —
            they are left blank (not scored as 0) otherwise, and confidence drops accordingly.
          </p>
        </div>
      ) : (
        <p className="text-xs text-slate-400 mb-4">No evaluation run yet for this request.</p>
      )}

      {/* Step 4: AI decision timeline */}
      {timeline.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5" /> AI Decision Timeline
          </h4>
          <ul className="space-y-1">
            {timeline.map(t => (
              <li key={t.id} className="text-xs text-slate-500 flex items-center gap-2">
                <span className="text-slate-400">{formatDateTime(t.created_at)}</span>
                <span>
                  {t.action === 'AI_EVALUATION_RUN' && t.new_values
                    ? `Evaluated vendors — top pick: ${t.new_values.top_vendor} (${Math.round(
                        Number(t.new_values.top_score) * 100
                      )}%)`
                    : t.action}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
