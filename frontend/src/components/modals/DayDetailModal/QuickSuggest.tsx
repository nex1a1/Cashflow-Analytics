import React from 'react';
import SharedQuickSuggest, { QuickSuggestProps } from '../../shared/QuickSuggest';

export default function QuickSuggest(props: QuickSuggestProps) {
  return (
    <SharedQuickSuggest
      defaultLimit={13}
      {...props}
      className="w-full md:w-[38%] px-5 py-3.5 flex flex-col min-h-0 border-l border-[#303030] bg-[#1c1c1c]"
    />
  );
}