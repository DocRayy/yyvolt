// Generate a superellipse track layout for Monaco
// The track uses a superellipse with Z as a function of angle

const CAR_WIDTH = 0.42;
const WIDTH = CAR_WIDTH * 4; // 1.68 (max of 3-4x CAR_WIDTH)

// Superellipse parameters
const halfWidth = 4.0;
const halfDepth = 6.0;
const exponent = 2.25;
const points = 60;
const surfaceY = 0.02;

// Z range: 0 (start) to 200 (loop top) and back to 0
// The loop goes around the island clockwise

function buildSuperellipseTrack() {
  const controlPoints = [];
  const power = 2 / exponent;
  
  // Build the superellipse with Z as a function of angle
  // t = 0 starts at (+halfWidth, 0) and t = PI*2 ends at (-halfWidth, 0)
  // Z increases with t to create a spiral-like loop
  
  for (let i = 0; i < points; i += 1) {
    const t = (i / points) * Math.PI * 2;
    const angle = t;
    const c = Math.cos(t);
    const s = Math.sin(t);
    
    // X follows superellipse
    const x = halfWidth * Math.sign(c) * Math.abs(c) ** power;
    const z = -halfDepth * Math.sign(s) * Math.abs(s) ** power;
    
    // Z is a function of angle to create the loop
    // t goes from 0 to 2*PI, so Z ranges from -halfDepth to halfDepth
    // We want Z to go from 0 to 200 and back to 0 as we go around
    const zScaled = (Math.sin(t) * halfDepth) * 0.3; // scaled to about 0-180 range
    const finalZ = zScaled + (i / points) * 200; // add monotonic increase
    
    controlPoints.push([x, surfaceY, finalZ]);
  }
  
  return controlPoints;
}

const track = buildSuperellipseTrack();
console.log(`Generated ${track.length} points`);
console.log('First 10 points:');
track.slice(0, 10).forEach((p, i) => console.log(`  ${i}: [${p.join(', ')}]`));
console.log('Last 5 points:');
track.slice(-5).forEach((p, i) => console.log(`  ${i + track.length - 5}: [${p.join(', ')}]`));
