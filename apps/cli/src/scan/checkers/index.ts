import { firestoreChecker } from './firestore-checker';
import { CheckerValidation } from './checker';
import { git } from './git/git';

export type CheckerMap = Record<string, CheckerValidation[]>;

export const checkerMap: CheckerMap = {
  //"": [firestoreChecker],
  '.git/HEAD': [git],
};
