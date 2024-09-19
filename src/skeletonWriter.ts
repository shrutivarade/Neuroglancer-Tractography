import fs from 'fs';
import path from 'path';

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

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
    fs.mkdirSync(path.dirname(outputFilePath), { recursive: true });

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
    fs.mkdirSync(path.dirname(infoFilePath), { recursive: true });

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

    fs.mkdirSync(path.dirname(infoFilePath), { recursive: true });

    // Write the skeleton info to the specified path
    fs.writeFileSync(infoFilePath, JSON.stringify(skeletonInfo, null, 2));
    console.log(`Skeleton info file written to ${infoFilePath}`);
  }

  
  static writePropInfo(propFilePath: string) {
    fs.mkdirSync(path.dirname(propFilePath), { recursive: true });

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

  
  static generateSkeletonFilePaths(outputDirectory: string, timestamp: string) {

    // Build the file paths with the formatted timestamp
    const binaryFilePath = path.join(outputDirectory, 'tract', timestamp, '1'); // Binary file path
    const propInfoFilePath = path.join(outputDirectory, 'tract', timestamp, 'prop', 'info'); // JSON file path
    const skeletonInfoFilePath = path.join(outputDirectory, 'tract', timestamp, 'info'); // JSON file path

    return {
      binaryFilePath,
      propInfoFilePath,
      skeletonInfoFilePath
    };
  }

  static async uploadSkeletonFilePathsToS3(outputDirectory: string, timestamp: string) {
  // Initialize the S3 client
    const s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-2',
    });

    // Read the bucket name from environment variables
    const bucketName = process.env.BUCKET_NAME || 'linc-brain-mit-prod-us-east-2';

    // Check for required environment variables
    if (!process.env.AWS_REGION || !process.env.BUCKET_NAME) {
      console.error('AWS_REGION and BUCKET_NAME must be set in environment variables.');
      return;
    }

    // Define the local directory to upload
    const localDir = path.join(outputDirectory, 'tract', timestamp);

    // Include the 'neuroglancer_trk/' prefix in the S3 destination path
    const s3DestinationPath = path.join('neuroglancer_trk', 'tract', timestamp).replace(/\\/g, '/');

    // Recursively upload all files in the local directory to S3
    await SkeletonWriter.uploadDirectoryToS3(s3Client, bucketName, localDir, s3DestinationPath);

    console.log('Uploaded generated files to S3.');
  }

  static async uploadDirectoryToS3(
    s3Client: S3Client,
    bucketName: string,
    localDirectory: string,
    s3DestinationPath: string
  ) {
    const files = SkeletonWriter.getAllFilesInDirectory(localDirectory);

    for (const filePath of files) {
      // Compute the relative path from the local directory
      const relativeFilePath = path.relative(localDirectory, filePath);

      // Construct the S3 key by joining the destination path and relative file path
      const s3Key = path.join(s3DestinationPath, relativeFilePath).replace(/\\/g, '/');

      try {
        const fileContent = fs.readFileSync(filePath);

        const params = {
          Bucket: bucketName,
          Key: s3Key,
          Body: fileContent,
        };

        const command = new PutObjectCommand(params);
        await s3Client.send(command);
        console.log(`File uploaded successfully to s3://${bucketName}/${s3Key}`);
      } catch (error) {
        console.error(`Error uploading file ${filePath} to S3:`, error);
      }
    }
  }

  static getAllFilesInDirectory(dir: string): string[] {
    let results: string[] = [];

    const list = fs.readdirSync(dir);
    list.forEach((file) => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat && stat.isDirectory()) {
        // Recursively walk subdirectories
        results = results.concat(SkeletonWriter.getAllFilesInDirectory(filePath));
      } else {
        results.push(filePath);
      }
    });

    return results;
  }
}


