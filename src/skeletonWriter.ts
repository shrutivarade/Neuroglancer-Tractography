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

  static writeSkeleton(vertices: Vertex[], edges: Edge[], orientations: number[][], outputFilePath: string) {
    const vertexCount = vertices.length;
    const edgeCount = edges.length;

    const vertexSize = 12; // 3 floats (x, y, z), each 4 bytes
    const edgeSize = 8;    // 2 uint32s (source and target), each 4 bytes
    const orientationSize = 12; // 3 floats (x, y, z) for orientations
    const bufferSize = 4 + 4 + (vertexSize * vertexCount) + (edgeSize * edgeCount) + (orientationSize * vertexCount);

    const buffer = Buffer.alloc(bufferSize);
    let offset = 0;

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

    // Write the orientations (3 floats per vertex)
    for (let i = 0; i < vertexCount; i++) {
      buffer.writeFloatLE(orientations[i][0], offset);
      buffer.writeFloatLE(orientations[i][1], offset + 4);
      buffer.writeFloatLE(orientations[i][2], offset + 8);
      offset += 12;
    }

    fs.writeFileSync(outputFilePath, buffer);
    console.log(`Skeleton written to ${outputFilePath}`);
  }

  
  static writeSkeletonInfo(infoFilePath: string) {
    const skeletonInfo = {
      "@type": "neuroglancer_skeletons",
      "vertex_attributes": [
        {
          "id": "orientation",
          "data_type": "float32",
          "num_components": 3,
        },
      ],
      "segment_properties": "prop",
    };

    // Write the skeleton info to the specified path
    fs.writeFileSync(infoFilePath, JSON.stringify(skeletonInfo, null, 2));
    console.log(`Skeleton info file written to ${infoFilePath}`);
  }

  
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


