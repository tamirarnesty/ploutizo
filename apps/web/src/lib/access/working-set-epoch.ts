let workingSetEpoch = 0;

export const getWorkingSetEpoch = () => workingSetEpoch;

export const isCurrentWorkingSetEpoch = (epoch: number) =>
  epoch === workingSetEpoch;

export const bumpWorkingSetEpoch = () => {
  workingSetEpoch += 1;
};

export const resetWorkingSetEpochForTests = () => {
  workingSetEpoch = 0;
};
