import { useEffect, useState } from 'react';
import { Cpu, Droplets, Award, Gauge, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { adjustPriceForQuality, CROP_PRICES } from '@/data/mockData';
import { supabase } from '@/integrations/supabase/client';

interface AIAnalysisResult {
  moisture: number;
  grade: 'A' | 'B' | 'C';
  confidence: number;
  adjustedPrice: number;
  detectedCropType?: string;
  analysis?: string;
  isFallback?: boolean;
  isRejected?: boolean;
}

interface AIAnalysisPanelProps {
  cropType: string;
  onAnalysisComplete: (result: AIAnalysisResult) => void;
  trigger: number;
  imageFile?: File | null;
}

export default function AIAnalysisPanel({ cropType, onAnalysisComplete, trigger, imageFile }: AIAnalysisPanelProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { t } = useTranslation('farmer') as any;
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AIAnalysisResult | null>(null);
  const [analysisStep, setAnalysisStep] = useState(0);

  useEffect(() => {
    if (trigger === 0) return;

    const buildFallbackResult = (): AIAnalysisResult => ({
      moisture: 18,
      grade: 'B',
      confidence: 0,
      adjustedPrice: CROP_PRICES[cropType] || 1500,
      detectedCropType: cropType,
      analysis: t('ai.unavailable'),
    });

    setAnalyzing(true);
    setResult(null);
    setAnalysisStep(0);

    const stepTimer1 = setTimeout(() => setAnalysisStep(1), 500);
    const stepTimer2 = setTimeout(() => setAnalysisStep(2), 1200);
    const stepTimer3 = setTimeout(() => setAnalysisStep(3), 1800);
    let cancelled = false;

    const analyzeWithAI = async (): Promise<AIAnalysisResult> => {
      try {
        let imageBase64: string | null = null;

        if (imageFile) {
          const reader = new FileReader();
          imageBase64 = await new Promise<string>((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(imageFile);
          });
        }

        const { data, error } = await supabase.functions.invoke('analyze-crop', {
          body: {
            imageBase64,
            cropTypeHint: cropType,
          },
        });

        if (error) throw error;

        const aiResult = data as {
          debugCase?: string;
          debugStatus?: number;
          debugReason?: string;
          isCropImage?: boolean;
          cropType: string | null;
          moisture: number | null;
          qualityGrade: 'A' | 'B' | 'C' | null;
          confidence: number;
          analysis: string;
        };

        if (aiResult.debugCase === 'rejected:not-crop-image') {
          console.warn('[AIAnalysisPanel] analyze-crop rejected: image is not crop residue', {
            analysis: aiResult.analysis,
          });
          return {
            moisture: 0,
            grade: 'B',
            confidence: 0,
            adjustedPrice: 0,
            detectedCropType: undefined,
            analysis: aiResult.analysis,
            isRejected: true,
          };
        }

        const isFallback = Boolean(aiResult.debugCase && aiResult.debugCase !== 'success');

        if (isFallback) {
          const logDetails = {
            status: aiResult.debugStatus,
            reason: aiResult.debugReason,
          };

          if (aiResult.debugCase === 'fallback:quota-exceeded' || aiResult.debugCase === 'fallback:rate-limited') {
            console.info('[AIAnalysisPanel] analyze-crop fallback:', aiResult.debugCase, logDetails);
          } else {
            console.warn('[AIAnalysisPanel] analyze-crop fallback:', aiResult.debugCase, logDetails);
          }
        } else {
          console.info('[AIAnalysisPanel] analyze-crop case:', aiResult.debugCase || 'success');
        }

        const resolvedCropType = aiResult.cropType || cropType;
        const resolvedMoisture = aiResult.moisture ?? 18;
        const resolvedGrade = aiResult.qualityGrade ?? 'B';

        return {
          moisture: resolvedMoisture,
          grade: resolvedGrade,
          confidence: aiResult.confidence,
          adjustedPrice: adjustPriceForQuality(
            CROP_PRICES[resolvedCropType] || CROP_PRICES[cropType] || 1500,
            resolvedCropType,
            resolvedMoisture,
            resolvedGrade
          ),
          detectedCropType: aiResult.cropType || undefined,
          analysis: aiResult.analysis,
          isFallback,
        };
      } catch (err) {
        console.error('AI analysis error:', err);
        return buildFallbackResult();
      }
    };

    void (async () => {
      const [analysisResult] = await Promise.all([
        analyzeWithAI(),
        new Promise((resolve) => setTimeout(resolve, 2500)),
      ]);

      if (cancelled) return;

      setResult(analysisResult);
      setAnalyzing(false);
      onAnalysisComplete(analysisResult);
    })();

    return () => {
      cancelled = true;
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
    };
  }, [trigger, cropType, imageFile, onAnalysisComplete, t]);

  if (!analyzing && !result) return null;

  const loadingSteps = [
    t('ai.detectingCrop'),
    t('ai.measuringMoisture'),
    t('ai.gradingQuality'),
  ];

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 animate-scale-in">
      <div className="flex items-center gap-2 mb-3">
        <Cpu className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-primary">{t('ai.title')}</span>
        {imageFile && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">{t('ai.imageDetected')}</span>}
      </div>

      {analyzing ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">
              {analysisStep === 0 && t('ai.uploading')}
              {analysisStep === 1 && t('ai.detectingCrop')}
              {analysisStep === 2 && t('ai.measuringMoisture')}
              {analysisStep === 3 && t('ai.gradingQuality')}
            </span>
          </div>
          <div className="space-y-2">
            {loadingSteps.map((step, i) => (
              <div key={step} className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${analysisStep > i ? 'bg-primary' : 'bg-primary/40 animate-pulse'}`}
                  style={{ width: analysisStep > i ? '100%' : `${30 + i * 25}%` }}
                />
              </div>
            ))}
          </div>
        </div>
      ) : result?.isRejected ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
          <div className="flex items-start gap-2">
            <FileText className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-destructive">
                {t('ai.notCropImage', { defaultValue: "This doesn't look like crop residue" })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{result.analysis}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('ai.notCropImageHint', { defaultValue: 'Please upload a clear photo of the actual crop residue to continue.' })}
              </p>
            </div>
          </div>
        </div>
      ) : result ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 bg-card rounded-lg p-2.5">
              <Cpu className="w-4 h-4 text-primary" />
              <div>
                <p className="text-[10px] text-muted-foreground">{t('ai.detectedCrop')}</p>
                <p className="text-sm font-bold">{result.detectedCropType || cropType}</p>
              </div>
            </div>
            {/* <div className="flex items-center gap-2 bg-card rounded-lg p-2.5">
              <Gauge className="w-4 h-4 text-info" />
              <div>
                <p className="text-[10px] text-muted-foreground">{t('ai.confidence')}</p>
                <p className="text-sm font-bold text-info">{result.confidence}%</p>
              </div>
            </div> */}
            <div className="flex items-center gap-2 bg-card rounded-lg p-2.5">
              <Droplets className="w-4 h-4 text-info" />
              <div>
                <p className="text-[10px] text-muted-foreground">{t('ai.moisture')}</p>
                <p className={`text-sm font-bold ${result.moisture > 20 ? 'text-warning' : 'text-success'}`}>{result.moisture}%</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-card rounded-lg p-2.5">
              <Award className="w-4 h-4 text-accent" />
              <div>
                <p className="text-[10px] text-muted-foreground">{t('ai.quality')}</p>
                <p className={`text-sm font-bold ${result.grade === 'A' ? 'text-success' : result.grade === 'B' ? 'text-warning' : 'text-destructive'}`}>
                  {t('listing.grade', { grade: result.grade })}
                </p>
              </div>
            </div>
          </div>

          {/* {result.analysis && (
            <div className="flex items-start gap-2 bg-card rounded-lg p-2.5">
              <FileText className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground">{t('ai.analysis')}</p>
                <p className="text-xs leading-relaxed">{result.analysis}</p>
              </div>
            </div>
          )} */}

          {result.adjustedPrice !== (CROP_PRICES[result.detectedCropType || cropType] || CROP_PRICES[cropType]) && (
            <div className="text-xs bg-warning/10 text-warning rounded-lg p-2 text-center">
              {t('ai.adjustedPrice', { value: `Rs ${result.adjustedPrice}` })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
