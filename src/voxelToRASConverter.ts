import * as math from 'mathjs';
import { TrkHeader } from './trkHeader';  // Import the TrkHeader interface

export class VoxelToRASConverter {

    // Convert voxel to RAS using the affine matrix
    static voxelToRAS(voxel: [number, number, number], affineMatrix: number[][]): [number, number, number] {
        // Convert the affine matrix and voxel into mathjs matrices
        const affine = math.matrix(affineMatrix);
        const voxelHomogeneous = math.matrix([...voxel, 1]);

        // Multiply the affine matrix with the voxel coordinates
        const rasHomogeneous = math.multiply(affine, voxelHomogeneous) as math.Matrix;

        // Extract x, y, z from the result and return as an array
        return [rasHomogeneous.get([0]), rasHomogeneous.get([1]), rasHomogeneous.get([2])];
    }

    // Function to compute affine matrix from voxelmm space to RAS+ mm space
    static getAffineTrackvisToRASMM(header: TrkHeader): number[][] {
        // Create an identity matrix for the affine transformation
        let affine = math.identity(4) as math.Matrix;

        // Apply scale: adjust voxel space based on voxel size
        const scale = math.identity(4) as math.Matrix;
        for (let i = 0; i < 3; i++) {
            scale.set([i, i], 1 / header.voxel_size[i]); // Scale by voxel size
        }
        affine = math.multiply(scale, affine) as math.Matrix;

        // Apply offset: Shift by half a voxel to account for corner/center discrepancy
        const offset = math.identity(4) as math.Matrix;
        for (let i = 0; i < 3; i++) {
            offset.set([i, 3], -0.5); // Shift by half voxel
        }
        affine = math.multiply(offset, affine) as math.Matrix;

        // Apply voxel_to_ras transformation matrix from the header
        const voxelToRASMatrix = math.matrix(header.vox_to_ras);
        const affine_voxmm_to_rasmm = math.multiply(voxelToRASMatrix, affine) as math.Matrix;

        // Convert the final affine matrix back to a 2D array (number[][]) and return
        return affine_voxmm_to_rasmm.toArray() as number[][];
    }
}
