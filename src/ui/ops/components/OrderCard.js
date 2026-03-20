// AirBoss extracted UI reference target
//
// This file is the first UI extraction target for the refactor.
// For now it intentionally mirrors the live OrderCard behavior reference
// stored in `OrderCard.reference.js`, but is not yet wired into the app.
// The goal is to move the live component here in controlled steps.

export const ORDER_CARD_EXTRACTION_STATUS = {
  state: 'scaffolded-not-wired',
  sourceOfTruth: 'index.html',
  referenceFile: './OrderCard.reference.js',
  nextSteps: [
    'define minimal prop contract',
    'copy live implementation into module-safe form',
    'load via browser runtime or script include',
    'switch index.html to use extracted component',
  ],
};
