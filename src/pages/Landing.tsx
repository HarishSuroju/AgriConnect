import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Leaf, ArrowRight, Factory, Wheat, BarChart3, Sprout, Recycle, TrendingUp,
  Shield, Zap, Globe, Trophy, MessageCircle, Gauge, ChevronRight, Menu, X,
  CheckCircle2, AlertCircle, ChevronLeft
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { fallbackLanguage, languageLocales } from '@/i18n/resources';
import { motion, AnimatePresence } from 'framer-motion';
import useEmblaCarousel from 'embla-carousel-react';

function useCountUp(target: number, duration = 2000) {
  const [value, setValue] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !isVisible) {
        setIsVisible(true);
      }
    });

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible || target === 0) return;
    
    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, [isVisible, target, duration]);

  return { value, ref };
}

// Success Stories Carousel Component
const SuccessStoriesCarousel = () => {
  const { t } = useTranslation('landing');
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    loop: true,
    breakpoints: {
      '(max-width: 768px)': { slidesToScroll: 1 },
      '(min-width: 769px)': { slidesToScroll: 3 },
    },
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((index: number) => emblaApi?.scrollTo(index), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  const stories = [
    {
      id: 1,
      name: t('carousel.stories.1.name', { defaultValue: 'Rajesh Kumar' }),
      role: t('carousel.stories.1.role', { defaultValue: 'Farmer' }),
      location: t('carousel.stories.1.location', { defaultValue: 'Punjab' }),
      income: t('carousel.stories.1.income', { defaultValue: '₹2.5L' }),
      story: t('carousel.stories.1.story', { defaultValue: 'Converted 50 tons of wheat residue into income in just 3 months' }),
      icon: Wheat
    },
    {
      id: 2,
      name: t('carousel.stories.2.name', { defaultValue: 'Priya Industries' }),
      role: t('carousel.stories.2.role', { defaultValue: 'Buyer' }),
      location: t('carousel.stories.2.location', { defaultValue: 'Haryana' }),
      impact: t('carousel.stories.2.impact', { defaultValue: '500 tons' }),
      story: t('carousel.stories.2.story', { defaultValue: 'Found reliable biomass suppliers at 40% lower cost through AgriConnect' }),
      icon: Factory
    },
    {
      id: 3,
      name: t('carousel.stories.3.name', { defaultValue: 'Farmer Collective' }),
      role: t('carousel.stories.3.role', { defaultValue: 'Community' }),
      location: t('carousel.stories.3.location', { defaultValue: 'Maharashtra' }),
      group: t('carousel.stories.3.group', { defaultValue: '250+ farmers' }),
      story: t('carousel.stories.3.story', { defaultValue: 'Built sustainable income stream while reducing regional air pollution' }),
      icon: Sprout
    },
    {
      id: 4,
      name: t('carousel.stories.4.name', { defaultValue: 'Amit Singh' }),
      role: t('carousel.stories.4.role', { defaultValue: 'Farmer' }),
      location: t('carousel.stories.4.location', { defaultValue: 'Uttar Pradesh' }),
      income: t('carousel.stories.4.income', { defaultValue: '₹1.8L' }),
      story: t('carousel.stories.4.story', { defaultValue: 'Reduced field burning emissions by 60% while earning sustainable income' }),
      icon: Globe
    },
    {
      id: 5,
      name: t('carousel.stories.5.name', { defaultValue: 'Green Technologies' }),
      role: t('carousel.stories.5.role', { defaultValue: 'Industry Partner' }),
      location: t('carousel.stories.5.location', { defaultValue: 'Karnataka' }),
      impact: t('carousel.stories.5.impact', { defaultValue: '800 tons' }),
      story: t('carousel.stories.5.story', { defaultValue: 'Reduced sourcing costs and ensured supply chain sustainability' }),
      icon: Zap
    },
  ];

  return (
    <div className="relative">
      {/* Carousel Container */}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {stories.map((story, index) => (
            <motion.div
              key={story.id}
              className="flex-[0_0_100%] md:flex-[0_0_33.333%] min-w-0 px-3 md:px-4"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <div className="group h-full">
                <div className="relative h-full bg-gradient-to-br from-white/60 to-white/30 dark:from-white/10 dark:to-white/0 backdrop-blur-md border border-white/30 dark:border-white/10 rounded-2xl p-6 md:p-8 hover:border-primary/50 transition-all duration-300 hover:shadow-2xl overflow-hidden">
                  {/* Background gradient overlay */}
                  <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-primary/10 blur-3xl group-hover:bg-primary/20 transition-all duration-500" />
                  
                  <div className="relative z-10">
                    {/* Top section with icon and verification */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg md:text-xl font-bold text-foreground mb-1">{story.name}</h3>
                        <p className="text-xs md:text-sm text-muted-foreground flex items-center gap-1">
                          <span>{story.role}</span>
                          <span>•</span>
                          <span className="text-xs">{story.location}</span>
                        </p>
                      </div>
                      <motion.div whileHover={{ scale: 1.2 }} transition={{ duration: 0.2 }}>
                        <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0" />
                      </motion.div>
                    </div>

                    {/* Icon */}
                    <div className="mb-4">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/20 group-hover:bg-primary/30 transition-colors">
                        <story.icon className="h-6 w-6 text-primary" />
                      </div>
                    </div>

                    {/* Story text */}
                    <p className="text-sm md:text-base text-muted-foreground mb-6 leading-relaxed group-hover:text-foreground/80 transition-colors">
                      {story.story}
                    </p>

                    {/* Impact/Income metric */}
                    <div className="pt-4 border-t border-white/10">
                      <p className="text-xs text-muted-foreground mb-1">{t('carousel.impact', { defaultValue: 'Impact' })}</p>
                      <p className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                        {story.income || story.impact || story.group}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between mt-8">
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={scrollPrev}
            disabled={!canScrollPrev}
            className="p-2 rounded-full bg-primary/20 hover:bg-primary/30 text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft size={20} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={scrollNext}
            disabled={!canScrollNext}
            className="p-2 rounded-full bg-primary/20 hover:bg-primary/30 text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight size={20} />
          </motion.button>
        </div>

        {/* Dots Indicators */}
        <div className="flex gap-2">
          {scrollSnaps.map((_, index) => (
            <motion.button
              key={index}
              onClick={() => scrollTo(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === selectedIndex ? 'bg-primary w-6' : 'bg-primary/30 w-2 hover:bg-primary/50'
              }`}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.95 }}
            />
          ))}
        </div>

        {/* Slide counter */}
        <div className="text-xs text-muted-foreground font-medium">
          {selectedIndex + 1} / {scrollSnaps.length}
        </div>
      </div>
    </div>
  );
};

interface StatData {
  farmers: number;
  industries: number;
  biomass: number;
  co2: number;
}

const Landing = () => {
  const [raw, setRaw] = useState<StatData>({ farmers: 0, industries: 0, biomass: 0, co2: 0 });
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t, i18n } = useTranslation(['common', 'landing']);
  const activeLanguage = ((i18n.resolvedLanguage ?? fallbackLanguage).split('-')[0] as keyof typeof languageLocales);
  const locale = languageLocales[activeLanguage] ?? languageLocales.en;

  const fetchStats = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_public_stats');
    if (!error && data) {
      const stats = typeof data === 'string' ? JSON.parse(data) : data;
      setRaw({
        farmers: Number(stats.farmers) || 0,
        industries: Number(stats.industries) || 0,
        biomass: Number(stats.biomass) || 0,
        co2: Math.round((Number(stats.co2) || 0) / 1000),
      });
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const channel = supabase
      .channel('homepage-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => fetchStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'residue_listings' }, () => fetchStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchStats())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchStats]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const farmersCount = useCountUp(raw.farmers);
  const industriesCount = useCountUp(raw.industries);
  const biomassCount = useCountUp(raw.biomass);
  const co2Count = useCountUp(raw.co2);

  const features = [
    {
      icon: Wheat,
      title: t('features.items.0.title', { ns: 'landing', defaultValue: 'AI Crop Classification' }),
      description: t('features.items.0.description', { ns: 'landing', defaultValue: 'Smart residue detection and classification' }),
    },
    {
      icon: Zap,
      title: t('features.items.1.title', { ns: 'landing', defaultValue: 'Smart Matching' }),
      description: t('features.items.1.description', { ns: 'landing', defaultValue: 'AI-powered industry matching system' }),
    },
    {
      icon: TrendingUp,
      title: t('features.items.2.title', { ns: 'landing', defaultValue: 'Price Optimization' }),
      description: t('features.items.2.description', { ns: 'landing', defaultValue: 'Dynamic pricing based on demand' }),
    },
    {
      icon: Globe,
      title: t('features.items.3.title', { ns: 'landing', defaultValue: 'Logistics Hub' }),
      description: t('features.items.3.description', { ns: 'landing', defaultValue: 'Optimized transport & delivery' }),
    },
    {
      icon: Trophy,
      title: t('features.items.4.title', { ns: 'landing', defaultValue: 'Gamified Rewards' }),
      description: t('features.items.4.description', { ns: 'landing', defaultValue: 'Green streaks & carbon points' }),
    },
    {
      icon: Shield,
      title: t('features.items.5.title', { ns: 'landing', defaultValue: 'Trust System' }),
      description: t('features.items.5.description', { ns: 'landing', defaultValue: 'Verified profiles & secure transactions' }),
    },
  ];

  const solutionSteps = [
    {
      number: '1',
      title: t('solution.steps.0.title', { ns: 'landing', defaultValue: 'List Residue' }),
      description: t('solution.steps.0.description', { ns: 'landing', defaultValue: 'Farmers post crop waste details & location' }),
      icon: Wheat,
    },
    {
      number: '2',
      title: t('solution.steps.1.title', { ns: 'landing', defaultValue: 'AI Matching' }),
      description: t('solution.steps.1.description', { ns: 'landing', defaultValue: 'System finds nearby industries in need' }),
      icon: Zap,
    },
    {
      number: '3',
      title: t('solution.steps.2.title', { ns: 'landing', defaultValue: 'Trade & Earn' }),
      description: t('solution.steps.2.description', { ns: 'landing', defaultValue: 'Secure transaction, income earned' }),
      icon: TrendingUp,
    },
  ];

  const impactStats = [
    { value: co2Count.value, label: t('impact.stats.0.label', { ns: 'landing', defaultValue: 'Tons CO2 Saved' }), suffix: '', icon: Globe },
    { value: farmersCount.value, label: t('impact.stats.1.label', { ns: 'landing', defaultValue: 'Farmers Empowered' }), suffix: '+', icon: Sprout },
    { value: industriesCount.value, label: t('impact.stats.2.label', { ns: 'landing', defaultValue: 'Industries Connected' }), suffix: '+', icon: Factory },
    { value: biomassCount.value, label: t('impact.stats.3.label', { ns: 'landing', defaultValue: 'Tons Traded' }), suffix: '', icon: Recycle },
  ];

  const problemStats = [
    { value: '120M', label: t('problem.stats.0.label', { ns: 'landing', defaultValue: 'Tons of crop residue burned annually' }) },
    { value: '1.2B', label: t('problem.stats.1.label', { ns: 'landing', defaultValue: 'Tons of CO2 emitted yearly' }) },
    { value: '₹0', label: t('problem.stats.2.label', { ns: 'landing', defaultValue: 'Income for farmers from waste' }) },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      {/* NAVBAR */}
      <motion.nav
        initial={{ backgroundColor: 'rgba(0,0,0,0)' }}
        animate={scrolled ? { backgroundColor: 'rgba(28, 25, 23, 0.9)', backdropFilter: 'blur(10px)' } : { backgroundColor: 'rgba(0,0,0,0)' }}
        className="sticky top-0 z-50 border-b border-border/0 transition-all duration-300 px-6 py-4 md:px-12"
      >
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          {/* Logo */}
          <motion.div className="flex items-center gap-2.5" whileHover={{ scale: 1.05 }}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
              <Leaf className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {t('brand.name', { ns: 'common', defaultValue: 'AgriConnect' })}
            </span>
          </motion.div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-12">
            <a href="#hero" onClick={(e) => { e.preventDefault(); document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth' }); }} className="text-sm font-medium text-muted-foreground hover:text-foreground transition cursor-pointer">{t('navbar.home', { ns: 'landing', defaultValue: 'Home' })}</a>
            <a href="#solution" onClick={(e) => { e.preventDefault(); document.getElementById('solution')?.scrollIntoView({ behavior: 'smooth' }); }} className="text-sm font-medium text-muted-foreground hover:text-foreground transition cursor-pointer">{t('navbar.solution', { ns: 'landing', defaultValue: 'Solution' })}</a>
            <a href="#features" onClick={(e) => { e.preventDefault(); document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }); }} className="text-sm font-medium text-muted-foreground hover:text-foreground transition cursor-pointer">{t('navbar.features', { ns: 'landing', defaultValue: 'Features' })}</a>
            <a href="#how-it-works" onClick={(e) => { e.preventDefault(); document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' }); }} className="text-sm font-medium text-muted-foreground hover:text-foreground transition cursor-pointer">{t('navbar.howItWorks', { ns: 'landing', defaultValue: 'How it Works' })}</a>
            <a href="#impact" onClick={(e) => { e.preventDefault(); document.getElementById('impact')?.scrollIntoView({ behavior: 'smooth' }); }} className="text-sm font-medium text-muted-foreground hover:text-foreground transition cursor-pointer">{t('navbar.impact', { ns: 'landing', defaultValue: 'Impact' })}</a>
          </div>

          {/* Right Nav Items */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:block">
              <LanguageSwitcher />
            </div>
            <Link to="/login" className="hidden md:block px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition">
              {t('navbar.login', { ns: 'landing' })}
            </Link>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link
                to="/login?mode=register"
                className="px-6 py-2 text-sm font-semibold bg-gradient-to-r from-primary to-accent text-white rounded-lg hover:shadow-lg transition-all"
              >
                {t('navbar.getStarted', { ns: 'landing', defaultValue: 'Get Started' })}
              </Link>
            </motion.div>
            <button
              className="md:hidden text-foreground"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden mt-4 space-y-4 pb-4 border-t border-border/20 pt-4"
            >
              <a href="#hero" onClick={(e) => { e.preventDefault(); document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth' }); setMobileMenuOpen(false); }} className="block text-sm font-medium text-muted-foreground cursor-pointer">{t('navbar.home', { ns: 'landing', defaultValue: 'Home' })}</a>
              <a href="#solution" onClick={(e) => { e.preventDefault(); document.getElementById('solution')?.scrollIntoView({ behavior: 'smooth' }); setMobileMenuOpen(false); }} className="block text-sm font-medium text-muted-foreground cursor-pointer">{t('navbar.solution', { ns: 'landing', defaultValue: 'Solution' })}</a>
              <a href="#features" onClick={(e) => { e.preventDefault(); document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }); setMobileMenuOpen(false); }} className="block text-sm font-medium text-muted-foreground cursor-pointer">{t('navbar.features', { ns: 'landing', defaultValue: 'Features' })}</a>
              <a href="#how-it-works" onClick={(e) => { e.preventDefault(); document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' }); setMobileMenuOpen(false); }} className="block text-sm font-medium text-muted-foreground cursor-pointer">{t('navbar.howItWorks', { ns: 'landing', defaultValue: 'How it Works' })}</a>
              <a href="#impact" onClick={(e) => { e.preventDefault(); document.getElementById('impact')?.scrollIntoView({ behavior: 'smooth' }); setMobileMenuOpen(false); }} className="block text-sm font-medium text-muted-foreground cursor-pointer">{t('navbar.impact', { ns: 'landing', defaultValue: 'Impact' })}</a>
              <Link to="/login" className="block text-sm font-medium text-muted-foreground">{t('navbar.login', { ns: 'landing', defaultValue: 'Login' })}</Link>
              <LanguageSwitcher />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* HERO SECTION */}
      <section id="hero" className="relative min-h-screen flex items-center overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/10" />
        
        {/* Animated Background Elements */}
        <motion.div
          className="absolute top-20 right-10 w-96 h-96 rounded-full bg-primary/20 blur-3xl"
          animate={{ y: [0, 30, 0] }}
          transition={{ duration: 6, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-20 left-10 w-80 h-80 rounded-full bg-accent/20 blur-3xl"
          animate={{ y: [0, -30, 0] }}
          transition={{ duration: 8, repeat: Infinity }}
        />

        <div className="relative z-10 mx-auto max-w-7xl px-6 md:px-12 py-20 md:py-32 w-full">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <motion.div
                className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 mb-6"
                whileHover={{ scale: 1.05 }}
              >
                <Sprout className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold text-primary">{t('hero.badge', { ns: 'landing', defaultValue: 'Sustainable Agriculture & Waste Management' })}</span>
              </motion.div>

              <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  {t('hero.titleLine1', { ns: 'landing', defaultValue: 'Turning Crop Waste' })}
                </span>
                <br />
                <span className="text-foreground">{t('hero.titleLine2', { ns: 'landing', defaultValue: 'into Green Wealth' })}</span>
                <span className="text-4xl md:text-5xl"> 🌱</span>
              </h1>

              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                {t('hero.description', { ns: 'landing', defaultValue: 'AgriConnect empowers farmers to convert crop residue into income while reducing pollution and enabling sustainable industries.' })}
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link
                    to="/login?mode=register&role=farmer"
                    className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-primary to-accent text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
                  >
                    {t('hero.startFarmer', { ns: 'landing', defaultValue: 'Start as Farmer' })} <ArrowRight size={18} />
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link
                    to="/login?mode=register&role=industry"
                    className="flex items-center justify-center gap-2 px-8 py-4 border-2 border-primary/30 text-foreground rounded-xl font-semibold hover:bg-primary/5 transition-all"
                  >
                    {t('hero.joinIndustry', { ns: 'landing', defaultValue: 'Join as Industry' })} <ArrowRight size={18} />
                  </Link>
                </motion.div>
              </div>
            </motion.div>

            {/* Right - Floating Cards */}
            <motion.div
              className="relative h-full"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              {/* Card 1 */}
              <motion.div
                className="absolute top-0 right-0 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 rounded-2xl p-6 w-64 shadow-xl"
                animate={{ y: [0, 20, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
              >
                <Sprout className="h-8 w-8 text-accent mb-3" />
                <p className="text-xs text-muted-foreground mb-2">{t('hero.floating.farmersEarning', { ns: 'landing', defaultValue: 'Farmers Earning' })}</p>
                <p className="text-2xl font-bold text-foreground">₹48.5L+</p>
              </motion.div>

              {/* Card 2 */}
              <motion.div
                className="absolute top-40 left-10 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 rounded-2xl p-6 w-64 shadow-xl"
                animate={{ y: [0, -20, 0] }}
                transition={{ duration: 4, repeat: Infinity, delay: 1 }}
              >
                <Globe className="h-8 w-8 text-green-500 mb-3" />
                <p className="text-xs text-muted-foreground mb-2">{t('hero.floating.co2Saved', { ns: 'landing', defaultValue: 'CO₂ Saved' })}</p>
                <p className="text-2xl font-bold text-foreground">
                  {t('hero.floating.co2SavedValue', { ns: 'landing', defaultValue: '{{value}}K+ Tons', value: co2Count.value })}
                </p>
              </motion.div>

              {/* Card 3 */}
              <motion.div
                className="absolute bottom-10 right-10 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 rounded-2xl p-6 w-64 shadow-xl"
                animate={{ y: [0, 20, 0] }}
                transition={{ duration: 4, repeat: Infinity, delay: 2 }}
              >
                <Factory className="h-8 w-8 text-blue-500 mb-3" />
                <p className="text-xs text-muted-foreground mb-2">{t('hero.floating.industriesMatched', { ns: 'landing', defaultValue: 'Industries Matched' })}</p>
                <p className="text-2xl font-bold text-foreground">{industriesCount.value}+</p>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* PROBLEM SECTION */}
      <section id="problem" className="py-20 md:py-32 px-6 md:px-12 bg-gradient-to-b from-background to-red-950/5">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 mb-4">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-xs font-semibold text-red-600">{t('problem.badge', { ns: 'landing', defaultValue: 'The Crisis' })}</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">{t('problem.title', { ns: 'landing', defaultValue: "The Problem We're Solving" })}</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('problem.description', { ns: 'landing', defaultValue: 'Millions of tons of crop residue are burned every year, causing severe air pollution and wasting valuable resources that could benefit industries and farmers alike.' })}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {problemStats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-gradient-to-br from-red-50 to-red-50/50 dark:from-red-950/20 dark:to-red-950/10 rounded-2xl p-8 border border-red-200/50 dark:border-red-900/30"
              >
                <div className="mb-4 text-4xl font-bold text-red-600">{stat.value}</div>
                <p className="text-foreground font-medium">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SOLUTION SECTION */}
      <section id="solution" className="py-20 md:py-32 px-6 md:px-12">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">{t('solution.title', { ns: 'landing', defaultValue: 'Our Solution' })}</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('solution.description', { ns: 'landing', defaultValue: 'A smart platform connecting farmers with industries for sustainable waste transformation' })}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {solutionSteps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -10, transition: { duration: 0.3 } }}
              >
                <div className="relative">
                  <div className="absolute -top-5 left-0 w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg z-10">
                    {step.number}
                  </div>
                  <div className="bg-gradient-to-br from-white/50 to-white/20 dark:from-white/5 dark:to-white/0 backdrop-blur-md border border-white/20 rounded-2xl p-8 pt-16 h-full">
                    <step.icon className="h-10 w-10 text-primary mb-4" />
                    <h3 className="text-2xl font-bold mb-3">{step.title}</h3>
                    <p className="text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="py-20 md:py-32 px-6 md:px-12 bg-gradient-to-b from-background to-primary/5">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">{t('features.title', { ns: 'landing', defaultValue: 'Powerful Features' })}</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('features.description', { ns: 'landing', defaultValue: 'Everything you need to succeed in the circular economy' })}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -10, transition: { duration: 0.3 } }}
                className="group cursor-pointer"
              >
                <div className="bg-gradient-to-br from-white/50 to-white/20 dark:from-white/5 dark:to-white/0 backdrop-blur-md border border-white/20 group-hover:border-primary/50 rounded-2xl p-8 transition-all duration-300 h-full shadow-lg group-hover:shadow-xl">
                  <div className="bg-gradient-to-br from-primary/20 to-accent/20 w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <feature.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                  <div className="mt-6 flex items-center text-primary font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                    {t('features.learnMore', { ns: 'landing', defaultValue: 'Learn more' })} <ChevronRight size={18} className="ml-2" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* IMPACT METRICS SECTION */}
      <section id="impact" className="py-20 md:py-32 px-6 md:px-12 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">{t('impact.title', { ns: 'landing', defaultValue: 'Real Impact, Real Numbers' })}</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('impact.description', { ns: 'landing', defaultValue: 'See the difference AgriConnect is making in real-time' })}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-8">
            {impactStats.map((stat, index) => {
              const statData = stat.icon === Globe ? co2Count : 
                                     stat.icon === Sprout ? farmersCount :
                                     stat.icon === Factory ? industriesCount :
                                     biomassCount;
              return (
                <motion.div
                  key={index}
                  ref={statData.ref}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="group cursor-pointer"
                >
                  <div className="bg-gradient-to-br from-white/50 to-white/20 dark:from-white/10 dark:to-white/0 backdrop-blur-md border border-white/20 group-hover:border-primary/50 rounded-2xl p-8 text-center transition-all duration-300 group-hover:shadow-xl">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 mb-6 group-hover:scale-110 transition-transform">
                      <stat.icon className="h-8 w-8 text-primary" />
                    </div>
                    <div className="text-5xl font-bold mb-2 text-transparent bg-gradient-to-r from-primary to-accent bg-clip-text">
                      {statData.value.toLocaleString(locale, { maximumFractionDigits: 0 })}{stat.suffix}
                    </div>
                    <p className="text-muted-foreground">{stat.label}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section id="how-it-works" className="py-20 md:py-32 px-6 md:px-12">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">{t('howItWorks.title', { ns: 'landing', defaultValue: 'How It Works' })}</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('howItWorks.description', { ns: 'landing', defaultValue: 'A seamless flow from crop residue to sustainable value creation' })}
            </p>
          </motion.div>

          <div className="relative">
            {/* Desktop Flow */}
            <div className="hidden md:flex items-center justify-between">
              {[
                t('howItWorks.desktop.0', { ns: 'landing', defaultValue: 'Farmer' }),
                t('howItWorks.desktop.1', { ns: 'landing', defaultValue: 'Listing' }),
                t('howItWorks.desktop.2', { ns: 'landing', defaultValue: 'Matching' }),
                t('howItWorks.desktop.3', { ns: 'landing', defaultValue: 'Transport' }),
                t('howItWorks.desktop.4', { ns: 'landing', defaultValue: 'Industry' }),
                t('howItWorks.desktop.5', { ns: 'landing', defaultValue: 'Impact' }),
              ].map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="flex flex-col items-center"
                >
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-lg shadow-lg mb-4">
                    {index + 1}
                  </div>
                  <p className="text-sm font-semibold text-center">{step}</p>
                  {index < 5 && (
                    <ChevronRight className="absolute w-6 h-6 text-primary/30 transform translate-x-20" style={{ top: '2rem' }} />
                  )}
                </motion.div>
              ))}
            </div>

            {/* Mobile Flow */}
            <div className="md:hidden space-y-4">
              {[
                t('howItWorks.mobile.0', { ns: 'landing', defaultValue: 'Farmer Lists Residue' }),
                t('howItWorks.mobile.1', { ns: 'landing', defaultValue: 'AI System Searches' }),
                t('howItWorks.mobile.2', { ns: 'landing', defaultValue: 'Finds Matching Industry' }),
                t('howItWorks.mobile.3', { ns: 'landing', defaultValue: 'Arranges Transport' }),
                t('howItWorks.mobile.4', { ns: 'landing', defaultValue: 'Secure Transaction' }),
                t('howItWorks.mobile.5', { ns: 'landing', defaultValue: 'Carbon Impact Recorded' }),
              ].map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="flex items-center gap-4"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-grow bg-white/5 border border-white/10 rounded-lg p-4">
                    <p className="font-semibold">{step}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* GAMIFICATION SECTION */}
      <section id="gamification" className="py-20 md:py-32 px-6 md:px-12 bg-gradient-to-b from-background to-primary/5">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">{t('gamification.title', { ns: 'landing', defaultValue: 'Gamified Sustainability' })}</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('gamification.description', { ns: 'landing', defaultValue: 'Earn rewards, build your reputation, and make a real environmental impact' })}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Trophy,
                title: t('gamification.items.0.title', { ns: 'landing', defaultValue: 'Green Streaks' }),
                description: t('gamification.items.0.description', { ns: 'landing', defaultValue: 'Consistent trading earns you exclusive badges and rewards' }),
                color: 'from-green-500 to-emerald-500',
              },
              {
                icon: Gauge,
                title: t('gamification.items.1.title', { ns: 'landing', defaultValue: 'Trust Score' }),
                description: t('gamification.items.1.description', { ns: 'landing', defaultValue: 'Build a verified profile that attracts premium buyers' }),
                color: 'from-blue-500 to-cyan-500',
              },
              {
                icon: Globe,
                title: t('gamification.items.2.title', { ns: 'landing', defaultValue: 'Carbon Points' }),
                description: t('gamification.items.2.description', { ns: 'landing', defaultValue: 'Convert CO2 savings into transferable carbon credits' }),
                color: 'from-purple-500 to-pink-500',
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group"
              >
                <div className="bg-gradient-to-br from-white/50 to-white/20 dark:from-white/5 dark:to-white/0 backdrop-blur-md border border-white/20 group-hover:border-primary/50 rounded-2xl p-8 transition-all duration-300 h-full hover:shadow-xl">
                  <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${item.color} bg-opacity-20 mb-6 group-hover:scale-110 transition-transform`}>
                    <item.icon className={`h-7 w-7`} />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SUCCESS STORIES */}
      <section id="success-stories" className="py-20 md:py-32 px-6 md:px-12 bg-gradient-to-b from-background via-accent/5 to-background">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">{t('successStories.title', { ns: 'landing', defaultValue: 'Success Stories' })}</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('successStories.description', { ns: 'landing', defaultValue: 'Real farmers and industries transforming waste into wealth' })}
            </p>
          </motion.div>

          <SuccessStoriesCarousel />
        </div>
      </section>

      {/* FINAL CTA SECTION */}
      <section id="cta" className="py-20 md:py-32 px-6 md:px-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20" />
        <div className="absolute top-0 right-20 w-72 h-72 rounded-full bg-accent/30 blur-3xl" />
        <div className="absolute bottom-0 left-20 w-72 h-72 rounded-full bg-primary/30 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              {t('cta.title', { ns: 'landing', defaultValue: 'Join the Green Revolution 🌍' })}
            </h2>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              {t('cta.description', { ns: 'landing', defaultValue: 'Be part of a movement that transforms agricultural waste into sustainable wealth while protecting our planet.' })}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  to="/login?mode=register&role=farmer"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-primary to-accent text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  {t('hero.startFarmer', { ns: 'landing', defaultValue: 'Start as Farmer' })} <ArrowRight size={18} />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  to="/login?mode=register&role=industry"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-primary/30 text-foreground rounded-xl font-semibold hover:bg-primary/5 transition-all"
                >
                  {t('hero.joinIndustry', { ns: 'landing', defaultValue: 'Join as Industry' })} <ArrowRight size={18} />
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border/20 bg-gradient-to-b from-background to-black/5 px-6 md:px-12 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="grid md:grid-cols-5 gap-12 mb-12">
            {/* Logo Column */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
                  <Leaf className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl font-bold">{t('brand.name', { ns: 'common', defaultValue: 'AgriConnect' })}</span>
              </div>
              <p className="text-muted-foreground max-w-sm">
                {t('footer.description', { ns: 'landing', defaultValue: 'Transforming agricultural waste into sustainable wealth while protecting our planet.' })}
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-semibold mb-4">{t('footer.product', { ns: 'landing', defaultValue: 'Product' })}</h4>
              <ul className="space-y-2">
                <li><Link to="#" className="text-muted-foreground hover:text-foreground transition">{t('footer.links.features', { ns: 'landing', defaultValue: 'Features' })}</Link></li>
                <li><Link to="#" className="text-muted-foreground hover:text-foreground transition">{t('footer.links.pricing', { ns: 'landing', defaultValue: 'Pricing' })}</Link></li>
                <li><Link to="#" className="text-muted-foreground hover:text-foreground transition">{t('footer.links.security', { ns: 'landing', defaultValue: 'Security' })}</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">{t('footer.company', { ns: 'landing', defaultValue: 'Company' })}</h4>
              <ul className="space-y-2">
                <li><Link to="#" className="text-muted-foreground hover:text-foreground transition">{t('footer.links.about', { ns: 'landing', defaultValue: 'About' })}</Link></li>
                <li><Link to="#" className="text-muted-foreground hover:text-foreground transition">{t('footer.links.blog', { ns: 'landing', defaultValue: 'Blog' })}</Link></li>
                <li><Link to="#" className="text-muted-foreground hover:text-foreground transition">{t('footer.links.careers', { ns: 'landing', defaultValue: 'Careers' })}</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">{t('footer.legal', { ns: 'landing', defaultValue: 'Legal' })}</h4>
              <ul className="space-y-2">
                <li><Link to="#" className="text-muted-foreground hover:text-foreground transition">{t('footer.links.privacy', { ns: 'landing', defaultValue: 'Privacy' })}</Link></li>
                <li><Link to="#" className="text-muted-foreground hover:text-foreground transition">{t('footer.links.terms', { ns: 'landing', defaultValue: 'Terms' })}</Link></li>
                <li><Link to="#" className="text-muted-foreground hover:text-foreground transition">{t('footer.links.contact', { ns: 'landing', defaultValue: 'Contact' })}</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border/20 pt-8 flex flex-col sm:flex-row items-center justify-between">
            <p className="text-muted-foreground text-sm">
              &copy; {new Date().getFullYear()} {t('brand.name', { ns: 'common', defaultValue: 'AgriConnect' })}. {t('footer.rights', { ns: 'landing', defaultValue: 'All rights reserved.' })}
            </p>
            <div className="flex gap-4 mt-4 sm:mt-0">
              <a href="#" className="text-muted-foreground hover:text-foreground transition">{t('footer.social.twitter', { ns: 'landing', defaultValue: 'Twitter' })}</a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition">{t('footer.social.linkedin', { ns: 'landing', defaultValue: 'LinkedIn' })}</a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition">{t('footer.social.instagram', { ns: 'landing', defaultValue: 'Instagram' })}</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
export default Landing;
