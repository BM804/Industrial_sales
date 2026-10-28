import { markupFloorPrice, markupPercent } from './pricing-rules';

export type NegotiationStatus = 'quote-below-floor' | 'counter-below-floor' | 'counter-meets-quote' | 'negotiating';

export function negotiate(counter: number, base: number, quote: number) {
  const safeCost = Number.isFinite(base) && base > 0 ? base : 0;
  const safeQuote = Number.isFinite(quote) && quote > 0 ? quote : 0;
  const safeCounter = Number.isFinite(counter) && counter > 0 ? counter : 0;
  const floor = markupFloorPrice(safeCost, 35);
  const topics = ['Tooling precision', 'Testing & quality', 'Phased scope'];

  if (!safeCost || !safeQuote || safeQuote < floor) {
    return {
      blocked: true,
      status: 'quote-below-floor' as NegotiationStatus,
      floor,
      offer: floor,
      steps: [] as number[],
      topics,
      margin: markupPercent(floor, safeCost),
      reason: 'The current customer quote is below the protected minimum price. Revise the quote or reduce scope before evaluating a counter-offer.',
    };
  }

  if (!safeCounter || safeCounter < floor) {
    return {
      blocked: true,
      status: 'counter-below-floor' as NegotiationStatus,
      floor,
      offer: floor,
      steps: [] as number[],
      topics,
      margin: markupPercent(floor, safeCost),
      reason: 'The counter-offer is below the protected minimum price. Do not accept it without an approved scope change.',
    };
  }

  if (safeCounter >= safeQuote) {
    return {
      blocked: false,
      status: 'counter-meets-quote' as NegotiationStatus,
      floor,
      offer: safeQuote,
      steps: [] as number[],
      topics: ['Delivery assurance'],
      margin: markupPercent(safeQuote, safeCost),
      reason: 'The customer counter meets or exceeds the current quote; no price concession is needed.',
    };
  }

  const gap = safeQuote - safeCounter;
  const suggested = Math.min(safeQuote, Math.max(floor, safeCounter + Math.min(gap * 0.18, 500_000)));
  const steps = [safeQuote - 500_000, safeQuote - 900_000, safeQuote - 1_200_000, floor]
    .filter((value, index, all) => value >= floor && value < safeQuote && all.indexOf(value) === index)
    .sort((a, b) => b - a);

  return {
    blocked: false,
    status: 'negotiating' as NegotiationStatus,
    floor,
    offer: suggested,
    steps,
    topics: gap > 5_000_000
      ? ['Phased scope', 'Tooling precision', 'Lifecycle reliability']
      : gap > 2_000_000
        ? ['Testing & quality', 'Phased scope']
        : ['Quality assurance', 'Delivery assurance'],
    margin: markupPercent(suggested, safeCost),
    reason: 'Trade price movement for a documented scope or payment commitment.',
  };
}

export function technicalResponse(topics: string[]) {
  return topics.map(topic => topic === 'Tooling precision'
    ? 'Die precision and tolerance depend on validated tooling iterations and metrology sign-off; reducing engineering effort raises rework and fitment risk.'
    : topic === 'Testing & quality'
      ? 'Retain the planned QA cycles and dimensional checks to catch failure modes before production handover.'
      : topic === 'Lifecycle reliability'
        ? 'Protect maintenance documentation and reliability validation to reduce unplanned line downtime across the tool lifecycle.'
        : topic === 'Delivery assurance'
          ? 'Keep the agreed acceptance criteria and delivery commitments intact.'
          : 'Offer a phased release: preserve safety and acceptance criteria, then schedule non-critical enhancements as a separately priced phase.');
}
