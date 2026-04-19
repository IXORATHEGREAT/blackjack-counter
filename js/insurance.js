// Insurance logic
function shouldOfferInsurance() {
  return state.dealerHand.length === 1 && state.dealerHand[0].rank === 'A' && !state.isSplit;
}

function insuranceEV() {
  const tc = trueCount();
  const tenProbValue = tenProb();
  const ev = (tenProbValue * 2) + ((1 - tenProbValue) * -1);
  return {
    ev: ev,
    recommended: ev > 0,
    strongRec: tc >= 3,
    tenProb: tenProbValue
  };
}

function takeInsurance() {
  if (!shouldOfferInsurance()) return;
  const baseBet = state.confirmedBet ? state.confirmedBet.bet : calcSuggestedBet().bet;
  state.insuranceBet = Math.floor(baseBet / 2);
  state.insuranceTaken = true;
  notify('INSURANCE TAKEN', '$' + state.insuranceBet);
  renderUI();
}

function declineInsurance() {
  state.insuranceTaken = false;
  state.insuranceBet = 0;
  notify('INSURANCE DECLINED', '');
  renderUI();
}