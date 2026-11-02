# Analyze the track points and identify tight corners
import json

# Current Monaco track points from track.config.js
points = [
    [0,0,0],
    [3,0,10],
    [4,0.1,20],
    [4,0.2,30],
    [3,0.3,40],
    [1,0.35,50],
    [-1,0.35,60],
    [-3,0.3,70],
    [-4,0.25,76],
    [-4,0.15,80],
    [-4,0.15,84],
    [-3,0.15,90],
    [-2,0.15,96],
    [-1,0.15,102],
    [0,0.15,108],
    [1,0.15,114],
    [2,0.15,120],
    [3,0.15,126],
    [4,0.15,132],
    [4,0.12,136],
    [3,0.05,140],
    [2,0.02,144],
    [0,0.01,148],
    [-2,0.02,152],
    [-4,0.05,156],
    [-4,0.1,160],
    [-3,0.15,164],
    [-2,0.15,168],
    [-1,0.15,172],
    [0,0.15,176],
    [1,0.15,180],
    [2,0.15,184],
    [4,0.12,189],
    [2,0.02,193],
    [0,0.01,198],
    [-1,0.05,202],
    [1,0.05,206],
    [2,0.02,210],
    [0,0,215],
]

n = len(points)
print(f"Track has {n} control points")
print(f"\nPoints around u=0.533 (midpoint of loop):")
for i in range(30, 38):
    print(f"  {i}: {points[i]}")

# Check distances between consecutive points
print(f"\nConsecutive distances:")
for i in range(n):
    a = points[i]
    b = points[(i+1) % n]
    dist = ((a[0]-b[0])**2 + (a[2]-b[2])**2)**0.5
    print(f"  {i}->{(i+1)%n}: {dist:.2f}")

# Check for tight turns at x=4
print(f"\nChecking tight turns at x=4:")
for i in range(30, 36):
    a = points[i]
    b = points[(i+1) % n]
    c = points[(i+2) % n]
    # Distance
    d_ab = ((a[0]-b[0])**2 + (a[2]-b[2])**2)**0.5
    d_bc = ((b[0]-c[0])**2 + (b[2]-c[2])**2)**0.5
    print(f"  {i}->{(i+1)%n}->{(i+2)%n}: {a} -> {b} -> {c} (d1={d_ab:.2f}, d2={d_bc:.2f})")
