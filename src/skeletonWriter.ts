import fs from 'fs';
import path from 'path';

export interface Vertex {
  x: number;
  y: number;
  z: number;
}

export interface Edge {
  vertex1: number;
  vertex2: number;
}

export class SkeletonWriter {
  /**
   * Writes the binary skeleton file for the given vertices and edges.
   * 
   * @param vertices Array of vertex positions.
   * @param edges Array of edges between vertices.
   * @param outputFilePath Path for the binary skeleton output.
   */
  static writeSkeleton(vertices: Vertex[], edges: Edge[], outputFilePath: string) {
    const vertexCount = vertices.length;
    const edgeCount = edges.length;

    // Calculate buffer size for skeleton: 16 bytes header + vertex positions + edges
    const headerSize = 16; // 4 bytes for magic number, 4 for version, 4 for vertex count, 4 for edge count
    const vertexSize = 12; // 3 floats (x, y, z), each 4 bytes
    const edgeSize = 8;    // 2 uint32s (source and target), each 4 bytes
    const bufferSize = headerSize + (vertexSize * vertexCount) + (edgeSize * edgeCount);

    const buffer = Buffer.alloc(bufferSize);
    let offset = 0;

    // Write the header
    buffer.writeUInt32LE(0x6b6e736b, offset);  // Magic number "nsk"
    offset += 4;
    buffer.writeUInt32LE(1, offset);  // Version number
    offset += 4;
    buffer.writeUInt32LE(vertexCount, offset);  // Number of vertices
    offset += 4;
    buffer.writeUInt32LE(edgeCount, offset);  // Number of edges
    offset += 4;

    // Write the vertices (3 floats per vertex: x, y, z)
    for (let i = 0; i < vertexCount; i++) {
      buffer.writeFloatLE(vertices[i].x, offset);
      buffer.writeFloatLE(vertices[i].y, offset + 4);
      buffer.writeFloatLE(vertices[i].z, offset + 8);
      offset += 12;
    }

    // Write the edges (2 uint32 per edge: vertex1, vertex2)
    for (let i = 0; i < edgeCount; i++) {
      buffer.writeUInt32LE(edges[i].vertex1, offset);
      buffer.writeUInt32LE(edges[i].vertex2, offset + 4);
      offset += 8;
    }

    // Write the buffer to a binary file
    fs.writeFileSync(outputFilePath, buffer);
    console.log(`Skeleton binary file written to ${outputFilePath}`);
  }

  /**
   * Writes the JSON skeleton metadata file as "info.json".
   * 
   * @param vertexCount Number of vertices in the skeleton.
   * @param edgeCount Number of edges in the skeleton.
   * @param outputDirectory Directory where the skeleton metadata file should be saved.
   */
  static writeSkeletonInfo(vertexCount: number, edgeCount: number, outputDirectory: string) {
    const skeletonInfo = {
      "@type": "neuroglancer_skeletons",
      "transform": [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],  // Identity transform for now, modify as needed
      "vertex_attributes": [
        {
          "id": "position",  // Default position attribute
          "data_type": "float32",
          "num_components": 3  // x, y, z
        }
      ],
      "num_vertices": vertexCount,
      "num_edges": edgeCount
    };

    // Path for the info.json file
    const infoFilePath = path.join(outputDirectory, 'info.json');

    // Write the JSON file
    fs.writeFileSync(infoFilePath, JSON.stringify(skeletonInfo, null, 2));
    console.log(`Skeleton info file written to ${infoFilePath}`);
  }

  /**
   * Generates the file paths for the skeleton's binary file.
   * 
   * @param segmentId The ID of the segment being processed.
   * @param outputDirectory The directory where the skeleton files should be saved.
   * @returns Object containing paths for both the binary file and the info file.
   */
  static generateSkeletonFilePaths(segmentId: string | number, outputDirectory: string) {
    const binaryFileName = `${segmentId}.bin`;  // Binary file for skeleton data

    return {
      binaryFilePath: path.join(outputDirectory, binaryFileName),
      infoFilePath: path.join(outputDirectory, 'info.json')  // Always "info.json"
    };
  }
}
