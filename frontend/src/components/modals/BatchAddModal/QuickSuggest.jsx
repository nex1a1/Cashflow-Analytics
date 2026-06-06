import React from 'react';
import SharedQuickSuggest from '../../shared/QuickSuggest';

export default function QuickSuggest(props) {
  return (
    <SharedQuickSuggest
      {...props}
      className="w-full lg:w-[30%] p-5 border-b lg:border-b-0 lg:border-r flex flex-col min-h-0 border-[#303030] bg-[#1c1c1c]"
    />
  );
}