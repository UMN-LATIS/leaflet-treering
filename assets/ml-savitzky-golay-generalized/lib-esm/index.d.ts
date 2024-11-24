import { NumberArray } from 'cheminfo-types';
export interface SGGOptions {
    /**
     * @default 9
     */
    windowSize?: number;
    /**
     * @default 0
     */
    derivative?: number;
    /**
     * @default 3
     */
    polynomial?: number;
}
/**
 * Apply Savitzky Golay algorithm
 * @param [ys] Array of y values
 * @param [xs] Array of X or deltaX
 * @return  Array containing the new ys (same length)
 */
export declare function sgg(ys: NumberArray, xs: NumberArray | number, options?: SGGOptions): Float64Array;
//# sourceMappingURL=index.d.ts.map