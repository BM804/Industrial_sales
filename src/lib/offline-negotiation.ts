import { formatINR } from './pricing-rules';

export type OfflineNegotiationInput = {
  project: string;
  company: string;
  quote: number;
  cost: number;
  floor: number;
  counter: number;
  reason: string;
  marketReference?: number;
};

type Scenario = {
  id: string;
  label: string;
  terms: RegExp;
  value: string;
  response: (input: OfflineNegotiationInput) => string;
  trade: string;
};

const scenarios: Scenario[] = [
  {
    id: 'competitor', label: 'Competing quote',
    terms: /competitor|other vendor|another company|alternative supplier|lower quote|cheaper|market price|benchmark|bid|tender/i,
    value: 'Compare the competing offer on the same scope, acceptance tests, delivery dates, warranty, support, and payment terms. The customer’s competitor price is not independently verified.',
    response: ({ marketReference }) => marketReference
      ? `If the scope is comparable, our recorded market reference is ${formatINR(marketReference)}. Let us compare inclusions and acceptance criteria line by line before changing the price.`
      : 'Could we compare the competing proposal against the same scope, delivery dates, acceptance tests, and support terms? If you can share its inclusions, we can identify a fair like-for-like option.',
    trade: 'Offer a like-for-like scope review. If a lower total is essential, show a separately priced phase or remove optional items explicitly; do not assume the competitor includes the same work.'
  },
  {
    id: 'budget', label: 'Budget constraint',
    terms: /budget|afford|cap|limit|approval|approved amount|spend|allocation|funding|quarter/i,
    value: 'Treat the stated budget as a constraint to solve, not proof that the full scope can be delivered at that amount. Preserve the protected floor and make scope choices visible.',
    response: ({ counter, floor }) => counter < floor
      ? `I understand the ${formatINR(counter)} budget. Our current scope has a protected minimum of ${formatINR(Math.ceil(floor))}, so I should not promise the same delivery below that level. Let’s identify a first phase that fits the available budget and price any later phase separately.`
      : `I understand the ${formatINR(counter)} budget. We can review a phased plan and align each payment to an accepted milestone, while keeping the agreed quality checks in the selected scope.`,
    trade: 'Split the work into independently useful phases, or align payment dates with customer approvals. Do not silently remove safety, validation, or acceptance work.'
  },
  {
    id: 'timeline', label: 'Delivery timing',
    terms: /timeline|deadline|delay|urgent|faster|early|delivery|outage|shutdown|commission|schedule|lead time/i,
    value: 'A compressed schedule changes staffing, sequencing, and risk. Confirm the requested date and dependencies before agreeing to a price or delivery commitment.',
    response: () => 'Let’s confirm the required commissioning date, site access, interface readiness, and customer review turnaround. We can then show which work can run in parallel and price any additional acceleration transparently.',
    trade: 'Offer a pilot, phased commissioning, or parallel work only after checking resource availability and customer dependencies. Price acceleration separately if it adds effort.'
  },
  {
    id: 'scope', label: 'Scope or features',
    terms: /scope|feature|function|requirement|specification|deliverable|add|remove|change|custom|integration|line|site/i,
    value: 'Price should follow the deliverables and acceptance criteria. Make requested additions or removals explicit so both sides compare the same outcome.',
    response: () => 'Let’s mark which deliverables are essential for the first release and which can move to a later phase. I’ll show the price and acceptance criteria for each option so the trade is clear.',
    trade: 'Create a base scope plus priced options. Record exclusions, assumptions, interfaces, and acceptance tests before revising the quote.'
  },
  {
    id: 'payment', label: 'Payment terms or cash flow',
    terms: /payment|cash flow|cashflow|advance|credit|invoice|milestone|installment|instalment|quarter/i,
    value: 'A payment structure may address cash-flow concerns without cutting project scope or delivery quality. Tie invoices to verifiable milestones and written acceptance.',
    response: () => 'If the concern is cash flow, we can review milestone-based billing tied to design approval, factory acceptance, and commissioning. That changes payment timing without concealing a scope reduction.',
    trade: 'Offer milestone billing or a phased purchase order, subject to agreed acceptance and payment terms. Do not promise financing or credit that has not been approved.'
  },
  {
    id: 'risk', label: 'Risk, quality, or proof',
    terms: /risk|quality|reliab|warranty|guarantee|proof|pilot|test|validation|safety|uptime|failure|acceptance|confidence/i,
    value: 'Address uncertainty with evidence, a pilot, and measurable acceptance tests. Avoid unsupported guarantees, savings claims, or performance promises.',
    response: () => 'Let’s agree the success measures and acceptance tests first. A bounded pilot can validate the critical interfaces before either side commits to the broader rollout.',
    trade: 'Offer a paid discovery or pilot with written success criteria, then make the larger rollout a separately approved phase.'
  },
  {
    id: 'volume', label: 'Volume, discount, or repeat business',
    terms: /discount|bulk|volume|quantity|multi.?year|renewal|repeat|portfolio|order size|larger order/i,
    value: 'A larger commitment can justify a different commercial structure only when quantity, duration, scope, and delivery assumptions are documented.',
    response: () => 'If you can confirm the quantity, sites, and purchase schedule, I can price the committed volume as a package. I’ll keep optional work and future phases visible so the discount is tied to a real commitment.',
    trade: 'Make any volume price conditional on a written minimum quantity, term, or schedule, with a clear expiry and no unapproved service commitments.'
  },
  {
    id: 'business-case', label: 'Value or business case',
    terms: /roi|payback|saving|efficien|throughput|downtime|return on investment|business case|benefit|productivity/i,
    value: 'Build the case from customer-validated baseline figures and measurable outcomes. Do not promise savings or payback that have not been measured or agreed.',
    response: () => 'Let’s agree the current baseline and the measures that would make this project worthwhile. We can show how the scope supports those measures, then validate the assumptions during a pilot or review milestone.',
    trade: 'Offer a measurement or discovery phase with agreed baseline data and success criteria. Keep projected benefits clearly labeled as assumptions until verified.'
  },
  {
    id: 'approval', label: 'Approval or decision process',
    terms: /decision.?maker|stakeholder|committee|procurement|sign.?off|authority|legal review|finance approval|board|internal approval/i,
    value: 'Map who approves budget, technical scope, security, and contract terms. A proposal is more useful when the decision path and unresolved questions are explicit.',
    response: () => 'Who else needs to review the commercial or technical proposal, and what evidence do they need? I can prepare a concise option comparison for each approver and agree a date to resolve open points.',
    trade: 'Offer a short technical/commercial review with the relevant stakeholders; hold price validity to a stated date instead of giving an open-ended concession.'
  },
  {
    id: 'stall', label: 'Delayed decision or no response',
    terms: /no response|not heard|follow.?up|stalled|no decision|postpone|later|delay decision|waiting/i,
    value: 'A stalled deal may reflect timing, missing information, or a changed priority. Check the reason before adding discounts or inventing urgency.',
    response: () => 'I’m checking whether the project is still active or if the priority has changed. Is there one open question blocking a decision? If timing has moved, we can agree a realistic next review date.',
    trade: 'Offer a concise options summary and a mutually agreed follow-up date. Do not create a fake deadline or discount to manufacture urgency.'
  }
];

