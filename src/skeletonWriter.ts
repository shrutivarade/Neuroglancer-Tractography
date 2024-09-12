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
    //const headerSize = 16; // 4 bytes for magic number, 4 for version, 4 for vertex count, 4 for edge count
    const vertexSize = 12; // 3 floats (x, y, z), each 4 bytes
    const edgeSize = 8;    // 2 uint32s (source and target), each 4 bytes
    const bufferSize = 4 + 4 + (vertexSize * vertexCount) + (edgeSize * edgeCount);

    const buffer = Buffer.alloc(bufferSize);
    let offset = 0;

    // Write the header
    //buffer.writeUInt32LE(0x6b6e736b, offset);  // Magic number "nsk"
    //offset += 4;
    //buffer.writeUInt32LE(1, offset);  // Version number
    //offset += 4;
    
    
    buffer.writeUInt32LE(vertexCount, offset);  // Number of vertices
    offset += 4;
    buffer.writeUInt32LE(edgeCount, offset);  // Number of edges
    offset += 4;

    // Write the vertices (3 floats per vertex: x, y, z)
    for (let i = 0; i < vertexCount; i++) {
      buffer.writeFloatLE((vertices[i].x)*1E6, offset);
      buffer.writeFloatLE(vertices[i].y*1E6, offset + 4);
      buffer.writeFloatLE(vertices[i].z*1E6, offset + 8);
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
    console.log(`\nSkeleton binary file written to ${outputFilePath}`);
  }

  /**
   * Writes the JSON skeleton metadata file as "info.json".
   * 
   * @param infoFilePath Path where the skeleton metadata file should be saved.
   */
  // Method to write skeleton info
  static writeSkeletonInfo(infoFilePath: string) {
    const skeletonInfo = {
      "@type": "neuroglancer_skeletons",
      "segment_properties": "prop",
    };

    // Write the skeleton info to the specified path
    fs.writeFileSync(infoFilePath, JSON.stringify(skeletonInfo, null, 2));
    console.log(`Skeleton info file written to ${infoFilePath}`);
  }

  // Method to write prop info
  static writePropInfo(propFilePath: string) {
    const propInfo = {
      "@type": "neuroglancer_segment_properties",
      "inline": {
        "ids": ["1"],
        "properties": [{ "id": "label", "type": "label", "values": ["1"] }]
      }
    };

    // Write the prop info to the specified path
    fs.writeFileSync(propFilePath, JSON.stringify(propInfo, null, 2));
    console.log(`Prop info file written to ${propFilePath}`);
  }

  /**
   * Generates the file paths for the skeleton's binary and metadata files.
   * 
   * @param outputDirectory The directory where the skeleton files should be saved.
   * @returns Object containing paths for both the binary file and the info file.
   */
  static generateSkeletonFilePaths(outputDirectory: string) {
    const binaryFilePath = path.join(outputDirectory, 'tract', '1'); // Binary file path
    const propInfoFilePath = path.join(outputDirectory, 'tract', 'prop', 'info'); // JSON file path
    const skeletonInfoFilePath = path.join(outputDirectory, 'tract', 'info'); // JSON file path

    return {
      binaryFilePath,
      propInfoFilePath,
      skeletonInfoFilePath
    };
  }
}