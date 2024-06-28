import { firestoreChecker } from "./firestore-checker";
import { CheckerValidation } from "./checker";
import { git } from "./git/git";
import { websiteExists } from "./website-exists";

export type CheckerMap = Record<string, CheckerValidation[]>;

export const checkerMap: CheckerMap = {
  "": [firestoreChecker, websiteExists],
  ".git/HEAD": [git],
};
