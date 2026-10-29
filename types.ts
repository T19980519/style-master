
export type Gender = 'Male' | 'Female';
export type Unit = 'metric' | 'imperial';
export type Language = 'ko' | 'en';

export type TPO = 'Business' | 'Date' | 'Weekend' | 'Active' | 'Special';

export interface LocalizedText {
  ko: string;
  en: string;
}

export interface StylingResult {
  report: LocalizedText;
  theme: LocalizedText;
  items: {
    top: LocalizedText;
    bottom: LocalizedText;
    outer: LocalizedText;
    shoes: LocalizedText;
  };
  tip: LocalizedText;
  worst: LocalizedText;
  imageUrl: string | null;
}

export interface UserProfile {
  photo: string | null;
  gender: Gender;
  age: number;
  height: number;
  weight: number;
  unit: Unit;
  bodyType: string;
  tpo: TPO;
}
