import { firestoreChecker } from "./firestore-checker";
import { CheckerValidation } from "./checker";

export type CheckerMap = Record<string, CheckerValidation[]>;

export const checkerMap: CheckerMap = {
  "": [firestoreChecker],
};
