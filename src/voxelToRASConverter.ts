export class VoxelToRASConverter {
    static voxelToRAS(point: [number, number, number], matrix: number[][]): [number, number, number] {
      const [x_voxel, y_voxel, z_voxel] = point;
      const x_ras = matrix[0][0] * x_voxel + matrix[0][1] * y_voxel + matrix[0][2] * z_voxel + matrix[0][3];
      const y_ras = matrix[1][0] * x_voxel + matrix[1][1] * y_voxel + matrix[1][2] * z_voxel + matrix[1][3];
      const z_ras = matrix[2][0] * x_voxel + matrix[2][1] * y_voxel + matrix[2][2] * z_voxel + matrix[2][3];
      return [x_ras, y_ras, z_ras];
    }
  }
  