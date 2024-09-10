import { TrkHeader } from './trkHeader';

export class VoxelToRASConverter {
  // Function to apply the affine transformation from voxel to RAS
  static voxelToRAS(point: [number, number, number], header: TrkHeader): [number, number, number] {
    const [x_voxel, y_voxel, z_voxel] = point;

    // Step 1: Scaling - Apply voxel size scaling to convert voxelmm space to voxel space
    const voxelSizes = header.vox_to_ras[0].slice(0, 3); // Get the voxel sizes from the header
    const x_scaled = x_voxel / voxelSizes[0];
    const y_scaled = y_voxel / voxelSizes[1];
    const z_scaled = z_voxel / voxelSizes[2];

    // Step 2: Shifting - Adjust by half a voxel to convert from corner to center of the voxel
    const x_shifted = x_scaled - 0.5;
    const y_shifted = y_scaled - 0.5;
    const z_shifted = z_scaled - 0.5;

    // Step 3: Apply the affine transformation using the matrix from the header
    const matrix = header.vox_to_ras;

    const x_ras = matrix[0][0] * x_shifted + matrix[0][1] * y_shifted + matrix[0][2] * z_shifted + matrix[0][3];
    const y_ras = matrix[1][0] * x_shifted + matrix[1][1] * y_shifted + matrix[1][2] * z_shifted + matrix[1][3];
    const z_ras = matrix[2][0] * x_shifted + matrix[2][1] * y_shifted + matrix[2][2] * z_shifted + matrix[2][3];

    return [x_ras, y_ras, z_ras];
  }
}