function scoreScenario(reason: string, scenario: Scenario) {
  const matches = reason.match(new RegExp(scenario.terms.source, 'gi'));
  return matches?.length ?? 0;
}

export function buildOfflineNegotiation(input: OfflineNegotiationInput) {
  const reason = input.reason.trim();
  const scenario = [...scenarios]
    .map((item, index) => ({ item, score: scoreScenario(reason, item), index }))
    .sort((a, b) => b.score - a.score || a.index - b.index)[0];
  const selected = scenario.score > 0 ? scenario.item : {
    id: 'general', label: 'Clarify the customer’s priority',
    value: 'The reason is missing or does not match a known objection. Ask a neutral question before trading price; confirm whether the concern is budget, scope, timing, risk, or payment.',
    response: () => 'To make a useful revision, could you tell me which matters most: total budget, delivery date, scope, payment timing, or risk? I can then show a specific option without changing requirements by assumption.',
    trade: 'Ask one clarifying question and prepare comparable scope and payment options. Avoid making an ungrounded concession.'
  };

  const quote = Math.max(0, input.quote);
  const floor = Math.max(0, Math.ceil(input.floor));
  const counter = Math.max(0, input.counter);
  let suggestedPrice: number;
  let priceReason: string;

  if (quote <= 0 || quote < floor) {
    suggestedPrice = Number.NaN;
    priceReason = `No safe price can be suggested: the quote (${formatINR(quote)}) is below the protected minimum (${formatINR(floor)}). Review the quote or scope with an authorized manager first.`;
  } else if (counter >= quote && quote > 0) {
    suggestedPrice = quote;
    priceReason = `The customer’s ${formatINR(counter)} position meets or exceeds the current ${formatINR(quote)} quote. Keep the quote and confirm scope, acceptance, and payment terms instead of offering an unnecessary discount. Estimated delivery cost is ${formatINR(input.cost)}.`;
  } else if (counter < floor) {
    suggestedPrice = floor;
    priceReason = `The requested ${formatINR(counter)} is below the protected minimum of ${formatINR(floor)}. Estimated delivery cost is ${formatINR(input.cost)}. The suggested figure holds that floor; if the budget cannot move, reduce or phase scope with explicit approval rather than sell the same scope below cost guardrails.`;
  } else {
    suggestedPrice = Math.max(floor, Math.min(quote, Math.round((counter + (quote - counter) * 0.4) / 1000) * 1000));
    priceReason = `The suggested ${formatINR(suggestedPrice)} moves partway from the customer’s ${formatINR(counter)} counter toward the ${formatINR(quote)} quote, while staying above the protected minimum of ${formatINR(floor)}. Estimated delivery cost is ${formatINR(input.cost)}. Ask for a reciprocal commitment before making any further concession.`;
  }

  const marketNote = input.marketReference && input.marketReference > 0
    ? ` Recorded market reference: ${formatINR(input.marketReference)}; treat it as an internal input and verify its scope, date, and source before presenting it.`
    : ' No verified market benchmark was supplied, so this guidance makes no claim about competitor or market prices.';

  const text = [
    `DEAL: ${input.company} · ${input.project}`,
    `SCENARIO: ${selected.label}`,
    `RECOMMENDED COUNTER (INR): ${Number.isFinite(suggestedPrice) ? suggestedPrice : 'No safe counter — escalate'}`,
    `WHY THIS PRICE: ${priceReason}`,
    `VALUE TO EMPHASIZE: ${selected.value}${marketNote}`,
    `CUSTOMER RESPONSE: ${selected.response(input)}`,
    `TRADE-OFF: ${selected.trade}`,
    `NEXT CHECK: Confirm the decision-maker, comparable scope, acceptance criteria, and the customer’s priority before recording a final offer. Do not treat customer-provided claims as verified facts.`
  ].join('\n\n');

  return { text, suggestedPrice: Number.isFinite(suggestedPrice) ? suggestedPrice : null, scenario: selected.id, label: selected.label };
}

