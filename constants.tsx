
import React from 'react';
import { 
  Briefcase, 
  Heart, 
  Coffee, 
  Activity,
  Sparkles
} from 'lucide-react';
import { TPO } from './types';

export const TPO_OPTIONS: { id: TPO; labelKo: string; labelEn: string; descKo: string; descEn: string; icon: React.ReactNode }[] = [
  { 
    id: 'Business', 
    labelKo: 'Business / Office', 
    labelEn: 'Business / Office', 
    descKo: '신뢰감을 주는 프로페셔널 룩',
    descEn: 'A professional look that inspires trust.',
    icon: <Briefcase className="w-5 h-5" />
  },
  { 
    id: 'Date', 
    labelKo: 'Date Night / Social', 
    labelEn: 'Date Night / Social', 
    descKo: '매력을 극대화하는 센스 룩',
    descEn: 'A tasteful look that maximizes charm.',
    icon: <Heart className="w-5 h-5" />
  },
  { 
    id: 'Special', 
    labelKo: 'Special Occasion', 
    labelEn: 'Special Occasion', 
    descKo: '결혼식 하객룩, 파티 등 품격 있는 룩',
    descEn: 'Elegant look for weddings, parties, etc.',
    icon: <Sparkles className="w-5 h-5" />
  },
  { 
    id: 'Weekend', 
    labelKo: 'Weekend / Casual', 
    labelEn: 'Weekend / Casual', 
    descKo: '편안함과 트렌드를 잡은 데일리 룩',
    descEn: 'A daily look catching both comfort and trends.',
    icon: <Coffee className="w-5 h-5" />
  },
  { 
    id: 'Active', 
    labelKo: 'Active / Athleisure', 
    labelEn: 'Active / Athleisure', 
    descKo: '퍼포먼스와 스타일의 경계를 허문 하이테크 룩',
    descEn: 'High-tech look blurring performance and style.',
    icon: <Activity className="w-5 h-5" />
  }
];

export const MALE_BODY_TYPES = [
  { id: 'InvertedTriangle', labelKo: '역삼각형(운동형)', labelEn: 'Inverted Triangle (Athletic)', icon: '▽' },
  { id: 'Rectangle', labelKo: '직사각형(슬림형)', labelEn: 'Rectangle (Slim)', icon: '▯' },
  { id: 'Oval', labelKo: '타원형(과체중)', labelEn: 'Oval (Overweight)', icon: 'O' },
  { id: 'Triangle', labelKo: '삼각형(좁은 어깨)', labelEn: 'Triangle (Narrow Shoulders)', icon: '△' }
];

export const FEMALE_BODY_TYPES = [
  { id: 'Hourglass', labelKo: '모래시계형', labelEn: 'Hourglass', icon: 'X' },
  { id: 'Triangle', labelKo: '삼각형(하체 발달)', labelEn: 'Triangle (Lower-body)', icon: '△' },
  { id: 'InvertedTriangle', labelKo: '역삼각형(어깨 발달)', labelEn: 'Inverted Triangle (Broad Shoulders)', icon: '▽' },
  { id: 'Round', labelKo: '원형(복부 발달)', labelEn: 'Round (Abdomen)', icon: 'O' },
  { id: 'Rectangle', labelKo: '직사각형형', labelEn: 'Rectangle', icon: '▯' }
];
