export const policies = [
  {
    id: 'build-bank',
    title: 'Build Bank',
    description: 'Construct the first state bank institution.',
    requires: [],
    unlocksText: 'Unlocks banking as a formal institution.',
    apply: (state) => {
      state.systems.bankBuilt = true;
      state.yearLog.unshift(
        `Year ${state.world.year}: The first bank was established, but no currency issuance is possible yet.`
      );
    },
  },
  {
    id: 'recruit-bank-clerks',
    title: 'Recruit Bank Clerks',
    description: 'Recruit and train clerks to operate bank ledgers.',
    requires: ['bankBuilt'],
    unlocksText: 'Unlocks operational banking staff.',
    apply: (state) => {
      state.systems.bankClerksRecruited = true;
      state.yearLog.unshift(
        `Year ${state.world.year}: Bank clerks were recruited, enabling daily operations.`
      );
    },
  },
  {
    id: 'research-anti-counterfeit',
    title: 'Research Anti-Counterfeit Technology',
    description: 'Develop anti-forgery safeguards for paper instruments.',
    requires: ['bankClerksRecruited'],
    unlocksText: 'Unlocks secure currency technology.',
    apply: (state) => {
      state.systems.antiCounterfeitResearched = true;
      state.yearLog.unshift(
        `Year ${state.world.year}: Anti-counterfeit research was completed. Grain coupons can now be issued.`
      );
    },
  },
  {
    id: 'issue-grain-coupons-policy',
    title: 'Issue Grain Coupons',
    description: 'Authorize government grain coupons as a managed instrument.',
    requires: ['antiCounterfeitResearched'],
    unlocksText: 'Unlocks grain coupon system and issuance controls.',
    apply: (state) => {
      state.systems.grainCouponsUnlocked = true;
      state.yearLog.unshift(
        `Year ${state.world.year}: Grain coupons were legally authorized and the issuance system is now active.`
      );
    },
  },
];
