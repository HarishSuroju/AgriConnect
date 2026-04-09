import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Wheat, Loader2, ShoppingCart, MapPin, Package, Tag, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { calculateDistance, TRANSPORT_RATE, CLUSTER_RADIUS_KM, CLUSTER_DISCOUNT } from '@/data/mockData';
import { useTranslation } from 'react-i18next';

const IndustryBrowse = () => {
  const { user } = useAuth();
  const { t } = useTranslation(['common', 'industry']);
  const [availableListings, setAvailableListings] = useState<any[]>([]);
  const [industryProfile, setIndustryProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    const [listingsRes, profileRes] = await Promise.all([
      supabase.from('residue_listings').select('*').eq('status', 'available').order('created_at', { ascending: false }),
      supabase.from('industry_profiles').select('*').eq('user_id', user.id).maybeSingle(),
    ]);
    setAvailableListings(listingsRes.data || []);
    setIndustryProfile(profileRes.data);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleBuyListing = async (listing: any) => {
    if (!user?.id || !industryProfile) {
      toast({ title: t('browse.profileMissingTitle', { ns: 'industry' }), description: t('browse.profileMissingDescription', { ns: 'industry' }), variant: 'destructive' });
      return;
    }

    const { data: existingRequest } = await supabase
      .from('transactions')
      .select('id')
      .eq('listing_id', listing.id)
      .eq('industry_id', user.id)
      .in('status', ['pending', 'accepted', 'completed'])
      .maybeSingle();

    if (existingRequest) {
      toast({ title: t('browse.requestExistsTitle', { ns: 'industry' }), description: t('browse.requestExistsDescription', { ns: 'industry' }) });
      return;
    }

    const dist = (industryProfile.lat && industryProfile.lng && listing.lat && listing.lng)
      ? calculateDistance(Number(industryProfile.lat), Number(industryProfile.lng), Number(listing.lat), Number(listing.lng))
      : 0;

    const qty = Number(listing.quantity);
    const baseCost = dist * TRANSPORT_RATE * qty;
    const isCluster = dist <= CLUSTER_RADIUS_KM;
    const transportCost = isCluster ? baseCost * (1 - CLUSTER_DISCOUNT) : baseCost;
    const pricePerTon = Number(industryProfile.price_offered_per_ton) || Number(listing.adjusted_price_per_ton);
    const totalValue = pricePerTon * qty;
    const netProfit = totalValue - transportCost;
    const carbonSaved = qty * 1.5;
    const creditPoints = qty * 8;

    const { error } = await supabase.from('transactions').insert({
      listing_id: listing.id,
      farmer_id: listing.farmer_id,
      industry_id: user.id,
      crop_type: listing.crop_type,
      quantity: qty,
      price_per_ton: pricePerTon,
      total_value: totalValue,
      transport_distance: dist,
      transport_cost: transportCost,
      net_profit: netProfit,
      cluster_eligible: isCluster,
      transport_savings: isCluster ? baseCost * CLUSTER_DISCOUNT : 0,
      carbon_saved: carbonSaved,
      credit_points: creditPoints,
      status: 'pending',
    });

    if (error) {
      toast({ title: t('browse.errorTitle', { ns: 'industry' }), description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t('browse.requestSentTitle', { ns: 'industry' }), description: t('browse.requestSentDescription', { ns: 'industry', quantity: qty, cropType: listing.crop_type }) });
      const { error: notifyError } = await supabase.from('notifications').insert({
        user_id: listing.farmer_id,
        message: t('browse.notificationMessage', { ns: 'industry', company: user.companyName || t('roles.industry', { ns: 'common' }), quantity: qty, cropType: listing.crop_type }),
        type: 'success',
      });

      if (notifyError) {
        toast({ title: t('browse.errorTitle', { ns: 'industry' }), description: notifyError.message, variant: 'destructive' });
      }

      fetchData();
    }
  };

  if (loading) {
    return <DashboardLayout><div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {t('browse.title', { ns: 'industry' })}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t('browse.subtitle', { ns: 'industry', defaultValue: 'Discover and purchase quality crop residue from verified farmers' })}
          </p>
        </motion.div>

        {availableListings.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden rounded-2xl border border-border/50 backdrop-blur-xl p-12"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-30" />
            <div className="relative z-10 flex flex-col items-center justify-center">
              <Wheat className="w-16 h-16 text-muted-foreground/20 mb-4" />
              <p className="text-lg font-semibold text-muted-foreground">{t('browse.empty', { ns: 'industry' })}</p>
              <p className="text-sm text-muted-foreground/60 mt-2">{t('browse.emptyHint', { ns: 'industry', defaultValue: 'Check back soon for new listings' })}</p>
            </div>
          </motion.div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {availableListings.map((l, idx) => {
              const dist = (industryProfile?.lat && industryProfile?.lng && l.lat && l.lng)
                ? calculateDistance(Number(industryProfile.lat), Number(industryProfile.lng), Number(l.lat), Number(l.lng))
                : null;
              const isCluster = dist && dist <= CLUSTER_RADIUS_KM;
              return (
                <motion.div
                  key={l.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={{ translateY: -2 }}
                  className="relative overflow-hidden rounded-2xl border border-primary/25 backdrop-blur-xl transition-all duration-300 group bg-card/60"
                >
                  <div className="absolute inset-0 backdrop-blur-xl bg-card/35" />
                  
                  {/* Image */}
                  {l.image_url && (
                    <div className="relative h-40 overflow-hidden">
                      <motion.img
                        src={l.image_url}
                        alt={t('browse.cropResidueAlt', { ns: 'industry' })}
                        className="w-full h-full object-cover transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      
                      {/* Quality Badge */}
                      {l.quality_grade && (
                        <div className="absolute top-3 right-3 z-10">
                          <motion.span
                            whileHover={{ scale: 1.03 }}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-xl ${
                              l.quality_grade === 'A' ? 'bg-success/80 text-white shadow-lg shadow-success/40' :
                              l.quality_grade === 'B' ? 'bg-warning/80 text-white shadow-lg shadow-warning/40' :
                              'bg-info/80 text-white shadow-lg shadow-info/40'
                            }`}
                          >
                            <Tag className="w-3.5 h-3.5" /> {t('browse.grade', { ns: 'industry', grade: l.quality_grade })}
                          </motion.span>
                        </div>
                      )}
                      
                      {/* Cluster Badge */}
                      {isCluster && (
                        <div className="absolute bottom-3 left-3 z-10">
                          <motion.span
                            whileHover={{ scale: 1.03 }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-success/80 text-white shadow-lg shadow-success/40 backdrop-blur-xl"
                          >
                            <Zap className="w-3.5 h-3.5" /> {t('browse.clusterDeal', { ns: 'industry', defaultValue: 'Cluster Deal' })}
                          </motion.span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="relative z-10 p-5">
                    {/* Title */}
                    <div className="mb-4">
                      <h3 className="text-lg font-bold text-foreground flex items-center gap-2 mb-1">
                        <Wheat className="w-5 h-5 text-primary" />
                        {l.crop_type}
                      </h3>
                      <p className="text-xs text-muted-foreground">{t('browse.availableQuantity', { ns: 'industry', defaultValue: 'Available quantity: {{quantity}} tons', quantity: Number(l.quantity) })}</p>
                    </div>

                    {/* Pricing */}
                    <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl p-3 mb-4 border border-primary/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-muted-foreground uppercase">{t('browse.price', { ns: 'industry', defaultValue: 'Price' })}</span>
                        <span className="text-lg font-bold text-primary">₹{Number(l.adjusted_price_per_ton)}/ton</span>
                      </div>
                      <div className="h-px bg-gradient-to-r from-primary/20 to-transparent mb-2" />
                      <p className="text-xs text-muted-foreground">
                        {t('browse.total', { ns: 'industry', value: `₹${Number(l.total_value).toLocaleString()}` })}
                      </p>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
                      {dist !== null && (
                        <div className="bg-card/50 rounded-lg p-2 border border-border/30">
                          <p className="text-muted-foreground mb-0.5">{t('browse.distance', { ns: 'industry', defaultValue: 'Distance' })}</p>
                          <p className="font-bold text-primary flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" /> {t('browse.distanceAway', { ns: 'industry', distance: Number(dist.toFixed(1)) })}
                          </p>
                        </div>
                      )}
                      {l.moisture_level && (
                        <div className="bg-card/50 rounded-lg p-2 border border-border/30">
                          <p className="text-muted-foreground mb-0.5">{t('browse.moistureLabel', { ns: 'industry', defaultValue: 'Moisture' })}</p>
                          <p className="font-bold text-accent">{Number(l.moisture_level)}%</p>
                        </div>
                      )}
                      {l.ai_confidence && (
                        <div className="bg-card/50 rounded-lg p-2 border border-border/30">
                          <p className="text-muted-foreground mb-0.5">{t('browse.aiQuality', { ns: 'industry', defaultValue: 'AI Quality' })}</p>
                          <p className="font-bold text-success">{(Number(l.ai_confidence) * 100).toFixed(0)}%</p>
                        </div>
                      )}
                      {l.address && (
                        <div className="bg-card/50 rounded-lg p-2 border border-border/30 col-span-2">
                          <p className="text-muted-foreground mb-0.5">{t('browse.location', { ns: 'industry', defaultValue: 'Location' })}</p>
                          <p className="font-bold text-foreground truncate">{l.address}</p>
                        </div>
                      )}
                    </div>

                    {/* CTA Button */}
                    <motion.button
                      onClick={() => handleBuyListing(l)}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-xs font-bold hover:opacity-95 transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <ShoppingCart className="w-4 h-4" /> {t('browse.sendRequest', { ns: 'industry' })}
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default IndustryBrowse;
