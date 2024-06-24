import { firestoreChecker } from "./firestore-checker";
import { CheckerValidation } from "./checker";
import { gitChecker } from "./git-checker";
import { websiteExists } from "./website-exists";

export type CheckerMap = Record<string, CheckerValidation[]>;

export const checkerMap: CheckerMap = {
  "": [firestoreChecker, websiteExists],
  ".git/HEAD": [gitChecker],
};
