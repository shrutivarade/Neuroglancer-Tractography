import fs from 'fs';

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
  static writeSkeleton(vertices: Vertex[], edges: Edge[], binaryOutputFilePath: string) {
    const vertexCount = vertices.length;
    const edgeCount = edges.length;
    const headerSize = 16;
    const vertexSize = 12;
    const edgeSize = 8;
    const bufferSize = headerSize + (vertexSize * vertexCount) + (edgeSize * edgeCount);
    const buffer = Buffer.alloc(bufferSize);

    let offset = 0;

    buffer.writeUInt32LE(0x6b6e736b, offset); // MAGIC_NUMBER
    offset += 4;
    buffer.writeUInt32LE(1, offset); // VERSION
    offset += 4;
    buffer.writeUInt32LE(vertexCount, offset);
    offset += 4;
    buffer.writeUInt32LE(edgeCount, offset);
    offset += 4;

    vertices.forEach((vertex) => {
      buffer.writeFloatLE(vertex.x, offset);
      buffer.writeFloatLE(vertex.y, offset + 4);
      buffer.writeFloatLE(vertex.z, offset + 8);
      offset += 12;
    });

    edges.forEach((edge) => {
      buffer.writeUInt32LE(edge.vertex1, offset);
      buffer.writeUInt32LE(edge.vertex2, offset + 4);
      offset += 8;
    });

    fs.writeFileSync(binaryOutputFilePath, buffer);
    console.log(`Skeleton binary file written to ${binaryOutputFilePath}`);
  }

  static writeSkeletonInfo(
    vertexCount: number,
    edgeCount: number,
    infoOutputFilePath: string,
    useRadius: boolean = false,
    sharding: boolean = false
  ) {
    // Base structure for skeleton info
    const skeletonInfo: any = {
      "@type": "neuroglancer_skeletons",  // Skeleton file type
      "num_vertices": vertexCount,
      "num_edges": edgeCount,
      "transform": [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0],  // Identity matrix (no transformation)
      "vertex_attributes": {
        attributes: [
          {
            id: "position",
            data_type: "float32",
            num_components: 3,
          },
        ],
      },
    };

    // Add a radius attribute if specified
    if (useRadius) {
      skeletonInfo.vertex_attributes.attributes.push({
        id: "radius",
        data_type: "float32",
        num_components: 1,
      });
    }

    // Add sharding information if specified
    if (sharding) {
      skeletonInfo.sharding = {
        preshift_bits: 0,
        minishard_bits: 6,
        shard_bits: 10,
        data_encoding: "gzip",
        hash: "identity",
        minishard_index_encoding: "gzip",
      };
    }

    // Optional segment_properties field (can be removed if not needed)
    skeletonInfo.segment_properties = "segment_properties_directory";

    // Write the info.json file
    fs.writeFileSync(infoOutputFilePath, JSON.stringify(skeletonInfo, null, 2));
    console.log(`Skeleton info file written to ${infoOutputFilePath}`);
  }
}
