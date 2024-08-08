import {
    main,
    executePrReview,
    inspectMergeConflict
} from './main';

(global as any).main = main;
(global as any).executePrReview = executePrReview;
(global as any).inspectMergeConflict = inspectMergeConflict;