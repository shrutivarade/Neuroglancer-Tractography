import * as fs from 'fs';

class SkeletonWriter {

  tracts: Float32Array[] = [
    new Float32Array([/* tract data 1 */]),
    new Float32Array([/* tract data 2 */]),
    // more tracts...
  ];

  
  displayedIds: number[];

  constructor() {
    this.displayedIds = [];
  }

  // Method to filter displayedIds (you can replace this with your actual logic)
  _filter() {
    // Assume _filter() assigns some valid ids to displayedIds
    this.displayedIds = [/* filtered ids */];
  }

  // Method to get a skeleton from a tract (replace this with actual implementation)
  getSkeleton(tract: Float32Array): { vertices: Float32Array, edges: Uint32Array, orientations: Float32Array } {
    // Replace with the actual skeleton calculation logic
    return {
      vertices: new Float32Array(tract.length * 3),
      edges: new Uint32Array(tract.length * 2),
      orientations: new Float32Array(tract.length * 3),
    };
  }

  // Integrated function to write the skeleton, previously _precomputed_skel_data_combined
  writeSkeleton(id: number = 1): Buffer {
    if (id !== 1) {
      return Buffer.alloc(0);
    }
  
    this._filter();
  
    let numVertices = 0;
    let numEdges = 0;
    let verticesBuffer = Buffer.alloc(0);
    let edgesBuffer = Buffer.alloc(0);
    let orientationsBuffer = Buffer.alloc(0);
  
    for (const tractId of this.displayedIds) {
      const tract = this.getTractById(tractId).map(val => val * 1E6); // nanometers
      const { vertices, edges, orientations } = this.getSkeleton(new Float32Array(tract));
  
      verticesBuffer = Buffer.concat([verticesBuffer, Buffer.from(vertices.buffer)]);
      edgesBuffer = Buffer.concat([edgesBuffer, Buffer.from(edges.buffer)]);
      orientationsBuffer = Buffer.concat([orientationsBuffer, Buffer.from(orientations.buffer)]);
  
      numVertices += tract.length;
      numEdges += tract.length - 1;
    }
  
    // Create the final binary tract buffer
    const bintract = Buffer.alloc(8 + verticesBuffer.length + edgesBuffer.length + orientationsBuffer.length);
  
    // Write the number of vertices (little-endian)
    bintract.writeUInt32LE(numVertices, 0);
  
    // Write the number of edges (little-endian)
    bintract.writeUInt32LE(numEdges, 4);
  
    // Append the vertices, edges, and orientations to the buffer
    verticesBuffer.copy(bintract, 8);
    edgesBuffer.copy(bintract, 8 + verticesBuffer.length);
    orientationsBuffer.copy(bintract, 8 + verticesBuffer.length + edgesBuffer.length);
  
    return bintract;
  }
  

  // Placeholder method to get a tract by its ID
  getTractById(id: number): Float32Array {
    // Logic to return a tract by its ID (replace this with actual logic)
    if (id < this.tracts.length) {
      return this.tracts[id];
    }
    // Handle invalid IDs (optional)
    console.error(`Tract ID ${id} is out of range`);
    return new Float32Array([]);
  }

  // Keep the writeSkeletonInfo method as it is
  writeSkeletonInfo(outputPath: string) {
    const info = {
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
    fs.writeFileSync(outputPath, JSON.stringify(info, null, 2));
  }

  // Keep the generateSkeletonFilePaths method as it is
  generateSkeletonFilePaths(basePath: string): { infoPath: string, skeletonPath: string } {
    return {
      infoPath: `${basePath}/info`,
      skeletonPath: `${basePath}/skeleton`,
    };
  }
}

export default SkeletonWriter;
