import SharedQuickSuggest, { QuickSuggestProps } from '../../shared/QuickSuggest';

export default function QuickSuggest(props: QuickSuggestProps) {
  return (
    <SharedQuickSuggest
      defaultLimit={11}
      {...props}
      className="w-full md:flex-1 md:min-w-0 px-5 py-3.5 flex flex-col min-h-0 border-l border-line bg-surface-hover"
    />
  );
}