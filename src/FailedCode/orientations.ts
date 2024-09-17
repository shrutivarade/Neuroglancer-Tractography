import * as math from 'mathjs';

export function aff2axcodes(affine: number[][]): string[] {
    const axisMapping = ['L', 'R', 'P', 'A', 'I', 'S'];  // Axis labels: L = Left, R = Right, P = Posterior, etc.
    const codes: string[] = [];
    for (let i = 0; i < 3; i++) {
        const col = affine.slice(0, 3).map(row => row[i]);  // Get the i-th column of affine matrix
        const maxIdx = col.indexOf(Math.max(...col.map(Math.abs)));  // Get the index of the max value
        const code = col[maxIdx] < 0 ? axisMapping[2 * maxIdx] : axisMapping[2 * maxIdx + 1];
        codes.push(code);
    }
    return codes;
}

export function axcodes2ornt(axcodes: string[]): number[][] {
    const ornt: number[][] = [];

    // Define the valid labels and their corresponding axis and direction
    const labelToAxis: { [key in 'L' | 'R' | 'P' | 'A' | 'I' | 'S']: number } = {
        'L': 0, 'R': 0,
        'P': 1, 'A': 1,
        'I': 2, 'S': 2
    };

    const labelToDirection: { [key in 'L' | 'R' | 'P' | 'A' | 'I' | 'S']: number } = {
        'L': -1, 'R': 1,
        'P': -1, 'A': 1,
        'I': -1, 'S': 1
    };

    for (let i = 0; i < axcodes.length; i++) {
        const label = axcodes[i] as 'L' | 'R' | 'P' | 'A' | 'I' | 'S';  // Ensure label is typed correctly
        const axis = labelToAxis[label];
        const direction = labelToDirection[label];
        ornt.push([axis, direction]);
    }

    return ornt;
}


export function ornt_transform(fromOrnt: number[][], toOrnt: number[][]): number[][] {
    const transform = [];

    for (let i = 0; i < fromOrnt.length; i++) {
        for (let j = 0; j < toOrnt.length; j++) {
            if (fromOrnt[i][0] === toOrnt[j][0]) {
                transform.push([j, toOrnt[j][1] * fromOrnt[i][1]]);
                break;
            }
        }
    }

    return transform;
}


export function inv_ornt_aff(ornt: number[][], shape: number[]): number[][] {
    // Start with 4x4 identity matrix and convert it to a JavaScript array
    let affine = math.identity(4) as math.Matrix;  // math.identity returns a Matrix
    let affineArray = affine.toArray() as number[][];  // Convert Matrix to array

    for (let i = 0; i < 3; i++) {
        const axis = ornt[i][0];
        const flip = ornt[i][1];

        // Flip axis
        affineArray[i][axis] = flip;

        // Adjust for offset
        affineArray[i][3] = (flip === 1) ? 0 : shape[axis] - 1;
    }

    return affineArray;
}
