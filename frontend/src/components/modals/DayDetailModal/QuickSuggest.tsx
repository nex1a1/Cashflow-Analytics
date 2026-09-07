import React from 'react';
import SharedQuickSuggest, { QuickSuggestProps } from '../../shared/QuickSuggest';

export default function QuickSuggest(props: QuickSuggestProps) {
  return (
    <SharedQuickSuggest
      {...props}
      className="w-full md:w-[38%] p-5 flex flex-col min-h-0 border-l border-[#303030] bg-[#1c1c1c]"
    />
  );
}