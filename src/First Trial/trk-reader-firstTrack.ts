import axios from 'axios';

// Define the interface for the TRK header
interface TrkHeader {
  id_string: string;
  dim: [number, number, number];
  voxel_size: [number, number, number];
  origin: [number, number, number];
  n_scalars: number;
  scalar_name: string[];
  n_properties: number;
  property_name: string[];
  vox_to_ras: number[][];
  voxel_order: string;
  image_orientation_patient: [number, number, number, number, number, number];
  invert_x: boolean;
  invert_y: boolean;
  invert_z: boolean;
  swap_xy: boolean;
  swap_yz: boolean;
  swap_zx: boolean;
  n_count: number;
  version: number;
  hdr_size: number;
}

// Function to read the TRK header from a buffer
function readTrkHeader(buffer: Buffer): TrkHeader {
  let offset = 0;

  const readChars = (length: number) => {
    const value = buffer.toString('ascii', offset, offset + length).replace(/\0/g, '');
    offset += length;
    return value;
  };

  const readShorts = (length: number): number[] => {
    const values: number[] = [];
    for (let i = 0; i < length; i++) {
      values.push(buffer.readInt16LE(offset));
      offset += 2;
    }
    return values;
  };

  const readFloats = (length: number): number[] => {
    const values: number[] = [];
    for (let i = 0; i < length; i++) {
      values.push(buffer.readFloatLE(offset));
      offset += 4;
    }
    return values;
  };

  const readMatrix = (rows: number, cols: number): number[][] => {
    const matrix: number[][] = [];
    for (let i = 0; i < rows; i++) {
      const row: number[] = [];
      for (let j = 0; j < cols; j++) {
        row.push(buffer.readFloatLE(offset));
        offset += 4;
      }
      matrix.push(row);
    }
    return matrix;
  };

  const readUChar = (): boolean => {
    const value = buffer.readUInt8(offset);
    offset += 1;
    return value !== 0;
  };

  const header: TrkHeader = {
    id_string: readChars(6),
    dim: readShorts(3) as [number, number, number],
    voxel_size: readFloats(3) as [number, number, number],
    origin: readFloats(3) as [number, number, number],
    n_scalars: buffer.readInt16LE(offset),
    scalar_name: [],
    n_properties: 0,
    property_name: [],
    vox_to_ras: [],
    voxel_order: '',
    image_orientation_patient: [0, 0, 0, 0, 0, 0],
    invert_x: false,
    invert_y: false,
    invert_z: false,
    swap_xy: false,
    swap_yz: false,
    swap_zx: false,
    n_count: 0,
    version: 0,
    hdr_size: 0,
  };
  offset += 2;

  // Scalar names (10 names x 20 chars each = 200 bytes)
  for (let i = 0; i < 10; i++) {
    header.scalar_name.push(readChars(20));
  }

  header.n_properties = buffer.readInt16LE(offset);
  offset += 2;

  // Property names (10 names x 20 chars each = 200 bytes)
  for (let i = 0; i < 10; i++) {
    header.property_name.push(readChars(20));
  }

  header.vox_to_ras = readMatrix(4, 4);

  offset += 444; // Skipped: Reserved space for future version.

  header.voxel_order = readChars(4);
  offset += 4; // Skipped: paddings

  header.image_orientation_patient = readFloats(6) as [number, number, number, number, number, number];

  offset += 2; // Skipped: paddings

  header.invert_x = readUChar();
  header.invert_y = readUChar();
  header.invert_z = readUChar();
  header.swap_xy = readUChar();
  header.swap_yz = readUChar();
  header.swap_zx = readUChar();

  header.n_count = buffer.readInt32LE(offset);
  offset += 4;

  header.version = buffer.readInt32LE(offset);
  offset += 4;

  header.hdr_size = buffer.readInt32LE(offset);
  offset += 4;

  return header;
}

