
import React, { useState } from 'react';
import { 
  Camera, 
  RefreshCcw, 
  Download, 
  Check, 
  ChevronRight, 
  AlertCircle, 
  Loader2, 
  Info,
  ExternalLink,
  Clock,
  Edit3,
  Sparkles
} from 'lucide-react';
import { 
  Gender, 
  Unit, 
  Language, 
  UserProfile, 
  StylingResult, 
  TPO 
} from './types';
import { 
  TPO_OPTIONS, 
  MALE_BODY_TYPES, 
  FEMALE_BODY_TYPES 
} from './constants';
import { generateStylingAdvice, generateStylingImage } from './services/gemini';

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('ko');
  const [profile, setProfile] = useState<UserProfile>({
    photo: null,
    gender: 'Female',
    age: 30,
    height: 165,
    weight: 55,
    unit: 'metric',
    bodyType: 'Hourglass',
    tpo: 'Business'
  });
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<'advice' | 'image' | null>(null);
  const [result, setResult] = useState<StylingResult | null>(null);
  const [error, setError] = useState<React.ReactNode | null>(null);
  const [imageFailed, setImageFailed] = useState(false);

  const t = (ko: string, en: string) => (lang === 'ko' ? ko : en);

  const resizeImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1024;
        const MAX_HEIGHT = 1024;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
    });
  };

  const handleNumericInput = (field: keyof UserProfile, value: string) => {
    let cleaned = value.replace(/^0+/, '');
    if (cleaned === '') cleaned = '0';
    const num = parseFloat(cleaned);
    if (!isNaN(num)) {
      setProfile(prev => ({ ...prev, [field]: num }));
    }
  };

  // Height and weight are always stored in cm / kg. In Imperial mode the inputs show
  // feet + inches and pounds and convert on the way in, so switching units never mixes them up.
  const CM_PER_INCH = 2.54;
  const LB_PER_KG = 2.20462;
  const totalInches = Math.round(profile.height / CM_PER_INCH);
  const heightFt = Math.floor(totalInches / 12);
  const heightIn = totalInches % 12;
  const weightLb = Math.round(profile.weight * LB_PER_KG);

  const parseNum = (value: string) => {
    const num = parseFloat(value);
    return isNaN(num) || num < 0 ? 0 : num;
  };
  const setHeightImperial = (ft: number, inches: number) => {
    setProfile(prev => ({ ...prev, height: Math.round((ft * 12 + inches) * CM_PER_INCH) }));
  };
  const setWeightImperial = (lb: number) => {
    setProfile(prev => ({ ...prev, weight: Math.round((lb / LB_PER_KG) * 10) / 10 }));
  };

  const profileValid = profile.age > 0 && profile.height > 0 && profile.weight > 0;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const resized = await resizeImage(reader.result as string);
        setProfile(prev => ({ ...prev, photo: resized }));
      };
      reader.readAsDataURL(file);
    }
  };

  const resetApp = () => {
    setResult(null);
    setProfile({
      photo: null,
      gender: 'Female',
      age: 30,
      height: 165,
      weight: 55,
      unit: 'metric',
      bodyType: 'Hourglass',
      tpo: 'Business'
    });
    setError(null);
    setImageFailed(false);
    setLoadingStage(null);
  };

  const backToSelection = () => {
    setResult(null);
    setError(null);
    setImageFailed(false);
  };

  const showError = (err: any) => {
    console.error("Styling Error Debug:", err);
    const errorMessage = err?.message || "Unknown error";

    if (errorMessage === 'DAILY_LIMIT') {
      setError(
        <div className="space-y-1">
          <p className="font-bold">{t('오늘 사용 횟수를 모두 썼어요', 'Daily limit reached')}</p>
          <p className="text-[11px] opacity-80">{t('내일 다시 이용해 주세요.', 'Please come back tomorrow.')}</p>
        </div>
      );
    } else if (errorMessage.includes("503") || errorMessage.includes("high demand") || errorMessage.includes("UNAVAILABLE")) {
      setError(
        <div className="space-y-2">
          <p className="font-bold flex items-center gap-2">
            <Clock className="w-4 h-4 text-rose-500" />
            {t("서버 혼잡 안내", "Server High Demand")}
          </p>
          <p className="text-[11px] opacity-90 leading-relaxed">
            {t(
              "현재 고화질 이미지 생성 모델의 사용자가 많아 서버가 일시적으로 응답하지 않습니다. 잠시 후 다시 시도해 주세요.",
              "The high-quality image model is currently experiencing high demand. Please wait a few moments and try again."
            )}
          </p>
        </div>
      );
    } else {
      setError(
        <div className="space-y-1">
           <p className="font-bold">{t('분석 중 오류 발생', 'Analysis Failed')}</p>
           <p className="text-[11px] opacity-80">{errorMessage}</p>
        </div>
      );
    }
  };

  const retryImage = async () => {
    if (loading || !result) return;
    setError(null);
    setImageFailed(false);
    setLoading(true);
    setLoadingStage('image');
    try {
      const imageUrl = await generateStylingImage(profile, result);
      setResult(prev => prev ? { ...prev, imageUrl } : null);
    } catch (err: any) {
      setImageFailed(true);
      showError(err);
    } finally {
      setLoading(false);
      setLoadingStage(null);
    }
  };

  const generateStyling = async () => {
    if (loading || !profileValid) return;
    
    setError(null);
    setImageFailed(false);
    setLoading(true);
    let adviceReady = false;

    try {
      setLoadingStage('advice');
      const advice = await generateStylingAdvice(profile);
      setResult({ ...advice, imageUrl: null });
      adviceReady = true;

      setLoadingStage('image');
      const imageUrl = await generateStylingImage(profile, advice);
      setResult(prev => prev ? { ...prev, imageUrl } : null);
      
    } catch (err: any) {
      // If the advice already arrived, only the image failed: keep the advice on screen.
      if (adviceReady) setImageFailed(true);
      showError(err);
    } finally {
      setLoading(false);
      setLoadingStage(null);
    }
  };

  return (
    <div className="max-w-xl mx-auto min-h-screen bg-white pb-20 shadow-lg ring-1 ring-gray-100">
      <header className="pt-10 pb-6 px-6 text-center border-b border-gray-50">
        <h1 className="text-4xl font-serif font-bold text-gray-900 mb-2">Style Master</h1>
        <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 mb-6">AI Personal Fashion Stylist</p>
        
        <div className="flex justify-center gap-2 mb-6">
          <button onClick={() => setLang('ko')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${lang === 'ko' ? 'bg-black text-white shadow-md shadow-black/20' : 'bg-gray-100 text-gray-400'}`}>한국어</button>
          <button onClick={() => setLang('en')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${lang === 'en' ? 'bg-black text-white shadow-md shadow-black/20' : 'bg-gray-100 text-gray-400'}`}>ENGLISH</button>
        </div>

        <p className="text-sm text-gray-500 leading-relaxed max-w-sm mx-auto">
          {t('당신의 체형과 TPO : Time (시간), Place (장소), Occasion (상황) 을 분석해 최적의 실루엣과 2026 트렌드를 제안하고 AI 디자이너의 스타일 조언과 팁을 제공하는 퍼스널 패션 서비스입니다.', 'A personal fashion service that analyzes your body and TPO (Time, Place, Occasion) to suggest the perfect 2026 styling, providing AI designer\'s styling advice and tips.')}
        </p>
      </header>

      {!result || (loading && loadingStage === 'advice') ? (
        <main className="p-6 space-y-10 animate-in fade-in duration-500">
          <section className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Camera className="w-5 h-5" /> 
              {t('전신 또는 상반신 사진 업로드', 'Upload Full Body or Upper Body Photo')}
            </h2>
            <div className={`relative border-2 border-dashed rounded-3xl aspect-[3/4] flex flex-col items-center justify-center transition-all overflow-hidden ${profile.photo ? 'border-transparent shadow-xl ring-1 ring-black/5' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'}`}>
              {profile.photo ? (
                <>
                  <img src={profile.photo} className="w-full h-full object-cover" alt="Upload" />
                  <button onClick={() => setProfile(prev => ({ ...prev, photo: null }))} className="absolute top-4 right-4 bg-black/50 backdrop-blur-md text-white p-2 rounded-full hover:bg-black"><RefreshCcw className="w-4 h-4" /></button>
                </>
              ) : (
                <div className="text-center px-10">
                  <p className="text-gray-400 text-sm mb-6 leading-relaxed">{t('정면 사진을 업로드하시면 더욱 정확한 분석이 가능합니다.', 'Uploading a front-facing photo ensures more accurate analysis.')}</p>
                  <p className="text-gray-400 text-[11px] mb-6 leading-relaxed">{t('사진은 화보 생성을 위해 Google Gemini로 전송되며, 이 앱에는 저장되지 않습니다.', 'Your photo is sent to Google Gemini to create the image and is not stored by this app.')}</p>
                  <label className="bg-black text-white px-8 py-3 rounded-full text-sm font-bold cursor-pointer hover:bg-gray-800 transition-all shadow-xl shadow-black/10">
                    {t('사진 선택하기', 'Select Photo')}
                    <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                  </label>
                </div>
              )}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">{t('성별', 'Gender')}</h2>
            <div className="flex gap-3">
              {(['Male', 'Female'] as Gender[]).map(g => (
                <button key={g} onClick={() => setProfile(prev => ({ ...prev, gender: g, bodyType: g === 'Male' ? 'Rectangle' : 'Hourglass' }))} className={`flex-1 py-4 rounded-2xl font-bold transition-all ${profile.gender === g ? 'bg-black text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}>
                  {t(g === 'Male' ? '남성' : '여성', g)}
                </button>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                {t('나이', 'Age')}
              </label>
              <input type="number" value={profile.age || ''} onChange={(e) => handleNumericInput('age', e.target.value)} className="w-full bg-gray-100 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-black font-bold outline-none" />
            </div>
            <div className="space-y-3 flex flex-col justify-end">
               <button onClick={() => setProfile(prev => ({ ...prev, unit: prev.unit === 'metric' ? 'imperial' : 'metric' }))} className="self-end text-[10px] font-bold bg-gray-200 px-3 py-1 rounded-full text-gray-500 hover:bg-gray-300 transition-all">{profile.unit === 'metric' ? 'Metric' : 'Imperial'} ⇄</button>
            </div>
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                {t('키', 'Height')} <span className="text-[10px] opacity-60">({profile.unit === 'metric' ? 'cm' : 'ft / in'})</span>
              </label>
              {profile.unit === 'metric' ? (
                <div className="relative">
                  <input type="number" inputMode="numeric" value={profile.height || ''} onChange={(e) => handleNumericInput('height', e.target.value)} className="w-full bg-gray-100 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-black font-bold outline-none" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-300">cm</span>
                </div>
              ) : (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input type="number" inputMode="numeric" value={heightFt || ''} onChange={(e) => setHeightImperial(parseNum(e.target.value), heightIn)} className="w-full bg-gray-100 border-none rounded-2xl px-4 py-4 focus:ring-2 focus:ring-black font-bold outline-none" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-300">ft</span>
                  </div>
                  <div className="relative flex-1">
                    <input type="number" inputMode="numeric" min={0} max={11} value={heightIn} onChange={(e) => setHeightImperial(heightFt, Math.min(11, parseNum(e.target.value)))} className="w-full bg-gray-100 border-none rounded-2xl px-4 py-4 focus:ring-2 focus:ring-black font-bold outline-none" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-300">in</span>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                {t('몸무게', 'Weight')} <span className="text-[10px] opacity-60">({profile.unit === 'metric' ? 'kg' : 'lb'})</span>
              </label>
              <div className="relative">
                {profile.unit === 'metric' ? (
                  <input type="number" step="0.1" inputMode="decimal" value={profile.weight || ''} onChange={(e) => handleNumericInput('weight', e.target.value)} className="w-full bg-gray-100 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-black font-bold outline-none" />
                ) : (
                  <input type="number" inputMode="numeric" value={weightLb || ''} onChange={(e) => setWeightImperial(parseNum(e.target.value))} className="w-full bg-gray-100 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-black font-bold outline-none" />
                )}
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-300">{profile.unit === 'metric' ? 'kg' : 'lb'}</span>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">{t('체형 실루엣', 'Body Type')}</h2>
            <div className="grid grid-cols-2 gap-3">
              {(profile.gender === 'Male' ? MALE_BODY_TYPES : FEMALE_BODY_TYPES).map(bt => (
                <button key={bt.id} onClick={() => setProfile(prev => ({ ...prev, bodyType: bt.id }))} className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${profile.bodyType === bt.id ? 'border-black bg-black text-white shadow-lg' : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200'}`}>
                  <span className="text-2xl w-10 h-10 flex items-center justify-center rounded-xl bg-white/20">{bt.icon}</span>
                  <span className="text-sm font-bold leading-tight">{t(bt.labelKo, bt.labelEn)}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">{t('상황(TPO)', 'Situation (TPO)')}</h2>
              <div className="group relative">
                <Info className="w-3.5 h-3.5 text-gray-300 cursor-help" />
                <div className="absolute bottom-full left-0 mb-2 w-64 bg-gray-900 text-white text-[10px] p-3 rounded-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-all z-10 shadow-2xl">
                  {t('TPO는 Time(시간), Place(장소), Occasion(상황)의 약어로, 패션의 황금 규칙입니다.', 'TPO stands for Time, Place, and Occasion. The golden rule of fashion.')}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {TPO_OPTIONS.map(opt => (
                <button key={opt.id} onClick={() => setProfile(prev => ({ ...prev, tpo: opt.id }))} className={`flex items-start gap-5 p-5 rounded-3xl border-2 transition-all text-left ${profile.tpo === opt.id ? 'border-black bg-black text-white shadow-lg' : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200'}`}>
                  <div className={`p-3 rounded-2xl ${profile.tpo === opt.id ? 'bg-white/20' : 'bg-white shadow-sm'}`}>{opt.icon}</div>
                  <div>
                    <h4 className="text-[15px] font-bold mb-1">{t(opt.labelKo, opt.labelEn)}</h4>
                    <p className={`text-[11px] ${profile.tpo === opt.id ? 'text-gray-400' : 'text-gray-500'}`}>{t(opt.descKo, opt.descEn)}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <button disabled={loading || !profileValid} onClick={generateStyling} className={`w-full py-6 rounded-full bg-black text-white font-bold text-lg shadow-2xl shadow-black/30 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-3 ${loading || !profileValid ? 'opacity-50 cursor-not-allowed' : ''}`}>
            {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> {t('분석 중...', 'Analyzing...')}</> : <>{t('나만의 스타일 생성하기', 'Create My Style')} <ChevronRight className="w-5 h-5" /></>}
          </button>

          {error && (
            <div className="flex items-start gap-3 p-5 bg-rose-50 text-rose-600 rounded-2xl text-sm animate-in slide-in-from-bottom-2 border border-rose-100">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}
        </main>
      ) : (
        <main className="animate-in fade-in duration-700">
          <div className="relative aspect-[9/16] bg-gray-100 overflow-hidden shadow-2xl ring-1 ring-black/5">
            {result.imageUrl ? (
              <img src={result.imageUrl} className="w-full h-full object-cover" alt="Editorial" />
            ) : imageFailed ? (
              <div className="w-full h-full flex flex-col items-center justify-center space-y-5 bg-white px-10 text-center">
                <AlertCircle className="w-10 h-10 text-rose-400" />
                <p className="text-sm font-bold text-gray-600">{t('화보 이미지를 만들지 못했어요', "Couldn't create the image")}</p>
                <button onClick={retryImage} disabled={loading} className="relative z-10 px-8 py-3 rounded-full bg-black text-white text-sm font-bold flex items-center gap-2 hover:bg-gray-800 transition-all">
                  <RefreshCcw className="w-4 h-4" /> {t('이미지 다시 만들기', 'Try Image Again')}
                </button>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center space-y-6 bg-white">
                <Loader2 className="w-12 h-12 animate-spin text-black" />
                <p className="text-xs font-bold tracking-[0.2em] uppercase text-gray-500 animate-pulse">{t('고화질 화보 생성 중...', 'Generating High-Res Editorial...')}</p>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-12 left-0 right-0 text-center px-10">
              <span className="text-[10px] font-bold tracking-[0.5em] text-white/60 uppercase mb-3 block">{t('추천 스타일 테마', 'Recommended Theme')}</span>
              <h2 className="text-3xl font-serif font-bold text-white italic tracking-tight">{result.theme[lang]}</h2>
            </div>
          </div>

          <div className="p-8 space-y-16">
            <section className="space-y-4">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.4em] text-gray-400">{t('디자이너 분석 리포트', 'Designer Report')}</h3>
              <p className="text-xl font-serif italic text-gray-800 leading-relaxed font-medium">"{result.report[lang]}"</p>
            </section>

            <section className="grid grid-cols-2 gap-5">
              {[
                { label: t('상의', 'TOP'), value: result.items.top[lang] },
                { label: t('하의', 'BOTTOM'), value: result.items.bottom[lang] },
                { label: t('아우터', 'OUTER'), value: result.items.outer[lang] },
                { label: t('신발', 'SHOES'), value: result.items.shoes[lang] },
              ].map((item, idx) => (
                <div key={idx} className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                  <span className="text-[14px] font-black text-gray-400 uppercase tracking-widest block mb-2">{item.label}</span>
                  <p className="text-lg font-normal text-gray-800 leading-snug">{item.value}</p>
                </div>
              ))}
            </section>

            <section className="space-y-8">
              <div className="p-10 bg-emerald-50/50 rounded-[2.5rem] border border-emerald-100/50">
                <h4 className="flex items-center gap-2 text-emerald-900 font-black text-[13px] uppercase tracking-widest mb-4"><Check className="w-4 h-4" />{t('디자이너의 "한 끗" 팁', 'Expert Styling Tip')}</h4>
                <p className="text-emerald-800 text-base font-normal leading-relaxed italic">{result.tip[lang]}</p>
              </div>
              <div className="p-10 bg-rose-50/50 rounded-[2.5rem] border border-rose-100/50">
                <h4 className="flex items-center gap-2 text-rose-900 font-black text-[13px] uppercase tracking-widest mb-4"><AlertCircle className="w-4 h-4" />{t('피해야 할 아이템 (Worst)', 'Items to Avoid')}</h4>
                <p className="text-rose-800 text-base font-normal leading-relaxed italic">{result.worst[lang]}</p>
              </div>
            </section>

            <div className="flex flex-col gap-4 pt-6">
              {result.imageUrl && (
                <button onClick={() => { const l = document.createElement('a'); l.href = result.imageUrl!; l.download = `Lookbook_${Date.now()}.png`; l.click(); }} className="w-full py-6 rounded-full bg-black text-white font-bold text-sm flex items-center justify-center gap-3 shadow-2xl shadow-black/20 hover:scale-[1.02] transition-all">
                  <Download className="w-5 h-5" /> {t('이미지 저장하기', 'Download Image')}
                </button>
              )}
              
              <button onClick={backToSelection} className="w-full py-6 rounded-full bg-gray-900 text-white font-bold text-sm flex items-center justify-center gap-3 hover:bg-black transition-all">
                <Edit3 className="w-5 h-5" /> {t('다른 스타일 선택하기', 'Select Another Style')}
              </button>

              <button onClick={resetApp} className="w-full py-6 rounded-full border-2 border-black text-black font-bold text-sm flex items-center justify-center gap-3 hover:bg-black hover:text-white transition-all">
                <RefreshCcw className="w-5 h-5" /> {t('처음으로 돌아가기 (초기화)', 'Start Over (Reset)')}
              </button>
            </div>
            
            {error && (
              <div className="flex items-start gap-3 p-5 bg-rose-50 text-rose-600 rounded-2xl text-sm border border-rose-100">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>{error}</div>
              </div>
            )}
          </div>
        </main>
      )}

      <footer className="py-20 text-center opacity-20 text-[9px] font-bold tracking-[0.5em] border-t border-gray-100 mt-20 px-10 leading-relaxed uppercase">
        &copy; 2026 Style Master <br/> Aesthetic Intelligence Curated by Veterans
      </footer>
    </div>
  );
};

export default App;
