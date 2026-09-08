// frontend/src/components/modals/ImportGuideModal/types.ts
import { Category, DayType } from '../../../types';
import { DelimiterChar, HeaderLanguage, LongVariation } from './guideUtils';

export type GuideFormat = 'long' | 'wide';
export type CategorySource = 'system' | 'standard';

export interface ImportGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories?: Category[];
  dayTypeConfig?: DayType[];
}

export interface GuideHeaderProps {
  onClose: () => void;
}

export interface GuideSidebarProps {
  selectedFormat: GuideFormat;
  onSelectFormat: (fmt: GuideFormat) => void;
  longVariation: LongVariation;
  onSelectLongVariation: (v: LongVariation) => void;
  categorySource: CategorySource;
  onToggleCategorySource: (src: CategorySource) => void;
  systemExpenseCount: number;
  delimiter: DelimiterChar;
  setDelimiter: (d: DelimiterChar) => void;
  headerLang: HeaderLanguage;
  setHeaderLang: (l: HeaderLanguage) => void;
}

export interface GuidePreviewAreaProps {
  selectedFormat: GuideFormat;
  longVariation: LongVariation;
  onSelectLongVariation: (v: LongVariation) => void;
  effectiveCategories: string[];
  categories: Category[];
  dayTypeConfig: DayType[];
  headerLang: HeaderLanguage;
  previewSearch: string;
  setPreviewSearch: (s: string) => void;
}

export interface GuideFooterProps {
  selectedFormat: GuideFormat;
  longVariation: LongVariation;
  delimiter: DelimiterChar;
  headerLang: HeaderLanguage;
  onClose: () => void;
  onCopy: () => void;
  onDownload: () => void;
  copied: boolean;
}
