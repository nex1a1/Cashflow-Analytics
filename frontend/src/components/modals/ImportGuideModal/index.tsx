// frontend/src/components/modals/ImportGuideModal/index.tsx
import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useToast } from '../../../context/ToastContext';
import { useAppData } from '../../../context/AppDataContext';
import GuideHeader from './GuideHeader';
import GuideSidebar from './GuideSidebar';
import GuidePreviewArea from './GuidePreviewArea';
import GuideFooter from './GuideFooter';
import {
  CategorySource,
  GuideFormat,
  ImportGuideModalProps,
} from './types';
import {
  DelimiterChar,
  downloadSampleCsv,
  generateLongCsvContent,
  generateWideCsvContent,
  getLongHeaders,
  getWideHeaders,
  HeaderLanguage,
  LongVariation,
} from './guideUtils';

const DEFAULT_CATEGORIES = [
  'อาหาร',
  'ช้อปปิ้งออนไลน์',
  'การเดินทาง',
  'ซอฟต์แวร์ & AI',
  'ของใช้ในบ้าน',
];

const ImportGuideModal = memo(function ImportGuideModal({
  isOpen,
  onClose,
  categories: propCategories,
  dayTypeConfig: propDayTypeConfig,
}: ImportGuideModalProps) {
  const { showToast } = useToast();
  const appData = useAppData();

  const categories = propCategories || appData?.categories || [];
  const dayTypeConfig = propDayTypeConfig || appData?.dayTypeConfig || [];

  const [selectedFormat, setSelectedFormat] = useState<GuideFormat>('long');
  const [longVariation, setLongVariation] = useState<LongVariation>('full');
  const [categorySource, setCategorySource] = useState<CategorySource>('system');
  const [delimiter, setDelimiter] = useState<DelimiterChar>(',');
  const [headerLang, setHeaderLang] = useState<HeaderLanguage>('th');
  const [previewSearch, setPreviewSearch] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Keyboard Escape listener
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Extract expense categories from system
  const systemExpenseCategories = useMemo(() => {
    const expenseCats = categories.filter(c => !c.type || c.type === 'expense');
    return expenseCats.length > 0 ? expenseCats.map(c => c.name) : categories.map(c => c.name);
  }, [categories]);

  // Determine active categories for Wide format
  const effectiveCategories = useMemo(() => {
    if (categorySource === 'system' && systemExpenseCategories.length > 0) {
      return systemExpenseCategories;
    }
    return DEFAULT_CATEGORIES;
  }, [categorySource, systemExpenseCategories]);

  // Copy Headers to Clipboard
  const handleCopyHeaders = useCallback(() => {
    let text = '';
    if (selectedFormat === 'long') {
      text = getLongHeaders(longVariation, headerLang).join(delimiter);
    } else {
      text = getWideHeaders(effectiveCategories, headerLang).map(h => `"${h}"`).join(delimiter);
    }

    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast('คัดลอกรายชื่อหัวตารางลงคลิปบอร์ดแล้ว', 'success');
    setTimeout(() => setCopied(false), 2000);
  }, [selectedFormat, longVariation, effectiveCategories, delimiter, headerLang, showToast]);

  // Download Sample CSV
  const handleDownloadSample = useCallback(() => {
    if (selectedFormat === 'long') {
      const content = generateLongCsvContent(longVariation, delimiter, headerLang);
      const filename = `template_long_${longVariation}_${headerLang}.csv`;
      downloadSampleCsv(filename, content);
      showToast(`ดาวน์โหลดเทมเพลต Long Format (${longVariation}) สำเร็จ`, 'success');
    } else {
      const content = generateWideCsvContent(effectiveCategories, delimiter, headerLang);
      const filename =
        categorySource === 'system'
          ? `template_wide_my_categories_${headerLang}.csv`
          : `template_wide_standard_${headerLang}.csv`;
      downloadSampleCsv(filename, content);
      showToast('ดาวน์โหลดเทมเพลต Wide Format สำเร็จ', 'success');
    }
  }, [selectedFormat, longVariation, effectiveCategories, categorySource, delimiter, headerLang, showToast]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center backdrop-blur-sm p-4 select-none">
      <div className="relative rounded-none shadow-2xl flex flex-col w-full max-w-[1240px] h-[86vh] border border-[#3e3e3e] bg-[#181818] overflow-hidden">
        {/* Header (Identical to ExportHeader) */}
        <GuideHeader onClose={onClose} />

        {/* Content Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar (Identical to ExportSidebar) */}
          <GuideSidebar
            selectedFormat={selectedFormat}
            onSelectFormat={setSelectedFormat}
            longVariation={longVariation}
            onSelectLongVariation={setLongVariation}
            categorySource={categorySource}
            onToggleCategorySource={setCategorySource}
            systemExpenseCount={systemExpenseCategories.length}
            delimiter={delimiter}
            setDelimiter={setDelimiter}
            headerLang={headerLang}
            setHeaderLang={setHeaderLang}
          />

          {/* Preview Area (Identical to ExportPreview) */}
          <GuidePreviewArea
            selectedFormat={selectedFormat}
            longVariation={longVariation}
            onSelectLongVariation={setLongVariation}
            effectiveCategories={effectiveCategories}
            categories={categories}
            dayTypeConfig={dayTypeConfig}
            headerLang={headerLang}
            previewSearch={previewSearch}
            setPreviewSearch={setPreviewSearch}
          />
        </div>

        {/* Footer (Identical to ExportFooter) */}
        <GuideFooter
          selectedFormat={selectedFormat}
          longVariation={longVariation}
          delimiter={delimiter}
          headerLang={headerLang}
          onClose={onClose}
          onCopy={handleCopyHeaders}
          onDownload={handleDownloadSample}
          copied={copied}
        />
      </div>
    </div>
  );
});

export default ImportGuideModal;
