import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Wheat, CheckCircle, Clock, XCircle, Loader2 } from 'lucide-react';
import TransactionTimeline from '@/components/TransactionTimeline';
import { useTranslation } from 'react-i18next';
import { toast } from '@/hooks/use-toast';

const StatusBadge = ({ status }: { status: string }) => {
  const { t } = useTranslation(['farmer']);
  const translate = t as any;
  const map: Record<string, string> = {
    pending: 'bg-warning/15 text-warning',
    accepted: 'bg-info/15 text-info',
    completed: 'bg-success/15 text-success',
    rejected: 'bg-destructive/15 text-destructive',
  };
  const icons: Record<string, any> = { pending: Clock, accepted: CheckCircle, completed: CheckCircle, rejected: XCircle };
  const Icon = icons[status] || Clock;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${map[status] || ''}`}>
      <Icon className="w-3 h-3" /> {translate(`statuses.${status}`, { ns: 'farmer' })}
    </span>
  );
};

const FarmerRequests = () => {
  const { user } = useAuth();
  const [myTransactions, setMyTransactions] = useState<any[]>([]);
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  const [reportingTxId, setReportingTxId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [reporting, setReporting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const { t } = useTranslation(['common', 'farmer']);
  const translate = t as any;

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('farmer_id', user.id)
      .order('created_at', { ascending: false });
    setMyTransactions(data || []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const startReport = (txId: string) => {
    if (reportingTxId === txId) {
      setReportingTxId(null);
      setReportReason('');
      setReportDetails('');
      return;
    }

    setReportingTxId(txId);
    setReportReason('');
    setReportDetails('');
  };

  const submitReport = async (transaction: any) => {
    if (!user?.id) return;

    const reason = reportReason.trim();
    if (!reason) {
      toast({
        title: translate('requests.report.requiredReason', { ns: 'farmer' }),
        variant: 'destructive',
      });
      return;
    }

    setReporting(true);

    const details = reportDetails.trim();
    const { error } = await supabase.from('fraud_reports').insert({
      reporter_user_id: user.id,
      reported_user_id: transaction.industry_id,
      reason,
      details: details || `Transaction: ${transaction.id}`,
    });

    setReporting(false);

    if (error) {
      toast({
        title: translate('requests.report.failedTitle', { ns: 'farmer' }),
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: translate('requests.report.successTitle', { ns: 'farmer' }),
      description: translate('requests.report.successDescription', { ns: 'farmer' }),
    });

    setReportingTxId(null);
    setReportReason('');
    setReportDetails('');
  };

  const filtered = filter === 'all' ? myTransactions : myTransactions.filter(t => t.status === filter);

  const handleRequestDecision = async (transaction: any, nextStatus: 'accepted' | 'rejected') => {
    const updatePayload = nextStatus === 'accepted'
      ? {
          status: 'accepted',
          pickup_date: transaction.pickup_date || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        }
      : { status: 'rejected' };

    const { error } = await supabase.from('transactions').update(updatePayload).eq('id', transaction.id);
    if (error) {
      toast({
        title: translate('listing.errorTitle', { ns: 'farmer' }),
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    if (nextStatus === 'accepted' && transaction.listing_id) {
      await supabase.from('residue_listings').update({ status: 'pending' }).eq('id', transaction.listing_id);
    }

    const industryMessage = nextStatus === 'accepted'
      ? translate('requests.decision.acceptedNotification', { ns: 'farmer', cropType: transaction.crop_type })
      : translate('requests.decision.rejectedNotification', { ns: 'farmer', cropType: transaction.crop_type });

    await supabase.from('notifications').insert({
      user_id: transaction.industry_id,
      message: industryMessage,
      type: nextStatus === 'accepted' ? 'success' : 'warning',
    });

    toast({
      title: nextStatus === 'accepted'
        ? translate('requests.decision.acceptedTitle', { ns: 'farmer' })
        : translate('requests.decision.rejectedTitle', { ns: 'farmer' }),
      description: nextStatus === 'accepted'
        ? translate('requests.decision.acceptedDescription', { ns: 'farmer' })
        : translate('requests.decision.rejectedDescription', { ns: 'farmer' }),
      variant: nextStatus === 'accepted' ? 'default' : 'destructive',
    });

    fetchData();
  };

  const statusCounts = {
    all: myTransactions.length,
    pending: myTransactions.filter(t => t.status === 'pending').length,
    accepted: myTransactions.filter(t => t.status === 'accepted').length,
    completed: myTransactions.filter(t => t.status === 'completed').length,
    rejected: myTransactions.filter(t => t.status === 'rejected').length,
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">{translate('requests.title', { ns: 'farmer' })}</h2>

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {(['all', 'pending', 'accepted', 'completed', 'rejected'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === s
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-secondary'
              }`}
            >
              {translate(`requests.filters.${s}`, { ns: 'farmer' })} ({statusCounts[s]})
            </button>
          ))}
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl p-4 shadow-card">
            <p className="text-xs text-muted-foreground">{translate('requests.stats.totalRequests', { ns: 'farmer' })}</p>
            <p className="text-xl font-bold">{myTransactions.length}</p>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-card">
            <p className="text-xs text-muted-foreground">{translate('requests.stats.totalEarnings', { ns: 'farmer' })}</p>
            <p className="text-xl font-bold text-success">
              ₹{myTransactions.filter(t => t.status === 'completed').reduce((s, t) => s + (Number(t.net_profit) || 0), 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-card">
            <p className="text-xs text-muted-foreground">{translate('requests.stats.biomassTraded', { ns: 'farmer' })}</p>
            <p className="text-xl font-bold">
              {myTransactions.filter(t => t.status === 'completed').reduce((s, t) => s + Number(t.quantity), 0)}t
            </p>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-card">
            <p className="text-xs text-muted-foreground">{translate('requests.stats.co2Saved', { ns: 'farmer' })}</p>
            <p className="text-xl font-bold text-primary">
              {myTransactions.filter(t => t.status === 'completed').reduce((s, t) => s + (Number(t.carbon_saved) || 0), 0).toFixed(1)} kg
            </p>
          </div>
        </div>

        {/* Requests list */}
        <div className="bg-card rounded-xl p-6 shadow-card">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <Wheat className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {filter === 'all' ? translate('requests.emptyAll', { ns: 'farmer' }) : translate('requests.emptyFiltered', { ns: 'farmer', status: translate(`requests.filters.${filter}`, { ns: 'farmer' }) })}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map(t => (
                <div key={t.id} className="border border-border rounded-lg p-4 animate-fade-in">
                  <div className="flex items-center justify-between mb-2 cursor-pointer" onClick={() => setExpandedTx(expandedTx === t.id ? null : t.id)}>
                    <div>
                      <p className="font-medium text-sm">{t.crop_type} • {Number(t.quantity)}t</p>
                      <p className="text-xs text-muted-foreground">
                        ₹{Number(t.price_per_ton)}/ton • Total: ₹{Number(t.total_value).toLocaleString()} • Net: ₹{Number(t.net_profit || 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        📍 {Number(t.transport_distance || 0)} km • 🚚 ₹{Number(t.transport_cost || 0).toLocaleString()}
                        {Number(t.transport_savings) > 0 && <span className="text-success"> (saved ₹{Number(t.transport_savings).toLocaleString()})</span>}
                      </p>
                      {t.pickup_date && (
                        <p className="text-xs text-info mt-0.5">📅 {translate('requests.pickup', { ns: 'farmer', date: t.pickup_date })}</p>
                      )}
                    </div>
                    <StatusBadge status={t.status} />
                  </div>
                  <div className="mt-2 flex justify-end">
                    <div className="flex items-center gap-2">
                      {t.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleRequestDecision(t, 'accepted')}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-success text-success-foreground hover:bg-success/90 transition-colors"
                          >
                            {translate('requests.actions.accept', { ns: 'farmer' })}
                          </button>
                          <button
                            onClick={() => handleRequestDecision(t, 'rejected')}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                          >
                            {translate('requests.actions.reject', { ns: 'farmer' })}
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => startReport(t.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                      >
                        {translate('requests.report.button', { ns: 'farmer' })}
                      </button>
                    </div>
                  </div>

                  {reportingTxId === t.id && (
                    <div className="mt-3 p-3 rounded-lg border border-border bg-muted/30 space-y-2">
                      <p className="text-xs font-semibold">{translate('requests.report.title', { ns: 'farmer' })}</p>
                      <div>
                        <label className="text-xs text-muted-foreground">{translate('requests.report.reasonLabel', { ns: 'farmer' })}</label>
                        <input
                          type="text"
                          value={reportReason}
                          onChange={(e) => setReportReason(e.target.value)}
                          placeholder={translate('requests.report.reasonPlaceholder', { ns: 'farmer' })}
                          className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">{translate('requests.report.detailsLabel', { ns: 'farmer' })}</label>
                        <textarea
                          value={reportDetails}
                          onChange={(e) => setReportDetails(e.target.value)}
                          placeholder={translate('requests.report.detailsPlaceholder', { ns: 'farmer' })}
                          className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-xs min-h-20 focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => startReport(t.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:bg-secondary transition-colors"
                        >
                          {translate('requests.report.cancel', { ns: 'farmer' })}
                        </button>
                        <button
                          disabled={reporting}
                          onClick={() => submitReport(t)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-60 transition-colors"
                        >
                          {reporting ? translate('requests.report.submitting', { ns: 'farmer' }) : translate('requests.report.submit', { ns: 'farmer' })}
                        </button>
                      </div>
                    </div>
                  )}

                  {expandedTx === t.id && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <TransactionTimeline transaction={{
                        ...t,
                        farmerId: t.farmer_id,
                        farmerName: user?.name || '',
                        industryId: t.industry_id,
                        industryName: '',
                        cropType: t.crop_type,
                        pricePerTon: Number(t.price_per_ton),
                        totalValue: Number(t.total_value),
                        transportCost: Number(t.transport_cost || 0),
                        netProfit: Number(t.net_profit || 0),
                        distance: Number(t.transport_distance || 0),
                        createdAt: t.created_at,
                        pickupDate: t.pickup_date,
                        clusterEligible: t.cluster_eligible,
                        transportSavings: Number(t.transport_savings || 0),
                      }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default FarmerRequests;