// Function to print the header in a readable format
function printTrkHeader(header: TrkHeader): void {
  console.log('\n--- TRK File Metadata ---');
  console.log(`ID String: ${header.id_string}`);
  console.log(`Dimensions: ${header.dim.join(' x ')}`);
  console.log(`Voxel Size: ${header.voxel_size.join(', ')}`);
  console.log(`Origin: ${header.origin.join(', ')}`);
  console.log(`Number of Scalars per Point: ${header.n_scalars}`);
  console.log(`Scalar Names: ${header.scalar_name.filter(name => name).join(', ')}`);
  console.log(`Number of Properties per Track: ${header.n_properties}`);
  console.log(`Property Names: ${header.property_name.filter(name => name).join(', ')}`);
  console.log('Voxel to RAS Matrix:');
  header.vox_to_ras.forEach(row => console.log(`  [${row.join(', ')}]`));
  console.log(`Voxel Order: ${header.voxel_order}`);
  console.log(`Image Orientation (Patient): ${header.image_orientation_patient.join(', ')}`);
  console.log(`Invert X: ${header.invert_x}`);
  console.log(`Invert Y: ${header.invert_y}`);
  console.log(`Invert Z: ${header.invert_z}`);
  console.log(`Swap XY: ${header.swap_xy}`);
  console.log(`Swap YZ: ${header.swap_yz}`);
  console.log(`Swap ZX: ${header.swap_zx}`);
  console.log(`Number of Tracks: ${header.n_count}`);
  console.log(`Version: ${header.version}`);
  console.log(`Header Size: ${header.hdr_size}`);
}

// Function to stream only first 1000 bytes from the TRK file and process the header
async function streamAndProcessHeader(url: string, start: number, end: number) {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'Range': `bytes=${start}-${end}`
      }
    });

    console.log(`\nReceived ${response.data.byteLength} bytes from range ${start}-${end}`);
    const buffer = Buffer.from(response.data);

    
    if (buffer.length < 1000) {
      console.error('Error: Buffer is too small to contain a valid header.');
      return;
    }

    
    const header = readTrkHeader(buffer);
    printTrkHeader(header);

  } catch (error) {
    if (error instanceof Error) {
      console.error('Error streaming or processing the TRK file:', error.message);
    } else {
      console.error('Unexpected error:', error);
    }
  }
}

// Function to read the next track data from the buffer
function readNextTrack(buffer: Buffer, offset: number) {
  // Read the number of points in the track (4 bytes)
  const n_points = buffer.readInt32LE(offset);
  offset += 4;

  if (n_points <= 0) {
    console.error('Error: Invalid number of points in the track.');
    return;
  }

  // Read the points (each point is 3 floats, so 12 bytes per point)
  const points: number[][] = [];
  for (let i = 0; i < n_points; i++) {
    const x = buffer.readFloatLE(offset);
    const y = buffer.readFloatLE(offset + 4);
    const z = buffer.readFloatLE(offset + 8);
    points.push([x, y, z]);
    offset += 12;
  }

  // Print the track data in a readable format
  console.log(`\n--- Track Data ---`);
  console.log(`Number of Points: ${n_points}`);
  points.forEach((point, index) => {
    console.log(`Point ${index + 1}: [${point.join(', ')}]`);
  });
}

// Function to stream and process the next track after the header
async function streamAndProcessNextTrack(url: string, start: number, end: number) {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'Range': `bytes=${start}-${end}`
      }
    });

    console.log(`\nReceived ${response.data.byteLength} bytes from range ${start}-${end}`);
    const buffer = Buffer.from(response.data);

    readNextTrack(buffer, 0);

  } catch (error) {
    if (error instanceof Error) {
      console.error('Error streaming or processing the TRK file:', error.message);
    } else {
      console.error('Unexpected error:', error);
    }
  }
}





async function main() {
  const trkFileUrl = "https://dandiarchive.s3.amazonaws.com/blobs/d4a/c43/d4ac43bd-6896-4adf-a911-82edbea21f67";
  
  const headerChunkSize = 1000;  

  await streamAndProcessHeader(trkFileUrl, 0, headerChunkSize - 1);


  
  const trackChunkSize = 2000; // Size of the chunk to read the next track

  // Stream and process the next track
  await streamAndProcessNextTrack(trkFileUrl, headerChunkSize, headerChunkSize + trackChunkSize - 1);

}

// Execute the main function
main().catch(console.error);
