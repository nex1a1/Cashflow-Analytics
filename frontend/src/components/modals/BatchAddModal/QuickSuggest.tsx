import React from 'react';
import SharedQuickSuggest, { QuickSuggestProps } from '../../shared/QuickSuggest';

function QuickSuggest(props: QuickSuggestProps) {
  return (
    <SharedQuickSuggest
      defaultLimit={11}
      {...props}
      className="w-full lg:w-[34%] px-5 py-4 border-b lg:border-b-0 lg:border-r flex flex-col min-h-0 border-line bg-surface-hover"
    />
  );
}

export default React.memo(QuickSuggest);